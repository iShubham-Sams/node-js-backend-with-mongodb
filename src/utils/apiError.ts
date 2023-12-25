import HttpStatusCode from "./statusCode.js";

class ApiError extends Error {
  statusCode: number;
  errorName: string;
  constructor(
    message = "Something went wrong",
    statusCode: number,
    errorName: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorName = errorName;
  }

  static Conflict(message: string) {
    return new ApiError(message, HttpStatusCode.CONFLICT, "APIError::Conflict");
  }

  static BadRequest(message: string) {
    return new ApiError(message, HttpStatusCode.BAD_REQUEST, "BadRequest");
  }

  static ServerError(message: string) {
    return new ApiError(
      message,
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      "ServerError"
    );
  }

  static NotFound(message: string) {
    return new ApiError(message, HttpStatusCode.NOT_FOUND, "NotFound");
  }
  static Unauthorized(message = "unauthorized") {
    return new ApiError(
      message,
      HttpStatusCode.UNAUTHORIZED,
      "ApiError::Unauthorized"
    );
  }
}

export { ApiError };
