import Axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";

export const F1_API_BASE_URL = "https://api.jolpi.ca/ergast/f1";
export const API_TIMEOUT_MS = 10000;
export const API_RETRY_ATTEMPTS = 2;
export const API_RETRY_BASE_DELAY_MS = 300;
export const API_RETRY_MAX_DELAY_MS = 3000;

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_HTTP_METHODS = new Set(["get", "head", "options"]);

const DEFAULT_HEADERS = {
  Accept: "application/json",
} as const;

export const F1_API_ERROR_SOURCE = "ergast-jolpica" as const;

export type F1ApiErrorKind =
  | "http"
  | "network"
  | "timeout"
  | "cancelled"
  | "unknown";

export interface F1ApiErrorShape {
  readonly name: "F1ApiError";
  readonly source: typeof F1_API_ERROR_SOURCE;
  readonly kind: F1ApiErrorKind;
  readonly message: string;
  readonly status?: number;
  readonly statusText?: string;
  readonly code?: string;
  readonly method?: string;
  readonly url?: string;
  readonly retryable: boolean;
  readonly cause?: unknown;
}

type F1ApiErrorInput = Omit<F1ApiErrorShape, "name" | "source">;

export class F1ApiError extends Error implements F1ApiErrorShape {
  readonly name = "F1ApiError";
  readonly source = F1_API_ERROR_SOURCE;
  readonly kind: F1ApiErrorKind;
  readonly status?: number;
  readonly statusText?: string;
  readonly code?: string;
  readonly method?: string;
  readonly url?: string;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor({
    message,
    kind,
    status,
    statusText,
    code,
    method,
    url,
    retryable,
    cause,
  }: F1ApiErrorInput) {
    super(message);
    Object.setPrototypeOf(this, F1ApiError.prototype);
    this.kind = kind;
    this.status = status;
    this.statusText = statusText;
    this.code = code;
    this.method = method;
    this.url = url;
    this.retryable = retryable;
    this.cause = cause;
  }
}

interface ApiRetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const getStringProperty = (
  record: Record<string, unknown>,
  keys: string[]
): string | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (isNonEmptyString(value)) {
      return value;
    }
  }

  return undefined;
};

const getErrorsMessage = (value: unknown): string | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const messages = value
    .filter(isNonEmptyString)
    .map((message) => message.trim());
  return messages.length > 0 ? messages.join("; ") : undefined;
};

const getApiErrorMessage = (data: unknown): string | undefined => {
  if (isNonEmptyString(data)) {
    return data;
  }

  if (!isRecord(data)) {
    return undefined;
  }

  const directMessage =
    getStringProperty(data, ["message", "error", "detail", "title"]) ??
    getErrorsMessage(data.errors) ??
    getErrorsMessage(data.Errors);
  if (directMessage) {
    return directMessage;
  }

  if (isRecord(data.MRData)) {
    return (
      getStringProperty(data.MRData, ["message", "error", "detail", "title"]) ??
      getErrorsMessage(data.MRData.errors) ??
      getErrorsMessage(data.MRData.Errors)
    );
  }

  return undefined;
};

const getDefaultApiErrorMessage = (
  kind: F1ApiErrorKind,
  status?: number,
  statusText?: string
): string => {
  if (kind === "http") {
    const statusLabel = status ? ` with status ${status}` : "";
    const statusTextLabel = statusText ? ` ${statusText}` : "";
    return `F1 API request failed${statusLabel}${statusTextLabel}`;
  }

  if (kind === "timeout") {
    return "F1 API request timed out";
  }

  if (kind === "network") {
    return "F1 API network request failed";
  }

  if (kind === "cancelled") {
    return "F1 API request was cancelled";
  }

  return "F1 API request failed";
};

const getAxiosErrorKind = (error: AxiosError): F1ApiErrorKind => {
  if (error.response) {
    return "http";
  }

  if (error.code === "ERR_CANCELED") {
    return "cancelled";
  }

  if (
    error.code === "ECONNABORTED" ||
    error.message.toLowerCase().includes("timeout")
  ) {
    return "timeout";
  }

  if (error.request) {
    return "network";
  }

  return "unknown";
};

