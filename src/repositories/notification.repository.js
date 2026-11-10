export class NotificationRepository {
  constructor(db) {
    this.db = db;
  }

  // 트랜잭션 안이면 tx, 아니면 db로 쿼리
  #model(tx) {
    return (tx ?? this.db).orm.public.Notification;
  }

  // 최신순, cursor가 있으면 그 id 보다 오래된 것만
  findManyByUser({ userId, cursor, limit }) {
    let query = this.#model().where({ userId });
    if (cursor) query = query.where((n) => n.id.lt(cursor));
    return query
      .orderBy((n) => n.id.desc())
      .limit(limit)
      .all();
  }

  async countUnread(userId) {
    const { count } = await this.#model()
      .where({ userId, isRead: false })
      .aggregate((agg) => ({ count: agg.count() }));
    return count;
  }

  // 내 알람일 때만 바뀐다. 아니면 null
  markRead({ id, userId }) {
    return this.#model().where({ id, userId }).update({ isRead: true });
  }

  // 구매, 교환 등 다른 기능의 트랜잭션 안에서 함께 만들 수 있게 tx를 받는다.
  create({ userId, type, message, link = null }, tx) {
    return this.#model(tx).create({
      userId,
      type,
      message,
      link,
      isRead: false,
    });
  }
}
