import { Router } from "express";
import { createAuthRouter } from "./auth.router.js";
import { createUserRouter } from "./user.router.js";
import { createPhotoCardRouter } from "./photo-card.router.js";

export const createApiRouter = ({
  requireAuth,
  userController,
  authController,
  photoCardController,
  uploadImage,
}) =>
  Router()
    .use("/auth", createAuthRouter({ authController }))
    .use("/users", createUserRouter({ userController, requireAuth }))
    .use(
      "/photo-cards",
      createPhotoCardRouter({ photoCardController, requireAuth, uploadImage }),
    );
