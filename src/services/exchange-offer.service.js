import {
  badRequest,
  notFound,
  unauthorized,
  conflict,
} from "../utils/http-error.js";

export class ExchangeOfferService {
  constructor({
    exchangeOfferRepository,
    saleListingRepository,
    cardRepository,
    userRepository,
    db,
  }) {
    this.exchangeOfferRepository = exchangeOfferRepository;
    this.saleListingRepository = saleListingRepository;
    this.cardRepository = cardRepository;
    this.userRepository = userRepository;
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
}
