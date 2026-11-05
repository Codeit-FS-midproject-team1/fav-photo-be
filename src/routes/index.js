import { Router } from "express";
import { createUserRouter } from "./user.router.js";
import { createNotificationRouter } from "./notification.router.js";

export const createApiRouter = ({
  requireAuth,
  userController,
  notificationController,
}) =>
  Router()
    .use("/users", createUserRouter({ userController, requireAuth }))
    .use(
      "/notifications",
      createNotificationRouter({ notificationController, requireAuth }),
    );
