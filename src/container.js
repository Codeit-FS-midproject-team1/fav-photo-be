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

// 포인트 관련
import { PointRepository } from "#repositories/point.repository.js";
import { PointHistoryRepository } from "#repositories/point-history.repository.js";
import { PointService } from "#services/point.service.js";

// 구매 관련
import { TradeRepository } from "#repositories/trade.repository.js";
import { PurchaseRequestRepository } from "#repositories/purchase-request.repository.js";
import { PurchaseService } from "#services/purchase.service.js";
import { PurchaseController } from "#controllers/purchase.controller.js";

// 품절 시 교환 제안 자동 정리
import { PendingOfferCleanupRepository } from "#repositories/pending-offer-cleanup.repository.js";

// ========================================
// 1. Repository 생성
// ========================================

// 사용자
const userRepository = new UserRepository(db);

// 인증
const authRepository = new AuthRepository(db);

// 포토카드
const photoCardRepository = new PhotoCardRepository(db);

const cardItemRepository = new CardItemRepository(db);

const creationLogRepository = new CreationLogRepository(db);

// 알림
const notificationRepository = new NotificationRepository(db);

// 판매
const saleListingRepository = new SaleListingRepository(db);

// 교환
const exchangeOfferRepository = new ExchangeOfferRepository(db);

const exchangeOfferListingRepository = new ExchangeOfferListingRepository(db);

const cardRepository = new ExchangeOfferCardRepository(db);

// 포인트
const pointRepository = new PointRepository(db);

const pointHistoryRepository = new PointHistoryRepository(db);

// 구매 거래 기록
const tradeRepository = new TradeRepository(db);

// 구매 중복 요청 방지
const purchaseRequestRepository = new PurchaseRequestRepository(db);

// 품절 시 대기 중 교환 제안 정리
const pendingOfferCleanupRepository = new PendingOfferCleanupRepository({
  db,
  exchangeOfferRepository,
  exchangeOfferCardRepository: cardRepository,
});

// ========================================
// 2. 공통 Service 생성
// ========================================

// 알림 Service
const notificationService = new NotificationService({
  notificationRepository,
});

// 판매 재고 Service
const stockService = new StockService({
  saleListingRepository,
  cardItemRepository,
  notificationService,
  pendingOfferCleanupRepository,
});

// 포인트 Service
const pointService = new PointService({
  pointRepository,
  pointHistoryRepository,
});

// DB 트랜잭션
const runInTransaction = (fn) => db.transaction(fn);

// ========================================
// 3. 기능별 Service 생성
// ========================================

// 사용자 Service
const userService = new UserService({
  userRepository,
});

// 인증 Service
const authService = new AuthService({
  authRepository,
});

// 판매 등록 / 조회 / 수정 / 취소
const saleListingService = new SaleListingService({
  saleListingRepository,
  stockService,
  runInTransaction,
  cardItemRepository,
  exchangeOfferRepository,
  exchangeOfferCardRepository: cardRepository,
  notificationService,
});

// Cloudinary 이미지 저장소
const imageStorage = new CloudinaryImageStorage({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
});

// 포토카드 생성 / 조회
const photoCardService = new PhotoCardService({
  photoCardRepository,
  cardItemRepository,
  creationLogRepository,
  imageStorage,
  runInTransaction,
});

// 교환 Service
const exchangeOfferService = new ExchangeOfferService({
  exchangeOfferRepository,
  saleListingRepository: exchangeOfferListingRepository,
  cardRepository,
  userRepository,
  db,
});

// 구매 Service
const purchaseService = new PurchaseService({
  saleListingRepository,
  cardItemRepository,
  stockService,
  pointService,
  tradeRepository,
  purchaseRequestRepository,
  notificationService,
  runInTransaction,
});

// ========================================
// 4. Middleware / Controller 생성
// ========================================

// 로그인 인증
const requireAuth = createRequireAuth({
  userRepository,
});

// 사용자 Controller
const userController = new UserController({
  userService,
});

// 인증 Controller
const authController = new AuthController({
  authService,
});

// 포토카드 Controller
const photoCardController = new PhotoCardController({
  photoCardService,
});

// 알림 Controller
const notificationController = new NotificationController({
  notificationService,
});

// 판매 Controller
const saleListingController = new SaleListingController({
  saleListingService,
});

// 교환 Controller
const exchangeOfferController = new ExchangeOfferController({
  exchangeOfferService,
});

// 구매 Controller
const purchaseController = new PurchaseController({
  purchaseService,
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
  purchaseController,
});
