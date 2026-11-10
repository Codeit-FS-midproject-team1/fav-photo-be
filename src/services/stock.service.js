import { badRequest, conflict, notFound } from "#utils/http-error.js";

export class StockService {
  constructor({
    saleListingRepository,
    cardItemRepository,
    notificationService,
  }) {
    this.saleListingRepository = saleListingRepository;
    this.cardItemRepository = cardItemRepository;
    this.notificationService = notificationService;
  }

  // 판매 등록 시 보유 카드를 판매 상태로 예약합니다.
  async reserveForSale({ sellerId, photoCardId, quantity, listingId }, tx) {
    if (!tx) {
      throw new Error("판매 재고 예약에는 트랜잭션이 필요합니다.");
    }

    const items = await this.cardItemRepository.findHeldForSale(
      sellerId,
      photoCardId,
      quantity,
      tx,
    );

    if (items.length !== quantity) {
      throw conflict("판매 가능한 보유 카드 수량이 부족합니다.");
    }

    const updatedCount = await this.cardItemRepository.markOnSale(
      items,
      listingId,
      tx,
    );

    if (updatedCount !== quantity) {
      throw conflict("판매할 카드의 상태 변경에 실패했습니다.");
    }

    return updatedCount;
  }

  // 향후 구매·교환용 재고 차감 로직 (알림 연동은 아직 확인 필요)
  async decrease(listingId, quantity, tx) {
    // 구매·교환 승인 전체를 하나의 트랜잭션으로 처리합니다.
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
      // 알림 담당자의 메서드 계약 확인이 필요합니다.
      await this.notificationService.notifySoldOut(updated, tx);
    }

    return updated;
  }
}
