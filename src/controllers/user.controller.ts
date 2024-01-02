import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { Request, Response } from "express";
import { config } from "dotenv";
config({
  path: "./.env",
});
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  changeUserPasswordZodSchema,
  getUserProfileChannelZodSchema,
  loginUserZodSchema,
  registerUserZodSchema,
  updateAccountDetailsZodSchema,
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

const changeUserPassword = asyncHandler(async (req, res) => {
  const {
    body: { oldPassword, newPassword },
  } = await changeUserPasswordZodSchema.parseAsync(req);
  const user = await User.findById(req.body.user._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError("Invalid old password", 400, "Invalid");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed successfully"));
});

const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  return res
    .status(200)
    .json(
      new ApiResponse(200, req.body.user, "Current user fetch successfully")
    );
});

const updateAccountDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      body: { email, fullName },
    } = await updateAccountDetailsZodSchema.parseAsync(req);
    const updatedUser = await User.findByIdAndUpdate(
      req.body.user._id,
      { $set: { fullName, email } },
      { new: true }
    ).select("-password -refreshToken");
    return res
      .status(200)
      .json(new ApiResponse(200, updatedUser, "User update successfully"));
  }
);

const updateUserAvatar = asyncHandler(async (req: Request, res: Response) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError("Avatar file missing", 400, "Bad request");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar?.url) {
    throw new ApiError("Error while uploading Avatar", 400, "Bad request");
  }

  const updatedUser = await User.findOneAndUpdate(
    req.body.user_id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User update successfully"));
});

const updateUserCoverImage = asyncHandler(
  async (req: Request, res: Response) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
      throw new ApiError("Cover file missing", 400, "Bad request");
    }
    const cover = await uploadOnCloudinary(coverImageLocalPath);

    if (!cover?.url) {
      throw new ApiError("Error while uploading Cover", 400, "Bad request");
    }
    const oldCoverImage = req.body.user.coverImage;
    const deleteOldCover = await cloudinary.uploader.destroy(oldCoverImage);
    console.log(deleteOldCover, "deleteOldCover");
    const updatedUser = await User.findOneAndUpdate(
      req.body.user._id,
      {
        $set: {
          coverImage: cover.url,
        },
      },
      { new: true }
    ).select("-password -refreshToken");
    return res
      .status(200)
      .json(new ApiResponse(200, updatedUser, "User update successfully"));
  }
);

const getUserChannelProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      params: { username },
    } = await getUserProfileChannelZodSchema.parseAsync(req);

    const channel = await User.aggregate([
      {
        $match: {
          username: username?.toLocaleLowerCase(),
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          foreignField: "channel",
          localField: "_id",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          foreignField: "subscriber",
          localField: "_id",
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          subscriberCount: {
            $size: "$subscribers",
          },
          channelSubscribedToCount: {
            $size: "$subscribedTo",
          },
          isSubscribed: {
            $cond: {
              if: { $in: [req.body.user?._id, "$subscribers.channel"] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          fullName: 1,
          username: 1,
          subscriberCount: 1,
          channelSubscribedToCount: 1,
          isSubscribed: 1,
          avatar: 1,
          coverImage: 1,
          email: 1,
        },
      },
    ]);
    if (!channel.length) {
      throw new ApiError("Channel does not exist", 400, "Bad Request");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
      );
  }
);

export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeUserPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
};
