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

  findByNickname(nickname, tx) {
    return this.#model(tx).where({ nickname }).first();
  }

  patchNickname(userId, nickname, tx) {
    return this.#model(tx).where({ id: userId }).update({ nickname });
  }

  patchPassword(userId, password, tx) {
    return this.#model(tx).where({ id: userId }).update({ password });
  }
}
