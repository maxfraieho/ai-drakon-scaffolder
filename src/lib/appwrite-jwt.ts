import { account } from "./appwrite";

let cachedJwt: string | null = null;
let lastFetched: number = 0; // Timestamp in milliseconds

/**
 * Fetches the Appwrite JWT, caching it in memory.
 * Updates the token if it is older than 10 minutes (600,000 ms).
 * Returns null if the user is not logged in or an error occurs.
 */
export async function getAppwriteJwt(): Promise<string | null> {
  const now = Date.now();
  
  if (cachedJwt && (now - lastFetched < 600000)) {
    return cachedJwt;
  }

  try {
    const jwtObj = await account.createJWT();
    cachedJwt = jwtObj.jwt;
    lastFetched = now;
    return cachedJwt;
  } catch (error) {
    // Return null if user is not logged in or there is any network error
    cachedJwt = null;
    lastFetched = 0;
    return null;
  }
}
