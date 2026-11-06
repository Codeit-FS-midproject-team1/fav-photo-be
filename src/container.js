import { db } from "./prisma/db.js";
import { UserRepository } from "./repositories/user.repository.js";
import { UserService } from "./services/user.service.js";
import { UserController } from "./controllers/user.controller.js";
import { createRequireAuth } from "./middlewares/auth.middleware.js";
import { createApiRouter } from "./routes/index.js";
import { ExchangeOfferRepository } from "./repositories/exchange-offer.repository.js";
import { ExchangeOfferListingRepository } from "./repositories/exchange-offer-listing.repository.js";
import { ExchangeOfferService } from "./services/exchange-offer.service.js";
import { ExchangeOfferController } from "./controllers/exchange-offer.controller.js";
import { ExchangeOfferCardRepository } from "./repositories/exchange-offer-card.repository.js";

// ===== 1) repositories =====
const userRepository = new UserRepository(db);
const exchangeOfferRepository = new ExchangeOfferRepository(db);
const saleListingRepository = new ExchangeOfferListingRepository(db);
const cardRepository = new ExchangeOfferCardRepository(db);

// ===== 2) 공통 service (팀 문서 4-4장) =====

// ===== 3) 기능 service — 도메인별 블록, 자기 블록만 수정 =====
// [소철] 인증·내 정보
const userService = new UserService({ userRepository });
const exchangeOfferService = new ExchangeOfferService({
  exchangeOfferRepository,
  saleListingRepository,
  cardRepository,
  db,
});

// ===== 4) middlewares · controllers =====
const requireAuth = createRequireAuth({ userRepository });
const userController = new UserController({ userService });
const exchangeOfferController = new ExchangeOfferController({
  exchangeOfferService,
});

// ===== 5) router =====
export const apiRouter = createApiRouter({
  requireAuth,
  userController,
  exchangeOfferController,
});
