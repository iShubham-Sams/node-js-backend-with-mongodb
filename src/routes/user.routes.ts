import { upload } from "../middlewares/multer.middleware.js";
import zodValidate from "../middlewares/zodValidation.middleware.js";
import { registerUser } from "../controllers/user.controller.js";
import { Router } from "express";
import { registerUserZodSchema } from "../zodschema/user.zodSchema.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  zodValidate(registerUserZodSchema),
  registerUser
);

export default router;
