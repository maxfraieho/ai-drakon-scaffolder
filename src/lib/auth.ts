const ACCESS_TOKEN_KEY = "aegisroute.access_token";
const JWT_TOKEN_KEY = "jwt";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(JWT_TOKEN_KEY);
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.setItem(JWT_TOKEN_KEY, token);
  }
  return token;
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.setItem(JWT_TOKEN_KEY, token);
}

export function clearAccessToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(JWT_TOKEN_KEY);
}
