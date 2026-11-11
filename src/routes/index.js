
import { Router } from "express";

import { createAuthRouter } from "./auth.router.js";
import { createUserRouter } from "./user.router.js";
import { createPhotoCardRouter } from "./photo-card.router.js";
import { createNotificationRouter } from "./notification.router.js";
import { createSaleListingRouter } from "./sale-listing.router.js";

import {
  createExchangeOfferRouter,
  createExchangeOfferActionRouter,
} from "./exchange-offer.router.js";

import {
  createPurchaseRouter,
  createPurchaseHistoryRouter,
} from "./purchase.router.js";

import { createMyGalleryRouter } from "./my-gallery.router.js";
import { createMySalesRouter } from "./my-sales.router.js";
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
  purchaseController,
  myGalleryController,
  mySalesController,
  randomPointController,
}) =>
  Router()
    // ========================================
    // 1. 인증 API
    // ========================================
    .use(
      "/auth",
      createAuthRouter({
        authController,
        requireAuth,
      }),
    )

    // ========================================
    // 2. 사용자 API
    // ========================================
    .use(
      "/users",
      createUserRouter({
        userController,
        requireAuth,
      }),
    )

    // ========================================
    // 3. 마이갤러리 API
    // ========================================
    .use(
      "/users/me/cards",
      createMyGalleryRouter({
        myGalleryController,
        requireAuth,
      }),
    )

    // ========================================
    // 4. 나의 판매 API
    // ========================================
    .use(
      "/users/me/sales",
      createMySalesRouter({
        mySalesController,
        requireAuth,
      }),
    )

    // ========================================
    // 5. 포토카드 API
    // ========================================
    .use(
      "/photo-cards",
      createPhotoCardRouter({
        photoCardController,
        requireAuth,
        uploadImage,
      }),
    )

    // ========================================
    // 6. 알림 API
    // ========================================
    .use(
      "/notifications",
      createNotificationRouter({
        notificationController,
        requireAuth,
      }),
    )

    // ========================================
    // 7. 판매 API
    // ========================================
    .use(
      "/sale-listings",
      createSaleListingRouter({
        saleListingController,
        requireAuth,
      }),
    )

    // ========================================
    // 8. 교환 제안 생성 및 조회 API
    // ========================================
    .use(
      "/sale-listings",
      createExchangeOfferRouter({
        exchangeOfferController,
        requireAuth,
      }),
    )

    // ========================================
    // 9. 교환 제안 처리 API
    // ========================================
    .use(
      "/offers",
      createExchangeOfferActionRouter({
        exchangeOfferController,
        requireAuth,
      }),
    )

    // ========================================
    // 10. 구매 API
    // ========================================
    .use(
      "/sale-listings",
      createPurchaseRouter({
        purchaseController,
        requireAuth,
      }),
    )

    // ========================================
    // 11. 기존 구매 조회 API
    // ========================================
    .use(
      "/purchases",
      createPurchaseHistoryRouter({
        purchaseController,
        requireAuth,
      }),
    )

    // ========================================
    // 12. 랜덤 포인트 API
    // ========================================
    .use(
      "/random-points",
      createRandomPointRouter({
        randomPointController,
        requireAuth,
      }),
    );
