import { Router } from "express";
import {
  patchNicknameSchema,
  patchPasswordSchema,
} from "#schemas/user.schema.js";
import { validateBody } from "#middlewares/validate.middleware.js";

export const createUserRouter = ({ userController, requireAuth }) =>
  Router()
    .get("/me", requireAuth, userController.getMe)
    .patch(
      "/me/nickname",
      requireAuth,
      validateBody(patchNicknameSchema),
      userController.patchNickname,
    )
    .patch(
      "/me/password",
      requireAuth,
      validateBody(patchPasswordSchema),
      userController.patchPassword,
    );
