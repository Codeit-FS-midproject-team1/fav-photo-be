import {
  badRequest,
  notFound,
  forbidden,
  conflict,
} from "#utils/http-error.js";

import { parsePage } from "#utils/pagination.js";

import {
  SALE_PRICE_MIN,
  SALE_PRICE_MAX,
  EXCHANGE_DESCRIPTION_MAX,
  POSTGRES_INT_MAX,
} from "#utils/sale-listing.constants.js";

import {
  PHOTO_CARD_METHODS as METHODS,
  PHOTO_CARD_GENRES as GENRES,
} from "#app/constants/photo-card.js";

const SORTS = ["latest", "oldest", "priceLow", "priceHigh"];
const SOLD_OUT = ["true", "false"];

const EDIT_FIELDS = [
  "quantity",
  "price",
  "exchangeMethod",
  "exchangeGenre",
  "exchangeDescription",
];

const checkOneOf = (value, allowed, field) => {
  if (value !== undefined && !allowed.includes(value)) {
    throw badRequest(undefined, {
      [field]: `${allowed.join(", ")} 중 하나여야 합니다.`,
    });
  }
};

const toUser = ({ id, nickname, deletedAt }) =>
  deletedAt ? { id: null, nickname: "탈퇴한 사용자" } : { id, nickname };

const toItem = (listing) => ({
  id: listing.id,
  status: listing.status,
  price: listing.price,
  saleQuantity: listing.saleQuantity,
  remainingQuantity: listing.remainingQuantity,
  seller: toUser(listing.seller),
  photoCard: {
    id: listing.photoCard.id,
    name: listing.photoCard.name,
    description: listing.photoCard.description,
    method: listing.photoCard.method,
    genre: listing.photoCard.genre,
    price: listing.photoCard.price,
    totalQuantity: listing.photoCard.totalQuantity,
    imageUrl: listing.photoCard.imageUrl,
    creator: toUser(listing.photoCard.creator),
    createdAt: new Date(listing.photoCard.createdAt).toISOString(),
  },
  createdAt: new Date(listing.createdAt).toISOString(),
});

const toDetail = (listing) => ({
  ...toItem(listing),
  exchangeMethod: listing.exchangeMethod,
  exchangeGenre: listing.exchangeGenre,
  exchangeDescription: listing.exchangeDescription,
  updatedAt: listing.updatedAt
    ? new Date(listing.updatedAt).toISOString()
    : null,
});

const parseListingId = (rawId) => {
  const id = Number(rawId);

  if (
    typeof rawId !== "string" ||
    !/^[1-9]\d*$/.test(rawId) ||
    !Number.isSafeInteger(id) ||
    id > POSTGRES_INT_MAX
  ) {
    throw badRequest(undefined, {
      id: "올바른 판매글 번호가 아닙니다.",
    });
  }

  return id;
};

export class SaleListingService {
  constructor({
    saleListingRepository,
    stockService,
    runInTransaction,
    cardItemRepository,
    exchangeOfferRepository,
    exchangeOfferCardRepository,
    notificationService,
  }) {
    this.saleListingRepository = saleListingRepository;
    this.stockService = stockService;
    this.runInTransaction = runInTransaction;
    this.cardItemRepository = cardItemRepository;
    this.exchangeOfferRepository = exchangeOfferRepository;
    this.exchangeOfferCardRepository = exchangeOfferCardRepository;
    this.notificationService = notificationService;
  }

  // ========================================
  // 1. 판매글 목록 조회
  // ========================================

