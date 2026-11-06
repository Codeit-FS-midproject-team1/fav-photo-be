import { badRequest, notFound } from "../utils/http-error.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const LIMIT_REASON = `1~${MAX_LIMIT} 사이로 입력해 주세요.`;

// 양의 정수가 아니면 400  message 는 공통 문구, 이유는 fields 에
const toPositiveInt = (value, field, reason) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1)
    throw badRequest(undefined, { [field]: reason });
  return n;
};

export class NotificationService {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository;
  }

  async getNotifications(userId, query) {
    const cursor = query.cursor
      ? toPositiveInt(query.cursor, "cursor", "올바른 커서가 아닙니다.")
      : undefined;
    const limit = query.limit
      ? toPositiveInt(query.limit, "limit", LIMIT_REASON)
      : DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) throw badRequest(undefined, { limit: LIMIT_REASON });

    // 하나 더 가져와서 다음 페이지가 있는지 본다
    const rows = await this.notificationRepository.findManyByUser({
      userId,
      cursor,
      limit: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = rows
      .slice(0, limit)
      .map(({ id, type, message, link, isRead, createdAt }) => ({
        id,
        type,
        message,
        link,
        isRead,
        createdAt: new Date(createdAt).toISOString(),
      }));

    return {
      items,
      nextCursor: hasMore ? String(items.at(-1).id) : null,
      unreadCount: await this.notificationRepository.countUnread(userId),
    };
  }

  async markRead(userId, id) {
    const updated = await this.notificationRepository.markRead({
      id: toPositiveInt(id, "id", "올바른 알림 번호가 아닙니다."),
      userId,
    });
    if (!updated) throw notFound("존재하지 않는 알림입니다.");
  }

  // 다른 기능(가입, 구매, 교환)에서 부른다. 거래 트랜잭션 안이면 tx를 넘긴다.
  notify({ userId, type, message, link }, tx) {
    return this.notificationRepository.create(
      { userId, type, message, link },
      tx,
    );
  }
}
