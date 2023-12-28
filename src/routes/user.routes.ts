import { upload } from "../middlewares/multer.middleware.js";
import zodValidate from "../middlewares/zodValidation.middleware.js";
import {
  logOutUser,
  loginUser,
  registerUser,
} from "../controllers/user.controller.js";
import { Router } from "express";
import {
  loginUserZodSchema,
  registerUserZodSchema,
} from "../zodschema/user.zodSchema.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

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

router.route("/logout").post(verifyJwt, logOutUser);

export default router;