  async getMarketList(query) {
    checkOneOf(query.method, METHODS, "method");
    checkOneOf(query.genre, GENRES, "genre");
    checkOneOf(query.soldOut, SOLD_OUT, "soldOut");
    checkOneOf(query.sort, SORTS, "sort");

    const { pageSize, offset } = parsePage(query, {
      defaultSize: 12,
      maxSize: 30,
    });

    const filters = {
      keyword:
        typeof query.keyword === "string" ? query.keyword.trim() : undefined,
      method: query.method,
      genre: query.genre,
      soldOut: query.soldOut && query.soldOut === "true",
    };

    const [rows, totalCount] = await Promise.all([
      this.saleListingRepository.findMarketList(filters, {
        sort: query.sort ?? "latest",
        offset,
        limit: pageSize,
      }),
      this.saleListingRepository.countMarketList(filters),
    ]);

    return {
      items: rows.map(toItem),
      totalCount,
    };
  }

  // ========================================
  // 2. 판매글 상세 조회
  // ========================================

  async getMarketDetail(rawId) {
    const id = parseListingId(rawId);

    const listing = await this.saleListingRepository.findMarketDetailById(id);

    if (!listing) {
      throw notFound("판매글을 찾을 수 없습니다.");
    }

    return toDetail(listing);
  }

  // ========================================
  // 3. 판매 등록
  // ========================================

  async create(userId, body) {
    const {
      photoCardId,
      saleQuantity,
      price,
      exchangeMethod,
      exchangeGenre,
      exchangeDescription,
    } = body ?? {};

    // 포토카드 ID 검증
    if (
      !Number.isSafeInteger(photoCardId) ||
      photoCardId < 1 ||
      photoCardId > POSTGRES_INT_MAX
    ) {
      throw badRequest(undefined, {
        photoCardId: "올바른 포토카드 ID가 필요합니다.",
      });
    }

    // 판매 수량 검증
    if (
      !Number.isSafeInteger(saleQuantity) ||
      saleQuantity < 1 ||
      saleQuantity > POSTGRES_INT_MAX
    ) {
      throw badRequest(undefined, {
        saleQuantity: "판매 수량은 1 이상의 정수여야 합니다.",
      });
    }

    // 판매 가격 검증
    if (
      !Number.isSafeInteger(price) ||
      price < SALE_PRICE_MIN ||
      price > SALE_PRICE_MAX
    ) {
      throw badRequest(undefined, {
        price: `판매 가격은 ${SALE_PRICE_MIN}~${SALE_PRICE_MAX}P 사이여야 합니다.`,
      });
    }

    // 교환 희망 제작 방식 검증
    if (!METHODS.includes(exchangeMethod)) {
      throw badRequest(undefined, {
        exchangeMethod: "올바른 교환 희망 제작 방식을 선택해주세요.",
      });
    }

    // 교환 희망 장르 검증
    if (!GENRES.includes(exchangeGenre)) {
      throw badRequest(undefined, {
        exchangeGenre: "올바른 교환 희망 장르를 선택해주세요.",
      });
    }

    // 교환 희망 설명 검증
    if (
      typeof exchangeDescription !== "string" ||
      exchangeDescription.length > EXCHANGE_DESCRIPTION_MAX
    ) {
      throw badRequest(undefined, {
        exchangeDescription: `교환 희망 설명은 ${EXCHANGE_DESCRIPTION_MAX}자 이하여야 합니다.`,
      });
    }

    // 판매글 생성 및 카드 재고 예약을 하나의 트랜잭션으로 처리
    const created = await this.runInTransaction(async (tx) => {
      const listing = await this.saleListingRepository.create(
        {
          sellerId: userId,
          photoCardId,
          saleQuantity,
          remainingQuantity: saleQuantity,
          price,
          exchangeMethod,
          exchangeGenre,
          exchangeDescription,
          status: "ON_SALE",
        },
        tx,
      );

      await this.stockService.reserveForSale(
        {
          sellerId: userId,
          photoCardId,
          quantity: saleQuantity,
          listingId: listing.id,
        },
        tx,
      );

      return listing;
    });

    return this.getMarketDetail(String(created.id));
  }

  // ========================================
  // 4. 판매 정보 수정
  // ========================================

  async update(userId, rawId, body) {
    const id = parseListingId(rawId);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw badRequest("수정할 정보를 입력해 주세요.");
    }

