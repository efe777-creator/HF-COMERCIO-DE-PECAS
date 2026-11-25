# Cruzamento PRD ChatGPT × panorama HF

**Data:** 2026-11-23  
**Status:** CANÔNICO (evidência de fusão)  
**Entrada GPT:** [HF_PRD_MODELO_CHATGPT_RAW.md](../entrada/referencias/HF_PRD_MODELO_CHATGPT_RAW.md)  
**Saída:** [HF_PRD_MESTRE_2036.md](../entrada/HF_PRD_MESTRE_2036.md) v1.0  
**Site vivo:** https://hfcomerciodepecas.com (varrido 2026-11-23)

---

## Regras de fusão

| Prioridade | Fonte |
|------------|-------|
| 1 | Decisões HF travadas (Visão, Sidicom, frete grátis, referência só auxiliar, stack, onda) |
| 2 | Evidência runtime + site `hfcomerciodepecas.com` + `business.ts` |
| 3 | Estrutura/detalhe GPT (ABSORVER/ADAPTAR) |
| 4 | Lacunas → tag **Pendente** (não inventar) |

---

## Matriz por capítulo GPT

| Cap | Tema | Decisão | Nota |
|-----|------|---------|------|
| 1 | Propósito + 3 níveis doc | **ABSORVER** | Base da governança do Mestre |
| 2 | Visão estratégica | **ADAPTAR** | Fundir com Visão HF + copy do site /Sobre |
| 3 | Modelo de negócio | **ABSORVER** | Cadeia de valor 17 passos |
| 4 | Org / departamentos | **ADAPTAR** | Proposto; RACI nomes = Pendente |
| 5 | Ecossistema / CORE | **ABSORVER** | Diagrama + cadastro único |
| 6.1 A | Identidade/segurança | **ADAPTAR** | App parcial = Definido |
| 6.2 B | Catálogo | **ABSORVER** | Andar 1; alinhar site + Fase 1 |
| 6.3–6.5 | CRM / B2B / pedidos | **ADAPTAR** | Andar 2/5 |
| 6.6–6.7 | Compras / estoque | **ADAPTAR** | Andar 3; Sidicom SoT |
| 6.8 H | CORE + Sidicom | **ADAPTAR** | HF: Sidicom hoje → CORE longo prazo **Definido** |
| 6.9 I | Financeiro/fiscal | **ABSORVER** | Andar 4; Proposto |
| 6.10 J | Portal B2B | **ADAPTAR** | Andar 5; site já fala “B2B autorizado” |
| 6.11 K | Logística | **ADAPTAR** | Frete grátis **Definido** HF; GPT distinção custo×cobrança ABSORVER |
| 6.12 L | Marketing | **ABSORVER** | Andar 7 |
| 6.13 M | IA | **ABSORVER** | Andar 8; níveis 1–4 |
| 6.14 N | BI | **ABSORVER** | Andar 9 |
| 6.15 O | Expansão | **ABSORVER** | Andar 10 |
| 7 | Dados | **ADAPTAR** | + `migrations_hf` + P0 |
| 8 | Arquitetura | **ADAPTAR** | Stack React/Vite/Supabase **Definido** MVP |
| 9 | Integrações | **ADAPTAR** | Sidicom D5, WA, 99, Uber |
| 10 | IA | **ABSORVER** | Tools + supervisão |
| 11 | UX | **ADAPTAR** | Tokens HF; site live |
| 12–13 | Segurança / RNF | **ABSORVER** | |
| 14 | Processos transversais | **ABSORVER** | |
| 15 | Fases 0–10 | **ADAPTAR** | = Fundação F + Andares 1–10 |
| 16–20 | Deps, RF template, KPIs, gates | **ABSORVER** | |
| 21 | Riscos | **ABSORVER** | |
| 22 | Pendentes | **ADAPTAR** | + D1–D5 HF |
| 23 | Rastreabilidade | **ABSORVER** | Modelo |
| 24 | referência auxiliar | **ABSORVER** | Já travado |
| 25 | Tree docs | **REJEITAR rename** | Mapear para `docs/` atual |
| 26–28 | Resultado / próxima / princípio | **ABSORVER** | |

### Rejeições explícitas

- Tratar frete grátis como “não definido”  
- Tratar substituição Sidicom como decisão sem caminho  
- Renomear em massa a árvore `docs/`  
- Copiar visual/regras fonte  
- ManyChat/Meta/Google como obrigatórios nas fases iniciais  

---

## Evidência do site (2026-11-23)

| Item | Valor vivo |
|------|------------|
| Domínio | https://hfcomerciodepecas.com |
| Hero | Encontre a peça certa para o seu negócio |
| Posicionamento catálogo | Catálogo B2B autorizado — **sem preço público**; consultar disponibilidade com a HF |
| Sobre | Parceria, competitividade, suporte identificação, variedade, atendimento próximo |
| Endereço | Av. Rosa Molina Pannochia, 424 — Guarulhos/SP |
| E-mail | marketing@hfcomerciodepecas.com |
| Horário | Seg–Sex 08h–18h · Sáb 09h–14h |
| Público citado | Lojas de autopeças e oficinas mecânicas |

**Impacto D1:** o site comunica “B2B autorizado” e “sem preço público”, mas o runtime ainda pode expor `published` anônimo (migration 08). Continua **Pendente** fechar política = messaging + flag + RLS.
