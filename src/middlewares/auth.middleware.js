import { unauthorized } from "#utils/http-error.js";
import { verifyToken } from "#utils/token.js";

export const createRequireAuth =
  ({ userRepository }) =>
  async (req, _res, next) => {
    const token = req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    const payload = verifyToken(token);
    const user = payload && (await userRepository.findById(payload.userId));

    if (!user || user.deletedAt) throw unauthorized();

    req.userId = user.id;
    next();
  };
