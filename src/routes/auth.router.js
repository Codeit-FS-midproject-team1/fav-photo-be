import { Router } from "express";
import { z } from "zod";
import {
  validateBody,
  validateParams,
} from "../middlewares/validate.middleware";
import { signupSchema, loginSchema } from '../schemas/auth.schema.js';

export const createAuthRouter = ({ authController }) =>
  Router()
    .post('/signup', validateBody(signupSchema), authController.signup)
    .post('/login', validateBody(loginSchema), authController.login)
    .post('/refresh', authController.refresh)
    .post('/logout', authController.logout);
