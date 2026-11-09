const SORT = {
  latest: [(l) => l.createdAt.desc(), (l) => l.id.desc()],
  oldest: [(l) => l.createdAt.asc(), (l) => l.id.asc()],
  priceLow: [(l) => l.price.asc(), (l) => l.id.desc()],
  priceHigh: [(l) => l.price.desc(), (l) => l.id.desc()],
};

// 검색어의 %, _ 를 글자 그대로 찾게 한다
const escapeLike = (text) => text.replace(/[\\%_]/g, "\\$&");

export class SaleListingRepository {
  constructor(db) {
    this.db = db;
  }

  // 트랜잭션 안이면 tx, 아니면 db로 쿼리
  #model(tx) {
    return (tx ?? this.db).orm.public.SaleListing;
  }

  // 재고 변경 전 판매글 행을 잠가 동시 재고 차감을 방지한다.
  findByIdForUpdate(id, tx) {
    if (!tx) {
      throw new Error("재고 조회에는 트랜잭션이 필요합니다.");
    }

    return this.#model(tx).where({ id }).forUpdate().first();
  }

  // 동일한 트랜잭션에서 남은 판매 수량과 상태를 변경한다.
  updateById(id, data, tx) {
    if (!tx) {
      throw new Error("재고 변경에는 트랜잭션이 필요합니다.");
    }

    return this.#model(tx).where({ id }).update(data);
  }

  // 목록과 개수가 같은 조건을 쓰도록 한 곳에서 만든다. 취소된 판매글은 제외
  #market({ keyword, method, genre, soldOut }) {
    let query = this.#model().where((l) => l.status.neq("CANCELED"));

    if (keyword) {
      const pattern = `%${escapeLike(keyword)}%`;
      query = query.where((l) =>
        l.photoCard.some((p) => p.name.ilike(pattern)),
      );
    }

    if (method) query = query.where((l) => l.photoCard.some({ method }));
    if (genre) query = query.where((l) => l.photoCard.some({ genre }));

    if (soldOut !== undefined) {
      query = query.where({ status: soldOut ? "SOLD_OUT" : "ON_SALE" });
    }

    return query;
  }

  findMarketList(filters, { sort, offset, limit }) {
    return this.#market(filters)
      .include("seller")
      .include("photoCard", (card) => card.include("creator"))
      .orderBy(SORT[sort])
      .offset(offset)
      .limit(limit)
      .all();
  }

  async countMarketList(filters) {
    const { count } = await this.#market(filters).aggregate((agg) => ({
      count: agg.count(),
    }));

    return count;
  }
}
