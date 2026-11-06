import { v2 as cloudinary } from "cloudinary";

export class CloudinaryImageStorage {
  constructor({
    cloudName,
    apiKey,
    apiSecret,
    folder = "fav-photo/photo-cards",
  }) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    this.folder = folder;
  }

  upload(buffer) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: this.folder, resource_type: "image" },
          (err, result) =>
            err
              ? reject(err)
              : resolve({ url: result.secure_url, publicId: result.public_id }),
        )
        .end(buffer);
    });
  }

  async delete(publicId) {
    await cloudinary.uploader.destroy(publicId);
  }
}
