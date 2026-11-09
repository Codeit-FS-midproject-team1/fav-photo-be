import {
  badRequest,
  notFound,
  unauthorized,
  forbidden,
  conflict,
} from "../utils/http-error.js";

export class ExchangeOfferService {
  constructor({
    exchangeOfferRepository,
    saleListingRepository,
    cardRepository,
    tradeRepository,
    userRepository,
    notificationService,
    db,
  }) {
    this.exchangeOfferRepository = exchangeOfferRepository;
    this.saleListingRepository = saleListingRepository;
    this.cardRepository = cardRepository;
    this.tradeRepository = tradeRepository;
    this.userRepository = userRepository;
    this.notificationService = notificationService;
    this.db = db;
  }

  async getOffersByListingId(listingId, userId) {
    const id = Number(listingId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw badRequest("판매글 ID는 1이상의 정수여야 합니다.");
    }

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw unauthorized();
    }

    const listing = await this.saleListingRepository.findById(id);

    if (!listing || listing.status === "CANCELED") {
      throw notFound("판매글을 찾을 수 없습니다.");
    }

    const isSeller = listing.sellerId === userId;

    const offererId = isSeller ? undefined : userId;

    const offers = await this.exchangeOfferRepository.findByListingId(id, {
      offererId,
    });

    const items = await Promise.all(
      offers.map(async (offer) => {
        const cardItem = await this.cardRepository.findById(
          offer.offeredCardItemId,
        );

        if (!cardItem) {
          throw new Error("교환 제안에 연결된 카드를 찾을 수 없습니다.");
        }

        const [photoCard, offerer] = await Promise.all([
          this.cardRepository.findPhotoCardById(cardItem.photoCardId),
          this.userRepository.findById(offer.offererId),
        ]);

        if (!photoCard || !offerer) {
          throw new Error("교환 제안의 상세 정보를 찾을 수 없습니다.");
        }

        const creator = await this.userRepository.findById(photoCard.creatorId);

        if (!creator) {
          throw new Error("포토카드 제작자 정보를 찾을 수 없습니다.");
        }

        return {
          id: offer.id,
          status: offer.status,
          description: offer.description,
          photoCard: {
            id: photoCard.id,
            name: photoCard.name,
            description: photoCard.description,
            method: photoCard.method,
            genre: photoCard.genre,
            price: photoCard.price,
            totalQuantity: photoCard.totalQuantity,
            imageUrl: photoCard.imageUrl,
            creator: {
              id: creator.id,
              nickname: creator.nickname,
            },
            createdAt: photoCard.createdAt,
          },
          offerer: {
            id: offerer.id,
            nickname: offerer.nickname,
          },
          createdAt: offer.createdAt,
        };
      }),
    );