    const keys = Object.keys(body);

    if (keys.length === 0) {
      throw badRequest("수정할 정보를 입력해 주세요.");
    }

    const unknownField = keys.find((key) => !EDIT_FIELDS.includes(key));

    if (unknownField) {
      throw badRequest(undefined, {
        [unknownField]: "수정할 수 없는 항목입니다.",
      });
    }

    // 수정 후 남은 판매 수량 검증
    if (Object.hasOwn(body, "quantity")) {
      if (
        !Number.isSafeInteger(body.quantity) ||
        body.quantity < 1 ||
        body.quantity > POSTGRES_INT_MAX
      ) {
        throw badRequest(undefined, {
          quantity: "남은 판매 수량은 1 이상의 정수여야 합니다.",
        });
      }
    }

    // 가격 검증
    if (Object.hasOwn(body, "price")) {
      if (
        !Number.isSafeInteger(body.price) ||
        body.price < SALE_PRICE_MIN ||
        body.price > SALE_PRICE_MAX
      ) {
        throw badRequest(undefined, {
          price: `판매 가격은 ${SALE_PRICE_MIN}~${SALE_PRICE_MAX}P 사이여야 합니다.`,
        });
      }
    }

    // 교환 희망 제작 방식 검증
    if (
      Object.hasOwn(body, "exchangeMethod") &&
      !METHODS.includes(body.exchangeMethod)
    ) {
      throw badRequest(undefined, {
        exchangeMethod: "올바른 교환 희망 제작 방식을 선택해주세요.",
      });
    }

    // 교환 희망 장르 검증
    if (
      Object.hasOwn(body, "exchangeGenre") &&
      !GENRES.includes(body.exchangeGenre)
    ) {
      throw badRequest(undefined, {
        exchangeGenre: "올바른 교환 희망 장르를 선택해주세요.",
      });
    }

    // 교환 희망 설명 검증
    if (Object.hasOwn(body, "exchangeDescription")) {
      if (
        typeof body.exchangeDescription !== "string" ||
        body.exchangeDescription.length > EXCHANGE_DESCRIPTION_MAX
      ) {
        throw badRequest(undefined, {
          exchangeDescription: `교환 희망 설명은 ${EXCHANGE_DESCRIPTION_MAX}자 이하여야 합니다.`,
        });
      }
    }

    await this.runInTransaction(async (tx) => {
      // 판매글을 잠가 동시에 수량이 수정되지 않게 합니다.
      const listing = await this.saleListingRepository.findByIdForUpdate(
        id,
        tx,
      );

      if (!listing) {
        throw notFound("판매글을 찾을 수 없습니다.");
      }

      if (listing.sellerId !== userId) {
        throw forbidden("본인의 판매글만 수정할 수 있습니다.");
      }

      if (listing.status !== "ON_SALE") {
        throw conflict("판매 중인 판매글만 수정할 수 있습니다.");
      }

      const changes = {};

      // 가격 및 교환 희망 정보 변경
      const simpleFields = [
        "price",
        "exchangeMethod",
        "exchangeGenre",
        "exchangeDescription",
      ];

      for (const field of simpleFields) {
        if (Object.hasOwn(body, field) && body[field] !== listing[field]) {
          changes[field] = body[field];
        }
      }

      // 판매 수량 변경
      if (
        Object.hasOwn(body, "quantity") &&
        body.quantity !== listing.remainingQuantity
      ) {
        const difference = body.quantity - listing.remainingQuantity;

        const nextSaleQuantity = listing.saleQuantity + difference;

        if (
          !Number.isSafeInteger(nextSaleQuantity) ||
          nextSaleQuantity < 1 ||
          nextSaleQuantity > POSTGRES_INT_MAX
        ) {
          throw conflict("변경할 수 있는 판매 수량 범위를 초과했습니다.");
        }

        if (difference > 0) {
          // 수량 증가
          // HELD 카드를 추가로 ON_SALE 처리
          await this.stockService.reserveForSale(
            {
              sellerId: listing.sellerId,
              photoCardId: listing.photoCardId,
              quantity: difference,
              listingId: id,
            },
            tx,
          );
        } else {
          // 수량 감소
          // 초과된 판매 카드를 HELD로 복구
          const releasedCount =
            await this.cardItemRepository.releaseFromSaleListing(
              id,
              listing.sellerId,
              Math.abs(difference),
              tx,
            );

          if (releasedCount !== Math.abs(difference)) {
            throw conflict("판매 카드 수량이 일치하지 않습니다.");
          }
        }

        changes.saleQuantity = nextSaleQuantity;
        changes.remainingQuantity = body.quantity;
      }

      // 변경된 내용이 없다면 저장하거나 알리지 않습니다.
      if (Object.keys(changes).length === 0) {
        return;
      }

      // 판매 정보 수정
      await this.saleListingRepository.updateById(id, changes, tx);

      // 대기 중인 교환 제안자에게 수정 알림
      const offers = await this.exchangeOfferRepository.findByListingId(id, {
        tx,
      });

      const offererIds = new Set(offers.map((offer) => offer.offererId));

      for (const offererId of offererIds) {
        await this.notificationService.notify(
          {
            userId: offererId,
            type: "LISTING_UPDATED",
            message: "교환을 제안한 판매글의 정보가 수정되었습니다.",
            link: `/marketplace/${id}`,
          },
          tx,
        );
      }
    });

