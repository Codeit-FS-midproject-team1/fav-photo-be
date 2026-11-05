import { Router } from "express";
import { z } from 'zod';
import { validateBody, validateParams } from '#middlewares/validate.js';

export const createUserRouter = ({ userController, requireAuth }) =>
  Router().get("/me", requireAuth, userController.getMe);
