# HF AI Search — Arquitetura (Fase 3.1)

**Status:** CANÔNICO (prep — camada de interpretação do Search Engine)  
**Plano completo (todas as fases):** [HF_AI_SEARCH_PLANO_COMPLETO.md](./HF_AI_SEARCH_PLANO_COMPLETO.md)  
**Projeto Supabase:** `owllmfcpbodqmoerdfxx`  
**Não é:** chatbot, SoT de catálogo, nem substituto de `search_products`.

## 1. Princípio

IA trabalha **nos bastidores** do HF Search Engine: interpreta, corrige e sugere.  
O motor de lista continua sendo `search_products` + interpretador determinístico (`interpretSearchQuery`).

Fluxo híbrido: **determinístico primeiro → avaliar → IA só se regras pedirem → validar no catálogo → RPC de novo se necessário → assistência inline (aceitar/rejeitar).**

## 2. Auditoria técnica (baseline)

| Pergunta | Achado |
|----------|--------|
| Backend | SPA Vite → `supabase.rpc` / Edge Functions. Sem `/api/*` Node. |
| Front busca | `searchService.searchCatalog` → RPC `search_products` |
| Interpretador | Cliente: `interpretSearchQuery` + `buildCatalogSearchParams` + `CatalogPage` |
| Edge hoje | `search-assist` LIVE=1; Gemini `gemini-3.8-flash`; grounding opcional (plain first); aliases HF no cliente |
| Produtos published | ~49 |
| `product_references` | 0 linhas (refs cruzadas fracas) |
| PVC | ~384 |
| `search_products` campos | sku, refs.code, name, search_document, manufacturer_code, brand + YMM/PVC/RLS |
| Host | Front Hostinger; dados/auth/IA secrets no Supabase |
| Vetorial | Sem `pgvector` / prioridade baixa até 3.4 |

## 3. Camadas

1. **Frontend** — SearchBar, filtros, empty tipado, `AISearchAssistant` inline (Aceitar / Manter / fora do catálogo).  
2. **Orquestrador** — `searchOrchestrator` (det → RPC → tipografia → **aliases** → Edge).  
3. **IA** — Edge `search-assist` (Gemini plain; Google Search grounding se ainda faltar veículo).  
4. **Validação HF** — catálogo YMM / merge + `vehicleRecognizedOutsideCatalog` → Aceitar reaplica `search_products`.

A IA **não** executa SQL livre nem inventa SKU/produto.

## 4. Contratos

Ver código:

- [`src/services/ai/types.ts`](../../src/services/ai/types.ts) — `AISearchInput`, `AISearchInterpretation`
- [`src/services/ai/aiProvider.ts`](../../src/services/ai/aiProvider.ts) — interface trocável
- [`src/services/ai/aiTriggerRules.ts`](../../src/services/ai/aiTriggerRules.ts) — quando chamar IA

Operação Edge (conceitual): `supabase.functions.invoke('search-assist', { body: AISearchInput })`.

## 5. Triggers (configuráveis)

| Situação | IA? |
|----------|-----|
| Código exact / confidence alta / veículo+peça claros com hits | Não |
| `unknown` / typo aparente / zero resultados | Sim (se flag) |
| Descrição informal / ambíguo | Sim (se flag) |
| Flag `VITE_SEARCH_NL_LLM` ≠ `1` ou timeout/erro | Não — só determinístico |

## 6. Prioridade de filtros

1. Seleção **manual** do cliente (não sobrescrever em silêncio).  
2. Veículo/peça **explícitos no texto**.  
3. Inferência da IA = **sugestão** (inline).  
4. Filtro herdado de pesquisa anterior — pode ceder à nova intenção.

## 7. Segurança e custo

- Credenciais **somente** Edge secrets (nunca `VITE_GEMINI_*`).  
- Debounce, timeout, fallback determinístico, validação de catálogo.  
- Sem pgvector nesta fase; sem dados pessoais desnecessários ao provedor.

## 8. Roadmap

| Fase | Conteúdo |
|------|----------|
| **3.1** (esta) | Doc + tipos + triggers + orchestrator stub + scaffold Edge |
| **3.2** | Correção tipográfica + “você quis dizer” + deploy Gemini real |
| **3.3** | Contexto de filtros + descrições informais |
| **3.4** | Matching aproximado / semântica (avaliar `pg_trgm` antes de vector) |
| **3.5** | Cache, rate limit, métricas |

## 9. Flag front

```env
# .env.local — só liga chamada à Edge; NÃO contém a API key
VITE_SEARCH_NL_LLM=0
```

**Fase 3.2 (homolog local):** `VITE_SEARCH_NL_LLM=1` em `.env.local` + Edge secret `HF_SEARCH_ASSIST_LIVE=1`.  
Fallback tipográfico local (`localTypoAssist`) cobre Pivor/Termial se Gemini falhar.  
Se logs Edge mostrarem `API_KEY_INVALID`, atualizar secret `GEMINI_API_KEY` no Dashboard.  
Manter `VITE_SEARCH_NL_LLM=0` no Hostinger produção até smoke 3.2 OK.
