export class UserController {
  constructor({ userService }) {
    this.userService = userService;
  }

  getMe = async (req, res) => {
    res.json(await this.userService.getMe(req.userId));
  };

  patchNickname = async (req, res) => {
    const { nickname } = req.body;
    const user = await this.userService.patchNickname(req.userId, nickname);

    res.json({
      message: "닉네임이 변경되었습니다.",
      nickname: user.nickname,
    });
  };

  patchPassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    await this.userService.patchPassword(
      req.userId,
      currentPassword,
      newPassword,
    );

    res.json({ message: "비밀번호가 변경되었습니다." });
  };
}
