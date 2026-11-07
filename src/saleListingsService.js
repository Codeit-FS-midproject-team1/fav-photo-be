import { ApiError, validateCreate, validatePatch, validatePurchase } from './validation.js';
import { inTransaction } from './database.js';

const conflict = message => { throw new ApiError(409, message); };
const notFound = message => { throw new ApiError(404, message); };

const dateString = value => value instanceof Date ? value.toISOString() : value;

/** DB 컬럼을 판매 등록/수정 응답의 camelCase 형식으로 변환합니다. */
function serializeListing(row) {
  return {
    id: row.id,
    sellerId: row.seller_id,
    photoCardId: row.photo_card_id,
    saleQuantity: row.sale_quantity,
    remainingQuantity: row.remaining_quantity,
    price: row.price,
    exchangeMethod: row.exchange_method,
    exchangeGenre: row.exchange_genre,
    exchangeDescription: row.exchange_description,
    status: row.status,
    createdAt: dateString(row.created_at),
    updatedAt: dateString(row.updated_at),
  };
}

/** 판매글 잠금: 구매/수정/취소/교환 승인에서는 같은 행을 먼저 잠가야 합니다. */
async function lockListing(client, id) {
  const result = await client.query('SELECT * FROM sale_listings WHERE id = $1 FOR UPDATE', [id]);
  if (!result.rowCount) notFound('판매글이 존재하지 않습니다.');
  return result.rows[0];
}

/** 거래 불가 상태인 판매글을 차단합니다. */
function requireOnSale(listing) {
  if (listing.status !== 'ON_SALE') conflict('현재 판매 중인 포토카드가 아닙니다.');
}

/** 사용 가능한 카드 N개를 안전하게 예약합니다. (경합 시 SKIP LOCKED) */
async function reserveCards(client, { sellerId, photoCardId, listingId, quantity }) {
  if (quantity <= 0) return;
  const result = await client.query(`
    UPDATE card_items AS ci
       SET status = 'ON_SALE', listing_id = $3, offer_id = NULL
      FROM (
        SELECT id FROM card_items
         WHERE owner_id = $1 AND photo_card_id = $2
           AND status = 'HELD' AND listing_id IS NULL AND offer_id IS NULL
         ORDER BY id FOR UPDATE SKIP LOCKED LIMIT $4
      ) AS picked
     WHERE ci.id = picked.id
     RETURNING ci.id
  `, [sellerId, photoCardId, listingId, quantity]);
  if (result.rowCount !== quantity) conflict('보유 중인 포토카드 수량이 부족합니다.');
}

/** 판매 중인 카드 N장을 보유 상태로 복구합니다. */
async function restoreCards(client, { listingId, quantity }) {
  if (quantity <= 0) return;
  const result = await client.query(`
    UPDATE card_items AS ci
       SET status = 'HELD', listing_id = NULL, offer_id = NULL
      FROM (
        SELECT id FROM card_items
         WHERE listing_id = $1 AND status = 'ON_SALE'
         ORDER BY id FOR UPDATE LIMIT $2
      ) AS picked
     WHERE ci.id = picked.id
     RETURNING ci.id
  `, [listingId, quantity]);
  if (result.rowCount !== quantity) conflict('판매 수량과 실제 카드 상태가 일치하지 않습니다.');
}

/** 알림 한 건 생성. 실제 FE 상세 주소로 link를 교체할 수 있습니다. */
async function notify(client, userId, type, message, listingId) {
  await client.query(`
    INSERT INTO notifications (user_id, type, message, link, is_read, created_at)
    VALUES ($1, $2, $3, $4, FALSE, NOW())
  `, [userId, type, message, `/sale-listings/${listingId}`]);
}

