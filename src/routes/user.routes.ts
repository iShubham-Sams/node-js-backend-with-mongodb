import { upload } from "../middlewares/multer.middleware.js";
import zodValidate from "../middlewares/zodValidation.middleware.js";
import { loginUser, registerUser } from "../controllers/user.controller.js";
import { Router } from "express";
import {
  loginUserZodSchema,
  registerUserZodSchema,
} from "../zodschema/user.zodSchema.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "avatar", maxCount: 1 },
  ]),
  zodValidate(registerUserZodSchema),
  registerUser
);

router.route("/login").post(zodValidate(loginUserZodSchema), loginUser);

export default router;
