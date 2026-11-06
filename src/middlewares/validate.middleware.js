import { badRequest } from "#utils/http-error.js";

const createValidator = (target) => (schema) => {
  return (req, res, next) => {
    const dataToValidate = req[target];
    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      const errorMessage =
        result.error.issues[0]?.message || "잘못된 요청 데이터입니다.";
      return next(badRequest(errorMessage));
    }

    req.validated = req.validated || {};
    req.validated[target] = result.data;

    next();
  };
};

export const validateBody = createValidator("body");
export const validateParams = createValidator("params");
