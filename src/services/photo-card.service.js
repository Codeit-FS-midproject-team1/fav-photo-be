import { badRequest, conflict } from "#utils/http-error.js";

const MONTHLY_LIMIT = 3; // 팀 정책: 월 3회

// kstYearMonth(now): KST 기준 "2026-11" 형태의 문자열을 돌려주는 함수
const kstYearMonth = (now = new Date()) =>
  new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 7);

export class PhotoCardService {
  constructor({
    photoCardRepository,
    cardItemRepository,
    creationLogRepository,
    imageStorage,
    runInTransaction,
  }) {
    this.photoCardRepository = photoCardRepository;
    this.cardItemRepository = cardItemRepository;
    this.creationLogRepository = creationLogRepository;
    this.imageStorage = imageStorage;
    this.runInTransaction = runInTransaction;
  }

  async create(userId, input, file) {
    // file 이 없으면 400 ("이미지를 등록해주세요.")
    if (!file) {
      throw badRequest("이미지를 등록해주세요.");
    }

    // Cloudinary에 올리고 { url, publicId }를 받아 둔다. 실패 시 삭제할 때 publicId 필요.
    const uploaded = await this.imageStorage.upload(file.buffer);

    try {
      // 주입 받은 함수 호출. 콜백 안의 모든 DB작업이 하나의 트랜잭션
      const photoCard = await this.runInTransaction(async (tx) => {
        // 월간 제한 확인과 증가
        await this.#consumeMonthlyQuota(userId, tx);

        // photo_cards에 저장
        const created = await this.photoCardRepository.create(
          {
            creatorId: userId,
            name: input.name,
            description: input.description,
            method: input.method,
            genre: input.genre,
            price: input.price,
            totalQuantity: input.totalQuantity,
            imageUrl: uploaded.url,
          },
          tx,
        );

        const acquiredAt = new Date().toISOString();

        // card_items 를 totalQuantity 개 저장
        const items = Array.from({ length: input.totalQuantity }, () => ({
          photoCardId: created.id,
          ownerId: userId,
          status: "HELD",
          listingId: null,
          offerId: null,
          acquiredAt,
        }));
        // 아이템 저장
        await this.cardItemRepository.createMany(items, tx);

        return created;
      });

      return this.#toResponse(photoCard);
    } catch (error) {
      // 올렸던 이미지 지우기.
      await this.imageStorage.delete(uploaded.publicId).catch(console.error);
      throw error;
    }
  }

  async #consumeMonthlyQuota(userId, tx) {
    const yearMonth = kstYearMonth();
    await this.creationLogRepository.ensure(userId, yearMonth, tx);
    const log = await this.creationLogRepository.findForUpdate(
      userId,
      yearMonth,
      tx,
    );
    if (log.createdCount >= MONTHLY_LIMIT) {
      throw conflict("이번 달 포토카드 생성 횟수를 초과했습니다.");
    }
    await this.creationLogRepository.setCount(log.id, log.createdCount + 1, tx);
  }

  #toResponse(c) {
    return {
      id: c.id,
      creatorId: c.creatorId,
      name: c.name,
      description: c.description,
      method: c.method,
      genre: c.genre,
      price: c.price,
      totalQuantity: c.totalQuantity,
      imageUrl: c.imageUrl,
      createdAt: new Date(c.createdAt).toISOString(),
    };
  }
}
