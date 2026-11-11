export class TradeRepository {
  constructor(db) {
    this.db = db;
  }

  #model(tx) {
    return (tx ?? this.db).orm.public.Trade;
  }

  // 기존 구매·교환 거래 기록 생성
  create(data, tx) {
    if (!tx) {
      throw new Error("거래 기록 생성에는 트랜잭션이 필요합니다.");
    }

    return this.#model(tx).create(data);
  }

  // 로그인한 사용자의 구매 내역 목록 조회
  findPurchasesByBuyer({ buyerId, limit, cursor = null }, tx) {
    let query = this.#model(tx)
      .where({
        type: "PURCHASE",
        counterpartId: buyerId,
      })
      .include("photoCard")
      .orderBy((trade) => trade.id.desc());

    // 이전 페이지의 마지막 거래 ID보다 작은 기록 조회
    if (cursor !== null) {
      query = query.where((trade) => trade.id.lt(cursor));
    }

    // 다음 페이지 존재 여부 확인을 위해 1건 더 조회
    return query.limit(limit + 1).all();
  }

  // 로그인한 사용자의 구매 거래 상세 조회
  findPurchaseById(tradeId, buyerId, tx) {
    return this.#model(tx)
      .where({
        id: tradeId,
        type: "PURCHASE",
        counterpartId: buyerId,
      })
      .include("photoCard")
      .first();
  }
}
