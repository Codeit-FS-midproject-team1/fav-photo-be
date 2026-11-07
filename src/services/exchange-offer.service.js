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
    db,
  }) {
    this.exchangeOfferRepository = exchangeOfferRepository;
    this.saleListingRepository = saleListingRepository;
    this.cardRepository = cardRepository;
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

    return offers;
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
    if (listing.reminingQuantity <= 0) {
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

      return this.exchangeOfferRepository.findById(id, tx);
    });
  }
}
