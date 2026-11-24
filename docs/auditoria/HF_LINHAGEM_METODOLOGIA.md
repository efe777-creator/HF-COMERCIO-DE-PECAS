# Linhagem fonte → HF: metodologia (não produto)

**Data:** 2026-11-23  
**Status:** CANÔNICO (evidência + decisão de governança)  
**Premissa:** A HF **não é** a fonte de referência. a fonte de referência é referência técnica e de disciplina documental.

Base técnica (somente leitura): `fonte PECAS AUTOMOTIVAS/fonte-pecas`  
Cópia de trabalho: `HF COMERCIO DE PECAS/hf-comercio-de-pecas`  
Corte técnico já documentado: `docs/MAPA_FAL_PARA_HF.md` (GATE 01)

---

## 1. O que a HF herdou da fonte de referência

| Herança | Uso na HF |
|---------|-----------|
| Stack React + Vite + Supabase + RLS | Sim |
| Camadas pages → services → supabase | Sim |
| Pipeline import CSV/XLSX + RPCs | Adaptado |
| Catálogo + aplicações + busca | Adaptado |
| Admin CRUD catálogo | Adaptado |
| Padrão de feature flags | Criado/adaptado (`features.ts`) |
| Mercado Pago, cart, checkout, frete, estoque operacional | **Não** no MVP runtime |
| Branding, seeds, copy fonte | **Não** |

Detalhe módulo a módulo: `MAPA_FAL_PARA_HF.md`.

---

## 2. O que a fonte de referência tem em governança documental (método)

Referência: `fonte PECAS AUTOMOTIVAS/docs/entrada/FAL_INDICE_CANONICO.md`

| Peça fonte de referência | Função |
|----------|--------|
| Índice canônico | Ordem de autoridade; “se você quer X → abra Y” |
| Visão ecossistema (2040) | Norte estratégico |
| PRD mestre | Regra de produto |
| Arquitetura + Fontes de verdade | Estrutura e SoT de dados |
| MVP / Roadmap / MARCHA / VAL | Escopo, ordem, execução, validação |
| Pasta `futuro/` | Ideias sem implementação até gate |

**Ordem de autoridade fonte (resumo):** Visão → PRD → Arquitetura/Dados → MVP → Roadmap → specs táticas.

---

## 3. O que a HF tinha antes desta marcha

| Peça | Estado |
|------|--------|
| Docs curtos em `docs/` | PRD B2B stub, UX, roadmap, modelos, import, deploy |
| `docs/entrada/` | **Ausente** (stubs `architecture.md` / `data-model-future.md` apontavam para fantasma) |
| Visão 2036 / PRD-Mestre 20 blocos | **Inexistentes** |
| Índice canônico | **Inexistente** |
| MARCHA/VAL | Não adotados formalmente na HF |

Conclusão: HF estava **forte em entrega técnica de catálogo** e **fraca em governança documental de empresa**.

---

## 4. Decisão: adotar método fonte, conteúdo HF

A HF passa a usar estrutura **análoga**:

```text
docs/
  entrada/       # índice, visão, PRD-Mestre, identidade
  arquitetura/   # padrão + fontes de verdade
  operacao/      # modelo operacional + runbooks
  auditoria/     # evidência (esta pasta)
  planejamento/  # futuro: MARCHAs / planos táticos
```

**Proibido:**

- Copiar regras de produto fonte (marketplace/loja, MP, garage, etc.) como se fossem da HF.
- Tratar docs fonte como autoridade sobre a HF.

**Obrigatório:**

- Conteúdo próprio: distribuidora, delivery, expansão nacional, B2B, essência HF.
- Manter `MAPA_FAL_PARA_HF.md` como evidência do corte técnico e da proibição de secrets/projeto de terceiros.

---

## 5. Contraste de norte

| Dimensão | fonte (referência) | HF (próprio) |
|----------|------------------|--------------|
| Negócio | Ecossistema/loja automotiva avançada | Distribuidora de autopeças + delivery |
| Horizonte doc | Visão 2040 | Visão / PRD-Mestre **2036** |
| MVP atual | Comércio, pagamento, estoque (mais maduro) | Catálogo B2B + WA; comércio off |
| Identidade | Marca fonte de referência | Guarulhos, suspensão/direção/freios, `@hfsuspensao` |

---

## 6. Como usar este documento

1. Em dúvida de **código compartilhado** → `MAPA_FAL_PARA_HF.md` + `migrations_hf`.  
2. Em dúvida de **governança de docs** → espelhar disciplina do índice fonte, conteúdo HF.  
3. Em dúvida de **produto** → `HF_VISAO_2036` / `HF_PRD_MESTRE_2036` (nunca `FAL_PRD_4.0` como regra HF).
