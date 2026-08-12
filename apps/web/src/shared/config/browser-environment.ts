/** Browser-safe runtime configuration exposed by Vite. */
export interface BrowserEnvironment {
  apiBaseUrl: string;
}

/**
 * Reads and validates the public API URL exposed to the browser.
 *
 * @returns Normalized browser configuration with no trailing slash.
 * @throws {Error} When the public API URL is missing or unsafe.
 */
export function loadBrowserEnvironment(): BrowserEnvironment {
  const value = import.meta.env.VITE_API_BASE_URL;

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('VITE_API_BASE_URL must be an absolute HTTP(S) URL.');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('VITE_API_BASE_URL must be an absolute HTTP(S) URL.');
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new Error(
      'VITE_API_BASE_URL must use HTTP(S) without credentials, query, or fragment.',
    );
  }

  return { apiBaseUrl: url.href.replace(/\/$/, '') };
}

/** Validated browser environment shared by the frontend boundaries. */
export const browserEnvironment = loadBrowserEnvironment();
