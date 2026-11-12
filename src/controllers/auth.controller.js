import { randomBytes } from "node:crypto";
import { URL, URLSearchParams } from "node:url";
import { OAuth2Client } from "google-auth-library";
import { badRequest, unauthorized } from "#utils/http-error.js";
import jwt from "jsonwebtoken";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

const isProduction = process.env.NODE_ENV === "production";
const sessionCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
};

export class AuthController {
  constructor({ authService }) {
    this.authService = authService;
  }

  signup = async (req, res) => {
    const result = await this.authService.signup(req.validated.body);
    res.status(201).json(result);
  };

  login = async (req, res) => {
    const { accessToken, refreshToken } = await this.authService.login(
      req.validated.body,
    );

    res.cookie("refreshToken", refreshToken, {
      ...sessionCookieOptions,
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  };

  refresh = async (req, res) => {
    const refreshCookie = req.cookies?.refreshToken;

    if (refreshCookie === undefined) {
      return res.status(204).end();
    }

    const { accessToken, refreshToken } =
      await this.authService.refresh(refreshCookie);

    res.cookie("refreshToken", refreshToken, {
      ...sessionCookieOptions,
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  };

  logout = async (req, res) => {
    await this.authService.logout(req.cookies?.refreshToken);

    res.clearCookie("refreshToken", {
      ...sessionCookieOptions,
      path: "/api/auth",
    });

    res.status(204).end();
  };

  google = (req, res) => {
    const state = randomBytes(32).toString("hex");
    const nonce = randomBytes(32).toString("hex");

    res.cookie(
      "googleOAuth",
      { state, nonce },
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/auth/google/callback",
        maxAge: 5 * 60 * 1000,
      },
    );

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: "openid email",
      state,
      nonce,
    }).toString();

    return res.redirect(url.toString());
  };

  googleCallback = async (req, res) => {
    const { code, state, error } = req.query;
    const oauth = req.cookies?.googleOAuth;

    res.clearCookie("googleOAuth", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google/callback",
    });

    if (error) throw badRequest("Google 로그인이 완료되지 않았습니다.");

    if (!oauth?.nonce || typeof state !== "string" || state !== oauth.state) {
      throw badRequest("로그인 요청이 만료되었거나 올바르지 않습니다.");
    }

    if (typeof code !== "string" || !code) {
      throw badRequest("Google 인증 코드가 없습니다.");
    }

    let profile;
    try {
      const { tokens } = await googleClient.getToken(code);
      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      profile = ticket.getPayload();
    } catch {
      throw unauthorized("Google 인증 정보를 확인할 수 없습니다.");
    }

    if (
      profile?.nonce !== oauth.nonce ||
      !profile.sub ||
      !profile.email ||
      profile.email_verified !== true
    ) {
      throw unauthorized("Google 계정 정보를 확인할 수 없습니다.");
    }

    const result = await this.authService.loginWithGoogle(profile);

    if (result.signupRequired) {
      const signupToken = jwt.sign(
        { sub: profile.sub, email: profile.email },
        process.env.GOOGLE_SIGNUP_SECRET,
        { expiresIn: "10m", audience: "google-signup" },
      );

      res.cookie("googleSignup", signupToken, {
        ...sessionCookieOptions,
        path: "/api/auth/google/signup",
        maxAge: 10 * 60 * 1000,
      });

      return res.redirect(
        new URL("/signup?mode=google", process.env.CLIENT_ORIGIN).href,
      );
    }

    res.cookie("refreshToken", result.refreshToken, {
      ...sessionCookieOptions,
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.redirect(process.env.CLIENT_ORIGIN);
  };

  googleSignup = async (req, res) => {
    const { nickname } = req.validated.body;
    const signupToken = req.cookies?.googleSignup;

    if (!signupToken) {
      throw unauthorized("Google 로그인을 다시 진행해 주세요.");
    }

    let profile;

    try {
      profile = jwt.verify(signupToken, process.env.GOOGLE_SIGNUP_SECRET, {
        algorithms: ["HS256"],
        audience: "google-signup",
      });
    } catch {
      throw unauthorized("가입 요청이 만료되었거나 올바르지 않습니다.");
    }

    if (typeof profile.sub !== "string" || typeof profile.email !== "string") {
      throw unauthorized("Google 계정 정보를 확인할 수 없습니다.");
    }

    const { accessToken, refreshToken, signupBonusPoints } =
      await this.authService.signupWithGoogle({
        googleId: profile.sub,
        email: profile.email,
        nickname,
      });

    res.clearCookie("googleSignup", {
      ...sessionCookieOptions,
      path: "/api/auth/google/signup",
    });

    res.cookie("refreshToken", refreshToken, {
      ...sessionCookieOptions,
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({ accessToken, signupBonusPoints });
  };
}
