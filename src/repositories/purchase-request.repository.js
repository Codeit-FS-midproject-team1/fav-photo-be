export class PurchaseRequestRepository {
  constructor(db) {
    this.db = db;
  }

  #model(tx) {
    return (tx ?? this.db).orm.public.PurchaseRequest;
  }

  // 사용자와 요청 키로 기존 구매 요청 조회
  findByBuyerAndKey(buyerId, idempotencyKey, tx) {
    return this.#model(tx)
      .where({
        buyerId,
        idempotencyKey,
      })
      .first();
  }

  // 최초 구매 요청 등록
  create({ buyerId, idempotencyKey, requestHash }, tx) {
    if (!tx) {
      throw new Error("구매 요청 등록에는 트랜잭션이 필요합니다.");
    }

    return this.#model(tx).create({
      buyerId,
      idempotencyKey,
      requestHash,
      responseJson: null,
    });
  }

  // 구매 성공 결과 저장
  saveResponse(requestId, response, tx) {
    if (!tx) {
      throw new Error("구매 결과 저장에는 트랜잭션이 필요합니다.");
    }

    return this.#model(tx)
      .where({ id: requestId })
      .updateAndCount({
        responseJson: JSON.stringify(response),
      });
  }
}
