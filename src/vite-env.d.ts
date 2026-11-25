/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_WHATSAPP_NUMBER?: string
  /** HF AI Search: `1` liga invoke Edge search-assist (sem API key no front). */
  readonly VITE_SEARCH_NL_LLM?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
