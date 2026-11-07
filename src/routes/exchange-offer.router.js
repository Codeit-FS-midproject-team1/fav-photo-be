import { Router } from "express";

export const createExchangeOfferRouter = ({
  exchangeOfferController,
  requireAuth,
}) => {
  return Router()
    .get(
      "/:id/offers",
      requireAuth,
      exchangeOfferController.getOffersByListingId,
    )
    .post("/:id/offers", requireAuth, exchangeOfferController.createOffer);
};

export const createExchangeOfferActionRouter = ({
  exchangeOfferController,
  requireAuth,
}) => {
  return Router()
    .delete("/:id", requireAuth, exchangeOfferController.cancelOffer)
    .post("/:id/reject", requireAuth, exchangeOfferController.rejectOffer);
};
