export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type HttpRequestOptions = {
  method?: HttpMethod;
  headers?: HeadersInit;
  body?: unknown;
};

export async function httpRequest<TResponse>(
  input: string,
  options: HttpRequestOptions = {},
): Promise<TResponse> {
  const { method = "GET", headers, body } = options;

  const response = await fetch(input, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP request failed: ${response.status}`);
  }

  return (await response.json()) as TResponse;
}
