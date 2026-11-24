# HF — Jornada operador Andar 1 (smoke)

**Data:** 2026-11-24  
**Escopo:** Montadoras → Veículos → Produtos → Aplicações → Import → Vitrine  
**Ambiente:** local Vite + Supabase HF  
**Sem FAL.**  
**SoT hierarquia:** [`HF_VEICULOS_HIERARQUIA.md`](./HF_VEICULOS_HIERARQUIA.md)

## Hierarquia

1. Montadora  
2. Modelo (fab início/fim)  
3. Identificação do veículo: **versão → motor → período** (+ geração/combustível opcionais)  
4. Produto published  
5. **Aplicação** = só na ficha do produto (vínculo versão · motor · período; sem tela índice)  
6. Vitrine encontra a peça pelo veículo  

## Smoke Veículos — HYUNDAI HB20 (2026-11-24)

Fixture: [`src/data/fixtures/hb20Configs.ts`](../../../src/data/fixtures/hb20Configs.ts)  
Modelo id `9ea4edec-ba5d-4407-9530-067bea41b514` · Montadora HYUNDAI.

| # | Passo | Resultado | Nota |
|---|--------|-----------|------|
| H1 | Montadora HYUNDAI | PASS | |
| H2 | Modelo HB20 · fab 2012 · fim vazio | PASS | |
| H3 | 1 versão por linha; motores curtos; HB20X modelo próprio | PASS | HB20 ~52 ativas; HB20X modelo separado (8); engines curtos; fuel vazio |
| H4 | Busca Sense Plus / 1.0 Turbo / Facelift | PASS | |
| H5 | UX alinhada (Versão→Motor→Período; aplicação = vínculo) | PASS | Guia + cascata + índice |

## Checklist admin (requer staff logado)

| # | Passo | Resultado | Nota |
|---|--------|-----------|------|
| 1 | `/admin` → sidebar Catálogo | SKIP | |
| 2 | `/admin/montadoras` | SKIP | |
| 3 | `/admin/veiculos` — HB20 | PASS | Dados + UX |
| 4–7 | Produtos / apps / import | SKIP | |
| 8–10 | Vitrine | PASS | Ver abaixo |

## Smoke vitrine (sem login) — 2026-11-24

| # | Passo | Resultado | Nota |
|---|--------|-----------|------|
| V1 | `/catalogo` carrega | PASS | |
| V2 | Seletor veículo responde | PASS | CHEVROLET → COBALT anos |
| V3 | PDP sem preço vitrine | PASS | |

## Regressão automatizada

| Check | Resultado |
|-------|-----------|
| `npx tsc --noEmit` | PASS |
| `npm test` (histórico) | PASS |
| `npm run build` (histórico) | PASS |

Legenda: **PASS** / **FAIL** / **SKIP**.
