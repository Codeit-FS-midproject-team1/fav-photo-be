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

import { NotificationRepository } from "#repositories/notification.repository.js";
import { NotificationService } from "#services/notification.service.js";
import { NotificationController } from "#controllers/notification.controller.js";

import { SaleListingRepository } from "#repositories/sale-listing.repository.js";
import { SaleListingService } from "#services/sale-listing.service.js";
import { SaleListingController } from "#controllers/sale-listing.controller.js";
import { StockService } from "#services/stock.service.js";

import { ExchangeOfferRepository } from "./repositories/exchange-offer.repository.js";
import { ExchangeOfferListingRepository } from "./repositories/exchange-offer-listing.repository.js";
import { ExchangeOfferCardRepository } from "./repositories/exchange-offer-card.repository.js";
import { ExchangeOfferService } from "./services/exchange-offer.service.js";
import { ExchangeOfferController } from "./controllers/exchange-offer.controller.js";

// ========================================
// 1. Repository 생성
// ========================================

const userRepository = new UserRepository(db);

const authRepository = new AuthRepository(db);

const photoCardRepository = new PhotoCardRepository(db);

const cardItemRepository = new CardItemRepository(db);

const creationLogRepository = new CreationLogRepository(db);

const notificationRepository = new NotificationRepository(db);

const saleListingRepository = new SaleListingRepository(db);

// 교환 담당 팀원의 Repository 유지
const exchangeOfferRepository = new ExchangeOfferRepository(db);

const exchangeOfferListingRepository = new ExchangeOfferListingRepository(db);

const cardRepository = new ExchangeOfferCardRepository(db);

// ========================================
// 2. 공통 Service 생성
// ========================================

const notificationService = new NotificationService({
  notificationRepository,
});

const stockService = new StockService({
  saleListingRepository,
  cardItemRepository,
  notificationService,
});

// 판매 등록과 취소에서 공통으로 사용하는 트랜잭션
const runInTransaction = (fn) => db.transaction(fn);

// ========================================
// 3. 기능별 Service 생성
// ========================================

const userService = new UserService({
  userRepository,
});

const authService = new AuthService({
  authRepository,
});

// 판매 등록 / 조회 / 취소
const saleListingService = new SaleListingService({
  saleListingRepository,
  stockService,
  runInTransaction,
  cardItemRepository,
  exchangeOfferRepository,
  exchangeOfferCardRepository: cardRepository,
});

// 포토카드 이미지 저장소
const imageStorage = new CloudinaryImageStorage({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
});

const photoCardService = new PhotoCardService({
  photoCardRepository,
  cardItemRepository,
  creationLogRepository,
  imageStorage,
  runInTransaction,
});

// 교환 담당 팀원의 Service 유지
const exchangeOfferService = new ExchangeOfferService({
  exchangeOfferRepository,
  saleListingRepository: exchangeOfferListingRepository,
  cardRepository,
  userRepository,
  db,
});

// ========================================
// 4. Middleware / Controller 생성
// ========================================

const requireAuth = createRequireAuth({
  userRepository,
});

const userController = new UserController({
  userService,
});

const authController = new AuthController({
  authService,
});

const photoCardController = new PhotoCardController({
  photoCardService,
});

const notificationController = new NotificationController({
  notificationService,
});

const saleListingController = new SaleListingController({
  saleListingService,
});

const exchangeOfferController = new ExchangeOfferController({
  exchangeOfferService,
});

// ========================================
// 5. Router 연결
// ========================================

export const apiRouter = createApiRouter({
  requireAuth,
  userController,
  authController,
  photoCardController,
  uploadImage,
  notificationController,
  saleListingController,
  exchangeOfferController,
});
