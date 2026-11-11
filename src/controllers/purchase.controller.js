export class PurchaseController {
  constructor({ purchaseService }) {
    this.purchaseService = purchaseService;
  }

  // POST /api/sale-listings/:id/purchases
  create = async (req, res) => {
    const saleListingId = Number(req.params.id);

    const idempotencyKey = req.get("Idempotency-Key");

    const purchase = await this.purchaseService.create(
      req.userId,
      {
        saleListingId,
        quantity: req.body?.quantity,
      },
      idempotencyKey,
    );

    return res.status(201).json(purchase);
  };

  // GET /api/purchases
  getMyPurchases = async (req, res) => {
    const result = await this.purchaseService.getMyPurchases(
      req.userId,
      req.query,
    );

    return res.status(200).json(result);
  };

  // GET /api/purchases/:id
  getMyPurchaseById = async (req, res) => {
    const result = await this.purchaseService.getMyPurchaseById(
      req.userId,
      req.params.id,
    );

    return res.status(200).json(result);
  };
}
