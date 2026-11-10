import { Router } from "express";

export const createSaleListingRouter = ({
  saleListingController,
  requireAuth,
}) =>
  Router()
    .get("/", requireAuth, saleListingController.getMarketList)
    .get("/:id", requireAuth, saleListingController.getMarketDetail);
