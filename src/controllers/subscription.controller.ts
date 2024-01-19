import mongoose, { isValidObjectId } from "mongoose";
import { Request, Response } from "express";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { CustomRequest } from "../types/jwt.types.js";
import HttpStatusCode from "../utils/statusCode.js";

const toggleSubscription = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { channelId } = req.params;
      const userId = req.user._id;
      if (!isValidObjectId(channelId)) {
        throw new ApiError(
          "channel id invalid",
          HttpStatusCode.BAD_REQUEST,
          "Bad request"
        );
      }
      const channelExist = await User.findById(channelId);
      if (!channelExist) {
        new ApiError(
          "channel id invalid",
          HttpStatusCode.BAD_REQUEST,
          "Bad request"
        );
      }
      const channelFind = await Subscription.findOne({ channel: channelId });
      if (channelFind) {
        await Subscription.findOneAndDelete({ channel: channelId });
        res.send(
          new ApiResponse(HttpStatusCode.OK, {
            message: "Channel unsubscribe",
            data: {},
          })
        );
      } else {
        await Subscription.create({
          subscriber: userId,
          channel: channelId,
        });
        res.send(
          new ApiResponse(HttpStatusCode.OK, {
            message: "Channel subscribe",
            data: {},
          })
        );
      }
    } catch (error) {
      res.send(
        new ApiError(
          "Tweet id invalid",
          HttpStatusCode.BAD_REQUEST,
          "Bad request"
        )
      );
    }
  }
);

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { channelId } = req.params;
  }
);

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { channelId } = req.params;
      if (!isValidObjectId(channelId)) {
        throw new ApiError(
          "channel id invalid",
          HttpStatusCode.BAD_REQUEST,
          "Bad request"
        );
      }
      const userExist = await User.findById(channelId);
      if (!userExist) {
        new ApiError(
          "channel id invalid",
          HttpStatusCode.BAD_REQUEST,
          "Bad request"
        );
      }

      const allSubscribeChannel = await Subscription.aggregate([
        {
          $match: {
            subscriber: new mongoose.Types.ObjectId(channelId),
          },
        },
        {
          $lookup: {
            from: "users",
            foreignField: "_id",
            localField: "channel",
            as: "subscribedChannel",
            pipeline: [
              {
                $project: {
                  username: 1,
                  fullName: 1,
                  _id: 0,
                },
              },
            ],
          },
        },
        {
          $project: {
            _id: 0,
            subscriber: 0,
            channel: 0,
            createdAt: 0,
            updatedAt: 0,
            __v: 0,
          },
        },
      ]);
      res.send(
        new ApiResponse(HttpStatusCode.OK, {
          message: "Channel subscribe",
          data: { allSubscribeChannel },
        })
      );
    } catch (error) {
      res.send(
        new ApiError(
          "channel id invalid",
          HttpStatusCode.BAD_REQUEST,
          "Bad request"
        )
      );
    }
  }
);

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