/** 대기 중인 제안을 거절하고 제안자가 맡긴 카드를 HELD로 돌립니다. */
async function rejectPendingOffers(client, listingId) {
  const offers = await client.query(`
    UPDATE exchange_offers SET status = 'REJECTED'
     WHERE listing_id = $1 AND status = 'PENDING'
     RETURNING id, offerer_id, offered_card_item_id
  `, [listingId]);
  for (const offer of offers.rows) {
    const restored = await client.query(`
      UPDATE card_items SET status = 'HELD', offer_id = NULL
       WHERE id = $1 AND owner_id = $2 AND offer_id = $3 AND status = 'OFFERED'
       RETURNING id
    `, [offer.offered_card_item_id, offer.offerer_id, offer.id]);
    if (restored.rowCount !== 1) conflict('교환 제안 카드 상태가 일치하지 않습니다.');
    await notify(client, offer.offerer_id, 'OFFER_REJECTED', '교환 제안이 자동 거절되었습니다.', listingId);
  }
  return offers.rowCount;
}

/** 판매 등록: 판매글과 ON_SALE 카드 연결을 하나의 트랜잭션으로 수행합니다. */
export async function createListing(pool, actorId, rawBody) {
  const body = validateCreate(rawBody);
  return inTransaction(pool, async client => {
    const photoCard = await client.query('SELECT id FROM photo_cards WHERE id = $1', [body.photoCardId]);
    if (!photoCard.rowCount) notFound('포토카드가 존재하지 않습니다.');
    const created = await client.query(`
      INSERT INTO sale_listings (
        seller_id, photo_card_id, sale_quantity, remaining_quantity, price,
        exchange_method, exchange_genre, exchange_description, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $3, $4, $5, $6, $7, 'ON_SALE', NOW(), NOW())
      RETURNING *
    `, [actorId, body.photoCardId, body.quantity, body.price, body.exchangeMethod, body.exchangeGenre, body.exchangeDescription]);
    const listing = created.rows[0];
    await reserveCards(client, { sellerId: actorId, photoCardId: body.photoCardId, listingId: listing.id, quantity: body.quantity });
    return serializeListing(listing);
  });
}

/** 판매 상세 조회: 비로그인 사용자에게도 공개. 취소된 글의 조회 정책은 팀 합의 필요. */
export async function getListing(pool, id) {
  const result = await pool.query(`
    SELECT l.*,
           c.id AS card_id, c.name AS card_name, c.description AS card_description,
           c.image_url AS card_image_url, c.method AS card_method, c.genre AS card_genre,
           s.nickname AS seller_nickname
      FROM sale_listings l
      JOIN photo_cards c ON c.id = l.photo_card_id
      JOIN users s ON s.id = l.seller_id
     WHERE l.id = $1
  `, [id]);
  if (!result.rowCount) notFound('판매글이 존재하지 않습니다.');
  const row = result.rows[0];
  return {
    id: row.id,
    photoCard: {
      id: row.card_id,
      name: row.card_name,
      description: row.card_description,
      imageUrl: row.card_image_url,
      method: row.card_method,
      genre: row.card_genre,
    },
    seller: { id: row.seller_id, nickname: row.seller_nickname },
    saleQuantity: row.sale_quantity,
    remainingQuantity: row.remaining_quantity,
    price: row.price,
    exchangeMethod: row.exchange_method,
    exchangeGenre: row.exchange_genre,
    exchangeDescription: row.exchange_description,
    status: row.status,
    createdAt: dateString(row.created_at),
    updatedAt: dateString(row.updated_at),
  };
}

