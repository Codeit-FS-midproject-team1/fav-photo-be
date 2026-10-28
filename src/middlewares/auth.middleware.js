import { unauthorized } from "../utils/http-error.js";
import { verifyToken } from "../utils/token.js";

// 로그인할 때 토큰을 jwt.sign({ userId }, JWT_ACCESS_SECRET)처럼 userId라는 이름으로 만들어야 이 미들웨어와 맞아요. 쿠키 이름도 명세대로 token이에요

export const createRequireAuth =
  ({ userRepository }) =>
  async (req, _res, next) => {
    const payload = verifyToken(req.cookies.token);
    const user = payload && (await userRepository.findById(payload.userId));
    if (!user || user.deletedAt) throw unauthorized();
    req.userId = user.id;
    next();
  };
