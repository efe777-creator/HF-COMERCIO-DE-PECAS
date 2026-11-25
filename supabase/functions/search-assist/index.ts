/**
 * HF — search-assist
 *
 * Gemini (GEMINI_API_KEY) com Google Search grounding quando reason indica
 * dúvida de veículo/busca (unknown_intent, no_results, ambiguous, informal…).
 * Tipografia de peça pode seguir no cliente sem web.
 *
 * Secrets: GEMINI_API_KEY · GEMINI_MODEL (default gemini-3.8-flash)
 * Flag: HF_SEARCH_ASSIST_LIVE=1
 * Front: VITE_SEARCH_NL_LLM=1
 *
 * Nunca inventa PVC / preço / estoque / SKU.
 */
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AssistBody = {
  query?: string
  filters?: Record<string, string | undefined>
  intentType?: string
  reason?: string
  resultTotal?: number
}

type Interpretation = {
  correctedQuery: string
  productTerms: string[]
  vehicleTerms: {
    maker?: string
    model?: string
    year?: string
    engine?: string
    version?: string
  }
  possibleProducts: string[]
  confidenceLevel: 'high' | 'medium' | 'low'
  needsClarification: boolean
  clarificationQuestion?: string
  vehicleRecognizedOutsideCatalog?: boolean
  suggestedVehicleLabel?: string
  status:
    | 'suggestion_available'
    | 'clarification_needed'
    | 'no_change'
    | 'deterministic_required'
    | 'provider_unavailable'
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const SYSTEM = `Você extrai intenção de busca de autopeças no Brasil e AUXILIA a busca (não inventa).
Pode usar resultados de busca na web só para reconhecer o VEÍCULO (montadora/modelo/ano/motor BR) e corrigir tipografia da peça mencionada.
Responda APENAS JSON válido (sem markdown) no formato:
{"correctedQuery":string,"productTerms":string[],"vehicleTerms":{"maker"?:string,"model"?:string,"year"?:string,"engine"?:string,"version"?:string},"possibleProducts":string[],"confidenceLevel":"high"|"medium"|"low","needsClarification":boolean,"clarificationQuestion"?:string,"suggestedVehicleLabel"?:string,"status":"suggestion_available"|"clarification_needed"|"no_change"}

Regras:
- correctedQuery = query corrigida (ex.: Pivor→Pivô; HRV→HR-V) sem inventar peça ausente no texto.
- productTerms = só termos de peça EXPLICITAMENTE no texto ou correção ortográfica óbvia.
- vehicleTerms = montadora/modelo/ano/motor/versão canônicos BR se mencionados ou inferíveis (apelidos: GM→Chevrolet, HRV→HR-V).
- suggestedVehicleLabel = nome amigável do carro se reconheceu (mesmo se incerto no cadastro do cliente).
- possibleProducts = nomes candidatos curtos; NÃO invente SKU, preço nem estoque.
- Se só veículo: needsClarification=true, clarificationQuestion pedindo a peça.
- NÃO invente compatibilidade ou produtos fora do texto/correção.`

const VEHICLE_DOUBT_REASONS = new Set([
  'unknown_intent',
  'no_results',
  'ambiguous',
  'informal_description',
  'low_confidence',
  'typo_suspected',
])

function shouldUseGrounding(reason: string | undefined): boolean {
  if (!reason) return true
  // Tipografia pura de peça: sem web (cliente resolve local).
  if (reason === 'typo_suspected') return false
  return VEHICLE_DOUBT_REASONS.has(reason) || reason === 'manual_request'
}

function sanitize(raw: unknown, fallbackQuery: string): Interpretation | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const vtIn = (o.vehicleTerms ?? {}) as Record<string, unknown>
  const vehicleTerms: Interpretation['vehicleTerms'] = {}
  for (const k of ['maker', 'model', 'year', 'engine', 'version'] as const) {
    const v = vtIn[k]
    if (typeof v === 'string' && v.trim()) vehicleTerms[k] = v.trim()
  }
  const conf = o.confidenceLevel
  const status = o.status
  const productTerms = Array.isArray(o.productTerms)
    ? o.productTerms.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : []
  const possibleProducts = Array.isArray(o.possibleProducts)
    ? o.possibleProducts.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : []
  return {
    correctedQuery:
      typeof o.correctedQuery === 'string' && o.correctedQuery.trim()
        ? o.correctedQuery.trim()
        : fallbackQuery,
    productTerms,
    vehicleTerms,
    possibleProducts,
    confidenceLevel: conf === 'high' || conf === 'medium' || conf === 'low' ? conf : 'medium',
    needsClarification: Boolean(o.needsClarification),
    clarificationQuestion:
      typeof o.clarificationQuestion === 'string' && o.clarificationQuestion.trim()
        ? o.clarificationQuestion.trim()
        : undefined,
    suggestedVehicleLabel:
      typeof o.suggestedVehicleLabel === 'string' && o.suggestedVehicleLabel.trim()
        ? o.suggestedVehicleLabel.trim()
        : undefined,
    status:
      status === 'suggestion_available' ||
      status === 'clarification_needed' ||
      status === 'no_change'
        ? status
        : 'suggestion_available',
  }
}

