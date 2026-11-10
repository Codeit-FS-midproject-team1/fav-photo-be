export class MyGalleryController {
  constructor({ myGalleryService }) {
    this.myGalleryService = myGalleryService;
  }
  getMyCards = async (req, res) => {
    res.json(await this.myGalleryService.getMyCards(req.userId, req.query));
  };
}
