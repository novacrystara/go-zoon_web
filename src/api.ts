// Resolves the API base URL for native Capacitor / local dev contexts (where relative
// paths don't resolve to a same-origin server) vs standard web hosting (relative paths).
//
// IMPORTANT: standard web hosting (the live site itself) always uses same-origin
// relative paths - it must never be redirectable to a different backend, otherwise
// the live app and its own database can silently diverge (this previously happened:
// the dev-testing override below used to apply to every platform, so a stale
// localStorage value from testing could make the production website write to a
// different Postgres instance than the one it reads from). The override now only
// applies to native/local builds, which have no same-origin backend to fall back to.
export const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    const isLocalOrNative =
      window.location.protocol === 'file:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol.startsWith('capacitor') ||
      window.location.protocol.startsWith('ionic');

    if (isLocalOrNative) {
      // Dev/testing override, e.g. pointing a simulator build at a local server.
      const saved = localStorage.getItem('gozoon_backend_api_url');
      if (saved) {
        return saved;
      }
      return 'https://go-zoon.ai.studio';
    }
  }
  return '';
};

export const fetchApi = (endpoint: string, options?: RequestInit) => {
  const baseUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return fetch(`${baseUrl}${cleanEndpoint}`, options);
};

// Best-effort client error report - deliberately fire-and-forget so a reporting
// failure never compounds whatever original error triggered it.
export const reportClientError = (message: string, stack: string | undefined, source: string) => {
  try {
    fetchApi('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, stack, source })
    }).catch(() => {});
  } catch {
    // no-op
  }
};
