import { Router } from "express";
import { createAuthRouter } from "./auth.router.js";
import { createUserRouter } from "./user.router.js";
import { createExchangeOfferRouter } from "./exchange-offer.router.js";
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
  exchangeOfferController,
}) =>
  Router()
    .use("/auth", createAuthRouter({ authController, requireAuth }))
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
    )
    .use(
      "/sale-listings",
      createExchangeOfferRouter({ exchangeOfferController, requireAuth }),
    );
