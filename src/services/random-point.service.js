import { Buffer } from "node:buffer";
import { randomInt } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import {
  badRequest,
  conflict,
  notFound,
  unauthorized,
} from "#utils/http-error.js";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAILY_LIMIT = 3;

class RetryableDrawConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "RetryableDrawConflictError";
  }
}

export class RandomPointService {
  constructor({ randomPointRepository, db }) {
    this.randomPointRepository = randomPointRepository;
    this.db = db;
  }

  getKstDrawContext(now = new Date()) {
    const kstNow = new Date(now.getTime() + KST_OFFSET_MS);

    const drawDate = kstNow.toISOString().slice(0, 10);

    const nextResetAt = new Date(
      Date.UTC(
        kstNow.getUTCFullYear(),
        kstNow.getUTCMonth(),
        kstNow.getUTCDate() + 1,
        -9,
      ),
    ).toISOString();

    return {
      drawDate,
      nextResetAt,
    };
  }

  validateDrawRequest(userId, idempotencyKey) {
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw unauthorized();
    }

    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.trim().length === 0
    ) {
      throw badRequest("Idempotency-Key 요청 헤더는 필수입니다.", {
        "Idempotency-Key": "요청 ID를 입력해 주세요.",
      });
    }

    const normalizedKey = idempotencyKey.trim();

    if (Buffer.byteLength(normalizedKey, "utf8") > 128) {
      throw badRequest("Idempotency-Key는 128바이트 이하여야 합니다.", {
        "Idempotency-Key": "128바이트 이하로 입력해 주세요.",
      });
    }

    return {
      userId,
      idempotencyKey: normalizedKey,
    };
  }

  async getExistingDrawResult(userId, idempotencyKey, tx) {
    const history = await this.randomPointRepository.findHistoryByKey(
      userId,
      idempotencyKey,
      tx,
    );

    if (!history) {
      return null;
    }

    if (history.reason !== "RANDOM") {
      throw conflict("이미 다른 포인트 처리에 사용된 요청 ID입니다.");
    }

    const { nextResetAt } = this.getKstDrawContext(new Date(history.createdAt));

    const dayStartAt = new Date(
      new Date(nextResetAt).getTime() - 24 * 60 * 60 * 1000,
    ).toISOString();

    const histories = await this.randomPointRepository.findDailyRandomHistories(
      userId,
      dayStartAt,
      nextResetAt,
      tx,
    );

    const historyIndex = histories.findIndex((item) => item.id === history.id);

    if (historyIndex === -1) {
      throw new Error("랜덤 포인트 지급 이력의 정합성을 확인할 수 없습니다.");
    }

    return {
      earned: history.amount,
      points: history.balanceAfter,
      randomPoint: {
        used: historyIndex + 1,
        limit: 3,
        nextResetAt,
      },
    };
  }

  isRetryableDrawError(error) {
    if (error instanceof RetryableDrawConflictError) {
      return true;
    }

    const retryableSqlStates = new Set(["23505", "40001", "40P01"]);

    const visited = new Set();
    let current = error;

    while (current && typeof current === "object" && !visited.has(current)) {
      visited.add(current);

      if (retryableSqlStates.has(current.sqlState)) {
        return true;
      }

      current = current.cause;
    }

    return false;
  }

  async drawOnce(userId, idempotencyKey, now) {
    const validated = this.validateDrawRequest(userId, idempotencyKey);

    return this.db.transaction(async (tx) => {
      const existing = await this.getExistingDrawResult(
        validated.userId,
        validated.idempotencyKey,
        tx,
      );

      if (existing) {
        return existing;
      }

      const user = await this.randomPointRepository.findUserById(
        validated.userId,
        tx,
      );

      if (!user) {
        throw notFound("사용자를 찾을 수 없습니다.");
      }

      const drawAt = now ?? new Date();
      const { drawDate, nextResetAt } = this.getKstDrawContext(drawAt);

      const dailyLog = await this.randomPointRepository.findDailyLog(
        validated.userId,
        drawDate,
        tx,
      );

      if (dailyLog && dailyLog.usedCount >= 3) {
        throw conflict("오늘의 랜덤 포인트 뽑기 횟수를 모두 사용했습니다.");
      }

      const earned = randomInt(5, 16);
      const balanceAfter = user.points + earned;
      const nextUsedCount = (dailyLog?.usedCount ?? 0) + 1;

      if (dailyLog) {
        const updatedCount =
          await this.randomPointRepository.increaseDailyUsage(
            validated.userId,
            drawDate,
            dailyLog.usedCount,
            dailyLog.earnedPoints,
            earned,
            tx,
          );

        if (updatedCount !== 1) {
          throw new RetryableDrawConflictError(
            "뽑기 처리 중 다른 요청과 충돌했습니다.",
          );
        }
      } else {
        await this.randomPointRepository.createDailyLog(
          validated.userId,
          drawDate,
          earned,
          tx,
        );
      }

      const updatedUserCount =
        await this.randomPointRepository.increaseUserPoints(
          validated.userId,
          user.points,
          earned,
          tx,
        );

      if (updatedUserCount !== 1) {
        throw new RetryableDrawConflictError(
          "사용자 포인트 잔액 갱신 중 다른 요청과 충돌했습니다.",
        );
      }

      await this.randomPointRepository.createPointHistory(
        validated.userId,
        earned,
        balanceAfter,
        validated.idempotencyKey,
        drawAt.toISOString(),
        tx,
      );

      return {
        earned,
        points: balanceAfter,
        randomPoint: {
          used: nextUsedCount,
          limit: 3,
          nextResetAt,
        },
      };
    });
  }

  async draw(userId, idempotencyKey) {
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.drawOnce(userId, idempotencyKey);
      } catch (error) {
        if (!this.isRetryableDrawError(error)) {
          throw error;
        }

        if (attempt === maxAttempts) {
          throw conflict(
            "뽑기 요청이 집중되어 처리하지 못했습니다. 다시 시도해 주세요.",
          );
        }

        await sleep(attempt * 20);
      }
    }
  }

  async getUsage(userId, now) {
    const { drawDate, nextResetAt } = this.getKstDrawContext(now);
    const log = await this.randomPointRepository.findDailyLog(userId, drawDate);

    return { used: log?.usedCount ?? 0, limit: DAILY_LIMIT, nextResetAt };
  }
}
