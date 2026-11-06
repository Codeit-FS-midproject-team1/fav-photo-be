export class ExchangeOfferCardRepository {
  constructor(db) {
    this.db = db;
  }

  #medel(tx) {
    return (tx ?? this.db).orm.public.CardItem;
  }
  findById(id, tx) {
    return this.#medel(tx).where({ id }).first();
  }
  markAsOffered(cardItemId, ownerId, offerId, tx) {
    const query = this.#medel(tx).where({
      id: cardItemId,
      ownerId,
      status: "HELD",
    });

    return query.updateAndCount({
      status: "OFFERED",
      offerId,
    });
  }
}
