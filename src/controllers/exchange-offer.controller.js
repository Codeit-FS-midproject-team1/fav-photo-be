export class ExchangeOfferController {
  constructor({ exchangeOfferService }) {
    this.exchangeOfferService = exchangeOfferService;
  }
  getOffersByListingId = async (req, res) => {
    const listingId = req.params.id;
    const userId = req.userId;
    const offers = await this.exchangeOfferService.getOffersByListingId(
      listingId,
      userId,
    );
    res.json({ items: offers });
  };
  createOffer = async (req, res) => {
    const listingId = req.params.id;
    const userId = req.userId;
    const data = req.body;

    const offer = await this.exchangeOfferService.createOffer(
      listingId,
      userId,
      data,
    );

    res.status(201).json(offer);
  };
}
