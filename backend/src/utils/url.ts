import { HttpError } from "../lib/HttpError";

export const normalizeUrl = (input: string): URL => {
  try {
    const url = new URL(input);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new HttpError(400, "Only http and https URLs are supported");
    }
    return url;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(400, "Invalid target URL", { input });
  }
};

export const sameOrigin = (baseUrl: URL, candidate: string): boolean => {
  try {
    return new URL(candidate, baseUrl).origin === baseUrl.origin;
  } catch {
    return false;
  }
};

export const toRoutePath = (value: string): string => {
  try {
    const url = new URL(value);
    return `${url.pathname || "/"}${url.search}`;
  } catch {
    return value;
  }
};

const TRACKING_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "ref",
  "ref_src",
  "source",
]);

const isDynamicSegment = (segment: string) => {
  const normalized = segment.trim();
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("@")) {
    return true;
  }

  if (/^\d+$/.test(normalized)) {
    return true;
  }

  if (/^[0-9a-f]{8,}$/i.test(normalized)) {
    return true;
  }

  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
  ) {
    return true;
  }

  if (/^[A-Za-z0-9_-]{8,}$/.test(normalized) && /[0-9]/.test(normalized)) {
    return true;
  }

  return false;
};

const normalizeSegment = (segment: string) => {
  if (segment.startsWith("@")) {
    return "@:handle";
  }

  return isDynamicSegment(segment) ? ":id" : segment.toLowerCase();
};

export const toRoutePattern = (value: string): string => {
  try {
    const url = new URL(value);
    const normalizedPath =
      url.pathname
        .split("/")
        .filter(Boolean)
        .map((segment) => normalizeSegment(segment))
        .join("/") || "";

    const queryKeys = Array.from(url.searchParams.keys())
      .filter((key) => !TRACKING_QUERY_PARAMS.has(key.toLowerCase()))
      .sort();

    const querySuffix = queryKeys.length > 0 ? `?${queryKeys.join("&")}` : "";
    return `/${normalizedPath}${querySuffix}` || "/";
  } catch {
    return value;
  }
};
