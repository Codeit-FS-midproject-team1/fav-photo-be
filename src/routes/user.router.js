import { Router } from 'express';

export const createUserRouter = ({ userController, requireAuth }) =>
  Router().get('/me', requireAuth, userController.getMe);