    return { items };
  }

  async createOffer(listingId, userId, data) {
    const { offeredCardItemId, description } = data ?? {};

    const id = Number(listingId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw badRequest("판매글 ID는 1이상의 정수여야 합니다.");
    }
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw unauthorized();
    }
    if (!Number.isSafeInteger(offeredCardItemId) || offeredCardItemId <= 0) {
      throw badRequest("제안할 카드 ID는 1 이상의 정수여야 합니다.");
    }
    if (typeof description !== "string" || description.trim().length === 0) {
      throw badRequest("교환 제안 내용을 입력해 주세요.", {
        description: "교환 제안 내용은 필수입니다.",
      });
    }
    if (description.length > 200) {
      throw badRequest("교환 제안 내용은 200자 이내로 입력해 주세요.", {
        description: "최대 200자까지 입력할 수 있습니다.",
      });
    }

    const listing = await this.saleListingRepository.findById(id);
    if (!listing || listing.status === "CANCELED") {
      throw notFound("판매글을 찾을 수 없습니다.");
    }
    if (listing.status !== "ON_SALE") {
      throw badRequest("판매 중인 판매글에만 교환을 제안할 수 있습니다.");
    }
    if (listing.remainingQuantity <= 0) {
      throw badRequest("교환 가능한 카드의 재고가 없습니다.");
    }
    if (listing.sellerId === userId) {
      throw badRequest("자신의 판매글에는 교환을 제안할 수 없습니다.");
    }

    const card = await this.cardRepository.findById(offeredCardItemId);
    if (!card) {
      throw notFound("제안할 카드를 찾을 수 없습니다.");
    }
    if (card.ownerId !== userId) {
      throw badRequest("본인이 소유한 카드만 교환 제안에 사용할 수 있습니다.");
    }
    if (card.status !== "HELD") {
      throw badRequest("현재 보유 중인 카드만 교환 제안에 사용할 수 있습니다.");
    }
    if (card.photoCardId === listing.photoCardId) {
      throw conflict("동일한 원본 포토카드끼리는 교환할 수 없습니다.");
    }

    return this.db.transaction(async (tx) => {
      const lockedListing =
        await this.saleListingRepository.findByIdForNoKeyUpdate(id, tx);

      if (!lockedListing || lockedListing.status === "CANCELED") {
        throw notFound("판매글을 찾을 수 없습니다.");
      }

      if (lockedListing.status !== "ON_SALE") {
        throw conflict("판매 중인 판매글에만 교환을 제안할 수 있습니다.");
      }

      if (lockedListing.remainingQuantity <= 0) {
        throw conflict("교환 가능한 카드의 재고가 없습니다.");
      }

      if (lockedListing.sellerId === userId) {
        throw badRequest("자신의 판매글에는 교환을 제안할 수 없습니다.");
      }

      if (card.photoCardId === lockedListing.photoCardId) {
        throw conflict("동일한 원본 포토카드끼리는 교환할 수 없습니다.");
      }

      const offer = await this.exchangeOfferRepository.create(
        {
          listingId: id,
          offererId: userId,
          offeredCardItemId,
          description,
          status: "PENDING",
        },
        tx,
      );
      const updatedCount = await this.cardRepository.markAsOffered(
        offeredCardItemId,
        userId,
        offer.id,
        tx,
      );
      if (updatedCount !== 1) {
        throw conflict("카드가 이미 다른 판매 또는 교환에 사용 중입니다.");
      }
      // 교환 제안 도착 알림에 필요한 정보 조회
      const offerer = await this.userRepository.findById(userId, tx);

      if (!offerer) {
        throw notFound("교환 제안자를 찾을 수 없습니다.");
      }

      const photoCard = await this.cardRepository.findPhotoCardById(
        lockedListing.photoCardId,
        tx,
      );

      if (!photoCard) {
        throw notFound("판매 포토카드를 찾을 수 없습니다.");
      }

      // 판매자에게 교환 제안 도착 알림 생성
      await this.notificationService.notify(
        {
          userId: lockedListing.sellerId,
          type: "OFFER_RECEIVED",
          message: `${offerer.nickname}님이 [${photoCard.name}] 포토카드 교환을 제안했습니다.`,
          link: null,
        },
        tx,
      );
      return offer;
    });
  }

  async cancelOffer(offerId, userId) {
    const id = Number(offerId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw badRequest("교환 제안 ID는 1 이상의 정수여야 합니다.");
    }

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw unauthorized();
    }

    const offer = await this.exchangeOfferRepository.findById(id);

    if (!offer) {
      throw notFound("교환 제안을 찾을 수 없습니다.");
    }

    if (offer.offererId !== userId) {
      throw forbidden("본인이 제안한 교환만 취소할 수 있습니다.");
    }

    if (offer.status !== "PENDING") {
      throw conflict("대기 중인 교환 제안만 취소할 수 있습니다.");
    }

    await this.db.transaction(async (tx) => {
      const updatedCount =
        await this.exchangeOfferRepository.updateStatusIfPending(
          id,
          "CANCELED",
          tx,
        );

      if (updatedCount !== 1) {
        throw conflict("이미 처리된 교환 제안입니다.");
      }

      const restoredCount = await this.cardRepository.restoreFromOffer(
        offer.offeredCardItemId,
        userId,
        id,
        tx,
      );

      if (restoredCount !== 1) {
        throw conflict("교환 제안에 사용한 카드를 복구할 수 없습니다.");
      }
    });
  }

  async rejectOffer(offerId, userId) {
    const id = Number(offerId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw badRequest("교환 제안 ID는 1 이상의 정수여야 합니다.");
    }

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw unauthorized();
    }

    const offer = await this.exchangeOfferRepository.findById(id);

    if (!offer) {
      throw notFound("교환 제안을 찾을 수 없습니다.");
    }

    const listing = await this.saleListingRepository.findById(offer.listingId);

    if (!listing || listing.status === "CANCELED") {
      throw notFound("판매글을 찾을 수 없습니다.");
    }

    if (listing.sellerId !== userId) {
      throw forbidden("판매자만 교환 제안을 거절할 수 있습니다.");
    }

    if (offer.status !== "PENDING") {
      throw conflict("대기 중인 교환 제안만 거절할 수 있습니다.");
    }

    return this.db.transaction(async (tx) => {
      const updatedCount =
        await this.exchangeOfferRepository.updateStatusIfPending(
          id,
          "REJECTED",
          tx,
        );

      if (updatedCount !== 1) {
        throw conflict("이미 처리된 교환 제안입니다.");
      }

      const restoredCount = await this.cardRepository.restoreFromOffer(
        offer.offeredCardItemId,
        offer.offererId,
        id,
        tx,
      );

      if (restoredCount !== 1) {
        throw conflict("교환 제안에 사용한 카드를 복구할 수 없습니다.");
      }

      // 교환 제안 거절 알림에 필요한 정보 조회
      const seller = await this.userRepository.findById(listing.sellerId, tx);

      if (!seller) {
        throw notFound("판매자를 찾을 수 없습니다.");
      }

      const photoCard = await this.cardRepository.findPhotoCardById(
        listing.photoCardId,
        tx,
      );

      if (!photoCard) {
        throw notFound("판매 포토카드를 찾을 수 없습니다.");
      }

      // 제안자에게 교환 제안 거절 알림 생성
      await this.notificationService.notify(
        {
          userId: offer.offererId,
          type: "OFFER_REJECTED",
          message: `${seller.nickname}님이 [${photoCard.name}] 포토카드 교환 제안을 거절했습니다.`,
          link: null,
        },
        tx,
      );

      return this.exchangeOfferRepository.findById(id, tx);
    });
  }

  async getAcceptOfferContext(offerId, userId, tx) {
    const id = Number(offerId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw badRequest("교환 제안 ID는 1 이상의 정수여야 합니다.");
    }

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw unauthorized();
    }

    const offer = await this.exchangeOfferRepository.findById(id, tx);

    if (!offer) {
      throw notFound("교환 제안을 찾을 수 없습니다.");
    }

    const listing = await this.saleListingRepository.findByIdForNoKeyUpdate(
      offer.listingId,
      tx,
    );

    if (!listing || listing.status === "CANCELED") {
      throw notFound("판매글을 찾을 수 없습니다.");
    }

    if (listing.sellerId !== userId) {
      throw forbidden("판매자만 교환 제안을 승인할 수 있습니다.");
    }

    if (offer.status !== "PENDING") {
      throw conflict("대기 중인 교환 제안만 승인할 수 있습니다.");
    }

    if (listing.status !== "ON_SALE" || listing.remainingQuantity <= 0) {
      throw conflict("교환 가능한 판매 재고가 없습니다.");
    }

    const offeredCard = await this.cardRepository.findById(
      offer.offeredCardItemId,
      tx,
    );

    if (
      !offeredCard ||
      offeredCard.ownerId !== offer.offererId ||
      offeredCard.status !== "OFFERED" ||
      offeredCard.offerId !== offer.id
    ) {
      throw conflict("교환 제시 카드의 상태가 올바르지 않습니다.");
    }

    if (offeredCard.photoCardId === listing.photoCardId) {
      throw conflict("동일한 원본 포토카드끼리는 교환할 수 없습니다.");
    }

    return { id, offer, listing, offeredCard };
  }

  async acceptOffer(offerId, userId) {
    return this.db.transaction(async (tx) => {
      const { id, offer, listing, offeredCard } =
        await this.getAcceptOfferContext(offerId, userId, tx);

      // 판매 중인 카드 1장 조회
      const sellerCard = await this.cardRepository.findOnSaleCardByListingId(
        listing.id,
        listing.sellerId,
        tx,
      );

      if (!sellerCard || sellerCard.photoCardId !== listing.photoCardId) {
        throw conflict("교환 가능한 판매 카드가 없습니다.");
      }

      // 교환 제안 승인
      const updatedCount =
        await this.exchangeOfferRepository.updateStatusIfPending(
          id,
          "ACCEPTED",
          tx,
        );

      if (updatedCount !== 1) {
        throw conflict("이미 처리된 교환 제안입니다.");
      }

      // 판매 재고 조건부 차감
      const decreasedCount =
        await this.saleListingRepository.decreaseRemainingQuantity(
          listing.id,
          listing.remainingQuantity,
          tx,
        );

      if (decreasedCount !== 1) {
        throw conflict("판매 재고가 변경되어 교환을 진행할 수 없습니다.");
      }

      const acquiredAt = new Date().toISOString();

      // 판매자 카드 → 제안자
      const sellerCardCount = await this.cardRepository.transferOnSaleCard(
        sellerCard.id,
        listing.sellerId,
        offer.offererId,
        listing.id,
        acquiredAt,
        tx,
      );

      if (sellerCardCount !== 1) {
        throw conflict("판매 카드의 소유권을 이전할 수 없습니다.");
      }

      // 제안자 카드 → 판매자
      const offeredCardCount = await this.cardRepository.transferOfferedCard(
        offeredCard.id,
        offer.offererId,
        listing.sellerId,
        id,
        acquiredAt,
        tx,
      );

      if (offeredCardCount !== 1) {
        throw conflict("제시 카드의 소유권을 이전할 수 없습니다.");
      }

      // 교환 거래 이력 생성
      await this.tradeRepository.createExchangeTrade(
        {
          sellerId: listing.sellerId,
          offererId: offer.offererId,
          photoCardId: sellerCard.photoCardId,
          receivedPhotoCardId: offeredCard.photoCardId,
        },
        tx,
      );

      // 마지막 재고가 소진되면 다른 대기 제안을 자동 거절
      if (listing.remainingQuantity === 1) {
        const pendingOffers =
          await this.exchangeOfferRepository.findByListingId(listing.id, {
            tx,
          });

        for (const pendingOffer of pendingOffers) {
          const rejectedCount =
            await this.exchangeOfferRepository.updateStatusIfPending(
              pendingOffer.id,
              "REJECTED",
              tx,
            );

          if (rejectedCount !== 1) {
            throw conflict("대기 중인 교환 제안을 거절할 수 없습니다.");
          }

          const restoredCount = await this.cardRepository.restoreFromOffer(
            pendingOffer.offeredCardItemId,
            pendingOffer.offererId,
            pendingOffer.id,
            tx,
          );

          if (restoredCount !== 1) {
            throw conflict("거절된 교환 제안의 카드를 복구할 수 없습니다.");
          }
        }
      }

      // 교환 제안 승인 알림에 필요한 정보 조회
      const seller = await this.userRepository.findById(listing.sellerId, tx);

      if (!seller) {
        throw notFound("판매자를 찾을 수 없습니다.");
      }

      const photoCard = await this.cardRepository.findPhotoCardById(
        listing.photoCardId,
        tx,
      );

      if (!photoCard) {
        throw notFound("판매 포토카드를 찾을 수 없습니다.");
      }

      // 제안자에게 교환 제안 승인 알림 생성
      await this.notificationService.notify(
        {
          userId: offer.offererId,
          type: "OFFER_ACCEPTED",
          message: `${seller.nickname}님이 [${photoCard.name}] 포토카드 교환 제안을 승인했습니다.`,
          link: null,
        },
        tx,
      );

      return {
        id,
        status: "ACCEPTED",
      };
    });
  }
}
