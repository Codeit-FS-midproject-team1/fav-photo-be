import { notFound, conflict, unauthorized } from "#utils/http-error.js";
import bcrypt from "bcryptjs";

export class UserService {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async getMe(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw notFound("사용자를 찾을 수 없습니다.");
    // password 는 절대 응답에 넣지 않는다. randomPoint · creation 은 소철 담당에서 추가
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      points: user.points,
      hasPassword: user.password !== null,
    };
  }

  async patchNickname(userId, nickname) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw notFound("사용자를 찾을 수 없습니다.");

    const existingUser = await this.userRepository.findByNickname(nickname);

    if (existingUser && existingUser.id !== userId) {
      throw conflict("이미 사용 중인 닉네임입니다.");
    }

    return this.userRepository.patchNickname(userId, nickname);
  }

  async patchPassword(userId, currentPassword, newPassword) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw notFound("사용자를 찾을 수 없습니다.");

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw unauthorized("현재 비밀번호가 올바르지 않습니다.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    return this.userRepository.patchPassword(userId, hashedPassword);
  }
}
