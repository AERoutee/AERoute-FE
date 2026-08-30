let initialized = false

function stripUrl(value?: string) {
  if (!value) return value
  try {
    const url = new URL(value, window.location.origin)
    return `${url.origin}${url.pathname}`
  } catch {
    return value.split(/[?#]/u)[0]
  }
}

export async function initializeMonitoring() {
  const appId = import.meta.env.VITE_LOGROCKET_APP_ID?.trim()
  if (!import.meta.env.PROD || !appId || initialized) return
  const { default: LogRocket } = await import('logrocket')
  LogRocket.init(appId, {
    release: import.meta.env.VITE_APP_VERSION ?? '0.1.0',
    shouldCaptureIP: false,
    dom: {
      textSanitizer: true,
      inputSanitizer: true,
      imageSanitizer: true,
      redactSelectors: ['[data-private]', '[autocomplete="one-time-code"]', '[autocomplete="current-password"]', '[autocomplete="new-password"]'],
    },
    browser: { urlSanitizer: (url) => stripUrl(url) ?? null },
    network: {
      requestSanitizer: (request) => ({ ...request, url: stripUrl(request.url) ?? '', headers: {}, body: null }),
      responseSanitizer: (response) => ({ ...response, url: stripUrl(response.url) ?? null, headers: {}, body: null }),
    },
    console: { isEnabled: { log: false, info: false, debug: false, warn: true, error: true } },
  })
  initialized = true
}
