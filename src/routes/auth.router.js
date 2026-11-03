import { Router } from "express";

export const createAuthRouter = ({ authController }) =>
  Router()
    .post("/signup", authController.signup)
    .post("/login", authController.login)
    .post("/refresh", authController.refresh)
    .post("/logout", authController.logout);
