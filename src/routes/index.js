import { Router } from "express";
import { createUserRouter } from "./user.router.js";
import { createExchangeOfferRouter } from "./exchange-offer.router.js";

export const createApiRouter = ({
  requireAuth,
  userController,
  exchangeOfferController,
}) =>
  Router()
    .use("/users", createUserRouter({ userController, requireAuth }))
    .use(
      "/sale-listings",
      createExchangeOfferRouter({ exchangeOfferController, requireAuth }),
    );
