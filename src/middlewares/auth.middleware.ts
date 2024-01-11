import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import { User } from "../models/user.model.js";
import { CustomRequest } from "../types/jwt.types.js";
config({
  path: "./.env",
});

export const verifyJwt = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");
      if (!token) {
        throw ApiError.Unauthorized();
      }

      const decodedToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET!
      ) as Record<string, string>;
      const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken"
      );
      if (!user) {
        throw ApiError.Unauthorized();
      }
      req.user = user;
      next();
    } catch (error) {
      throw ApiError.Unauthorized();
    }
  }
);
