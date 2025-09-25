class CustomError extends Error {
  constructor(err: any) {
    let message = 'An error occurred';
    let code = '00.00.00';
    let status = err.response?.status;

    const errorData = err.response?.data || err;

    if (errorData?.errors?.[0]) {
      message = errorData.errors[0].errorMessage || message;
      code = errorData.errors[0].errorCode || code;
      status = errorData.errors[0].status || status;
    } else {
      message = err.message || message;
      code = err.code || code;
    }

    super(message);
    this.code = code;
    this.status = status;

    Object.setPrototypeOf(this, CustomError.prototype);
  }

  public code: string;
  public status?: number;
}

export default CustomError;
