export type MessageFailureType =
  | "network"
  | "server"
  | "validation"
  | "permission"
  | "community_unavailable"
  | "content_rejected"
  | "unknown";

export type MessageFailure = {
  type: MessageFailureType;
  message: string;
  retryable: boolean;
};

function getErrorMessage(value: any): string {
  if (typeof value === "string") {
    return value;
  }

  if (!value) {
    return "Message could not be sent";
  }

  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === "object") {
    // Most useful fields first
    if (typeof value.message === "string") {
      return value.message;
    }

    if (typeof value.detail === "string") {
      return value.detail;
    }

    if (typeof value.error_message === "string") {
      return value.error_message;
    }

    if (typeof value.error === "string") {
      return value.error;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return "Message could not be sent";
    }
  }

  return String(value);
}

export function classifyMessageError(
  error?: any,
  ack?: any
): MessageFailure {
  // ---------------------------------
  // ACK ERROR
  // ---------------------------------
  if (ack && ack.ok === false) {
    const code =
      ack.error_code ??
      ack.code ??
      ack.error?.code ??
      ack.error_type;

    const rawMessage =
      ack.error ??
      ack.message ??
      ack.error_message ??
      ack.detail ??
      null;

    const message = getErrorMessage(rawMessage);

    const normalizedCode =
      String(code ?? "").toLowerCase();

    const normalizedMessage =
      String(message).toLowerCase();

    // -----------------------------
    // VALIDATION
    // -----------------------------
    if (
      normalizedCode.includes("validation") ||
      normalizedCode.includes("invalid") ||
      normalizedMessage.includes("invalid message") ||
      normalizedMessage.includes("validation")
    ) {
      return {
        type: "validation",
        message: String(message),
        retryable: false,
      };
    }

    // -----------------------------
    // PERMISSION
    // -----------------------------
    if (
      normalizedCode.includes("permission") ||
      normalizedCode.includes("forbidden") ||
      normalizedCode.includes("unauthorized") ||
      normalizedCode.includes("not_allowed") ||
      normalizedMessage.includes("permission denied") ||
      normalizedMessage.includes("not allowed")
    ) {
      return {
        type: "permission",
        message: String(message),
        retryable: false,
      };
    }

    // -----------------------------
    // COMMUNITY UNAVAILABLE
    // -----------------------------
    if (
      normalizedCode.includes("community") &&
      (
        normalizedCode.includes("unavailable") ||
        normalizedCode.includes("not_found") ||
        normalizedCode.includes("deleted")
      )
    ) {
      return {
        type: "community_unavailable",
        message: String(message),
        retryable: false,
      };
    }

    if (
      normalizedMessage.includes("community unavailable") ||
      normalizedMessage.includes("community not found") ||
      normalizedMessage.includes("community does not exist")
    ) {
      return {
        type: "community_unavailable",
        message: String(message),
        retryable: false,
      };
    }

    // -----------------------------
    // CONTENT REJECTED
    // -----------------------------
    if (
      normalizedCode.includes("content") &&
      (
        normalizedCode.includes("rejected") ||
        normalizedCode.includes("blocked")
      )
    ) {
      return {
        type: "content_rejected",
        message: String(message),
        retryable: false,
      };
    }

    if (
      normalizedMessage.includes("content rejected") ||
      normalizedMessage.includes("content blocked") ||
      normalizedMessage.includes("rejected content")
    ) {
      return {
        type: "content_rejected",
        message: String(message),
        retryable: false,
      };
    }

    // -----------------------------
    // TEMPORARY SERVER ERROR
    // -----------------------------
    if (
      normalizedCode.includes("server") ||
      normalizedCode.includes("temporary") ||
      normalizedCode.includes("timeout") ||
      normalizedCode === "500" ||
      normalizedCode === "502" ||
      normalizedCode === "503" ||
      normalizedCode === "504"
    ) {
      return {
        type: "server",
        message: String(message),
        retryable: true,
      };
    }

    if (
      normalizedMessage.includes("server error") ||
      normalizedMessage.includes("temporarily unavailable") ||
      normalizedMessage.includes("timeout")
    ) {
      return {
        type: "server",
        message: String(message),
        retryable: true,
      };
    }

    // Unknown ACK failure:
    // safer to retry because the server did not explicitly
    // tell us that the message is permanently invalid.
    return {
      type: "server",
      message: String(message),
      retryable: true,
    };
  }

  // ---------------------------------
  // THROWN ERROR
  // ---------------------------------

  const message =
    error?.message ??
    String(error ?? "Message could not be sent");

  const normalized =
    message.toLowerCase();

  // Network errors
  if (
    error?.name === "NetworkError" ||
    error?.name === "AbortError" ||
    normalized.includes("network") ||
    normalized.includes("offline") ||
    normalized.includes("socket disconnected") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("connection refused") ||
    normalized.includes("connection reset") ||
    normalized.includes("timeout")
  ) {
    return {
      type: "network",
      message,
      retryable: true,
    };
  }

  // Server errors
  if (
    normalized.includes("500") ||
    normalized.includes("502") ||
    normalized.includes("503") ||
    normalized.includes("504") ||
    normalized.includes("server error") ||
    normalized.includes("temporarily unavailable")
  ) {
    return {
      type: "server",
      message,
      retryable: true,
    };
  }

  // Permanent failures
  if (
    normalized.includes("invalid message") ||
    normalized.includes("validation") ||
    normalized.includes("permission denied") ||
    normalized.includes("forbidden") ||
    normalized.includes("unauthorized") ||
    normalized.includes("community unavailable") ||
    normalized.includes("community not found") ||
    normalized.includes("content rejected")
  ) {
    if (
      normalized.includes("permission") ||
      normalized.includes("forbidden") ||
      normalized.includes("unauthorized")
    ) {
      return {
        type: "permission",
        message,
        retryable: false,
      };
    }

    if (
      normalized.includes("community")
    ) {
      return {
        type: "community_unavailable",
        message,
        retryable: false,
      };
    }

    if (
      normalized.includes("content")
    ) {
      return {
        type: "content_rejected",
        message,
        retryable: false,
      };
    }

    return {
      type: "validation",
      message,
      retryable: false,
    };
  }

  // Unknown thrown errors should retry.
  return {
    type: "unknown",
    message,
    retryable: true,
  };
}