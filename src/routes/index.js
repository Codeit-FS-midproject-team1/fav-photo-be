import { Router } from "express";
import { createUserRouter } from "./user.router.js";

export const createApiRouter = ({ requireAuth, userController }) =>
  Router().use("/users", createUserRouter({ userController, requireAuth }));
