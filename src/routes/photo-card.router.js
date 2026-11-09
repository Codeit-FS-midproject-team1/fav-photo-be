// import: Router, validateBody, 스키마
import { Router } from "express";
import { validateBody } from "#middlewares/validate.middleware.js";
import { createPhotoCardSchema } from "#schemas/photo-card.schema.js";

export const createPhotoCardRouter = ({
  photoCardController,
  requireAuth,
  uploadImage,
}) =>
  Router().post(
    "/",
    requireAuth,
    uploadImage,
    validateBody(createPhotoCardSchema),
    photoCardController.create,
  );
