import multer from "multer";
import { badRequest } from "#utils/http-error.js";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.includes(file.mimetype)
      ? cb(null, true)
      : cb(badRequest("JPEG, PNG, WebP 형식의 이미지만 등록할 수 있습니다.")),
});

export const uploadImage = (req, res, next) =>
  upload.single("image")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE")
      return next(badRequest("이미지 크기는 10MB 이하여야 합니다."));
    if (err.code === "LIMIT_UNEXPECTED_FILE")
      return next(badRequest("올바른 이미지 필드가 아닙니다."));
    next(err);
  });
