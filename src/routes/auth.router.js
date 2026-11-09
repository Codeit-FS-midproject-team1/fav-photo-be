import { Router } from "express";
import { signupSchema, loginSchema } from "#schemas/auth.schema.js";
import { validateBody } from "#middlewares/validate.middleware.js";

export const createAuthRouter = ({ authController, requireAuth }) =>
  Router()
    .post("/signup", validateBody(signupSchema), authController.signup)
    .post("/login", validateBody(loginSchema), authController.login)
    .post("/refresh", authController.refresh)
    .post("/logout", requireAuth, authController.logout);