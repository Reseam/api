export type ApiStatus = 400 | 404 | 502 | 503;

export class ApiError extends Error {
  constructor(
    readonly statusCode: ApiStatus,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
