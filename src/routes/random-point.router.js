import { Router } from "express";

export const createRandomPointRouter = ({
  randomPointController,
  requireAuth,
}) => Router().post("/draw", requireAuth, randomPointController.draw);
