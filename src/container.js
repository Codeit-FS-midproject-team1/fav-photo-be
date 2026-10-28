import { db } from './prisma/db.js';
import { UserRepository } from './repositories/user.repository.js';
import { UserService } from './services/user.service.js';
import { UserController } from './controllers/user.controller.js';
import { createRequireAuth } from './middlewares/auth.middleware.js';
import { createApiRouter } from './routes/index.js';

// ===== 1) repositories =====
const userRepository = new UserRepository(db);

// ===== 2) 공통 service (팀 문서 4-4장) =====

// ===== 3) 기능 service — 도메인별 블록, 자기 블록만 수정 =====
// [소철] 인증·내 정보
const userService = new UserService({ userRepository });

// ===== 4) middlewares · controllers =====
const requireAuth = createRequireAuth({ userRepository });
const userController = new UserController({ userService });

// ===== 5) router =====
export const apiRouter = createApiRouter({ requireAuth, userController });
