export class PointHistoryRepository {
  constructor(db) {
    this.db = db;
  }

  #model(tx) {
    return (tx ?? this.db).orm.public.PointHistory;
  }

  create(data, tx) {
    if (!tx) {
      throw new Error("포인트 내역 저장에는 트랜잭션이 필요합니다.");
    }

    return this.#model(tx).create(data);
  }
}
