/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUB_APP_NAME: string;
  readonly VITE_API_BASE_URL: string;
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