const isRetryableApiFailure = (
  method?: string,
  status?: number,
  kind: F1ApiErrorKind = "unknown"
): boolean => {
  if (method && !RETRYABLE_HTTP_METHODS.has(method.toLowerCase())) {
    return false;
  }

  if (kind === "cancelled" || kind === "unknown") {
    return false;
  }

  if (status !== undefined) {
    return RETRYABLE_STATUS_CODES.has(status);
  }

  return kind === "network" || kind === "timeout";
};

export const isF1ApiError = (error: unknown): error is F1ApiError =>
  error instanceof F1ApiError ||
  (isRecord(error) &&
    error.name === "F1ApiError" &&
    error.source === F1_API_ERROR_SOURCE &&
    isNonEmptyString(error.message) &&
    typeof error.retryable === "boolean");

export const normalizeF1ApiError = (error: unknown): F1ApiError => {
  if (isF1ApiError(error)) {
    return error;
  }

  if (!Axios.isAxiosError(error)) {
    return new F1ApiError({
      kind: "unknown",
      message: error instanceof Error ? error.message : "F1 API request failed",
      retryable: false,
      cause: error,
    });
  }

  const kind = getAxiosErrorKind(error);
  const method = error.config?.method?.toUpperCase();
  const status = error.response?.status;
  const statusText = error.response?.statusText;

  return new F1ApiError({
    kind,
    message:
      getApiErrorMessage(error.response?.data) ??
      getDefaultApiErrorMessage(kind, status, statusText),
    status,
    statusText,
    code: error.code,
    method,
    url: error.config?.url,
    retryable: isRetryableApiFailure(method, status, kind),
    cause: error,
  });
};

const handleApiResponseError = (error: unknown): Promise<never> =>
  Promise.reject(normalizeF1ApiError(error));

const createApiClient = (
  baseURL: string,
  config: AxiosRequestConfig = {}
): AxiosInstance => {
  const client = Axios.create({
    timeout: API_TIMEOUT_MS,
    ...config,
    baseURL,
    headers: {
      ...DEFAULT_HEADERS,
      ...config.headers,
    },
  });

  client.interceptors.response.use(
    (response) => response,
    handleApiResponseError
  );
  return client;
};

export const f1ApiClient = createApiClient(F1_API_BASE_URL);

// Backwards-compatible alias for existing imports while the app migrates to the
// clearer `f1ApiClient` name.
export const ergastAxios = f1ApiClient;

const delay = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    globalThis.setTimeout(resolve, durationMs);
  });

export const getRetryDelayMs = (
  attemptIndex: number,
  baseDelayMs = API_RETRY_BASE_DELAY_MS,
  maxDelayMs = API_RETRY_MAX_DELAY_MS
): number => Math.min(baseDelayMs * 2 ** attemptIndex, maxDelayMs);

export const shouldRetryApiRequest = (error: unknown): boolean => {
  if (isF1ApiError(error)) {
    return error.retryable;
  }

  if (!Axios.isAxiosError(error)) {
    return false;
  }

  return isRetryableApiFailure(
    error.config?.method,
    error.response?.status,
    getAxiosErrorKind(error)
  );
};

export const requestWithRetry = async <T>(
  request: () => Promise<T>,
  {
    retries = API_RETRY_ATTEMPTS,
    baseDelayMs = API_RETRY_BASE_DELAY_MS,
    maxDelayMs = API_RETRY_MAX_DELAY_MS,
  }: ApiRetryOptions = {}
): Promise<T> => {
  let attemptIndex = 0;

  while (true) {
    try {
      return await request();
    } catch (error) {
      if (attemptIndex >= retries || !shouldRetryApiRequest(error)) {
        throw error;
      }

      await delay(getRetryDelayMs(attemptIndex, baseDelayMs, maxDelayMs));
      attemptIndex += 1;
    }
  }
};

export const getF1ApiData = async <T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  const request = (): Promise<AxiosResponse<T>> =>
    config ? f1ApiClient.get<T>(url, config) : f1ApiClient.get<T>(url);

  const response = await requestWithRetry(request);
  return response.data;
};
