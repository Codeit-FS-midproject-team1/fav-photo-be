import { app } from "./app.js";

const PORT = process.env.PORT ?? 4000;

if (!process.env.JWT_ACCESS_SECRET?.trim()) {
  throw new Error('JWT_ACCESS_SECRET 환경 변수가 필요합니다.');
}

app.listen(PORT, () => {
  console.log(`서버 실행: http://localhost:${PORT}`);
});
