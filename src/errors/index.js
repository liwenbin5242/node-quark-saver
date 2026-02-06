class QuarkError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class AuthenticationError extends QuarkError {
  constructor(message, details = {}) {
    super(message, 'AUTH_ERROR', details);
  }
}

class NetworkError extends QuarkError {
  constructor(message, details = {}) {
    super(message, 'NETWORK_ERROR', details);
  }
}

class InvalidURLError extends QuarkError {
  constructor(message, details = {}) {
    super(message, 'INVALID_URL', details);
  }
}

class TransferError extends QuarkError {
  constructor(message, details = {}) {
    super(message, 'TRANSFER_ERROR', details);
  }
}

class FileNotFoundError extends QuarkError {
  constructor(message, details = {}) {
    super(message, 'FILE_NOT_FOUND', details);
  }
}

class RateLimitError extends QuarkError {
  constructor(message, details = {}) {
    super(message, 'RATE_LIMIT', details);
  }
}

module.exports = {
  QuarkError,
  AuthenticationError,
  NetworkError,
  InvalidURLError,
  TransferError,
  FileNotFoundError,
  RateLimitError
};