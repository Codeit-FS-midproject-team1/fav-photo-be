import { z } from "zod";

export const signupPasswordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .max(16, "비밀번호는 16자 이하여야 합니다.")
  .regex(
    /^[A-Za-z0-9_!@#$%^&*()\-+=[\]{};:'",.<>/?\\|`~]+$/,
    "영문, 숫자, 특수문자만 입력해 주세요.",
  );

export const signupSchema = z.object({
  email: z.email("올바른 이메일을 입력해 주세요."),
  password: signupPasswordSchema,
  nickname: z.string().trim().min(2).max(10),
});

export const loginSchema = z.object({
  email: z.email("올바른 이메일을 입력해 주세요."),
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});
