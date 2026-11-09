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
      const stream = cloudinary.uploader.upload_stream(
        { folder: this.folder, resource_type: "image" },
        (err, result) =>
          err || !result
            ? reject(err ?? new Error("Cloudinary 업로드 결과가 없습니다."))
            : resolve({ url: result.secure_url, publicId: result.public_id }),
      );
      stream.on("error", reject);
      stream.end(buffer);
    });
  }

  async delete(publicId) {
    await cloudinary.uploader.destroy(publicId);
  }
}
