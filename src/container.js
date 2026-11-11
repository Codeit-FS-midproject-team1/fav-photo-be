
import { db } from "#prisma/db.js";

// ========================================
// Repository
// ========================================

import {
  AuthRepository,
  CardItemRepository,
  CreationLogRepository,
  ExchangeOfferCardRepository,
  ExchangeOfferListingRepository,
  ExchangeOfferTradeRepository,
  ExchangeOfferRepository,
  NotificationRepository,
  PhotoCardRepository,
  RandomPointRepository,
  SaleListingRepository,
  UserRepository,
} from "#repositories/index.js";

import { MySalesRepository } from "#repositories/my-sales.repository.js";

// 구매 / 포인트 Repository
import { PointRepository } from "#repositories/point.repository.js";
import { PointHistoryRepository } from "#repositories/point-history.repository.js";
import { TradeRepository } from "#repositories/trade.repository.js";
import { PurchaseRequestRepository } from "#repositories/purchase-request.repository.js";
import { PendingOfferCleanupRepository } from "#repositories/pending-offer-cleanup.repository.js";

// ========================================
// Service
// ========================================

import {
  AuthService,
  ExchangeOfferService,
  MyGalleryService,
  NotificationService,
  PhotoCardService,
  RandomPointService,
  SaleListingService,
  UserService,
} from "#services/index.js";

import { MySalesService } from "#services/my-sales.service.js";
import { StockService } from "#services/stock.service.js";
import { PointService } from "#services/point.service.js";
import { PurchaseService } from "#services/purchase.service.js";

// ========================================
// Controller
// ========================================

import {
  AuthController,
  ExchangeOfferController,
  MyGalleryController,
  NotificationController,
  PhotoCardController,
  RandomPointController,
  SaleListingController,
  UserController,
} from "#controllers/index.js";

import { MySalesController } from "#controllers/my-sales.controller.js";
import { PurchaseController } from "#controllers/purchase.controller.js";

// ========================================
// Middleware / Router / Utils
// ========================================

import { createRequireAuth } from "#middlewares/auth.middleware.js";
import { uploadImage } from "#middlewares/upload.middleware.js";
import { createApiRouter } from "#routes/index.js";
import { CloudinaryImageStorage } from "#utils/cloudinary.js";

// ========================================
// 1. Repository 생성
// ========================================

// 사용자 / 인증
const userRepository = new UserRepository(db);
const authRepository = new AuthRepository(db);

// 포토카드
const photoCardRepository = new PhotoCardRepository(db);
const cardItemRepository = new CardItemRepository(db);
const creationLogRepository = new CreationLogRepository(db);

// 알림
const notificationRepository = new NotificationRepository(db);

// 판매
const saleListingRepository = new SaleListingRepository(db);
const mySalesRepository = new MySalesRepository(db);

// 교환
const exchangeOfferRepository = new ExchangeOfferRepository(db);

const exchangeOfferListingRepository =
  new ExchangeOfferListingRepository(db);

const cardRepository = new ExchangeOfferCardRepository(db);

// 교환 거래 기록용
const exchangeTradeRepository =
  new ExchangeOfferTradeRepository(db);

// 랜덤 포인트
const randomPointRepository = new RandomPointRepository(db);

// 구매 포인트
const pointRepository = new PointRepository(db);
const pointHistoryRepository = new PointHistoryRepository(db);

// 구매 거래 기록용
const tradeRepository = new TradeRepository(db);

// 구매 중복 요청 방지
const purchaseRequestRepository =
  new PurchaseRequestRepository(db);

// 품절 시 교환 제안 자동 정리
const pendingOfferCleanupRepository =
  new PendingOfferCleanupRepository({
    db,
    exchangeOfferRepository,
    exchangeOfferCardRepository: cardRepository,
  });

// ========================================
// 2. 공통 Service 생성
// ========================================

// 알림
const notificationService = new NotificationService({
  notificationRepository,
});

// 판매 재고
const stockService = new StockService({
  saleListingRepository,
  cardItemRepository,
  notificationService,
  pendingOfferCleanupRepository,
});

// 포인트
const pointService = new PointService({
  pointRepository,
  pointHistoryRepository,
});

// DB 트랜잭션
const runInTransaction = (fn) => db.transaction(fn);

// 이미지 저장소
const imageStorage = new CloudinaryImageStorage({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
});

// ========================================
// 3. 기능별 Service 생성
// ========================================

// 포토카드 생성 / 조회
const photoCardService = new PhotoCardService({
  photoCardRepository,
  cardItemRepository,
  creationLogRepository,
  imageStorage,
  runInTransaction,
});

// 랜덤 포인트
const randomPointService = new RandomPointService({
  randomPointRepository,
  db,
});

// 사용자
const userService = new UserService({
  userRepository,
  randomPointService,
  photoCardService,
});

// 인증
const authService = new AuthService({
  authRepository,
  db,
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

// 교환
const exchangeOfferService = new ExchangeOfferService({
  exchangeOfferRepository,
  saleListingRepository: exchangeOfferListingRepository,
  cardRepository,
  tradeRepository: exchangeTradeRepository,
  userRepository,
  notificationService,
  db,
});

// 마이갤러리
const myGalleryService = new MyGalleryService({
  photoCardRepository,
});

// 나의 판매
const mySalesService = new MySalesService({
  mySalesRepository,
});

// 구매
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

// 사용자
const userController = new UserController({
  userService,
});

// 인증
const authController = new AuthController({
  authService,
});

// 포토카드
const photoCardController = new PhotoCardController({
  photoCardService,
});

// 알림
const notificationController = new NotificationController({
  notificationService,
});

// 판매
const saleListingController = new SaleListingController({
  saleListingService,
});

// 교환
const exchangeOfferController = new ExchangeOfferController({
  exchangeOfferService,
});

// 마이갤러리
const myGalleryController = new MyGalleryController({
  myGalleryService,
});

// 나의 판매
const mySalesController = new MySalesController({
  mySalesService,
});

// 랜덤 포인트
const randomPointController = new RandomPointController({
  randomPointService,
});

// 구매
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
  myGalleryController,
  mySalesController,
  randomPointController,
  purchaseController,
});
