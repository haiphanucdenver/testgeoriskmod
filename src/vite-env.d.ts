/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAPBOX_API_KEY: string
  readonly VITE_API_URL: string
  // add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

