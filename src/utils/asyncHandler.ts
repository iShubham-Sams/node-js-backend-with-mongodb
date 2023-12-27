import { NextFunction, Request, Response } from "express";

const asyncHandler = (
  requestHandler: (req: Request, res: Response, nex: NextFunction) => void
) => {
  return (req: Request, res: Response, nex: NextFunction) => {
    Promise.resolve(requestHandler(req, res, nex)).catch((err) => nex(err));
  };
};
export { asyncHandler };
