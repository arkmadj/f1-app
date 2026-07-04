import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const axiosMock = vi.hoisted(() => {
  const createMockClient = (get = vi.fn()) => ({
    get,
    post: vi.fn(),
    interceptors: {
      response: {
        use: vi.fn(),
      },
    },
  });

  return {
    create: vi.fn(() => createMockClient()),
    createMockClient,
    isAxiosError: vi.fn((error: unknown) =>
      Boolean((error as { isAxiosError?: boolean }).isAxiosError)
    ),
  };
});

vi.mock("axios", () => {
  return {
    default: { create: axiosMock.create, isAxiosError: axiosMock.isAxiosError },
  };
});

describe("services/api/axios", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exposes the Jolpica F1 base URL", async () => {
    const {
      F1_API_BASE_URL,
      API_TIMEOUT_MS,
      API_RETRY_ATTEMPTS,
      API_RETRY_BASE_DELAY_MS,
      API_RETRY_MAX_DELAY_MS,
    } = await import("./axios");
    expect(F1_API_BASE_URL).toBe("https://api.jolpi.ca/ergast/f1");
    expect(API_TIMEOUT_MS).toBe(10000);
    expect(API_RETRY_ATTEMPTS).toBe(2);
    expect(API_RETRY_BASE_DELAY_MS).toBe(300);
    expect(API_RETRY_MAX_DELAY_MS).toBe(3000);
  });

  it("creates the F1 axios instance with shared defaults and response normalization", async () => {
    const Axios = (await import("axios")).default;
    const client = axiosMock.createMockClient();
    vi.mocked(Axios.create).mockReturnValue(client as never);

    await import("./axios");

    expect(Axios.create).toHaveBeenCalledWith({
      baseURL: "https://api.jolpi.ca/ergast/f1",
      timeout: 10000,
      headers: { Accept: "application/json" },
    });
    expect(client.interceptors.response.use).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("exposes a helper that returns F1 response data", async () => {
    const Axios = (await import("axios")).default;
    const get = vi.fn().mockResolvedValue({ data: { ok: true } });
    vi.mocked(Axios.create).mockReturnValue(
      axiosMock.createMockClient(get) as never
    );

    const { getF1ApiData } = await import("./axios");
    await expect(getF1ApiData("/2024.json")).resolves.toEqual({ ok: true });
    expect(get).toHaveBeenCalledWith("/2024.json");
  });

  it("normalizes Ergast/Jolpica HTTP errors through the response interceptor", async () => {
    const Axios = (await import("axios")).default;
    const client = axiosMock.createMockClient();
    vi.mocked(Axios.create).mockReturnValue(client as never);

    const { F1_API_ERROR_SOURCE, F1ApiError } = await import("./axios");
    const onRejected = client.interceptors.response.use.mock.calls[0][1];
    const upstreamError = {
      isAxiosError: true,
      code: "ERR_BAD_RESPONSE",
      message: "Request failed with status code 503",
      config: { method: "get", url: "/2024.json" },
      response: {
        status: 503,
        statusText: "Service Unavailable",
        data: { MRData: { Errors: ["Jolpica service unavailable"] } },
      },
    };

    await expect(onRejected(upstreamError)).rejects.toMatchObject({
      name: "F1ApiError",
      source: F1_API_ERROR_SOURCE,
      kind: "http",
      message: "Jolpica service unavailable",
      status: 503,
      statusText: "Service Unavailable",
      code: "ERR_BAD_RESPONSE",
      method: "GET",
      url: "/2024.json",
      retryable: true,
    });
    await expect(onRejected(upstreamError)).rejects.toBeInstanceOf(F1ApiError);
  });

  it("normalizes unknown failures into non-retryable F1 API errors", async () => {
    const { normalizeF1ApiError } = await import("./axios");
    const normalizedError = normalizeF1ApiError(new Error("boom"));

    expect(normalizedError).toMatchObject({
      name: "F1ApiError",
      kind: "unknown",
      message: "boom",
      retryable: false,
    });
  });

  it("retries retryable request failures with exponential backoff", async () => {
    vi.useFakeTimers();
    const Axios = (await import("axios")).default;
    const retryableError = {
      isAxiosError: true,
      config: { method: "get" },
      response: { status: 503 },
    };
    const get = vi
      .fn()
      .mockRejectedValueOnce(retryableError)
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValueOnce({ data: { ok: true } });
    vi.mocked(Axios.create).mockReturnValue(
      axiosMock.createMockClient(get) as never
    );

    const { getF1ApiData, API_RETRY_BASE_DELAY_MS } = await import("./axios");
    const promise = getF1ApiData("/2024.json");

    await Promise.resolve();
    expect(get).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(API_RETRY_BASE_DELAY_MS);
    expect(get).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(API_RETRY_BASE_DELAY_MS * 2);
    await expect(promise).resolves.toEqual({ ok: true });
    expect(get).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-retryable client errors", async () => {
    const Axios = (await import("axios")).default;
    const nonRetryableError = {
      isAxiosError: true,
      config: { method: "get" },
      response: { status: 404 },
    };
    const get = vi.fn().mockRejectedValue(nonRetryableError);
    vi.mocked(Axios.create).mockReturnValue(
      axiosMock.createMockClient(get) as never
    );

    const { getF1ApiData } = await import("./axios");

    await expect(getF1ApiData("/missing.json")).rejects.toBe(nonRetryableError);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("retries normalized retryable API errors", async () => {
    const { F1ApiError, requestWithRetry } = await import("./axios");
    const retryableError = new F1ApiError({
      kind: "http",
      message: "Service unavailable",
      status: 503,
      method: "GET",
      retryable: true,
    });
    const request = vi
      .fn()
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValueOnce("ok");

    await expect(
      requestWithRetry(request, { retries: 1, baseDelayMs: 0 })
    ).resolves.toBe("ok");
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("stops retrying after the configured retry attempts", async () => {
    const retryableError = {
      isAxiosError: true,
      config: { method: "get" },
      response: { status: 503 },
    };
    const request = vi.fn().mockRejectedValue(retryableError);
    const { requestWithRetry } = await import("./axios");

    await expect(
      requestWithRetry(request, { retries: 1, baseDelayMs: 0 })
    ).rejects.toBe(retryableError);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
