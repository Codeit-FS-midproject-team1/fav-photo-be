import { Router } from "express";
import { createAuthRouter } from "./auth.router.js";
import { createUserRouter } from "./user.router.js";
import {
  createExchangeOfferRouter,
  createExchangeOfferActionRouter,
} from "./exchange-offer.router.js";
import { createPhotoCardRouter } from "./photo-card.router.js";
import { createNotificationRouter } from "./notification.router.js";
import { createSaleListingRouter } from "./sale-listing.router.js";
import { createMyGalleryRouter } from "./my-gallery.router.js";
import { createRandomPointRouter } from "./random-point.router.js";

export const createApiRouter = ({
  requireAuth,
  userController,
  authController,
  photoCardController,
  uploadImage,
  notificationController,
  saleListingController,
  exchangeOfferController,
  myGalleryController,
  randomPointController,
}) =>
  Router()
    .use("/auth", createAuthRouter({ authController, requireAuth }))
    .use("/users", createUserRouter({ userController, requireAuth }))
    .use(
      "/users/me/cards",
      createMyGalleryRouter({ myGalleryController, requireAuth }),
    )
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
    )
    .use(
      "/offers",
      createExchangeOfferActionRouter({
        exchangeOfferController,
        requireAuth,
      }),
    )
    .use(
      "/random-points",
      createRandomPointRouter({
        randomPointController,
        requireAuth,
      }),
    );
