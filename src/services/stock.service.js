import { badRequest, conflict, notFound } from "#utils/http-error.js";

export class StockService {
  constructor({ saleListingRepository, notificationService }) {
    this.saleListingRepository = saleListingRepository;
    this.notificationService = notificationService;
  }

  async decrease(listingId, quantity, tx) {
    // 구매·교환 승인 전체를 하나의 트랜잭션으로 처리하기 위해 tx를 필수로 받습니다.
    if (!tx) {
      throw new Error("재고 차감에는 트랜잭션이 필요합니다.");
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
      await this.notificationService.notify(
        {
          userId: listing.sellerId,
          type: "SOLD_OUT",
          message: "판매 중인 포토카드가 품절되었습니다.",
          link: `/marketplace/${listing.id}`,
        },
        tx,
      );
    }
    return updated;
  }
}
