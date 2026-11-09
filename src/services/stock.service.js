import { badRequest, conflict, notFound } from "#utils/http-error.js";

export class StockService {
  constructor({ saleListingRepository, notificationService }) {
    this.saleListingRepository = saleListingRepository;
    this.notificationService = notificationService;
  }

  async decrease(listingId, quantity, tx) {
    // 구매·교환 승인 전체를 하나의 트랜잭션으로 처리하기 위해 tx를 필수로 받습니다.
    if (!tx) {
      throw new Error("StockService.decrease() requires a transaction.");
    }

    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw badRequest("수량은 1 이상의 정수여야 합니다.");
    }

    const listing = await this.saleListingRepository.findByIdForUpdate(
      listingId,
      tx,
    );

    if (!listing) {
      throw notFound("판매글을 찾을 수 없습니다.");
    }

    if (listing.status !== "ON_SALE") {
      throw conflict("현재 판매 중인 포토카드가 아닙니다.");
    }

    if (listing.remainingQuantity < quantity) {
      throw conflict("남은 판매 수량이 부족합니다.");
    }

    const remainingQuantity = listing.remainingQuantity - quantity;
    const isSoldOut = remainingQuantity === 0;

    const updated = await this.saleListingRepository.updateById(
      listingId,
      {
        remainingQuantity,
        status: isSoldOut ? "SOLD_OUT" : "ON_SALE",
      },
      tx,
    );

    if (!updated) {
      throw conflict("재고 변경에 실패했습니다.");
    }

    if (isSoldOut) {
      // 실제 알림 메서드 이름과 인자는 알림 담당자와 확정한 뒤 연결합니다.
      await this.notificationService.notifySoldOut(updated, tx);
    }

    return updated;
  }
}
