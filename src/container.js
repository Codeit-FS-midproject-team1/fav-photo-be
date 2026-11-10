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
import { MyGalleryService } from "#services/my-gallery.service.js";
import { MyGalleryController } from "#controllers/my-gallery.controller.js";

import { ExchangeOfferRepository } from "./repositories/exchange-offer.repository.js";
import { ExchangeOfferListingRepository } from "./repositories/exchange-offer-listing.repository.js";
import { ExchangeOfferCardRepository } from "./repositories/exchange-offer-card.repository.js";
import { ExchangeOfferService } from "./services/exchange-offer.service.js";
import { ExchangeOfferController } from "./controllers/exchange-offer.controller.js";
import { ExchangeOfferTradeRepository } from "./repositories/exchange-offer-trade.repository.js";

import { RandomPointRepository } from "#repositories/random-point.repository.js";
import { RandomPointService } from "#services/random-point.service.js";
import { RandomPointController } from "#controllers/random-point.controller.js";

// ===== 1) repositories =====
const userRepository = new UserRepository(db);
const authRepository = new AuthRepository(db);
const photoCardRepository = new PhotoCardRepository(db);
const cardItemRepository = new CardItemRepository(db);
const creationLogRepository = new CreationLogRepository(db);
const notificationRepository = new NotificationRepository(db);
const saleListingRepository = new SaleListingRepository(db);

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
const userService = new UserService({ userRepository });
const authService = new AuthService({ authRepository, db});
// [다운] 마켓
const saleListingService = new SaleListingService({ saleListingRepository });

// [규리] 마이갤러리
const myGalleryService = new MyGalleryService({ photoCardRepository });

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
  randomPointController,
});
