export const appendEmailQuery = (url: string, email: string) =>
  email ? `${url}${url.includes("?") ? "&" : "?"}email=${encodeURIComponent(email)}` : url;

export const userScopedResourceUrl = (baseUrl: string, resourceUrl: string | undefined, email: string) =>
  resourceUrl ? appendEmailQuery(`${baseUrl}${resourceUrl}`, email) : "";

