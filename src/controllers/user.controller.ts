import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { config } from "dotenv";
config({
  path: "./.env",
});
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  loginUserZodSchema,
  registerUserZodSchema,
} from "../zodschema/user.zodSchema.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const generateAccessAndRefreshToken = async (userId: string) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      "Something went wrong while creating access and refresh token",
      500,
      "ServerError"
    );
  }
};

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

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const {
    body: { username, password, email },
  } = await loginUserZodSchema.parseAsync(req);
  if (!email && !username) {
    throw new ApiError("User name or Email required", 400, "BadRequest");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    throw new ApiError("User does not exist", 404, "NotFound");
  }
  const correctPassword = await user.isPasswordCorrect(password);
  if (!correctPassword) {
    throw new ApiError("Invalid user credentials", 400, "BadRequest");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken },
        "User login Successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req: Request, res: Response) => {
  await User.findByIdAndUpdate(
    req.body.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw ApiError.Unauthorized();
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    ) as jwt.JwtPayload;
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw ApiError.Unauthorized("Invalid refresh token");
    }
    if (incomingRefreshToken !== user.refreshToken) {
      throw ApiError.Unauthorized("Refresh token expired");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );
    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken,
          },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw ApiError.Unauthorized();
  }
});

export { registerUser, loginUser, logOutUser, refreshAccessToken };
