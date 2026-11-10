const SORT = {
  latest: [(l) => l.createdAt.desc(), (l) => l.id.desc()],
  oldest: [(l) => l.createdAt.asc(), (l) => l.id.asc()],
  priceLow: [(l) => l.price.asc(), (l) => l.id.desc()],
  priceHigh: [(l) => l.price.desc(), (l) => l.id.desc()],
};

// 검색어의 %, _ 를 글자 그대로 찾게 합니다.
const escapeLike = (text) => text.replace(/[\\%_]/g, "\\$&");

export class SaleListingRepository {
  constructor(db) {
    this.db = db;
  }

  #model(tx) {
    return (tx ?? this.db).orm.public.SaleListing;
  }

  // 판매글 생성은 재고 변경과 같은 트랜잭션에서 처리합니다.
  create(data, tx) {
    if (!tx) {
      throw new Error("판매 등록에는 트랜잭션이 필요합니다.");
    }

    return this.#model(tx).create(data);
  }

  // 재고 변경 전 판매글 행을 잠급니다.
  findByIdForUpdate(id, tx) {
    if (!tx) {
      throw new Error("재고 조회에는 트랜잭션이 필요합니다.");
    }

    return this.#model(tx).where({ id }).forUpdate().first();
  }

  // 남은 판매 수량과 상태를 변경합니다.
  updateById(id, data, tx) {
    if (!tx) {
      throw new Error("재고 변경에는 트랜잭션이 필요합니다.");
    }

    return this.#model(tx).where({ id }).update(data);
  }

  // 목록과 개수 조회에 동일한 필터를 사용합니다.
  #market({ keyword, method, genre, soldOut }) {
    let query = this.#model().where((l) => l.status.neq("CANCELED"));

    if (keyword) {
      const pattern = `%${escapeLike(keyword)}%`;

      query = query.where((l) =>
        l.photoCard.some((p) => p.name.ilike(pattern)),
      );
    }

    if (method) {
      query = query.where((l) => l.photoCard.some({ method }));
    }

    if (genre) {
      query = query.where((l) => l.photoCard.some({ genre }));
    }

    if (soldOut !== undefined) {
      query = query.where({
        status: soldOut ? "SOLD_OUT" : "ON_SALE",
      });
    }

    return query;
  }

  // 기존 마켓 판매글 목록 조회
  findMarketList(filters, { sort, offset, limit }) {
    return this.#market(filters)
      .include("seller")
      .include("photoCard", (card) => card.include("creator"))
      .orderBy(SORT[sort])
      .offset(offset)
      .limit(limit)
      .all();
  }

  // 기존 마켓 판매글 개수 조회
  async countMarketList(filters) {
    const { count } = await this.#market(filters).aggregate((agg) => ({
      count: agg.count(),
    }));

    return count;
  }

  // 기존 마켓 판매글 상세 조회
  findMarketDetailById(id) {
    return this.#model()
      .where({ id })
      .where((listing) => listing.status.neq("CANCELED"))
      .include("seller")
      .include("photoCard", (card) => card.include("creator"))
      .first();
  }
}
