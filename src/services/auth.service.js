import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { conflict } from "../utils/http-error.js";
import { unauthorized } from "../utils/http-error.js";

export class AuthService {
  constructor({ authRepository, db }) {
    this.authRepository = authRepository;
    this.db = db;
  }

  async signup({ email, nickname, password }) {
    const emailUser = await this.authRepository.findByEmail(email);
    if (emailUser) throw conflict("이미 사용 중인 이메일입니다.");

    const nicknameUser = await this.authRepository.findByNickname(nickname);
    if (nicknameUser) throw conflict("이미 사용 중인 닉네임입니다.");

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.authRepository.createUser({
      email,
      nickname,
      password: hashedPassword,
    });

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
    };
  }

  async login({ email, password }) {
    const user = await this.authRepository.findByEmail(email);
    if (!user || !user.password || user.deletedAt) throw unauthorized();

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw unauthorized();

    return this.#issueTokens(user.id);
  }

  async loginWithGoogle({ sub, email }) {
    const user = await this.authRepository.findByGoogleId(sub);

    if (user) {
      if (user.deletedAt) throw unauthorized();

      const tokens = await this.#issueTokens(user.id);
      return { signupRequired: false, ...tokens };
    }

    const existingUser = await this.authRepository.findByEmail(email);
    if (existingUser) {
      throw conflict("기존 계정에 로그인한 뒤 Google 계정을 연결해 주세요.");
    }

    return { signupRequired: true };
  }

  async #issueTokens(userId, tx) {
    const accessToken = jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
      expiresIn: "15m",
    });

    const refreshToken = randomBytes(64).toString("hex");
    const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await this.authRepository.createRefreshToken(
      { userId, tokenHash, expiresAt },
      tx,
    );

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken) {
    if (!refreshToken) throw unauthorized();

    const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
    const storedToken =
      await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (!storedToken || new Date(storedToken.expiresAt) <= new Date()) {
      throw unauthorized();
    }

    const nextRefreshToken = randomBytes(64).toString("hex");
    const nextTokenHash = createHash("sha256")
      .update(nextRefreshToken)
      .digest("hex");
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const deletedToken =
      await this.authRepository.deleteRefreshTokenByHash(tokenHash);

    if (!deletedToken) throw unauthorized();

    await this.authRepository.createRefreshToken({
      userId: storedToken.userId,
      tokenHash: nextTokenHash,
      expiresAt,
    });

    const accessToken = jwt.sign(
      { userId: storedToken.userId },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" },
    );

    return { accessToken, refreshToken: nextRefreshToken };
  }

  async logout(refreshToken) {
    if (!refreshToken) return;

    const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
    await this.authRepository.deleteRefreshTokenByHash(tokenHash);
  }

  async signupWithGoogle({ googleId, email, nickname }) {
    if (await this.authRepository.findByGoogleId(googleId)) {
      throw conflict("이미 가입한 Google 계정입니다.");
    }

    if (await this.authRepository.findByEmail(email)) {
      throw conflict("이미 사용 중인 이메일입니다.");
    }

    if (await this.authRepository.findByNickname(nickname)) {
      throw conflict("이미 사용 중인 닉네임입니다.");
    }

    return this.db.transaction(async (tx) => {
      const user = await this.authRepository.createUser(
        { googleId, email, nickname, password: null },
        tx,
      );

      return this.#issueTokens(user.id, tx);
    });
  }
}
