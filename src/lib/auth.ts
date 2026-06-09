const ACCESS_TOKEN_KEY = "aegisroute.access_token";
const JWT_TOKEN_KEY = "jwt";

export function getAccessToken() {
if (typeof window === "undefined") return null;
const token = localStorage.getItem(ACCESS_TOKEN_KEY) ||
localStorage.getItem(JWT_TOKEN_KEY);
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
  
  const keysToPreserve = [
    "drakon.settings",
    "drakon_agent_base_url",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "default_model",
    "enable_auto_retry",
    "debug_mode",
    "nav_collapsed",
    "docs_repo_path",
    "docs_repo_name"
  ];
  
  const preserved: Record<string, string> = {};
  keysToPreserve.forEach((key) => {
    const val = localStorage.getItem(key);
    if (val !== null) preserved[key] = val;
  });

  localStorage.clear();

  Object.entries(preserved).forEach(([key, val]) => {
    localStorage.setItem(key, val);
  });
}


