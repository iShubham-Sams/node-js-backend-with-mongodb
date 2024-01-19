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
import mongoose from "mongoose";
import { CustomRequest } from "../types/jwt.types.js";
import HttpStatusCode from "../utils/statusCode.js";

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
      HttpStatusCode.INTERNAL_SERVER_ERROR,
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
      HttpStatusCode.CONFLICT,
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
    throw new ApiError(
      "Upload Avatar image",
      HttpStatusCode.BAD_REQUEST,
      "BadRequest"
    );
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(
      "Avatar file is required",
      HttpStatusCode.BAD_REQUEST,
      "BadRequest"
    );
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
    .status(HttpStatusCode.CREATED)
    .json(
      new ApiResponse(
        HttpStatusCode.OK,
        userCreateDone,
        "User register successfully"
      )
    );
});

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const {
    body: { username, password, email },
  } = await loginUserZodSchema.parseAsync(req);
  if (!email && !username) {
    throw new ApiError(
      "User name or Email required",
      HttpStatusCode.BAD_REQUEST,
      "BadRequest"
    );
  }

  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    throw new ApiError(
      "User does not exist",
      HttpStatusCode.NOT_FOUND,
      "NotFound"
    );
  }
  const correctPassword = await user.isPasswordCorrect(password);
  if (!correctPassword) {
    throw new ApiError(
      "Invalid user credentials",
      HttpStatusCode.BAD_REQUEST,
      "BadRequest"
    );
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(HttpStatusCode.OK)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        HttpStatusCode.OK,
        { accessToken, refreshToken },
        "User login Successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req: CustomRequest, res: Response) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
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
    .status(HttpStatusCode.OK)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(HttpStatusCode.OK, {}, "User logged Out"));
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
      .status(HttpStatusCode.OK)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
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

const changeUserPassword = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const {
      body: { oldPassword, newPassword },
    } = await changeUserPasswordZodSchema.parseAsync(req);
    const user = await User.findById(req.user._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      throw new ApiError(
        "Invalid old password",
        HttpStatusCode.BAD_REQUEST,
        "Invalid"
      );
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(HttpStatusCode.OK, {}, "Password Changed successfully")
      );
  }
);

const getCurrentUser = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    return res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          req.user,
          "Current user fetch successfully"
        )
      );
  }
);

const updateAccountDetails = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const {
      body: { email, fullName },
    } = await updateAccountDetailsZodSchema.parseAsync(req);
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { fullName, email } },
      { new: true }
    ).select("-password -refreshToken");
    return res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          updatedUser,
          "User update successfully"
        )
      );
  }
);

const updateUserAvatar = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
      throw new ApiError(
        "Avatar file missing",
        HttpStatusCode.BAD_REQUEST,
        "Bad request"
      );
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar?.url) {
      throw new ApiError(
        "Error while uploading Avatar",
        HttpStatusCode.BAD_REQUEST,
        "Bad request"
      );
    }

    const updatedUser = await User.findOneAndUpdate(
      req.user._id,
      {
        $set: {
          avatar: avatar.url,
        },
      },
      { new: true }
    ).select("-password -refreshToken");
    return res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          updatedUser,
          "User update successfully"
        )
      );
  }
);

const updateUserCoverImage = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
      throw new ApiError(
        "Cover file missing",
        HttpStatusCode.BAD_REQUEST,
        "Bad request"
      );
    }
    const cover = await uploadOnCloudinary(coverImageLocalPath);

    if (!cover?.url) {
      throw new ApiError(
        "Error while uploading Cover",
        HttpStatusCode.BAD_REQUEST,
        "Bad request"
      );
    }
    const oldCoverImage = req.user.coverImage;
    const deleteOldCover = await cloudinary.uploader.destroy(oldCoverImage);
    const updatedUser = await User.findOneAndUpdate(
      req.user._id,
      {
        $set: {
          coverImage: cover.url,
        },
      },
      { new: true }
    ).select("-password -refreshToken");
    return res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          updatedUser,
          "User update successfully"
        )
      );
  }
);

const getUserChannelProfile = asyncHandler(
  async (req: CustomRequest, res: Response) => {
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
              if: { $in: [req.user?._id, "$subscribers.channel"] },
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
      throw new ApiError(
        "Channel does not exist",
        HttpStatusCode.BAD_REQUEST,
        "Bad Request"
      );
    }

    return res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          channel[0],
          "User channel fetched successfully"
        )
      );
  }
);

const getWatchHistory = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      username: 1,
                      fullName: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                owner: {
                  $first: "$owner",
                },
              },
            },
          ],
        },
      },
    ]);

    return res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          user[0].watchHistory,
          "Watch history fetched"
        )
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
  getWatchHistory,
};
