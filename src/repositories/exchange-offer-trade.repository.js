export class ExchangeOfferTradeRepository {
  constructor(db) {
    this.db = db;
  }

  #model(tx) {
    return (tx ?? this.db).orm.public.Trade;
  }

  createExchangeTrade(
    { sellerId, offererId, photoCardId, receivedPhotoCardId },
    tx,
  ) {
    return this.#model(tx).create({
      type: "EXCHANGE",
      sellerId,
      counterpartId: offererId,
      photoCardId,
      receivedPhotoCardId,
      quantity: 1,
      points: 0,
    });
  }
}
