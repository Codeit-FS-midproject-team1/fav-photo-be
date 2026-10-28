import { notFound } from '../utils/http-error.js';

export class UserService {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async getMe(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw notFound('사용자를 찾을 수 없습니다.');
    // password 는 절대 응답에 넣지 않는다. randomPoint · creation 은 소철 담당에서 추가
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      points: user.points,
      hasPassword: user.password !== null,
    };
  }
}
