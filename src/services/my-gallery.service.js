import { badRequest } from "#utils/http-error.js";
import { parsePage } from "#utils/pagination.js";
import {
  PHOTO_CARD_METHODS as METHODS,
  PHOTO_CARD_GENRES as GENRES,
} from "#app/constants/photo-card.js";

const SORTS = ["LATEST", "OLDEST", "PRICE_ASC", "PRICE_DESC"];

// 값이 있는데 허용 목록에 없으면 400
const checkOneOf = (value, allowed, message) => {
  if (value !== undefined && !allowed.includes(value)) {
    throw badRequest(message);
  }
};

// 탈퇴한 사용자는 id 를 숨긴다 (마켓 목록과 같은 규칙)
const toUser = ({ id, nickname, deletedAt }) =>
  deletedAt ? { id: null, nickname: "탈퇴한 사용자" } : { id, nickname };

// DB 한 줄 → 응답 items[] 한 줄
const toItem = (row) => ({
  photoCard: {
    id: row.id,
    name: row.name,
    description: row.description,
    method: row.method,
    genre: row.genre,
    price: row.price,
    totalQuantity: row.totalQuantity,
    imageUrl: row.imageUrl,
    creator: toUser(row.creator),
    createdAt: new Date(row.createdAt).toISOString(),
  },
  quantity: row.cardItems.quantity,
  latestAcquiredAt: new Date(row.cardItems.latestAcquiredAt).toISOString(),
});

// 정렬 비교 함수. 값이 같으면 photo_cards.id 오름차순
const time = (item) => new Date(item.latestAcquiredAt).getTime();
const byId = (a, b) => a.photoCard.id - b.photoCard.id;
const COMPARE = {
  LATEST: (a, b) => time(b) - time(a) || byId(a, b),
  OLDEST: (a, b) => time(a) - time(b) || byId(a, b),
  PRICE_ASC: (a, b) => a.photoCard.price - b.photoCard.price || byId(a, b),
  PRICE_DESC: (a, b) => b.photoCard.price - a.photoCard.price || byId(a, b),
};

export class MyGalleryService {
  constructor({ photoCardRepository }) {
    this.photoCardRepository = photoCardRepository;
  }

  async getMyCards(userId, query) {
    // 1) 쿼리 검사
    checkOneOf(query.method, METHODS, "올바른 제작 방식을 선택해주세요.");
    checkOneOf(query.genre, GENRES, "올바른 장르를 선택해주세요.");
    checkOneOf(query.sort, SORTS, "올바른 정렬 기준을 선택해주세요.");
    if (query.keyword !== undefined && typeof query.keyword !== "string") {
      throw badRequest("올바른 검색어를 입력해주세요.");
    }

    const keyword = query.keyword?.trim();
    const { page, pageSize, offset } = parsePage(query, {
      defaultSize: 10,
      maxSize: 50,
    });

    /// 2) DB 조회: 내 보유 카드 전체 (summary 는 필터와 상관없이 센다)
    const rows = await this.photoCardRepository.findHeldByOwner(userId, {});
    const all = rows.map(toItem);

    // 3) 제작 방식별 종류 수
    const methodCounts = Object.fromEntries(
      METHODS.map((method) => [method, 0]),
    );
    for (const item of all) methodCounts[item.photoCard.method] += 1;

    // 4) 검색어·장르·제작 방식 필터 → 정렬 → 페이지 자르기
    const lowerKeyword = keyword?.toLowerCase();
    const filtered = all.filter(
      (item) =>
        (!lowerKeyword ||
          item.photoCard.name.toLowerCase().includes(lowerKeyword)) &&
        (!query.genre || item.photoCard.genre === query.genre) &&
        (!query.method || item.photoCard.method === query.method),
    );
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
