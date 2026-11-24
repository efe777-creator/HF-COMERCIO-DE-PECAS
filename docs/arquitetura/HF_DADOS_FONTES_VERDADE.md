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
| Schema / RLS / RPCs do projeto HF | `supabase/migrations_hf/*.sql` | `supabase/migrations/` (legado externo) |
| Visibilidade de produto no catálogo | `products.status` (draft \| published \| archived) + regras B2B/`customer_can_see_product` | `is_available` como proxy triplo |
| Preço | Listas/overrides admin (quando ligados); vitrine só com `price_enabled` | Inventar preço no front |
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

**Runtime + política D1 (fechada 2026-11-24):** migration `08_public_published_catalog.sql` + flag `customer_specific_catalog_enabled: false` = leitura anon de `published`. Sem preço público. Login B2B por lista = portal futuro.

---

## 3. Entidades MVP (resumo)

Tabelas centrais (ver também `ARQUITETURA_HF.md`):  
`profiles`, categorias/marcas/produtos/imagens/referências, fabricantes/modelos/versões, compatibilidade, suppliers, imports, pipeline B2B (customers, groups, catalogs), price lists (staff).

Storage: `product-images`, `logos`, `imports`.

RPCs principais: `search_products`, `apply_*` de import, helpers staff.

---

## 4. Política de migrations

1. Aplicar apenas o necessário em `migrations_hf`.  
2. Não aplicar cegamente as 52 migrations de referência.  
3. Evitar aplicar **ao mesmo tempo** a cadeia `01`–`11` e o blob `20261007190000_hf_f1_foundation.sql` sem runbook explícito.  
4. Qualquer nova tabela comercial (pedidos, estoque, pagamento) exige fase no ROADMAP + flag + aceite.

---

## 5. Proibições

- Reutilizar URL/keys/projeto Supabase fonte.  
- Duplicar lógica de autorização só no client (RLS/RPC mandam).  
- Usar dados mock em produção sem flag/documentação clara.
