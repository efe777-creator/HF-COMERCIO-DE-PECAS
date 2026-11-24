# Critérios de aceite — Andar 1 Catálogo Digital

**Versão:** 1.1  
**Data:** 2026-11-24  
**PRD:** [PRD_FASE_01.md](./PRD_FASE_01.md)  
**Auditoria Gate:** [AUDITORIA_GATE01_2026-11-24.md](./AUDITORIA_GATE01_2026-11-24.md)  
**Base UX:** [ACEITE_UX_B2B.md](../../ACEITE_UX_B2B.md)

---

## 1. Smoke manual (loja)

| # | Caso | Esperado |
|---|------|----------|
| S01 | Abrir home (site/app) | Hero HF; sem preço; caminho ao catálogo |
| S02 | Buscar peça conhecida | Resultados relevantes; sem preço |
| S03 | Abrir PDP | Refs + apps + CTA WA; sem comprar |
| S04 | Navegar categoria e marca | Listagens coerentes |
| S05 | `/veiculo` cascata | Peças compatíveis (cobertura) |
| S06 | Sobre / Atendimento | Endereço, horário, e-mail, WA |
| S07 | CTA WA do PDP | Abre com número do env; idealmente contexto da peça |
| S08 | Mobile | Rotas públicas usáveis |

## 2. Smoke auth / conta

| # | Caso | Esperado |
|---|------|----------|
| A01 | Login staff | Acesso `/admin` |
| A02 | Não-staff em `/admin` | Bloqueio |
| A03 | Conta perfil | Edita/vê dados sem erro |
| A04 | `/conta/veiculos` | Funciona com tabela+RLS **ou** rota off (sem 500) |

## 3. Smoke admin

| # | Caso | Esperado |
|---|------|----------|
| D01 | CRUD produto | Salva; draft/publish respeitados |
| D02 | Upload imagem | Aparece no PDP após publish |
| D03 | Import produtos | Preview → apply → draft; erros listados |
| D04 | Import aplicações | Apps no PDP |
| D05 | Publish | Some na vitrine conforme D1 |
| D06 | Clientes/grupos/listas | CRUD admin OK |
| D07 | Operadores | Role aplicada |

## 4. Segurança / qualidade

| # | Caso | Esperado |
|---|------|----------|
| Q01 | `npm test` | Passa |
| Q02 | `npm run build` | Passa |
| Q03 | Tokens | Sem tokens de terceiros na UI HF |
| Q04 | Secrets | Sem keys de terceiros; WA só env |
| Q05 | RLS | Anon/authenticated conforme D1; staff isolado |

## 5. Correções Gate

| # | Caso | Esperado |
|---|------|----------|
| C01 | P0 vehicles | Resolvido (schema ou off) |
| C02 | favoriteService | Removido ou inerte |
| C03 | adminCustomerService orders | Removido/isolado |
| C04 | D1 | Decisão A/B registrada na Visão/Gate |
| C05 | D5 | **Fora do Gate** — questionário opcional/adiado (não bloqueia) |
| C06 | D6 | Pedido oficial digital = HF Andar 2 (registrado Visão) |

## 6. Aceite UX B2B legado

Manter smoke de [ACEITE_UX_B2B.md](../../ACEITE_UX_B2B.md) quando seed B2B existir; se D1 = aberto, ajustar expectativa de redirect login no catálogo.
