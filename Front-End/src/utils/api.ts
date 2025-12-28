import { API_URL } from "@/components/MatchDashboard/types";

/**
 * Authenticated fetch wrapper that includes credentials (cookies) in all requests
 */
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;
  
  return fetch(fullUrl, {
    ...options,
    credentials: "include", // Always include cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
};

