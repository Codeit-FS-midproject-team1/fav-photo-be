export class ExchangeOfferCardRepository {
  constructor(db) {
    this.db = db;
  }

  #model(tx) {
    return (tx ?? this.db).orm.public.CardItem;
  }

  findById(id, tx) {
    return this.#model(tx).where({ id }).first();
  }

  findPhotoCardById(photoCardId, tx) {
    return (tx ?? this.db).orm.public.PhotoCard.where({
      id: photoCardId,
    }).first();
  }

  markAsOffered(cardItemId, ownerId, offerId, tx) {
    const query = this.#model(tx).where({
      id: cardItemId,
      ownerId,
      status: "HELD",
    });

    return query.updateAndCount({
      status: "OFFERED",
      offerId,
    });
  }

  restoreFromOffer(cardItemId, ownerId, offerId, tx) {
    return this.#model(tx)
      .where({
        id: cardItemId,
        ownerId,
        status: "OFFERED",
        offerId,
      })
      .updateAndCount({
        status: "HELD",
        offerId: null,
      });
  }
}
