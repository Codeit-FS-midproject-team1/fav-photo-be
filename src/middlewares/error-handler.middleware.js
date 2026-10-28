import { HttpError } from "../utils/http-error.js";

// 없는 경로
export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: "요청한 주소를 찾을 수 없습니다." });
};

// 모든 에러 응답은 여기서만 만든다: { message, fields? }
export const errorHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    return res
      .status(err.status)
      .json({
        message: err.message,
        ...(err.fields && { fields: err.fields }),
      });
  }
  // express.json() 이 깨진 JSON 을 받은 경우
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "요청 형식이 올바르지 않습니다." });
  }
  // 동시에 같은 값으로 가입하는 등 UNIQUE 제약 위반 → 500 이 아니라 409
  if (err.sqlState === "23505") {
    return res.status(409).json({ message: "이미 사용 중인 값입니다." });
  }
  console.error(err);
  res.status(500).json({ message: "서버 오류가 발생했습니다." });
};
