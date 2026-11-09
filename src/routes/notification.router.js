import { Router } from "express";

export const createNotificationRouter = ({
  notificationController,
  requireAuth,
}) =>
  Router()
    .get("/", requireAuth, notificationController.getNotifications)
    .patch("/:id/read", requireAuth, notificationController.markRead);
