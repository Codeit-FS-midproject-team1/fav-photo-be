import jwt from "jsonwebtoken";

// 토큰이 없거나 위조·만료됐으면 null
export const verifyToken = (token) => {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch {
    return null;
  }
};
