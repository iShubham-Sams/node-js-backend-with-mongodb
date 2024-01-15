import HttpStatusCode from "../utils/statusCode.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
  //TODO: build a healthcheck response that simply returns the OK status as json with a message
  return res
    .status(HttpStatusCode.OK)
    .json(new ApiResponse(200, {}, "Backend working fine"));
});

export { healthcheck };
