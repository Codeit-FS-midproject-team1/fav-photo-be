import { z } from "zod";

// 상수: METHODS, GENRES 배열
const METHODS = ["PHOTO", "CRAFT", "AI", "ETC"];

const GENRES = ["LANDSCAPE", "PORTRAIT", "ANIMAL", "PLANT", "OBJECT", "ETC"];

export const createPhotoCardSchema = z.object({
  name: z
    .string({ error: "이름을 입력해주세요." })
    .trim()
    .min(1, "포토카드 이름은 1~15자여야 합니다.")
    .max(15, "포토카드 이름은 1~15자여야 합니다."), // 문자열, 앞뒤 공백 제거, 1~15자
  description: z
    .string()
    .trim()
    .max(200, "포토카드 설명은 200자 이하여야 합니다.")
    .default(""), // 문자열, 최대 200자, 없으면 ""
  method: z.enum(METHODS, { error: "올바른 제작 방식을 선택해주세요." }), // METHODS 중 하나
  genre: z.enum(GENRES, { error: "올바른 장르를 선택해주세요." }), // GENRES 중 하나
  price: z.coerce
    .number({ error: "가격은 1~1000P 사이의 정수여야 합니다." })
    .int("가격은 1~1000P 사이의 정수여야 합니다.")
    .min(1, "가격은 1~1000P 사이의 정수여야 합니다.")
    .max(1000, "가격은 1~1000P 사이의 정수여야 합니다."), // 문자열로 온 것을 정수로, 1~1000
  totalQuantity: z.coerce
    .number({ error: "발행량을 입력해주세요." })
    .int("발행 수량은 1~10 사이의 정수여야 합니다.")
    .min(1, "발행 수량은 1~10 사이의 정수여야 합니다.")
    .max(10, "발행 수량은 1~10 사이의 정수여야 합니다."), // 문자열로 온 것을 정수로, 1~10
});
