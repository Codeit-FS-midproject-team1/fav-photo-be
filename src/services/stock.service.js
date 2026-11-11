import { badRequest, conflict, notFound } from "#utils/http-error.js";

const MAX_DB_INT = 2147483647;

export class StockService {
  constructor({
    saleListingRepository,
    cardItemRepository,
    notificationService,
    pendingOfferCleanupRepository,
  }) {
    this.saleListingRepository = saleListingRepository;
    this.cardItemRepository = cardItemRepository;
    this.notificationService = notificationService;
    this.pendingOfferCleanupRepository = pendingOfferCleanupRepository;
  }

  // 판매 등록 시 보유 카드를 판매 상태로 예약
  async reserveForSale({ sellerId, photoCardId, quantity, listingId }, tx) {
    if (!tx) {
      throw new Error("판매 재고 예약에는 트랜잭션이 필요합니다.");
    }

    const items = await this.cardItemRepository.findHeldForSale(
      sellerId,
      photoCardId,
      quantity,
      tx,
    );

    if (items.length !== quantity) {
      throw conflict("판매 가능한 보유 카드 수량이 부족합니다.");
    }

    const updatedCount = await this.cardItemRepository.markOnSale(
      items,
      listingId,
      tx,
    );

    if (updatedCount !== quantity) {
      throw conflict("판매할 카드의 상태 변경에 실패했습니다.");
    }

    return updatedCount;
  }

  // 구매 및 교환 승인 시 판매 재고 차감
  async decrease(listingId, quantity, tx) {
    if (!tx) {
      throw new Error("재고 차감에는 트랜잭션이 필요합니다.");
    }

    // 1. 입력값 검증
    if (
      !Number.isSafeInteger(listingId) ||
      listingId < 1 ||
      listingId > MAX_DB_INT
    ) {
      throw badRequest("올바른 판매글 ID가 필요합니다.");
    }

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_DB_INT
    ) {
      throw badRequest("수량은 1 이상의 올바른 정수여야 합니다.");
    }

    // 2. 판매글 조회 및 잠금
    const listing = await this.saleListingRepository.findByIdForUpdate(
      listingId,
      tx,
    );

    if (!listing) {
      throw notFound("판매글을 찾을 수 없습니다.");
    }

    // 3. 판매 상태 검사
    if (listing.status !== "ON_SALE") {
      throw conflict("현재 판매 중인 포토카드가 아닙니다.");
    }

    // 4. 남은 수량 검사
    if (listing.remainingQuantity < quantity) {
      throw conflict("남은 판매 수량이 부족합니다.");
    }

    // 5. 재고 차감
    const remainingQuantity = listing.remainingQuantity - quantity;

    const isSoldOut = remainingQuantity === 0;

    // 6. 판매글 수량 및 상태 변경
    const updated = await this.saleListingRepository.updateById(
      listingId,
      {
        remainingQuantity,
        status: isSoldOut ? "SOLD_OUT" : "ON_SALE",
      },
      tx,
    );

    if (!updated) {
      throw conflict("재고 변경에 실패했습니다.");
    }

    // 7. 품절 시 후속 처리
    if (isSoldOut) {
      // 7-1. 대기 중 교환 제안 거절 및 카드 복구
      const rejectedOffers =
        await this.pendingOfferCleanupRepository.rejectAllPendingByListing(
          listingId,
          tx,
        );

      // 7-2. 거절된 제안자에게 알림
      for (const offer of rejectedOffers) {
        await this.notificationService.notify(
          {
            userId: offer.offererId,
            type: "OFFER_REJECTED",
            message: "판매글이 품절되어 교환 제안이 거절되었습니다.",
            link: "/",
          },
          tx,
        );
      }

      // 7-3. 판매자에게 품절 알림
      await this.notificationService.notify(
        {
          userId: listing.sellerId,
          type: "SOLD_OUT",
          message: "판매 중인 포토카드가 품절되었습니다.",
          link: "/",
        },
        tx,
      );
    }

    return updated;
  }
}
