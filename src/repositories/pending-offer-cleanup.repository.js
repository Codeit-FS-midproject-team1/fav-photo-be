import { conflict } from "#utils/http-error.js";

export class PendingOfferCleanupRepository {
  constructor({ db, exchangeOfferRepository, exchangeOfferCardRepository }) {
    this.db = db;
    this.exchangeOfferRepository = exchangeOfferRepository;
    this.exchangeOfferCardRepository = exchangeOfferCardRepository;
  }

  // 품절된 판매글의 대기 중 교환 제안 정리
  async rejectAllPendingByListing(listingId, tx) {
    if (!tx) {
      throw new Error("교환 제안 정리에는 트랜잭션이 필요합니다.");
    }

    // 1. 대기 중 제안 조회 및 잠금
    const offers = await tx.orm.public.ExchangeOffer.where({
      listingId,
      status: "PENDING",
    })
      .orderBy([(offer) => offer.id.asc()])
      .forUpdate()
      .all();

    const rejectedOffers = [];

    for (const offer of offers) {
      // 2. 기존 팀원 메서드로 카드 복구
      const restoredCount =
        await this.exchangeOfferCardRepository.restoreFromOffer(
          offer.offeredCardItemId,
          offer.offererId,
          offer.id,
          tx,
        );

      if (restoredCount !== 1) {
        throw conflict("교환 제시 카드 복구에 실패했습니다.");
      }

      // 3. 기존 팀원 메서드로 제안 거절
      const rejectedCount =
        await this.exchangeOfferRepository.updateStatusIfPending(
          offer.id,
          "REJECTED",
          tx,
        );

      if (rejectedCount !== 1) {
        throw conflict("교환 제안 상태 변경에 실패했습니다.");
      }

      rejectedOffers.push(offer);
    }

    return rejectedOffers;
  }
}
