export interface ApiHealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
}

export interface EmptyApiResponse {
  success: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
}
