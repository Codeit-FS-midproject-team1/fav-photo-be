import { badRequest, notFound } from "#utils/http-error.js";
import { parsePage } from "#utils/pagination.js";
import {
  SALE_PRICE_MIN,
  SALE_PRICE_MAX,
  EXCHANGE_DESCRIPTION_MAX,
  POSTGRES_INT_MAX,
} from "#utils/sale-listing.constants.js";

const METHODS = ["PHOTO", "CRAFT", "AI", "ETC"];
const GENRES = ["LANDSCAPE", "PORTRAIT", "ANIMAL", "PLANT", "OBJECT", "ETC"];
const SORTS = ["latest", "oldest", "priceLow", "priceHigh"];
const SOLD_OUT = ["true", "false"];
const FILTERS = ["method", "genre", "soldOut"];
const ONE_FILTER = "필터는 하나만 선택할 수 있습니다.";

const checkOneOf = (value, allowed, field) => {
  if (value !== undefined && !allowed.includes(value)) {
    throw badRequest(undefined, {
      [field]: `${allowed.join(", ")} 중 하나여야 합니다.`,
    });
  }
};

// 탈퇴한 사용자는 id 를 숨긴다
const toUser = ({ id, nickname, deletedAt }) =>
  deletedAt ? { id: null, nickname: "탈퇴한 사용자" } : { id, nickname };

// 기존 마켓 목록 응답 형식
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

// 상세 조회에서만 필요한 교환 희망 정보 추가
const toDetail = (listing) => ({
  ...toItem(listing),
  exchangeMethod: listing.exchangeMethod,
  exchangeGenre: listing.exchangeGenre,
  exchangeDescription: listing.exchangeDescription,
  updatedAt: listing.updatedAt
    ? new Date(listing.updatedAt).toISOString()
    : null,
});

export class SaleListingService {
  constructor({ saleListingRepository, stockService, runInTransaction }) {
    this.saleListingRepository = saleListingRepository;
    this.stockService = stockService;
    this.runInTransaction = runInTransaction;
  }

  // 기존 마켓 목록 조회
  async getMarketList(query) {
    const used = FILTERS.filter((key) => query[key] !== undefined);

    if (used.length > 1)
      throw badRequest(ONE_FILTER, { [used[1]]: ONE_FILTER });

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

    return { items: rows.map(toItem), totalCount };
  }

  // 판매글 상세 조회
  async getMarketDetail(id) {
    // 판매글 ID는 PostgreSQL int4 범위의 양의 정수만 허용한다.
    const parsedId = Number(id);

    if (
      typeof id !== "string" ||
      !/^[1-9]\d*$/.test(id) ||
      !Number.isSafeInteger(parsedId) ||
      parsedId > POSTGRES_INT_MAX
    ) {
      throw badRequest(undefined, {
        id: "올바른 판매글 번호가 아닙니다.",
      });
    }

    const listing =
      await this.saleListingRepository.findMarketDetailById(parsedId);

    if (!listing) {
      throw notFound("판매글을 찾을 수 없습니다.");
    }

    return toDetail(listing);
  }

  // 판매글 생성과 HELD 카드 예약을 하나의 트랜잭션에서 처리합니다.
  async create(userId, body) {
    const {
      photoCardId,
      saleQuantity,
      price,
      exchangeMethod,
      exchangeGenre,
      exchangeDescription,
    } = body ?? {};

    if (
      !Number.isSafeInteger(photoCardId) ||
      photoCardId < 1 ||
      photoCardId > POSTGRES_INT_MAX
    ) {
      throw badRequest(undefined, {
        photoCardId: "올바른 포토카드 ID가 필요합니다.",
      });
    }

    if (
      !Number.isSafeInteger(saleQuantity) ||
      saleQuantity < 1 ||
      saleQuantity > POSTGRES_INT_MAX
    ) {
      throw badRequest(undefined, {
        saleQuantity: "판매 수량은 1 이상의 정수여야 합니다.",
      });
    }

    if (
      !Number.isSafeInteger(price) ||
      price < SALE_PRICE_MIN ||
      price > SALE_PRICE_MAX
    ) {
      throw badRequest(undefined, {
        price: `판매 가격은 ${SALE_PRICE_MIN}~${SALE_PRICE_MAX}P 사이여야 합니다.`,
      });
    }

    if (!METHODS.includes(exchangeMethod)) {
      throw badRequest(undefined, {
        exchangeMethod: "올바른 교환 희망 제작 방식을 선택해주세요.",
      });
    }

    if (!GENRES.includes(exchangeGenre)) {
      throw badRequest(undefined, {
        exchangeGenre: "올바른 교환 희망 장르를 선택해주세요.",
      });
    }

    if (
      typeof exchangeDescription !== "string" ||
      exchangeDescription.length > EXCHANGE_DESCRIPTION_MAX
    ) {
      throw badRequest(undefined, {
        exchangeDescription: `교환 희망 설명은 ${EXCHANGE_DESCRIPTION_MAX}자 이하여야 합니다.`,
      });
    }

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
}
