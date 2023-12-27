import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { registerUserZodSchema } from "../zodschema/user.zodSchema.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const {
    body: { email, fullName, password, username },
  } = await registerUserZodSchema.parseAsync(req);

  let existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(
      "User with email or username already exists",
      409,
      "Conflict"
    );
  }

  let files = req.files as any;
  const avatarLocalPath = files?.avatar[0].path;

  let coverImageLocalPath = null;
  if (files && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    coverImageLocalPath = files?.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError("Upload Avatar image", 400, "BadRequest");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError("Avatar file is required", 400, "BadRequest");
  }

  const user = await User.create({
    fullName: fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url,
    email: email,
    password: password,
    username: username.toLowerCase(),
  });

  const userCreateDone = await User.findById(user._id).select(
    "-password -refreshToken "
  );

  if (!userCreateDone) {
    throw ApiError.ServerError("Something went wrong while registering user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, userCreateDone, "User register successfully"));
});

export { registerUser };
