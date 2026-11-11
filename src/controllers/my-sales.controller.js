export class MySalesController {
  constructor({ mySalesService }) {
    this.mySalesService = mySalesService;
  }
  getMySales = async (req, res) => {
    res.json(await this.mySalesService.getMySales(req.userId, req.query));
  };
}
