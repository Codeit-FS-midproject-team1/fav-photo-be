import { z } from "zod";
import { signupPasswordSchema } from "#schemas/auth.schema.js";

export const patchNicknameSchema = z.object({
  nickname: z.string().trim().min(2).max(10),
});

export const patchPasswordSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력해 주세요."),
  newPassword: signupPasswordSchema,
});
