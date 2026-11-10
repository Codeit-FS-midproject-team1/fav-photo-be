export class CardItemRepository {
  constructor(db) {
    this.db = db;
  }

  #model(tx) {
    return (tx ?? this.db).orm.public.CardItem;
  }

  // 기존 카드 생성 기능
  async createMany(items, tx) {
    for (const item of items) {
      await this.#model(tx).create(item);
    }
  }

  // 판매 가능한 HELD 카드를 트랜잭션 안에서 잠급니다.
  findHeldForSale(ownerId, photoCardId, quantity, tx) {
    if (!tx) {
      throw new Error("보유 카드 조회에는 트랜잭션이 필요합니다.");
    }

    return this.#model(tx)
      .where({
        ownerId,
        photoCardId,
        status: "HELD",
      })
      .orderBy([(item) => item.id.asc()])
      .limit(quantity)
      .forUpdate()
      .all();
  }

  // 예약한 카드들을 판매 상태로 변경하고 정확한 갱신 건수를 확인합니다.
  async markOnSale(items, listingId, tx) {
    if (!tx) {
      throw new Error("카드 상태 변경에는 트랜잭션이 필요합니다.");
    }

    let updatedCount = 0;

    for (const item of items) {
      const count = await this.#model(tx)
        .where({
          id: item.id,
          ownerId: item.ownerId,
          status: "HELD",
        })
        .updateAndCount({
          status: "ON_SALE",
          listingId,
        });

      if (count !== 1) {
        throw new Error("판매할 카드의 상태 변경에 실패했습니다.");
      }

      updatedCount += count;
    }

    return updatedCount;
  }
}
