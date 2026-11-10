import { Router } from "express";

export const createSaleListingRouter = ({
  saleListingController,
  requireAuth,
}) =>
  Router()
    .get("/", requireAuth, saleListingController.getMarketList)
    .post("/", requireAuth, saleListingController.create)
    .get("/:id", requireAuth, saleListingController.getMarketDetail);
