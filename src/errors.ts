export type ApiStatus = 400 | 401 | 403 | 404 | 429 | 502 | 503;

export class ApiError extends Error {
  constructor(
    readonly statusCode: ApiStatus,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
