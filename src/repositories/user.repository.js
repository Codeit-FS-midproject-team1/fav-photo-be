export class UserRepository {
  constructor(db) {
    this.db = db;
  }

  // 트랜잭션 안이면 tx, 아니면 db 로 쿼리
  #model(tx) {
    return (tx ?? this.db).orm.public.User;
  }

  findById(id, tx) {
    return this.#model(tx).where({ id }).first();
  }
}
