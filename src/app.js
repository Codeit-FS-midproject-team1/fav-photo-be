import { swaggerUi, swaggerSpec } from "#swagger/swagger.js";
import express from "express";
import cookieParser from "cookie-parser";
import {
  errorHandler,
  notFoundHandler,
} from "#middlewares/error-handler.middleware.js";
import { apiRouter } from "./container.js";
import cors from "cors";

export const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("🎴 최애의 포토 서버가 작동 중일걸요?");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api", apiRouter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/googlee08d96ded12043f0.html", (_req, res) => {
  res.sendFile("googlee08d96ded12043f0.html", { root: "public" });
});
// 이 두 줄은 항상 모든 라우트보다 아래에 있어야함. 위에 있으면 모든 요청이 404가 됨.
app.use(notFoundHandler);
app.use(errorHandler);
