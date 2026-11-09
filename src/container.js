import { db } from "#prisma/db.js";
import { UserRepository } from "#repositories/user.repository.js";
import { UserService } from "#services/user.service.js";
import { UserController } from "#controllers/user.controller.js";
import { createRequireAuth } from "#middlewares/auth.middleware.js";
import { createApiRouter } from "#routes/index.js";
import { AuthRepository } from "./repositories/auth.repository.js";
import { AuthService } from "./services/auth.service.js";
import { AuthController } from "./controllers/auth.controller.js";
import { NotificationRepository } from "#repositories/notification.repository.js";
import { NotificationService } from "#services/notification.service.js";
import { NotificationController } from "#controllers/notification.controller.js";
import { SaleListingRepository } from "#repositories/sale-listing.repository.js";
import { SaleListingService } from "#services/sale-listing.service.js";
import { SaleListingController } from "#controllers/sale-listing.controller.js";

// ===== 1) repositories =====
const userRepository = new UserRepository(db);
const authRepository = new AuthRepository(db);
const notificationRepository = new NotificationRepository(db);
const saleListingRepository = new SaleListingRepository(db);

// ===== 2) 공통 service (팀 문서 4-4장) =====
// [다운] 알림 — 가입·구매·교환 service 가 notify 로 알림을 만든다
const notificationService = new NotificationService({
  notificationRepository,
});

// ===== 3) 기능 service — 도메인별 블록, 자기 블록만 수정 =====
const userService = new UserService({ userRepository });
const authService = new AuthService({ authRepository });
// [다운] 마켓
const saleListingService = new SaleListingService({ saleListingRepository });

// ===== 4) middlewares · controllers =====
const requireAuth = createRequireAuth({ userRepository });
const userController = new UserController({ userService });
const authController = new AuthController({ authService });
const notificationController = new NotificationController({
  notificationService,
});
const saleListingController = new SaleListingController({ saleListingService });

// ===== 5) router =====
export const apiRouter = createApiRouter({
  requireAuth,
  userController,
  authController,
  notificationController,
  saleListingController,
});
