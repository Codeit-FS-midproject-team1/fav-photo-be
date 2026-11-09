import { and } from "@prisma/orm-postgres/orm-client";

// 검색어의 %, _ 를 글자 그대로 찾게 한다
const escapeLike = (text) => text.replace(/[\\%_]/g, "\\$&");

export class PhotoCardRepository {
  // constructor: db 를 받아 this.db 에 저장
  constructor(db) {
    this.db = db;
  }

  //tx 가 있으면 tx, 없으면 this.db 를 써서 PhotoCard 모델을 돌려준다.
  #model(tx) {
    return (tx ?? this.db).orm.public.PhotoCard;
  }

  // photo_cards 에 한 행 저장하고, 저장된 행을 돌려준다.
  create(data, tx) {
    return this.#model(tx).create(data);
  }
  // 마이갤러리: 내 보유(HELD) 카드가 1장 이상 있는 원본 카드 목록
  // 원본 1개당 1줄. cardItems 자리에 { quantity, latestAcquiredAt } 이 들어온다
  findHeldByOwner(ownerId, { keyword, genre }) {
    // "내 카드이고 보유 상태" 조건. 아래에서 두 번 쓴다
    const held = (c) => and(c.ownerId.eq(ownerId), c.status.eq("HELD"));

    let query = this.#model().where((p) => p.cardItems.some(held));
    if (keyword) {
      const pattern = `%${escapeLike(keyword)}%`;
      query = query.where((p) => p.name.ilike(pattern));
    }
    if (genre) query = query.where({ genre });

    return query
      .include("creator", (user) => user.select("id", "nickname", "deletedAt"))
      .include("cardItems", (items) => {
        const mine = items.where(held);
        return mine.combine({
          quantity: mine.count(),
          latestAcquiredAt: mine.max("acquiredAt"),
        });
      })
      .all();
  }
}
