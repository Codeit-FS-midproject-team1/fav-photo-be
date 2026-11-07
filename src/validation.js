/** 판매 API 입력 검증. DB 의존성이 없어 단위 테스트가 가능합니다. */
export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

export const METHODS = new Set(['PHOTO', 'CRAFT', 'AI', 'ETC']);
export const GENRES = new Set(['LANDSCAPE', 'PORTRAIT', 'ANIMAL', 'PLANT', 'OBJECT', 'ETC']);

export function parsePositiveId(value, label = 'id') {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0 || n > 2147483647) {
    throw new ApiError(400, `${label}는 양의 정수여야 합니다.`);
  }
  return n;
}

export function integerInRange(value, label, min, max) {
  if (typeof value === 'boolean' || value === '' || value === null || value === undefined) {
    throw new ApiError(400, `${label}는 ${min}~${max} 범위의 정수여야 합니다.`);
  }
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) {
    throw new ApiError(400, `${label}는 ${min}~${max} 범위의 정수여야 합니다.`);
  }
  return n;
}

function optionalEnum(value, field, values) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !values.has(value)) {
    throw new ApiError(400, `${field} 값이 올바르지 않습니다.`);
  }
  return value;
}

function optionalDescription(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.length > 200) {
    throw new ApiError(400, 'exchangeDescription은 200자 이하의 문자열이어야 합니다.');
  }
  return value; // 엔터와 공백 보존. 화면에서 pre-wrap으로 보여 줍니다.
}

function bodyObject(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object') {
    throw new ApiError(400, 'JSON 객체를 전달해 주세요.');
  }
  return body;
}

function rejectUnknownKeys(body, allowed) {
  const unknown = Object.keys(body).filter(key => !allowed.has(key));
  if (unknown.length) throw new ApiError(400, `지원하지 않는 필드: ${unknown.join(', ')}`);
}

const saleFields = new Set(['photoCardId', 'quantity', 'price', 'exchangeMethod', 'exchangeGenre', 'exchangeDescription']);
const editFields = new Set(['quantity', 'price', 'exchangeMethod', 'exchangeGenre', 'exchangeDescription']);

/** 판매 등록: 수량은 새 판매 등록 장수입니다. */
export function validateCreate(body) {
  const b = bodyObject(body);
  rejectUnknownKeys(b, saleFields);
  return {
    photoCardId: parsePositiveId(b.photoCardId, 'photoCardId'),
    quantity: integerInRange(b.quantity, 'quantity', 1, 100000),
    price: integerInRange(b.price, 'price', 1, 1000),
    exchangeMethod: optionalEnum(b.exchangeMethod, 'exchangeMethod', METHODS),
    exchangeGenre: optionalEnum(b.exchangeGenre, 'exchangeGenre', GENRES),
    exchangeDescription: optionalDescription(b.exchangeDescription),
  };
}

/** 수정: quantity는 '수정 후 남은 수량'이며 생략한 필드는 유지합니다. */
export function validatePatch(body) {
  const b = bodyObject(body);
  rejectUnknownKeys(b, editFields);
  if (!Object.keys(b).length) throw new ApiError(400, '수정할 항목을 하나 이상 전달해 주세요.');
  const patch = {};
  if (Object.hasOwn(b, 'quantity')) patch.quantity = integerInRange(b.quantity, 'quantity', 1, 100000);
  if (Object.hasOwn(b, 'price')) patch.price = integerInRange(b.price, 'price', 1, 1000);
  if (Object.hasOwn(b, 'exchangeMethod')) patch.exchangeMethod = optionalEnum(b.exchangeMethod, 'exchangeMethod', METHODS);
  if (Object.hasOwn(b, 'exchangeGenre')) patch.exchangeGenre = optionalEnum(b.exchangeGenre, 'exchangeGenre', GENRES);
  if (Object.hasOwn(b, 'exchangeDescription')) patch.exchangeDescription = optionalDescription(b.exchangeDescription);
  return patch;
}

/** 구매: 총액은 클라이언트 입력이 아닌 DB의 판매가로 서버에서 계산합니다. */
export function validatePurchase(body) {
  const b = bodyObject(body);
  rejectUnknownKeys(b, new Set(['quantity']));
  return { quantity: integerInRange(b.quantity, 'quantity', 1, 100000) };
}
