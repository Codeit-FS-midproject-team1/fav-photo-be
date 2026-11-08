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

  cancelOffer = async (req, res) => {
    const offerId = req.params.id;
    const userId = req.userId;

    await this.exchangeOfferService.cancelOffer(offerId, userId);

    res.status(204).end();
  };

  rejectOffer = async (req, res) => {
    const offerId = req.params.id;
    const userId = req.userId;

    const offer = await this.exchangeOfferService.rejectOffer(offerId, userId);

    res.status(200).json(offer);
  };

  acceptOffer = async (req, res) => {
    const offerId = req.params.id;
    const userId = req.userId;

    const result = await this.exchangeOfferService.acceptOffer(offerId, userId);

    res.status(200).json(result);
  };
}