/** 판매 수정: 이미 거래된 양 = sale_quantity - remaining_quantity 를 유지합니다. */
export async function updateListing(pool, actorId, id, rawBody) {
  const patch = validatePatch(rawBody);
  return inTransaction(pool, async client => {
    const before = await lockListing(client, id);
    if (before.seller_id !== actorId) throw new ApiError(403, '본인 판매글만 수정할 수 있습니다.');
    requireOnSale(before);

    const nextRemain = Object.hasOwn(patch, 'quantity') ? patch.quantity : before.remaining_quantity;
    const delta = nextRemain - before.remaining_quantity;
    if (delta > 0) {
      await reserveCards(client, { sellerId: actorId, photoCardId: before.photo_card_id, listingId: id, quantity: delta });
    } else if (delta < 0) {
      await restoreCards(client, { listingId: id, quantity: -delta });
    }

    const columns = [];
    const params = [];
    const assignments = {
      sale_quantity: before.sale_quantity + delta,
      remaining_quantity: nextRemain,
      ...(Object.hasOwn(patch, 'price') && { price: patch.price }),
      ...(Object.hasOwn(patch, 'exchangeMethod') && { exchange_method: patch.exchangeMethod }),
      ...(Object.hasOwn(patch, 'exchangeGenre') && { exchange_genre: patch.exchangeGenre }),
      ...(Object.hasOwn(patch, 'exchangeDescription') && { exchange_description: patch.exchangeDescription }),
    };
    for (const [name, value] of Object.entries(assignments)) {
      params.push(value);
      columns.push(`${name} = $${params.length}`);
    }
    params.push(id);
    const changed = await client.query(`
      UPDATE sale_listings SET ${columns.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length} RETURNING *
    `, params);

    // 팀 합의: 판매 수정 시 PENDING 교환 제안자에게 변경 알림
    const waiting = await client.query(`
      SELECT DISTINCT offerer_id FROM exchange_offers
       WHERE listing_id = $1 AND status = 'PENDING'
    `, [id]);
    for (const row of waiting.rows) {
      await notify(client, row.offerer_id, 'LISTING_UPDATED', '제안한 판매글의 정보가 수정되었습니다.', id);
    }
    return serializeListing(changed.rows[0]);
  });
}

/** 판매 취소: 소프트 삭제 + 남은 카드 복구 + 대기 교환 제안 자동 거절. */
export async function cancelListing(pool, actorId, id) {
  return inTransaction(pool, async client => {
    const before = await lockListing(client, id);
    if (before.seller_id !== actorId) throw new ApiError(403, '본인 판매글만 취소할 수 있습니다.');
    requireOnSale(before);
    await restoreCards(client, { listingId: id, quantity: before.remaining_quantity });
    await rejectPendingOffers(client, id);
    const result = await client.query(`
      UPDATE sale_listings SET status = 'CANCELED', updated_at = NOW()
       WHERE id = $1 RETURNING id, status, updated_at
    `, [id]);
    return {
      id: result.rows[0].id,
      status: result.rows[0].status,
      updatedAt: dateString(result.rows[0].updated_at),
    };
  });
}

