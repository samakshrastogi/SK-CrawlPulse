export const normalizeUserEmail = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
};

