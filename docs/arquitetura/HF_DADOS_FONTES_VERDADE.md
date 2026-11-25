# HF — Fontes de verdade (dados)

**Versão:** 1.0  
**Data:** 2026-11-23  
**Status:** CANÔNICO  
**Arquitetura:** [HF_ARQUITETURA_PADRAO.md](./HF_ARQUITETURA_PADRAO.md)

Este arquivo **substitui** a autoridade do stub `docs/data-model-future.md` (que apontava para `entrada/DATABASE.md` inexistente).

---

## 1. O que é fonte de verdade

| Assunto | Fonte de verdade | Não é SoT |
|---------|------------------|-----------|
| Schema / RLS / RPCs do projeto HF | `supabase/migrations_hf/*.sql` | Blob legado `migrations/` (fase6–9 externas); **deltas HF dated** (`20261124*` / `20261125*`) são espelho até consolidar em `migrations_hf` |
| Visibilidade de produto no catálogo | `products.status` (draft \| published \| archived) + regras B2B/`customer_can_see_product` | `is_available` como proxy triplo |
| Preço | Listas staff + `assigned_price_list_id` B2B; guest sem preço (`price_enabled=false`); B2B assigned → `priceVisible` | Inventar preço no front |
| Estoque físico | Futuro (flag `inventory_enabled`) | Status published |
| Identidade / copy comercial | `src/config/business.ts` + este índice de docs | Textos hardcoded soltos |
| Feature de produto ligada/desligada | `src/config/features.ts` | Comentários em páginas |
| Contato WhatsApp CTA | `VITE_WHATSAPP_NUMBER` | Telefone “default” de exibição como fallback de CTA |
| Credenciais | `.env.local` (não versionar) | Projeto/keys de terceiros |

---

## 2. Separação obrigatória

```text
IDENTIDADE ≠ CATÁLOGO ≠ ACESSO ≠ DISPONIBILIDADE COMERCIAL ≠ PREÇO ≠ ESTOQUE ≠ PEDIDO
```

Detalhe de produto: `docs/MODELO_CATALOGO_HF.md`, `docs/MODELO_B2B_HF.md`.

**Publicação:** import cria em `draft` por padrão (`REGRAS_IMPORTACAO_HF.md`).

**Runtime + política D1 (fechada 2026-11-24):** migration `08_public_published_catalog.sql` + flag `customer_specific_catalog_enabled: false` = leitura anon de `published`. Sem preço público para guest. B2B com lista assigned: preço da lista no catálogo/PDP (`priceVisible`) — D-03 parcial.

---

## 3. Entidades MVP (resumo)

Tabelas centrais (ver também `ARQUITETURA_HF.md`):  
`profiles`, categorias/marcas/produtos/imagens/referências, fabricantes/modelos/versões, compatibilidade, suppliers, imports, pipeline B2B (customers, groups, catalogs), price lists (staff).

Storage: `product-images`, `logos`, `imports`.

RPCs principais: `search_products`, `apply_*` de import, helpers staff.

---

## 4. Política de migrations

1. SoT de schema HF = `migrations_hf`. Novos deltas devem nascer lá (`31_*`, `32_*`, …).  
2. Não aplicar cegamente as 52 migrations de referência (fase6–9 / ecommerce).  
3. Evitar aplicar **ao mesmo tempo** a cadeia `01`–`11` e o blob `20261007190000_hf_f1_foundation.sql` sem runbook explícito.  
4. Espelhos dated em `migrations/` (`20261124*`, `20261125*`) documentam apply MCP/histórico — **não** são “legado FAL”; espelhar sempre em `migrations_hf`.  
5. Qualquer nova tabela comercial (pedidos, estoque, gateway) exige fase no ROADMAP + flag + aceite.

---

## 5. Proibições

- Reutilizar URL/keys/projeto Supabase fonte.  
- Duplicar lógica de autorização só no client (RLS/RPC mandam).  
- Usar dados mock em produção sem flag/documentação clara.
