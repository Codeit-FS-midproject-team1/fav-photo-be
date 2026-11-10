import { db } from "#prisma/db.js";
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

import { createRequireAuth } from "#middlewares/auth.middleware.js";
import { createApiRouter } from "#routes/index.js";
import { CloudinaryImageStorage } from "#utils/cloudinary.js";
import { uploadImage } from "#middlewares/upload.middleware.js";

import { MySalesRepository } from "#repositories/my-sales.repository.js";
import { MySalesService } from "#services/my-sales.service.js";
import { MySalesController } from "#controllers/my-sales.controller.js";

// ===== 1) repositories =====
const userRepository = new UserRepository(db);
const authRepository = new AuthRepository(db);
const photoCardRepository = new PhotoCardRepository(db);
const cardItemRepository = new CardItemRepository(db);
const creationLogRepository = new CreationLogRepository(db);
const notificationRepository = new NotificationRepository(db);
const saleListingRepository = new SaleListingRepository(db);
const mySalesRepository = new MySalesRepository(db);

const exchangeOfferRepository = new ExchangeOfferRepository(db);
const exchangeOfferListingRepository = new ExchangeOfferListingRepository(db);
const cardRepository = new ExchangeOfferCardRepository(db);
const tradeRepository = new ExchangeOfferTradeRepository(db);

const randomPointRepository = new RandomPointRepository(db);

// ===== 2) 공통 service (팀 문서 4-4장) =====
// [다운] 알림 — 가입·구매·교환 service 가 notify 로 알림을 만든다
const notificationService = new NotificationService({
  notificationRepository,
});

// ===== 3) 기능 service — 도메인별 블록, 자기 블록만 수정 =====
const authService = new AuthService({ authRepository, db});
// [다운] 마켓
const saleListingService = new SaleListingService({ saleListingRepository });

// [규리] 마이갤러리
const myGalleryService = new MyGalleryService({ photoCardRepository });
// 나의 거래 포토카드
const mySalesService = new MySalesService({ mySalesRepository });

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

const exchangeOfferService = new ExchangeOfferService({
  exchangeOfferRepository,
  saleListingRepository: exchangeOfferListingRepository,
  cardRepository,
  tradeRepository,
  userRepository,
  notificationService,
  db,
});

const randomPointService = new RandomPointService({
  randomPointRepository,
  db,
});

const userService = new UserService({
  userRepository,
  randomPointService,
  photoCardService,
});

// ===== 4) middlewares · controllers =====
const requireAuth = createRequireAuth({ userRepository });
const userController = new UserController({ userService });
const authController = new AuthController({ authService });
const photoCardController = new PhotoCardController({ photoCardService });
const notificationController = new NotificationController({
  notificationService,
});
const saleListingController = new SaleListingController({ saleListingService });

const exchangeOfferController = new ExchangeOfferController({
  exchangeOfferService,
});
const myGalleryController = new MyGalleryController({ myGalleryService });
const mySalesController = new MySalesController({ mySalesService });

const randomPointController = new RandomPointController({
  randomPointService,
});

// ===== 5) router =====
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
});
