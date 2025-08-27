/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_MGMT_3CAT_PASSCODE: string
  readonly VITE_SEVEN_SHIFTS_COMPANY_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
