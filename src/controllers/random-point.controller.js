export class RandomPointController {
  constructor({ randomPointService }) {
    this.randomPointService = randomPointService;
  }

  draw = async (req, res) => {
    const result = await this.randomPointService.draw(
      req.userId,
      req.get("Idempotency-Key"),
    );

    res.status(200).json(result);
  };
}
