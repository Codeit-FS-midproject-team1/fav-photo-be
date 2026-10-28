export class UserController {
  constructor({ userService }) {
    this.userService = userService;
  }

  getMe = async (req, res) => {
    res.json(await this.userService.getMe(req.userId));
  };
}
