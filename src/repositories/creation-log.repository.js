export class CreationLogRepository {
  // constructor, #model(tx): 모델은 CreationLog
  constructor(db) {
    this.db = db;
  }

  #model(tx) {
    return (tx ?? this.db).orm.public.CreationLog;
  }

  // 이번 달 행이 없으면 createdCount 0 으로 만들고, 있으면 그대로 둔다.
  async ensure(userId, yearMonth, tx) {
    const existing = await this.#model(tx).where({ userId, yearMonth }).first();
    if (existing) return existing;
    return this.#model(tx).upsert({
      create: { userId, yearMonth, createdCount: 0 },
      update: {},
      conflictOn: { userId, yearMonth },
    });
  }

  // (userId, yearMonth) 로 행을 찾아 "잠그면서" 하나 가져온다.
  findForUpdate(userId, yearMonth, tx) {
    return this.#model(tx).where({ userId, yearMonth }).forUpdate().first();
  }

  // id 로 찾아서 createdCount 를 바꾼다.
  setCount(id, createdCount, tx) {
    return this.#model(tx).where({ id }).update({ createdCount });
  }

  findByMonth(userId, yearMonth) {
    return this.#model().where({ userId, yearMonth }).first();
  }
}
