import { badRequest, notFound } from "../utils/http-error.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// 양의 정수가 아니면 400
const toPositiveInt = (value, name) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw badRequest(`${name}는 1 이상의 정수이어야 합니다.`, {
      [name]: "1 이상의 정수",
    });
  }
  return n;
};

export class NotificationService {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository;
  }

  async getNotifications(userId, query) {
    const cursor = query.cursor
      ? toPositiveInt(query.cursor, "cursor")
      : undefined;
    const limit = query.limit
      ? toPositiveInt(query.limit, "limit")
      : DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) {
      throw badRequest(`limit는 1~${MAX_LIMIT} 사이이어야 합니다.`, {
        limit: `1~${MAX_LIMIT}`,
      });
    }

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
      id: toPositiveInt(id, "id"),
      userId,
    });
    if (!updated) throw notFound("알림을 찾을 수 없습니다.");
  }

  // 다른 기능(가입, 구매, 교환)에서 부른다. 거래 트랜잭션 안이면 tx를 넘긴다.
  notify({ userId, type, message, link }, tx) {
    return this.notificationRepository.create(
      { userId, type, message, link },
      tx,
    );
  }
}
