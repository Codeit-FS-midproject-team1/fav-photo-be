export class SaleListingController {
  constructor({ saleListingService }) {
    this.saleListingService = saleListingService;
  }

  getMarketList = async (req, res) => {
    res.json(await this.saleListingService.getMarketList(req.query));
  };
}
