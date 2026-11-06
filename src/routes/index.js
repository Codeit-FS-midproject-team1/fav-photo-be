import { Router } from "express";
import { createAuthRouter } from "./auth.router.js";
import { createUserRouter } from "./user.router.js";

export const createApiRouter = ({
  requireAuth,
  userController,
  authController,
}) =>
  Router()
    .use("/auth", createAuthRouter({ authController }))
    .use("/users", createUserRouter({ userController, requireAuth }));