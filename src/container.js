import { db } from "#prisma/db.js";
import { UserRepository } from "#repositories/user.repository.js";
import { UserService } from "#services/user.service.js";
import { UserController } from "#controllers/user.controller.js";
import { createRequireAuth } from "#middlewares/auth.middleware.js";
import { createApiRouter } from "#routes/index.js";
import { AuthRepository } from "./repositories/auth.repository.js";
import { AuthService } from "./services/auth.service.js";
import { AuthController } from "./controllers/auth.controller.js";
import { PhotoCardRepository } from "#repositories/photo-card.repository.js";
import { CardItemRepository } from "#repositories/card-item.repository.js";
import { CreationLogRepository } from "#repositories/creation-log.repository.js";
import { CloudinaryImageStorage } from "#utils/cloudinary.js";
import { PhotoCardService } from "#services/photo-card.service.js";
import { PhotoCardController } from "#controllers/photo-card.controller.js";
import { uploadImage } from "#middlewares/upload.middleware.js";

// ===== 1) repositories =====
const userRepository = new UserRepository(db);
const authRepository = new AuthRepository(db);
const photoCardRepository = new PhotoCardRepository(db);
const cardItemRepository = new CardItemRepository(db);
const creationLogRepository = new CreationLogRepository(db);

// ===== 2) 공통 service (팀 문서 4-4장) =====

// ===== 3) 기능 service — 도메인별 블록, 자기 블록만 수정 =====
const userService = new UserService({ userRepository });
const authService = new AuthService({ authRepository });

const imageStorage = new CloudinaryImageStorage({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
});
const runInTransaction = (fn) => db.transaction(fn);
const photoCardService = new PhotoCardService({
  photoCardRepository,
  cardItemRepository,
  creationLogRepository,
  imageStorage,
  runInTransaction,
});

// ===== 4) middlewares · controllers =====
const requireAuth = createRequireAuth({ userRepository });
const userController = new UserController({ userService });
const authController = new AuthController({ authService });
const photoCardController = new PhotoCardController({ photoCardService });

// ===== 5) router =====
export const apiRouter = createApiRouter({
  requireAuth,
  userController,
  authController,
  photoCardController,
  uploadImage,
});
