import { Response } from "express";
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
    res.send(ApiError.ServerError("Something went Wrong "));
  }
  res.send(
    new ApiResponse(HttpStatusCode.CREATED, { message: "Tweet created" })
  );
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
