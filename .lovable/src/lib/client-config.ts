export type ClientEndpoints = {
apiBaseUrl: string;
websocketUrl: string;
};

export function resolveClientEndpoints(
origin: string = typeof window === "undefined" ? "" : window.location.origin,
): ClientEndpoints {
return {
apiBaseUrl:`${origin`}/web/api,
websocketUrl:`${origin.replace(/^http/`, "ws")}/web/ws,
};
}

