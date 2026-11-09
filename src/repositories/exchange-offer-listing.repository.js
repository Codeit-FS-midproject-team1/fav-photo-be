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
}
