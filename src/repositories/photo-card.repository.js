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
}
