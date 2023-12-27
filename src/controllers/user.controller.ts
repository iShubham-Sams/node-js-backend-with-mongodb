import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    message: "OK",
  });
});

export { registerUser };
