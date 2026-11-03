export class AuthRepository {
  constructor(db) {
    this.db = db;
  }

  #model(tx) {
    return (tx ?? this.db).orm.public.User;
  }

  #refreshTokenModel(tx) {
    return (tx ?? this.db).orm.public.RefreshToken;
  }

  findByEmail(email) {
    return this.#model().where({ email }).first();
  }

  findByNickname(nickname) {
    return this.#model().where({ nickname }).first();
  }

  createUser({ email, nickname, password }) {
    return this.#model().create({ email, nickname, password });
  }

  createRefreshToken({ userId, tokenHash, expiresAt }, tx) {
    return this.#refreshTokenModel(tx).create({
      userId,
      tokenHash,
      expiresAt,
    });
  }

  findRefreshTokenByHash(tokenHash) {
    return this.#refreshTokenModel().where({ tokenHash }).first();
  }

  deleteRefreshTokenByHash(tokenHash) {
    return this.#refreshTokenModel().where({ tokenHash }).delete();
  }
}
