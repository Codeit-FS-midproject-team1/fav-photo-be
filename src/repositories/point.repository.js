export class PointRepository {
  constructor(db) {
    this.db = db;
  }

  #model(tx) {
    return (tx ?? this.db).orm.public.User;
  }

  // 트랜잭션 중 사용자 행을 잠급니다.
  findByIdForUpdate(userId, tx) {
    if (!tx) {
      throw new Error("포인트 조회에는 트랜잭션이 필요합니다.");
    }

    return this.#model(tx).where({ id: userId }).forNoKeyUpdate().first();
  }

  // 잠근 사용자의 포인트를 변경합니다.
  updateBalance(userId, currentPoints, nextPoints, tx) {
    if (!tx) {
      throw new Error("포인트 변경에는 트랜잭션이 필요합니다.");
    }

    return this.#model(tx)
      .where({
        id: userId,
        points: currentPoints,
      })
      .updateAndCount({
        points: nextPoints,
      });
  }
}
