import { Router } from "express";
import { createAuthRouter } from "./auth.router.js";
import { createUserRouter } from "./user.router.js";
import { createExchangeOfferRouter } from "./exchange-offer.router.js";

export const createApiRouter = ({
  requireAuth,
  userController,
  authController,
  exchangeOfferController,
}) =>
  Router()
    .use("/auth", createAuthRouter({ authController }))
    .use("/users", createUserRouter({ userController, requireAuth }))
    .use(
      "/sale-listings",
      createExchangeOfferRouter({ exchangeOfferController, requireAuth }),
    );
