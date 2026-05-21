import { getAccessToken } from "@/lib/auth";

export function hasClientJwt(): boolean {
return Boolean(getAccessToken());
}

