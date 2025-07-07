import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategory,
  getCategoryById,
  updateCategory,
} from "../controllers/categories.controllers.js";
import upload from "../utils/cloudinary.js";

const router = Router();


router.post("/create", upload.single("image"), createCategory);
router.get("/", getAllCategory);
router.get("/:id", getCategoryById);
router.put("/:id", upload.single("image"), updateCategory);
router.delete("/:id", deleteCategory);

export default router;
