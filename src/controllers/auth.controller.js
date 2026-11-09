export class AuthController {
  constructor({ authService }) {
    this.authService = authService;
  }

  signup = async (req, res) => {
    const result = await this.authService.signup(req.validated.body);
    res.status(201).json(result);
  };

  login = async (req, res) => {
    const { accessToken, refreshToken } = await this.authService.login(
      req.validated.body,
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  };

  refresh = async (req, res) => {
    const { accessToken, refreshToken } = await this.authService.refresh(
      req.cookies?.refreshToken,
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  };

  logout = async (req, res) => {
    await this.authService.logout(req.cookies?.refreshToken);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
    });

    res.status(204).end();
  };
}
