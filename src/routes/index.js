import { Router } from "express";
import { createAuthRouter } from "./auth.router.js";
import { createUserRouter } from "./user.router.js";
import { createPhotoCardRouter } from "./photo-card.router.js";
import { createNotificationRouter } from "./notification.router.js";
import { createSaleListingRouter } from "./sale-listing.router.js";

export const createApiRouter = ({
  requireAuth,
  userController,
  authController,
  photoCardController,
  uploadImage,
  notificationController,
  saleListingController,
}) =>
  Router()
    .use("/auth", createAuthRouter({ authController }))
    .use("/users", createUserRouter({ userController, requireAuth }))
    .use(
      "/photo-cards",
      createPhotoCardRouter({ photoCardController, requireAuth, uploadImage }),
    )
    .use(
      "/notifications",
      createNotificationRouter({ notificationController, requireAuth }),
    )
    .use(
      "/sale-listings",
      createSaleListingRouter({ saleListingController, requireAuth }),
    );
