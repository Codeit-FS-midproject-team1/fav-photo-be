export class PhotoCardController {
  // constructor: photoCardService 를 받아 저장
  constructor({ photoCardService }) {
    this.photoCardService = photoCardService;
  }

  create = async (req, res) => {
    const photoCard = await this.photoCardService.create(
      req.userId,
      req.body,
      req.file,
    );
    res.status(201).json(photoCard);
  };
}
