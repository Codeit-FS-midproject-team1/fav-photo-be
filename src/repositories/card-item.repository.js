export class CardItemRepository {
  constructor(db) {
    this.db = db;
  }

  #model(tx) {
    return (tx ?? this.db).orm.public.CardItem;
  }

  async createMany(items, tx) {
    for (const item of items) {
      await this.#model(tx).create(item);
    }
  }
}
