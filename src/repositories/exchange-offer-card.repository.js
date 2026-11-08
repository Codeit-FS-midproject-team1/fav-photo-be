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

  findOnSaleCardByListingId(listingId, ownerId, tx) {
    return this.#model(tx)
      .where({
        listingId,
        ownerId,
        status: "ON_SALE",
      })
      .orderBy((card) => card.id.asc())
      .first();
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

  transferOnSaleCard(
    cardItemId,
    sellerId,
    offererId,
    listingId,
    acquiredAt,
    tx,
  ) {
    return this.#model(tx)
      .where({
        id: cardItemId,
        ownerId: sellerId,
        listingId,
        status: "ON_SALE",
      })
      .updateAndCount({
        ownerId: offererId,
        status: "HELD",
        listingId: null,
        offerId: null,
        acquiredAt,
      });
  }

  transferOfferedCard(
    cardItemId,
    offererId,
    sellerId,
    offerId,
    acquiredAt,
    tx,
  ) {
    return this.#model(tx)
      .where({
        id: cardItemId,
        ownerId: offererId,
        status: "OFFERED",
        offerId,
      })
      .updateAndCount({
        ownerId: sellerId,
        status: "HELD",
        listingId: null,
        offerId: null,
        acquiredAt,
      });
  }
}
