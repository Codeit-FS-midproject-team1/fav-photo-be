import { Router } from "express";
import { createAuthRouter } from "./auth.router.js";
import { createUserRouter } from "./user.router.js";
import { createSaleListingRouter } from "./sale-listing.router.js";

export const createApiRouter = ({
  requireAuth,
  userController,
  authController,
  saleListingController,
}) =>
  Router()
    .use("/auth", createAuthRouter({ authController }))
    .use("/users", createUserRouter({ userController, requireAuth }))
    .use(
      "/sale-listings",
      createSaleListingRouter({ saleListingController, requireAuth }),
    );
