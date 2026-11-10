import { Router } from "express";

// index.js 에서 /users/me/sales 에 연결
export const createMySalesRouter = ({ mySalesController, requireAuth }) =>
  Router().get("/", requireAuth, mySalesController.getMySales);
