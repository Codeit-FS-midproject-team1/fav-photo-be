export class RandomPointRepository {
  constructor(db) {
    this.db = db;
  }

  #logModel(tx) {
    return (tx ?? this.db).orm.public.RandomPointLog;
  }

  #historyModel(tx) {
    return (tx ?? this.db).orm.public.PointHistory;
  }

  #userModel(tx) {
    return (tx ?? this.db).orm.public.User;
  }

  findDailyLog(userId, drawDate, tx) {
    return this.#logModel(tx)
      .where({
        userId,
        drawDate,
      })
      .first();
  }

  findHistoryByKey(userId, idempotencyKey, tx) {
    return this.#historyModel(tx)
      .where({
        userId,
        idempotencyKey,
      })
      .first();
  }

  createDailyLog(userId, drawDate, earnedPoints, tx) {
    return this.#logModel(tx).create({
      userId,
      drawDate,
      usedCount: 1,
      earnedPoints,
    });
  }

  increaseDailyUsage(
    userId,
    drawDate,
    expectedUsedCount,
    expectedEarnedPoints,
    earnedPoints,
    tx,
  ) {
    if (
      !Number.isSafeInteger(expectedUsedCount) ||
      expectedUsedCount < 1 ||
      expectedUsedCount >= 3
    ) {
      return 0;
    }

    return this.#logModel(tx)
      .where({
        userId,
        drawDate,
        usedCount: expectedUsedCount,
        earnedPoints: expectedEarnedPoints,
      })
      .updateAndCount({
        usedCount: expectedUsedCount + 1,
        earnedPoints: expectedEarnedPoints + earnedPoints,
      });
  }

  findUserById(userId, tx) {
    return this.#userModel(tx).where({ id: userId }).first();
  }

  increaseUserPoints(userId, expectedPoints, earnedPoints, tx) {
    const nextPoints = expectedPoints + earnedPoints;

    if (
      !Number.isSafeInteger(expectedPoints) ||
      expectedPoints < 0 ||
      !Number.isSafeInteger(earnedPoints) ||
      earnedPoints <= 0 ||
      nextPoints > 2147483647
    ) {
      return 0;
    }

    return this.#userModel(tx)
      .where({
        id: userId,
        points: expectedPoints,
      })
      .updateAndCount({
        points: nextPoints,
      });
  }

  createPointHistory(
    userId,
    earnedPoints,
    balanceAfter,
    idempotencyKey,
    createdAt,
    tx,
  ) {
    return this.#historyModel(tx).create({
      userId,
      amount: earnedPoints,
      reason: "RANDOM",
      balanceAfter,
      idempotencyKey,
      createdAt,
    });
  }

  findDailyRandomHistories(userId, dayStartAt, nextDayStartAt, tx) {
    return this.#historyModel(tx)
      .where({
        userId,
        reason: "RANDOM",
      })
      .where((history) => history.createdAt.gte(dayStartAt))
      .where((history) => history.createdAt.lt(nextDayStartAt))
      .orderBy((history) => history.id.asc())
      .all();
  }
}