type GeminiCallResult =
  | { ok: true; interpretation: Interpretation }
  | { ok: false; detail: string }

async function callGeminiOnce(
  q: string,
  apiKey: string,
  model: string,
  filters: Record<string, string | undefined> | undefined,
  reason: string | undefined,
  withGrounding: boolean,
): Promise<GeminiCallResult> {
  const userPayload = JSON.stringify({
    query: q.slice(0, 240),
    filters: filters ?? {},
    reason: reason ?? null,
  })
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: userPayload }] }],
    systemInstruction: { parts: [{ text: SYSTEM }] },
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  }
  if (withGrounding) {
    body.tools = [{ google_search: {} }]
  }
  const ac = new AbortController()
  const timeoutMs = withGrounding ? 8000 : 22000
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ac.signal,
    })
  } catch (e) {
    clearTimeout(timer)
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[search-assist] gemini fetch', withGrounding, msg)
    return { ok: false, detail: `fetch_${withGrounding ? 'ground' : 'plain'}:${msg.slice(0, 160)}` }
  }
  clearTimeout(timer)
  if (!res.ok) {
    const errText = await res.text()
    console.error('[search-assist] gemini http', res.status, withGrounding, errText)
    return { ok: false, detail: `http_${res.status}:${errText.slice(0, 280)}` }
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  try {
    const interpretation = sanitize(JSON.parse(text), q)
    if (!interpretation) return { ok: false, detail: 'sanitize_null' }
    return { ok: true, interpretation }
  } catch {
    console.error('[search-assist] gemini json parse fail', text.slice(0, 200))
    return { ok: false, detail: `json_parse:${text.slice(0, 120)}` }
  }
}

async function callGemini(
  q: string,
  apiKey: string,
  model: string,
  filters: Record<string, string | undefined> | undefined,
  reason: string | undefined,
): Promise<GeminiCallResult & { groundingUsed?: boolean }> {
  // Sempre tenta plain primeiro (rápido / menos quota). Grounding só se ainda faltar veículo.
  const plain = await callGeminiOnce(q, apiKey, model, filters, reason, false)
  if (!plain.ok) return { ...plain, groundingUsed: false }

  const hasVehicle = Boolean(
    plain.interpretation.vehicleTerms.model || plain.interpretation.vehicleTerms.maker,
  )
  // Kill-switch: HF_SEARCH_ASSIST_GROUNDING=0 desliga web; default ligado se faltar veículo.
  const groundingDisabled =
    (Deno.env.get('HF_SEARCH_ASSIST_GROUNDING') ?? '1').trim() === '0'
  const wantGrounding = shouldUseGrounding(reason) && !hasVehicle && !groundingDisabled

  if (!wantGrounding) {
    return { ...plain, groundingUsed: false }
  }

  const withWeb = await callGeminiOnce(q, apiKey, model, filters, reason, true)
  if (withWeb.ok) return { ...withWeb, groundingUsed: true }
  console.warn('[search-assist] grounding failed, keep plain', withWeb.detail)
  return { ...plain, groundingUsed: false }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as AssistBody
    const q = String(body.query ?? '').trim()
    if (!q) {
      return json(200, { ok: true, mode: 'empty', interpretation: null })
    }

    const live = (Deno.env.get('HF_SEARCH_ASSIST_LIVE') ?? '').trim() === '1'
    if (!live) {
      return json(200, {
        ok: true,
        mode: 'noop',
        message:
          'HF_SEARCH_ASSIST_LIVE≠1. Cliente deve usar interpretSearchQuery / aliases locais.',
        interpretation: null,
      })
    }

    const geminiKey = (Deno.env.get('GEMINI_API_KEY') ?? '').trim()
    const model =
      (Deno.env.get('GEMINI_MODEL') ?? '').trim() || 'gemini-3.8-flash'

    if (!geminiKey) {
      return json(200, {
        ok: true,
        mode: 'deterministic_required',
        message: 'GEMINI_API_KEY ausente.',
        interpretation: null,
      })
    }

    const gemini = await callGemini(q, geminiKey, model, body.filters, body.reason)
    if (!gemini.ok) {
      return json(200, {
        ok: true,
        mode: 'llm_failed',
        message: 'Gemini falhou; use determinístico/aliases.',
        detail: gemini.detail,
        interpretation: null,
      })
    }

    return json(200, {
      ok: true,
      mode: 'gemini',
      model,
      grounding: Boolean(gemini.groundingUsed),
      interpretation: gemini.interpretation,
    })
  } catch (e) {
    return json(500, { ok: false, error: String(e) })
  }
})
