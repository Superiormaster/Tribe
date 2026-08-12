export class UploadNetworkError extends Error {
  isNetworkError = true;

  constructor(message = "Network error during media upload.") {
    super(message);
    this.name = "UploadNetworkError";
  }
}