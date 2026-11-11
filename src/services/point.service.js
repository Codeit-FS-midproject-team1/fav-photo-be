import { badRequest, notFound, conflict } from "#utils/http-error.js";

const MAX_POINTS = 2147483647;

const validatePositiveInt = (value, field) => {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_POINTS) {
    throw badRequest(undefined, {
      [field]: "1 이상의 올바른 정수를 입력해 주세요.",
    });
  }
};

export class PointService {
  constructor({ pointRepository, pointHistoryRepository }) {
    this.pointRepository = pointRepository;
    this.pointHistoryRepository = pointHistoryRepository;
  }

  // 구매 트랜잭션이 전달되었는지 확인
  #requireTransaction(tx) {
    if (!tx) {
      throw new Error("포인트 변경에는 트랜잭션이 필요합니다.");
    }
  }

  // 사용자 조회 및 행 잠금
  async #lockUser(userId, tx) {
    const user = await this.pointRepository.findByIdForUpdate(userId, tx);

    if (!user || user.deletedAt) {
      throw notFound("사용자를 찾을 수 없습니다.");
    }

    return user;
  }

  // 포인트 변경과 내역 저장
  async #applyChange(user, amount, reason, tx) {
    const nextBalance = user.points + amount;

    if (nextBalance < 0) {
      throw conflict("포인트가 부족합니다.");
    }

    if (!Number.isSafeInteger(nextBalance) || nextBalance > MAX_POINTS) {
      throw conflict("포인트 보유 한도를 초과했습니다.");
    }

    const updatedCount = await this.pointRepository.updateBalance(
      user.id,
      user.points,
      nextBalance,
      tx,
    );

    if (updatedCount !== 1) {
      throw conflict("포인트 잔액이 변경되었습니다. 다시 시도해 주세요.");
    }

    await this.pointHistoryRepository.create(
      {
        userId: user.id,
        amount,
        reason,
        balanceAfter: nextBalance,
      },
      tx,
    );

    return {
      userId: user.id,
      amount,
      balanceAfter: nextBalance,
    };
  }

  // 구매자 포인트 차감
  async decreasePoints(userId, amount, tx) {
    this.#requireTransaction(tx);
    validatePositiveInt(userId, "userId");
    validatePositiveInt(amount, "amount");

    const user = await this.#lockUser(userId, tx);

    return this.#applyChange(user, -amount, "PURCHASE", tx);
  }

  // 판매자 포인트 적립
  async increasePoints(userId, amount, tx) {
    this.#requireTransaction(tx);
    validatePositiveInt(userId, "userId");
    validatePositiveInt(amount, "amount");

    const user = await this.#lockUser(userId, tx);

    return this.#applyChange(user, amount, "SALE", tx);
  }

  // 구매 시 구매자 차감과 판매자 적립을 함께 처리
  async transferForPurchase({ buyerId, sellerId, amount }, tx) {
    this.#requireTransaction(tx);

    validatePositiveInt(buyerId, "buyerId");
    validatePositiveInt(sellerId, "sellerId");
    validatePositiveInt(amount, "amount");

    if (buyerId === sellerId) {
      throw badRequest("자신의 판매글은 구매할 수 없습니다.");
    }

    // 서로 반대 방향의 구매 요청에서도
    // 사용자 행을 같은 순서로 잠가 교착 상태 위험을 줄입니다.
    const ids = [buyerId, sellerId].sort((a, b) => a - b);

    const lockedUsers = new Map();

    for (const id of ids) {
      const user = await this.#lockUser(id, tx);
      lockedUsers.set(id, user);
    }

    const buyer = lockedUsers.get(buyerId);
    const seller = lockedUsers.get(sellerId);

    if (buyer.points < amount) {
      throw conflict("포인트가 부족합니다.");
    }

    const buyerResult = await this.#applyChange(buyer, -amount, "PURCHASE", tx);

    const sellerResult = await this.#applyChange(seller, amount, "SALE", tx);

    return {
      buyer: buyerResult,
      seller: sellerResult,
    };
  }
}
