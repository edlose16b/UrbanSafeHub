export function getAuthRedirectBaseUrl(currentOrigin?: string): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (currentOrigin) {
    return currentOrigin.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}
