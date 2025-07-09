import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME||"dxrn83ohw",
  api_key: process.env.CLOUDINARY_API_KEY||"699481635736458",
  api_secret: process.env.CLOUDINARY_API_SECRET ||"Kh_B6ppHF5TSUHfMALiIG6u5SE4",
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "auction/items",
    allowed_formats: ["jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});

const upload = multer({ storage });
export default upload;
