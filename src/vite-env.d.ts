/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_GOOGLE_MAPS_BROWSER_KEY?: string
  readonly VITE_LOGROCKET_APP_ID?: string
  readonly VITE_APP_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
