import { Router } from "express";
import { createAuthRouter } from "./auth.router.js";
import { createUserRouter } from "./user.router.js";
import { createNotificationRouter } from "./notification.router.js";

export const createApiRouter = ({
  requireAuth,
  userController,
  authController,
  notificationController,
}) =>
  Router()
    .use("/auth", createAuthRouter({ authController }))
    .use("/users", createUserRouter({ userController, requireAuth }))
    .use(
      "/notifications",
      createNotificationRouter({ notificationController, requireAuth }),
    );
