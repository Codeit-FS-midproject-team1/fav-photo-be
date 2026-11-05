import { app } from "#app/app.js";

const PORT = process.env.PORT ?? 4000;

app.listen(PORT, () => {
  console.log(`서버 실행: http://localhost:${PORT}`);
});
