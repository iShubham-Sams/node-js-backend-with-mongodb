import { Response, Request } from "express";
import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createAndUpdateTweetZodSchema } from "../zodschema/tweet.zodSchema.js";
import { CustomRequest } from "../types/jwt.types.js";
import HttpStatusCode from "../utils/statusCode.js";

const createTweet = asyncHandler(async (req: CustomRequest, res: Response) => {
  const {
    body: { content },
  } = await createAndUpdateTweetZodSchema.parseAsync(req);
  const tweetCreate = await Tweet.create({
    content: content,
    owner: req.user._id,
  });
  if (!tweetCreate) {
    res.send(ApiError.ServerError("Something went Wrong"));
  }
  res.send(
    new ApiResponse(HttpStatusCode.CREATED, { message: "Tweet created" })
  );
});

const getUserTweets = asyncHandler(async (req: Request, res: Response) => {
  try {
    const id = req.params.userId;
    // approach one
    // const user = await User.findById(id);
    // if (!user) {
    //   throw new ApiError(
    //     "User doesn't exist",
    //     HttpStatusCode.BAD_REQUEST,
    //     "Bad request"
    //   );
    // }
    // const tweet = await Tweet.find({ owner: user._id });
    // approach second
    const valid = isValidObjectId(id);
    if (!valid) {
      throw new ApiError(
        "User doesn't exist",
        HttpStatusCode.BAD_REQUEST,
        "Bad request"
      );
    }
    const tweet = await Tweet.find({ owner: id });
    res.send(
      new ApiResponse(HttpStatusCode.OK, {
        message: "Tweet Fetched",
        data: tweet,
      })
    );
  } catch (error) {
    res.send(
      new ApiError(
        "User doesn't exist",
        HttpStatusCode.BAD_REQUEST,
        "Bad request"
      )
    );
  }
});

const updateTweet = asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      body: { content },
    } = await createAndUpdateTweetZodSchema.parseAsync(req);
    const tweetId = req.params.tweetId;
    const tweet = await Tweet.findByIdAndUpdate(
      tweetId,
      { $set: { content } },
      { new: true, useFindAndModify: false }
    ).select("-_id -owner");
    if (!tweet) {
      throw new ApiError(
        "Tweet id invalid",
        HttpStatusCode.BAD_REQUEST,
        "Bad request"
      );
    }

    res.send(
      new ApiResponse(HttpStatusCode.OK, {
        message: "Tweet Update",
        data: tweet,
      })
    );
  } catch (error) {
    res.send(
      new ApiError(
        "Tweet id invalid",
        HttpStatusCode.BAD_REQUEST,
        "Bad request"
      )
    );
  }
});

const deleteTweet = asyncHandler(async (req, res) => {
  try {
    const tweetId = req.params.tweetId;
    const tweet = await Tweet.findByIdAndDelete(tweetId);
    if (!tweet) {
      throw new ApiError(
        "Tweet id invalid",
        HttpStatusCode.BAD_REQUEST,
        "Bad request"
      );
    }
    res.send(
      new ApiResponse(HttpStatusCode.OK, {
        message: "Tweet delete successfully",
        data: {},
      })
    );
  } catch (error) {
    res.send(
      new ApiError(
        "Tweet id invalid",
        HttpStatusCode.BAD_REQUEST,
        "Bad request"
      )
    );
  }
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
