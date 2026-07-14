// Resolves the API base URL for native Capacitor / local dev contexts (where relative
// paths don't resolve to a same-origin server) vs standard web hosting (relative paths).
export const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    // If the developer/user has configured a specific target sync endpoint, respect it on all platforms!
    const saved = localStorage.getItem('gozoon_backend_api_url');
    if (saved) {
      return saved;
    }

    const isLocalOrNative =
      window.location.protocol === 'file:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol.startsWith('capacitor') ||
      window.location.protocol.startsWith('ionic');

    if (isLocalOrNative) {
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
