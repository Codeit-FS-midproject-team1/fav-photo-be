import { badRequest } from "./http-error.js";

// 페이지 목록 공통 : ?page=2&pageSize = 12 -> {page, pageSize, offset}

export const parsePage = (query, { defaultSize, maxSize }) => {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? defaultSize);

  if (!Number.isInteger(page) || page < 1) {
    throw badRequest("page는 1 이상의 정수이어야 합니다.", {
      page: "1이상의 정수",
    });
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > maxSize) {
    throw badRequest(`pageSize는 1~${maxSize} 사이이어야 합니다.`, {
      pageSize: `1~${maxSize}`,
    });
  }
  return { page, pageSize, offset: (page - 1) * pageSize };
};
