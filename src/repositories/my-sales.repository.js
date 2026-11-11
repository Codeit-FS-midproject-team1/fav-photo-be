export class MySalesRepository {
  constructor(db) {
    this.db = db;
  }

  // 내가 올린 판매글 (취소된 글 제외). 원본 카드와 제작자까지 함께 가져온다.
  findListingsBySeller(sellerId) {
    return this.db.orm.public.SaleListing.where({ sellerId })
      .where((l) => l.status.neq("CANCELED"))
      .include("photoCard", (card) => card.include("creator"))
      .all();
  }
  // 내가 보낸 제안. 내가 제시한 카드(offeredCardItem)의 원본 정보까지 가져온다.
  findOffersByOfferer(offererId) {
    return this.db.orm.public.ExchangeOffer.where({ offererId })
      .include("offeredCardItem", (item) =>
        item.include("photoCard", (card) => card.include("creator")),
      )
      .all();
  }
}
