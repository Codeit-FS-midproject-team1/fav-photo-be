export class ExchangeOfferRepository {
  constructor(db) {
    this.db = db;
  }

  #model(tx) {
    return (tx ?? this.db).orm.public.ExchangeOffer;
  }

  findByListingId(listingId, { offererId, tx } = {}) {
    let query = this.#model(tx)
      .where({ listingId })
      .where({ status: "PENDING" });

    if (offererId !== undefined) {
      query = query.where({ offererId });
    }

    return query.orderBy((offer) => offer.createdAt.desc()).all();
  }
  create(data, tx) {
    const model = this.#model(tx);

    return model.create(data);
  }
}
