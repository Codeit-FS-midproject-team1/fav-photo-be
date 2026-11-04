import { swaggerUi, swaggerSpec } from './swagger/swagger.js';
import express from "express";
import cookieParser from "cookie-parser";
import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/error-handler.middleware.js";
import { apiRouter } from "./container.js";

export const app = express();

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api", apiRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 이 두 줄은 항상 모든 라우트보다 아래에 있어야함. 위에 있으면 모든 요청이 404가 됨.
app.use(notFoundHandler);
app.use(errorHandler);
