export class CardItemRepository {
  constructor(db) {
    this.db = db;
  }

  #model(tx) {
    return (tx ?? this.db).orm.public.CardItem;
  }

  // 포토카드 생성 시 실제 소유 카드 생성
  async createMany(items, tx) {
    for (const item of items) {
      await this.#model(tx).create(item);
    }
  }

  // 판매 가능한 HELD 카드 조회 및 잠금
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

  // 판매 등록: HELD → ON_SALE
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

  // 판매 취소: 해당 판매글의 남은 카드 전체 복구
  // ON_SALE → HELD
  restoreFromSaleListing(listingId, sellerId, tx) {
    if (!tx) {
      throw new Error("판매 카드 복구에는 트랜잭션이 필요합니다.");
    }

    return this.#model(tx)
      .where({
        listingId,
        ownerId: sellerId,
        status: "ON_SALE",
      })
      .updateAndCount({
        status: "HELD",
        listingId: null,
      });
  }

  // 판매 수정: 지정한 수량만큼 카드 복구
  // ON_SALE → HELD
  async releaseFromSaleListing(listingId, sellerId, quantity, tx) {
    if (!tx) {
      throw new Error("판매 카드 수량 변경에는 트랜잭션이 필요합니다.");
    }

    const items = await this.#model(tx)
      .where({
        listingId,
        ownerId: sellerId,
        status: "ON_SALE",
      })
      .orderBy([(item) => item.id.desc()])
      .limit(quantity)
      .forUpdate()
      .all();

    if (items.length !== quantity) {
      return items.length;
    }

    let restoredCount = 0;

    for (const item of items) {
      const count = await this.#model(tx)
        .where({
          id: item.id,
          listingId,
          ownerId: sellerId,
          status: "ON_SALE",
        })
        .updateAndCount({
          status: "HELD",
          listingId: null,
        });

      if (count !== 1) {
        throw new Error("판매 카드 복구에 실패했습니다.");
      }

      restoredCount += count;
    }

    return restoredCount;
  }

  // 구매 시 판매 카드의 소유권을 구매자에게 이전
  // ON_SALE → HELD
  // ownerId: 판매자 → 구매자
  async transferSaleItemsToBuyer(
    { listingId, sellerId, buyerId, quantity },
    tx,
  ) {
    if (!tx) {
      throw new Error("카드 소유권 이전에는 트랜잭션이 필요합니다.");
    }

    // 해당 판매글의 판매 중인 카드만 조회하고 잠급니다.
    const items = await this.#model(tx)
      .where({
        listingId,
        ownerId: sellerId,
        status: "ON_SALE",
      })
      .orderBy([(item) => item.id.asc()])
      .limit(quantity)
      .forUpdate()
      .all();

    if (items.length !== quantity) {
      return 0;
    }

    let transferredCount = 0;

    for (const item of items) {
      const count = await this.#model(tx)
        .where({
          id: item.id,
          listingId,
          ownerId: sellerId,
          status: "ON_SALE",
        })
        .updateAndCount({
          ownerId: buyerId,
          status: "HELD",
          listingId: null,
          offerId: null,
          acquiredAt: new Date().toISOString(),
        });

      if (count !== 1) {
        throw new Error("포토카드 소유권 이전에 실패했습니다.");
      }

      transferredCount += count;
    }

    return transferredCount;
  }
}
