# HF Comércio de Peças

Catálogo digital de peças automotivas — aplicação **independente** da HF, com identidade, banco, dados e regras próprias.

## MVP

- Catálogo (busca, categorias, aplicações por veículo) — published aberto no runtime atual (`customer_specific_catalog_enabled: false`); ver auditoria C1/C2
- Admin B2B (produtos, taxonomia, importação, clientes/listas, preços staff, operadores)
- Publicação via `status`: draft | published | archived
- CTA WhatsApp (sem checkout / pagamento / frete / estoque físico na vitrine)

## Setup

```bash
cp .env.example .env.local
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY do projeto Supabase HF
pnpm install   # ou npm install
pnpm dev
```

## Branches

| Branch | Uso |
|--------|-----|
| `plan` | WIP de planos Cursor / docs — abre PR para `dev` |
| `dev` | Integração e trabalho diário — abre PR para `main` quando estável |
| `main` | Código estável (referência de produção) |
| `hostinger-static` | Só artefato de deploy (`dist` + `site.zip`) — **não** mergear fonte nesta branch |

Fluxo: `plan` → `dev` → `main`. Deploy Hostinger: rebuild a partir de `main` e atualizar `hostinger-static` (ver `docs/DEPLOY_HOSTINGER.md`).

## Documentação

**Índice canônico (comece aqui):** [`docs/entrada/HF_INDICE_CANONICO.md`](docs/entrada/HF_INDICE_CANONICO.md)

### Auditoria 2036

Baseline evidência (2026-11-23):

- [`docs/auditoria/HF_AUDITORIA_CONSOLIDADA_2036.md`](docs/auditoria/HF_AUDITORIA_CONSOLIDADA_2036.md)
- [`docs/auditoria/HF_INVENTARIO_DOCUMENTOS.md`](docs/auditoria/HF_INVENTARIO_DOCUMENTOS.md)
- [`docs/auditoria/HF_INVENTARIO_CODIGO_RUNTIME.md`](docs/auditoria/HF_INVENTARIO_CODIGO_RUNTIME.md)
- [`docs/auditoria/HF_LINHAGEM_METODOLOGIA.md`](docs/auditoria/HF_LINHAGEM_METODOLOGIA.md)
- [`docs/auditoria/HF_GAPS_VS_PRD_MESTRE_20.md`](docs/auditoria/HF_GAPS_VS_PRD_MESTRE_20.md)

### Referência técnica (reuso interno)

- Mestre: [`docs/auditoria/referencia_tecnica/HF_REF_APROVEITAMENTO_DETALHADO.md`](docs/auditoria/referencia_tecnica/HF_REF_APROVEITAMENTO_DETALHADO.md)
- Pacote: `docs/auditoria/referencia_tecnica/`

### Auditoria runtime profunda (telas × funções × tabelas)

- Mestre: [`docs/auditoria/runtime/HF_AUDITORIA_RUNTIME_PROFUNDA.md`](docs/auditoria/runtime/HF_AUDITORIA_RUNTIME_PROFUNDA.md)
- Telas: `docs/auditoria/runtime/HF_AUDITORIA_TELAS_FUNCOES.md`
- Tabelas/RPCs: `docs/auditoria/runtime/HF_AUDITORIA_TABELAS_RPCS.md`

### Suíte 2036 (esqueleto)

- Visão: `docs/entrada/HF_VISAO_2036.md`
- PRD-Mestre (andares + blocos): `docs/entrada/HF_PRD_MESTRE_2036.md`
- Fase 1: `docs/fases/FASE_01_CATALOGO_DIGITAL/PRD_FASE_01.md`
- Identidade: `docs/entrada/HF_IDENTIDADE_VISUAL.md`
- UX operacional (guias/hierarquia, sem visual de terceiros): `docs/entrada/HF_PADRAO_TELAS_UX_OPERACIONAL.md`
- Prep IA + 99/Uber: `docs/arquitetura/HF_INTEGRACOES_E_AGENTES_PREP.md`
- Arquitetura / dados: `docs/arquitetura/`
- Operação (Sidicom, frete grátis, runbooks): `docs/operacao/`

### Produto atual (anexos)

- `MAPA_REFERENCIA_TECNICA.md`, `ARQUITETURA_HF.md`, `ROADMAP_HF.md`
- `PRD_HF_B2B_1.0.md`, `PRD_UX_B2B_1.0.md`, `HOMOLOGACAO_HF.md`
- `MODELO_CATALOGO_HF.md`, `MODELO_B2B_HF.md`
- `REGRAS_IMPORTACAO_HF.md`, `DEPLOY_HOSTINGER.md`

## Segurança

Nunca versionar `.env.local`. Use apenas o projeto Supabase da HF.
