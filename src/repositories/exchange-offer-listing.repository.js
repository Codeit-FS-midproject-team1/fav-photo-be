export class ExchangeOfferListingRepository {
  constructor(db) {
    this.db = db;
  }

  #model(tx) {
    return (tx ?? this.db).orm.public.SaleListing;
  }

  findById(id, tx) {
    return this.#model(tx).where({ id }).first();
  }

  decreaseRemainingQuantity(listingId, expectedQuantity, tx) {
    if (!Number.isSafeInteger(expectedQuantity) || expectedQuantity <= 0) {
      return 0;
    }

    return this.#model(tx)
      .where({
        id: listingId,
        status: "ON_SALE",
        remainingQuantity: expectedQuantity,
      })
      .updateAndCount({
        remainingQuantity: expectedQuantity - 1,
        status: expectedQuantity === 1 ? "SOLD_OUT" : "ON_SALE",
      });
  }
}
