import mongoose, { isValidObjectId } from "mongoose";
import { Response } from "express";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { publishVideoZodSchema } from "../zodschema/video.zodSchema.js";
import { CustomRequest } from "../types/jwt.types.js";
import { MulterFileType } from "../types/share.js";
import HttpStatusCode from "../utils/statusCode.js";
import { UploadApiResponse, v2 as cloudinary } from "cloudinary";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const {
        body: { description, title },
      } = await publishVideoZodSchema.parseAsync(req);
      const files = req.files as Record<string, MulterFileType[]>;
      const videoFileLocalPath = files?.videoFile[0]?.path;
      const thumbNailLocalPath = files?.thumbnail[0]?.path;
      if (!videoFileLocalPath || !thumbNailLocalPath) {
        if (videoFileLocalPath) {
          await cloudinary.uploader.destroy(videoFileLocalPath);
        }
        if (thumbNailLocalPath) {
          await cloudinary.uploader.destroy(thumbNailLocalPath);
        }
        throw new ApiError(
          "Video or file require",
          HttpStatusCode.BAD_REQUEST,
          "Bad request"
        );
      }
      const videoPathCloudnary: UploadApiResponse | null | undefined =
        await uploadOnCloudinary(videoFileLocalPath);
      const thumbNailPathCloudnary: UploadApiResponse | null | undefined =
        await uploadOnCloudinary(thumbNailLocalPath);
      if (!videoPathCloudnary || !thumbNailPathCloudnary) {
        throw new ApiError(
          "Video or file require",
          HttpStatusCode.BAD_REQUEST,
          "Bad request"
        );
      }

      const createdVideo = await Video.create({
        videoFile: videoPathCloudnary.url,
        thumbnail: thumbNailPathCloudnary.url,
        title: title,
        description: description,
        duration: Math.floor(videoPathCloudnary.duration),
        views: 0,
        isPublished: true,
        owner: req.user._id,
      });

      const videoDone = await Video.findById(createdVideo._id).select(
        "-_id -owner -__v"
      );

      if (!videoDone) {
        throw new ApiError(
          "Video or file require",
          HttpStatusCode.BAD_REQUEST,
          "Bad request"
        );
      }
      // TODO: get video, upload to cloudinary, create video
      res.send(
        new ApiError(
          "Video upload successfully",
          HttpStatusCode.CREATED,
          "Success"
        )
      );
    } catch (error) {
      res.send(
        new ApiError(
          "Video or file require",
          HttpStatusCode.BAD_REQUEST,
          "Bad request"
        )
      );
    }
  }
);

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
