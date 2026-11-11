import { Router } from "express";

// index.js 에서 /users/me/cards 에 연결
export const createMyGalleryRouter = ({ myGalleryController, requireAuth }) =>
  Router().get("/", requireAuth, myGalleryController.getMyCards);
