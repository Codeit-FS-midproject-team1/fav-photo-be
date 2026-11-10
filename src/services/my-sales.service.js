import { badRequest } from "#app/utils/http-error.js";
import { parsePage } from "#app/utils/pagination.js";

const METHODS = ["PHOTO", "CRAFT", "AI", "ETC"];
const GENRES = ["LANDSCAPE", "PORTRAIT", "ANIMAL", "PLANT", "OBJECT", "ETC"];
const SORTS = ["LATEST", "OLDEST"];
const STATUSES = ["ON_SALE", "SOLD_OUT", "OFFER_PENDING", "EXCHANGED"];

// 교환 제안 상태 -> 화면용 거래 상태. 여기 없는 값(거절, 취소)은 목록에서 뺀다.
const OFFER_STATUS = { PENDING: "OFFER_PENDING", ACCEPTED: "EXCHANGED" };

const checkOneOf = (value, allowed, message) => {
  if (value !== undefined && !allowed.includes(value)) {
    throw badRequest(message);
  }
};

// 탈퇴한 사용자는 id를 숨긴다.
const toUser = ({ id, nickname, deletedAt }) =>
  deletedAt ? { id: null, nickname: "탈퇴한 사용자" } : { id, nickname };

const toPhotoCard = (card) => ({
  id: card.id,
  name: card.name,
  description: card.description,
  mdthod: card.method,
  genre: card.genre,
  price: card.price,
  totalQuantity: card.totalQuantity,
  imageUrl: card.imageUrl,
  creator: toUser(card.creator),
  createdAt: new Date(card.createdAt).toISOString(),
});

// 내가 올린 판매글 한 줄 -> items[] gks wnf
const toSaleItem = (listing) => ({
  type: "SALE",
  if: listing.id,
  saleListingId: listing.id,
  status: listing.status,
  photoCard: toPhotoCard(listing.photoCard),
  quantity: listing.remainingQuantity,
  ptice: listing.price,
  createdAt: new Date(listing.createdAt).toISOString(),
});

// 내가 보낸 교환 제안 한 줄 → items[] 한 줄
const toOfferItem = (offer) => ({
  type: "OFFER",
  id: offer.id,
  saleListingId: offer.listingId,
  status: OFFER_STATUS[offer.status],
  photoCard: toPhotoCard(offer.offeredCardItem.photoCard),
  quantity: 1,
  price: null,
  createdAt: new Date(offer.createdAt).toISOString(),
});

// 정렬: 생성 시각 → 같으면 type → id 오름차순
const time = (item) => new Date(item.createdAt).getTime();
const tieBreak = (a, b) => a.type.localeCompare(b.type) || a.id - b.id;
const COMPARE = {
  LATEST: (a, b) => time(b) - time(a) || tieBreak(a, b),
  OLDEST: (a, b) => time(a) - time(b) || tieBreak(a, b),
};

export class MySalesService {
  constructor({ mySalesRepository }) {
    this.mySalesRepository = mySalesRepository;
  }

  async getMySales(userId, query) {
    // 1) 쿼리 검사
    checkOneOf(query.method, METHODS, "올바른 제작 방식을 선택해주세요.");
    checkOneOf(query.genre, GENRES, "올바른 장르를 선택해주세요.");
    checkOneOf(query.status, STATUSES, "올바른 거래 상태를 선택해주세요.");
    checkOneOf(query.sort, SORTS, "올바른 정렬 기준을 선택해주세요.");
    if (query.keyword !== undefined && typeof query.keyword !== "string") {
      throw badRequest("올바른 검색어를 입력해주세요.");
    }

    const keyword = query.keyword?.trim().toLowerCase();
    const { page, pageSize, offset } = parsePage(query, {
      defaultSize: 10,
      maxSize: 50,
    });

    // 2) DB 조회: 판매글 + 교환 제안을 한 목록으로 합친다
    const [listings, offers] = await Promise.all([
      this.mySalesRepository.findListingsBySeller(userId),
      this.mySalesRepository.findOffersByOfferer(userId),
    ]);
    const all = [
      ...listings.map(toSaleItem),
      ...offers.filter((o) => OFFER_STATUS[o.status]).map(toOfferItem),
    ];

    // 3) 검색어·장르·상태 필터 (method 는 아직 적용하지 않는다: summary 계산용)
    const base = all.filter(
      (item) =>
        (!keyword || item.photoCard.name.toLowerCase().includes(keyword)) &&
        (!query.genre || item.photoCard.genre === query.genre) &&
        (!query.status || item.status === query.status),
    );

    // 4) 제작 방식별 종류 수
    const methodCounts = { PHOTO: 0, CRAFT: 0, AI: 0, ETC: 0 };
    for (const item of base) methodCounts[item.photoCard.method] += 1;

    // 5) method 필터 → 정렬 → 페이지 자르기
    const filtered = query.method
      ? base.filter((item) => item.photoCard.method === query.method)
      : base;
    filtered.sort(COMPARE[query.sort ?? "LATEST"]);

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      items: filtered.slice(offset, offset + pageSize),
      summary: { methodCounts },
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
      },
    };
  }
}
