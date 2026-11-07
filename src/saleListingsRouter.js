import { Router } from 'express';
import { ApiError, parsePositiveId } from './validation.js';
import {
  createListing,
  getListing,
  updateListing,
  cancelListing,
  purchaseListing,
} from './saleListingsService.js';

/** 기존 JWT 인증 미들웨어가 req.user.id 또는 req.auth.userId를 설정해야 합니다. */
function actorId(req) {
  const raw = req.user?.id ?? req.auth?.userId;
  if (raw === undefined || raw === null) throw new ApiError(401, '로그인이 필요합니다.');
  try {
    return parsePositiveId(raw, '인증 사용자 ID');
  } catch {
    throw new ApiError(401, '유효하지 않은 인증 정보입니다.');
  }
}

/** 기존 Express 앱에 /api로 마운트할 수 있는 판매 모듈 라우터. */
export function buildSaleListingsRouter({ pool, requireAuth, pointHistoryHasBalanceAfter = false }) {
  if (!pool || typeof pool.query !== 'function' || typeof pool.connect !== 'function') {
    throw new Error('PostgreSQL Pool이 필요합니다.');
  }
  if (typeof requireAuth !== 'function') {
    throw new Error('팀의 실제 requireAuth 미들웨어를 연결해야 합니다. (보안상 인증 우회 불가)');
  }
  const router = Router();
  // 실제 URL: POST /api/sale-listings
  router.post('/sale-listings', requireAuth, async (req, res) => {
    const result = await createListing(pool, actorId(req), req.body);
    res.status(201).json(result);
  });
  // 실제 URL: GET /api/sale-listings/:id (인증 없음)
  router.get('/sale-listings/:id', async (req, res) => {
    const result = await getListing(pool, parsePositiveId(req.params.id));
    res.status(200).json(result);
  });
  // 실제 URL: PATCH /api/sale-listings/:id
  router.patch('/sale-listings/:id', requireAuth, async (req, res) => {
    const result = await updateListing(pool, actorId(req), parsePositiveId(req.params.id), req.body);
    res.status(200).json(result);
  });
  // 실제 URL: DELETE /api/sale-listings/:id (DB 소프트 삭제)
  router.delete('/sale-listings/:id', requireAuth, async (req, res) => {
    const result = await cancelListing(pool, actorId(req), parsePositiveId(req.params.id));
    res.status(200).json(result);
  });
  // 실제 URL: POST /api/sale-listings/:id/purchases
  router.post('/sale-listings/:id/purchases', requireAuth, async (req, res) => {
    const result = await purchaseListing(pool, actorId(req), parsePositiveId(req.params.id), req.body, { pointHistoryHasBalanceAfter });
    res.status(201).json(result);
  });
  return router;
}

/** 앱의 다른 에러 핸들러보다 앞 또는 공통 에러 핸들러에 통합합니다. */
export function saleListingsErrorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof ApiError) {
    return res.status(error.status).json({ message: error.message, ...(error.fields && { fields: error.fields }) });
  }
  // 실제 환경의 DB 스키마/제약 조건에 맞게 공통 에러 정책으로 조정하세요.
  if (error?.code === '23514' || error?.code === '22P02') {
    return res.status(400).json({ message: '유효하지 않은 데이터입니다.' });
  }
  if (error?.code === '23503') {
    return res.status(409).json({ message: '연결된 데이터가 없어 처리할 수 없습니다.' });
  }
  // DB 상세 에러를 클라이언트에 노출하지 않습니다.
  console.error('[sale-listings]', error);
  return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
}
