// Central place for resolving backend API and media URLs.
//
// Set VITE_API_BASE_URL (e.g. https://api.example.com) when the frontend is
// deployed separately from the backend. When it is unset (empty string),
// "/api" and "/media" paths stay relative: in local development the Vite dev
// server proxy forwards them to the Django backend, and in production the
// app is expected to be served from the same origin as the API.

export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? "";

/** Build an API URL from a path such as "/api/events/". */
export function buildApiUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${suffix}`;
}

/** Build a media URL from a path such as "/media/images/foo.jpg". */
export function buildMediaUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${suffix}`;
}

// Legacy backend hosts that may still be baked into stored image URLs.
const LEGACY_BACKEND_HOSTS = [
  "http://localhost:8000",
  "https://localhost:8000",
  "http://127.0.0.1:8000",
  "https://127.0.0.1:8000",
];

/**
 * Normalize a media/image URL coming from the backend:
 * - absolute URLs pointing at an old hard-coded dev backend are rewritten
 *   against the current API base
 * - relative "/media/..." paths resolve against the current API base
 * - anything else (external CDN, placeholder, data URL) is returned untouched
 */
export function resolveMediaUrl(
  url: string | null | undefined
): string | undefined {
  if (!url) return undefined;
  let normalized = url.trim();
  for (const host of LEGACY_BACKEND_HOSTS) {
    if (normalized.startsWith(host)) {
      normalized = normalized.slice(host.length);
      break;
    }
  }
  if (normalized.startsWith("/media/")) {
    return buildMediaUrl(normalized);
  }
  return normalized;
}
