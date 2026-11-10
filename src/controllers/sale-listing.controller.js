export class SaleListingController {
  constructor({ saleListingService }) {
    this.saleListingService = saleListingService;
  }

  getMarketList = async (req, res) => {
    res.json(await this.saleListingService.getMarketList(req.query));
  };

  getMarketDetail = async (req, res) => {
    res.json(await this.saleListingService.getMarketDetail(req.params.id));
  };

  create = async (req, res) => {
    const listing = await this.saleListingService.create(req.userId, req.body);

    res.status(201).json(listing);
  };

  update = async (req, res) => {
    const listing = await this.saleListingService.update(
      req.userId,
      req.params.id,
      req.body,
    );

    res.status(200).json(listing);
  };

  cancel = async (req, res) => {
    await this.saleListingService.cancel(req.userId, req.params.id);

    res.status(204).send();
  };
}
