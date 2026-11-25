/**
 * Smoke real (sem path aliases Vite): RPC + Edge search-assist.
 * Uso: node scripts/smoke-search-assist.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(resolve(root, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1)]
    }),
)

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

function line(title, obj) {
  console.log(`\n=== ${title} ===`)
  console.log(typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2))
}

async function rpc(q, extra = {}) {
  const { data, error } = await sb.rpc('search_products', {
    p_q: q,
    p_category: null,
    p_brand: null,
    p_maker: null,
    p_model: null,
    p_year: null,
    p_engine: null,
    p_version: null,
    p_sort: 'relevance',
    p_page: 1,
    p_page_size: 5,
    ...extra,
  })
  if (error) return { q, error: error.message }
  const rows = data ?? []
  return {
    q,
    total: Number(rows[0]?.total_count ?? 0),
    first: rows[0]?.name ?? null,
    sku: rows[0]?.sku ?? null,
  }
}

async function edge(query, reason) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 35000)
  try {
    const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/search-assist`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
        apikey: env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, reason }),
      signal: ctrl.signal,
    })
    const json = await res.json()
    return {
      query,
      reason,
      http: res.status,
      mode: json.mode,
      grounding: json.grounding ?? null,
      detail: typeof json.detail === 'string' ? json.detail.slice(0, 160) : json.detail,
      corrected: json.interpretation?.correctedQuery ?? null,
      model: json.interpretation?.vehicleTerms?.model ?? null,
      maker: json.interpretation?.vehicleTerms?.maker ?? null,
      products: json.interpretation?.productTerms ?? null,
      clarifying: json.interpretation?.needsClarification ?? null,
    }
  } finally {
    clearTimeout(t)
  }
}

line('ENV', {
  url: env.VITE_SUPABASE_URL,
  nl: env.VITE_SEARCH_NL_LLM,
})

line('RPC search_products', await Promise.all([
  rpc('pivo'),
  rpc('Pivor'),
  rpc('CELTA'),
  rpc('onix'),
  rpc('amortecedor'),
  rpc('pivo', { p_maker: 'Chevrolet', p_model: 'Celta' }),
]))

line('EDGE Pivor typo', await edge('Pivor HB20', 'typo_suspected').catch((e) => ({ error: e.message })))
line('EDGE amortecedor hrv', await edge('amortecedor hrv', 'unknown_intent').catch((e) => ({ error: e.message })))
line('EDGE CELTA', await edge('CELTA', 'unknown_intent').catch((e) => ({ error: e.message })))

// vitest path for aliases (reliable with vite resolve)
console.log('\n=== ALIAS/TYPO via vitest ===')
console.log('(rode: npx vitest run src/services/vehicles/vehicleAliases.test.ts --reporter=verbose)')