    return this.getMarketDetail(String(id));
  }

  // ========================================
  // 5. 판매 취소
  // ========================================

  async cancel(userId, rawId) {
    const id = parseListingId(rawId);

    await this.runInTransaction(async (tx) => {
      // 판매글 잠금
      const listing = await this.saleListingRepository.findByIdForUpdate(
        id,
        tx,
      );

      if (!listing) {
        throw notFound("판매글을 찾을 수 없습니다.");
      }

      if (listing.sellerId !== userId) {
        throw forbidden("본인의 판매글만 취소할 수 있습니다.");
      }

      if (listing.status !== "ON_SALE") {
        throw conflict("판매 중인 판매글만 취소할 수 있습니다.");
      }

      // 대기 중인 교환 제안 조회
      const offers = await this.exchangeOfferRepository.findByListingId(id, {
        tx,
      });

      // 교환 제안 자동 거절 및 제시 카드 복구
      for (const offer of offers) {
        const updatedCount =
          await this.exchangeOfferRepository.updateStatusIfPending(
            offer.id,
            "REJECTED",
            tx,
          );

        if (updatedCount !== 1) {
          throw conflict("교환 제안 상태가 변경되었습니다.");
        }

        const restoredCount =
          await this.exchangeOfferCardRepository.restoreFromOffer(
            offer.offeredCardItemId,
            offer.offererId,
            offer.id,
            tx,
          );

        if (restoredCount !== 1) {
          throw conflict("교환 제시 카드를 복구할 수 없습니다.");
        }

        // 판매 취소로 교환 제안이 자동 거절되었음을 알림
        await this.notificationService.notify(
          {
            userId: offer.offererId,
            type: "OFFER_REJECTED",
            message: "판매가 취소되어 교환 제안이 거절되었습니다.",
            link: "/marketplace",
          },
          tx,
        );
      }

      // 남은 판매 카드를 보유 상태로 복구
      const restoredSaleCount =
        await this.cardItemRepository.restoreFromSaleListing(
          id,
          listing.sellerId,
          tx,
        );

      if (restoredSaleCount !== listing.remainingQuantity) {
        throw conflict("판매 카드 수량이 일치하지 않습니다.");
      }

      // 판매글 취소 상태로 변경
      await this.saleListingRepository.updateById(
        id,
        {
          status: "CANCELED",
        },
        tx,
      );
    });
  }
}
