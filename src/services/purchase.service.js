import { createHash } from "node:crypto";

import { badRequest, conflict, notFound } from "#utils/http-error.js";

const MAX_DB_INT = 2147483647;

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export class PurchaseService {
  constructor({
    saleListingRepository,
    cardItemRepository,
    stockService,
    pointService,
    tradeRepository,
    purchaseRequestRepository,
    notificationService,
    runInTransaction,
  }) {
    this.saleListingRepository = saleListingRepository;
    this.cardItemRepository = cardItemRepository;
    this.stockService = stockService;
    this.pointService = pointService;
    this.tradeRepository = tradeRepository;
    this.purchaseRequestRepository = purchaseRequestRepository;
    this.notificationService = notificationService;
    this.runInTransaction = runInTransaction;
  }

  // ========================================
  // 1. 공통 유효성 검사
  // ========================================

  #parsePositiveId(value, fieldName) {
    if (
      (typeof value !== "string" && typeof value !== "number") ||
      !/^[1-9]\d*$/.test(String(value))
    ) {
      throw badRequest(`${fieldName}는 1 이상의 정수여야 합니다.`);
    }

    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed) || parsed > MAX_DB_INT) {
      throw badRequest(`${fieldName}가 올바르지 않습니다.`);
    }

    return parsed;
  }

  // ========================================
  // 2. 구매 중복 요청 결과 조회
  // ========================================

  #getPreviousResult(request, requestHash) {
    if (request.requestHash !== requestHash) {
      throw conflict(
        "동일한 Idempotency-Key를 다른 구매 요청에 사용할 수 없습니다.",
      );
    }

    if (!request.responseJson) {
      throw conflict("해당 구매 요청의 완료 결과를 확인할 수 없습니다.");
    }

    try {
      return JSON.parse(request.responseJson);
    } catch {
      throw conflict("저장된 구매 결과를 읽을 수 없습니다.");
    }
  }

  // ========================================
  // 3. 구매 처리
  // POST /api/sale-listings/:id/purchases
  // ========================================

  async create(buyerId, body, rawIdempotencyKey) {
    const { saleListingId, quantity } = body ?? {};

    // 구매자 ID 검증
    const validBuyerId = this.#parsePositiveId(buyerId, "구매자 ID");

    // 판매글 ID 검증
    const validSaleListingId = this.#parsePositiveId(
      saleListingId,
      "판매글 ID",
    );

    // 구매 수량 검증
    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_DB_INT
    ) {
      throw badRequest(undefined, {
        quantity: "구매 수량은 1 이상의 정수여야 합니다.",
      });
    }

    // 중복 요청 방지 키 검증
    const idempotencyKey =
      typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : "";

    if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw badRequest(
        "Idempotency-Key는 영문, 숫자, 점, 밑줄, 하이픈, 콜론으로 구성된 8~128자 문자열이어야 합니다.",
      );
    }

    // 동일한 구매 내용에 대해 동일한 해시 생성
    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          saleListingId: validSaleListingId,
          quantity,
        }),
      )
      .digest("hex");

    try {
      return await this.runInTransaction(async (tx) => {
        // 1. 이전 구매 요청 확인
        const existingRequest =
          await this.purchaseRequestRepository.findByBuyerAndKey(
            validBuyerId,
            idempotencyKey,
            tx,
          );

        if (existingRequest) {
          return this.#getPreviousResult(existingRequest, requestHash);
        }

        // 2. 구매 요청 키 등록
        const purchaseRequest = await this.purchaseRequestRepository.create(
          {
            buyerId: validBuyerId,
            idempotencyKey,
            requestHash,
          },
          tx,
        );

        // 3. 판매글 조회 및 행 잠금
        const listing = await this.saleListingRepository.findByIdForUpdate(
          validSaleListingId,
          tx,
        );

        if (!listing) {
          throw notFound("판매글을 찾을 수 없습니다.");
        }

        // 4. 본인 판매글 구매 차단
        if (listing.sellerId === validBuyerId) {
          throw badRequest("자신의 판매글은 구매할 수 없습니다.");
        }

        // 5. 판매 상태 확인
        if (listing.status !== "ON_SALE") {
          throw conflict("현재 판매 중인 포토카드가 아닙니다.");
        }

        // 6. 재고 수량 확인
        if (listing.remainingQuantity < quantity) {
          throw conflict("남은 판매 수량이 부족합니다.");
        }

        // 7. 전체 구매 금액 계산
        const totalPrice = listing.price * quantity;

        if (
          !Number.isSafeInteger(totalPrice) ||
          totalPrice < 1 ||
          totalPrice > MAX_DB_INT
        ) {
          throw badRequest("구매 금액이 허용 범위를 초과했습니다.");
        }

        // 8. 구매자 포인트 차감
        //    판매자 포인트 적립
        await this.pointService.transferForPurchase(
          {
            buyerId: validBuyerId,
            sellerId: listing.sellerId,
            amount: totalPrice,
          },
          tx,
        );

        // 9. 카드 소유권 이전
        const transferredCount =
          await this.cardItemRepository.transferSaleItemsToBuyer(
            {
              listingId: listing.id,
              sellerId: listing.sellerId,
              buyerId: validBuyerId,
              quantity,
            },
            tx,
          );

        if (transferredCount !== quantity) {
          throw conflict("구매 가능한 카드 수량이 부족합니다.");
        }

        // 10. 판매 재고 차감
        //     품절 시 후속 처리
        await this.stockService.decrease(listing.id, quantity, tx);

        // 11. 거래 기록 생성
        const trade = await this.tradeRepository.create(
          {
            type: "PURCHASE",
            sellerId: listing.sellerId,
            counterpartId: validBuyerId,
            photoCardId: listing.photoCardId,
            receivedPhotoCardId: null,
            quantity,
            points: totalPrice,
          },
          tx,
        );

        // 12. 구매자 알림
        await this.notificationService.notify(
          {
            userId: validBuyerId,
            type: "PURCHASE_COMPLETED",
            message: "포토카드 구매가 완료되었습니다.",
            link: "/",
          },
          tx,
        );

        // 13. 판매자 알림
        await this.notificationService.notify(
          {
            userId: listing.sellerId,
            type: "SALE_COMPLETED",
            message: "판매 중인 포토카드가 판매되었습니다.",
            link: "/",
          },
          tx,
        );

        // 14. 구매 결과
        const result = {
          id: trade.id,
          type: trade.type,
          saleListingId: listing.id,
          photoCardId: listing.photoCardId,
          quantity,
          totalPrice,
          status: "COMPLETED",
        };

        // 15. 중복 요청 방지를 위한 결과 저장
        const savedCount = await this.purchaseRequestRepository.saveResponse(
          purchaseRequest.id,
          result,
          tx,
        );

        if (savedCount !== 1) {
          throw conflict("구매 요청 결과 저장에 실패했습니다.");
        }

        return result;
      });
    } catch (error) {
      // 동시 중복 요청으로 UNIQUE 제약조건이
      // 충돌한 경우 기존 구매 결과 조회
      const sqlState =
        error?.sqlState ??
        error?.cause?.sqlState ??
        error?.code ??
        error?.cause?.code;

      if (sqlState === "23505") {
        const existingRequest =
          await this.purchaseRequestRepository.findByBuyerAndKey(
            validBuyerId,
            idempotencyKey,
          );

        if (existingRequest) {
          return this.#getPreviousResult(existingRequest, requestHash);
        }
      }

      throw error;
    }
  }

  // ========================================
  // 4. 구매 내역 응답 변환
  // ========================================

  #toPurchaseResponse(trade) {
    return {
      id: trade.id,
      type: trade.type,
      sellerId: trade.sellerId,
      photoCardId: trade.photoCardId,
      photoCard: trade.photoCard
        ? {
            id: trade.photoCard.id,
            name: trade.photoCard.name,
            imageUrl: trade.photoCard.imageUrl,
            genre: trade.photoCard.genre,
            method: trade.photoCard.method,
          }
        : null,
      quantity: trade.quantity,
      totalPrice: trade.points,
      status: "COMPLETED",
      createdAt: trade.createdAt,
    };
  }

  // ========================================
  // 5. 내 구매 내역 목록 조회
  // GET /api/purchases
  // ========================================

  async getMyPurchases(buyerId, query = {}) {
    const validBuyerId = this.#parsePositiveId(buyerId, "사용자 ID");

    // 기본 조회 수량: 20개
    const limit =
      query.limit === undefined
        ? 20
        : this.#parsePositiveId(query.limit, "limit");

    if (limit > 100) {
      throw badRequest("limit는 최대 100까지 허용됩니다.");
    }

    // 커서 기반 페이지네이션
    const cursor =
      query.cursor === undefined
        ? null
        : this.#parsePositiveId(query.cursor, "cursor");

    // 실제 구매 기록 조회
    const trades = await this.tradeRepository.findPurchasesByBuyer({
      buyerId: validBuyerId,
      limit,
      cursor,
    });

    // 다음 페이지 존재 여부
    const hasMore = trades.length > limit;

    const page = trades.slice(0, limit);

    const items = page.map((trade) => this.#toPurchaseResponse(trade));

    return {
      items,
      nextCursor:
        hasMore && page.length > 0 ? String(page[page.length - 1].id) : null,
    };
  }

  // ========================================
  // 6. 내 구매 상세 조회
  // GET /api/purchases/:id
  // ========================================

  async getMyPurchaseById(buyerId, tradeId) {
    const validBuyerId = this.#parsePositiveId(buyerId, "사용자 ID");

    const validTradeId = this.#parsePositiveId(tradeId, "거래 ID");

    const trade = await this.tradeRepository.findPurchaseById(
      validTradeId,
      validBuyerId,
    );

    if (!trade) {
      throw notFound("구매 내역을 찾을 수 없습니다.");
    }

    return this.#toPurchaseResponse(trade);
  }
}
