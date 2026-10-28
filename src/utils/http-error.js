// Express 5는 async 함수에서 던진 에러도 자동으로 여기까지 옴. 그래서 controller에 try/catch를 쓰지 않아도 됨.

export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export const badRequest = (message = "입력값을 확인해 주세요.", fields) =>
  new HttpError(400, message, fields);
export const unauthorized = (message = "로그인이 필요합니다.") =>
  new HttpError(401, message);
export const forbidden = (message = "권한이 없습니다.") =>
  new HttpError(403, message);
export const notFound = (message = "대상을 찾을 수 없습니다.") =>
  new HttpError(404, message);
export const conflict = (message = "요청을 처리할 수 없는 상태입니다.") =>
  new HttpError(409, message);