/** 구매: 수량/포인트/소유권/거래 기록/알림을 한 번에 반영합니다. */
export async function purchaseListing(pool, actorId, id, rawBody, { pointHistoryHasBalanceAfter = false } = {}) {
  const { quantity } = validatePurchase(rawBody);
  return inTransaction(pool, async client => {
    const listing = await lockListing(client, id);
    requireOnSale(listing);
    if (listing.seller_id === actorId) throw new ApiError(403, '자신의 판매글은 구매할 수 없습니다.');
    if (quantity > listing.remaining_quantity) conflict('남은 포토카드 수량이 부족합니다.');
    const totalPrice = listing.price * quantity;
    if (!Number.isSafeInteger(totalPrice) || totalPrice < 1) throw new ApiError(400, '구매 금액이 올바르지 않습니다.');

    // 유저 행은 ID 오름차순으로 잠가 포인트 동시 갱신 충돌을 줄입니다.
    const users = await client.query(`
      SELECT id, points, deleted_at FROM users WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE
    `, [[actorId, listing.seller_id]]);
    if (users.rowCount !== 2) notFound('구매자 또는 판매자 정보를 찾을 수 없습니다.');
    const buyer = users.rows.find(user => user.id === actorId);
    const seller = users.rows.find(user => user.id === listing.seller_id);
    if (buyer.deleted_at || seller.deleted_at) conflict('탈퇴한 사용자와는 거래할 수 없습니다.');
    if (buyer.points < totalPrice) conflict('포인트가 부족합니다.');

    // 실제 판매 중인 카드 N장을 구매자 소유로 이전
    const moved = await client.query(`
      UPDATE card_items AS ci
         SET owner_id = $2, status = 'HELD', listing_id = NULL,
             offer_id = NULL, acquired_at = NOW()
        FROM (
          SELECT id FROM card_items
           WHERE listing_id = $1 AND owner_id = $3 AND status = 'ON_SALE'
           ORDER BY id FOR UPDATE LIMIT $4
        ) AS picked
       WHERE ci.id = picked.id
       RETURNING ci.id
    `, [id, actorId, listing.seller_id, quantity]);
    if (moved.rowCount !== quantity) conflict('판매 수량과 실제 카드 재고가 일치하지 않습니다.');

    const buyerUpdate = await client.query(`
      UPDATE users SET points = points - $2
       WHERE id = $1 AND points >= $2 RETURNING points
    `, [actorId, totalPrice]);
    if (buyerUpdate.rowCount !== 1) conflict('포인트가 부족합니다.');
    const sellerUpdate = await client.query(`
      UPDATE users SET points = points + $2 WHERE id = $1 RETURNING points
    `, [listing.seller_id, totalPrice]);

    const remain = listing.remaining_quantity - quantity;
    const nextStatus = remain === 0 ? 'SOLD_OUT' : 'ON_SALE';
    await client.query(`
      UPDATE sale_listings
         SET remaining_quantity = $2, status = $3, updated_at = NOW()
       WHERE id = $1
    `, [id, remain, nextStatus]);

    const trade = await client.query(`
      INSERT INTO trades (
        type, seller_id, counterpart_id, photo_card_id, received_photo_card_id,
        quantity, points, created_at
      ) VALUES ('PURCHASE', $1, $2, $3, NULL, $4, $5, NOW())
      RETURNING id, created_at
    `, [listing.seller_id, actorId, listing.photo_card_id, quantity, totalPrice]);

    // 최신 ERD에서 balance_after 필드가 있다면 true로 설정하세요.
    if (pointHistoryHasBalanceAfter) {
      await client.query(`
        INSERT INTO point_histories (user_id, amount, reason, balance_after, created_at)
        VALUES ($1, $2, 'PURCHASE', $3, NOW()), ($4, $5, 'SALE', $6, NOW())
      `, [actorId, -totalPrice, buyerUpdate.rows[0].points, listing.seller_id, totalPrice, sellerUpdate.rows[0].points]);
    } else {
      await client.query(`
        INSERT INTO point_histories (user_id, amount, reason, created_at)
        VALUES ($1, $2, 'PURCHASE', NOW()), ($3, $4, 'SALE', NOW())
      `, [actorId, -totalPrice, listing.seller_id, totalPrice]);
    }
    await notify(client, actorId, 'PURCHASE_COMPLETED', '포토카드 구매가 완료되었습니다.', id);
    await notify(client, listing.seller_id, 'SALE_COMPLETED', '포토카드 판매가 완료되었습니다.', id);
    if (remain === 0) {
      await notify(client, listing.seller_id, 'SOLD_OUT', '포토카드가 모두 판매되었습니다.', id);
      // 잠정 정책: 품절 시 대기 중인 제안도 자동 거절. 팀 교환 담당과 최종 합의 필요.
      await rejectPendingOffers(client, id);
    }
    return {
      tradeId: trade.rows[0].id,
      listingId: id,
      quantity,
      totalPrice,
      remainingQuantity: remain,
      listingStatus: nextStatus,
      purchasedAt: dateString(trade.rows[0].created_at),
    };
  });
}
