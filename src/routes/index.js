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
    // 3. 포토카드 API
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
    // 4. 알림 API
    // ========================================
    .use(
      "/notifications",
      createNotificationRouter({
        notificationController,
        requireAuth,
      }),
    )

    // ========================================
    // 5. 판매 API
    // ========================================
    .use(
      "/sale-listings",
      createSaleListingRouter({
        saleListingController,
        requireAuth,
      }),
    )

    // ========================================
    // 6. 교환 제안 생성·조회 API
    // ========================================
    .use(
      "/sale-listings",
      createExchangeOfferRouter({
        exchangeOfferController,
        requireAuth,
      }),
    )

    // ========================================
    // 7. 교환 제안 처리 API
    // ========================================
    .use(
      "/offers",
      createExchangeOfferActionRouter({
        exchangeOfferController,
        requireAuth,
      }),
    )

    // ========================================
    // 8. 구매 POST API
    // POST /api/sale-listings/:id/purchases
    // ========================================
    .use(
      "/sale-listings",
      createPurchaseRouter({
        purchaseController,
        requireAuth,
      }),
    )

    // ========================================
    // 9. 구매 내역 조회 API
    // GET /api/purchases
    // GET /api/purchases/:id
    // ========================================
    .use(
      "/purchases",
      createPurchaseHistoryRouter({
        purchaseController,
        requireAuth,
      }),
    );
