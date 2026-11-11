import { Router } from "express";

// POST /api/sale-listings/:id/purchases
export const createPurchaseRouter = ({ purchaseController, requireAuth }) =>
  Router().post("/:id/purchases", requireAuth, purchaseController.create);

// GET /api/purchases
// GET /api/purchases/:id
export const createPurchaseHistoryRouter = ({
  purchaseController,
  requireAuth,
}) =>
  Router()
    .get("/", requireAuth, purchaseController.getMyPurchases)
    .get("/:id", requireAuth, purchaseController.getMyPurchaseById);
