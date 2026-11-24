# HF — Identidade visual e voz de marca

**Versão:** 1.0  
**Data:** 2026-11-23  
**Status:** CANÔNICO (marca + tokens; gaps tipográficos/logo guia abaixo)  
**PRD-Mestre:** [HF_PRD_MESTRE_2036.md](./HF_PRD_MESTRE_2036.md)  
**Visão:** [HF_VISAO_2036.md](./HF_VISAO_2036.md)  
**UX produto:** [PRD_UX_B2B_1.0.md](../PRD_UX_B2B_1.0.md)  
**UX operacional:** [HF_PADRAO_TELAS_UX_OPERACIONAL.md](./HF_PADRAO_TELAS_UX_OPERACIONAL.md)  
**Código:** `src/styles/index.css`, `src/config/business.ts`  
**Site vivo:** [hfcomerciodepecas.com](https://hfcomerciodepecas.com)

---

## 1. Posicionamento e voz **[Definido]**

| Elemento | Texto canônico |
|----------|----------------|
| Nome | HF Comércio de Peças |
| Tagline | Distribuidora automotiva especializada em suspensão, direção e freios. |
| Eyebrow | Distribuição automotiva • Guarulhos/SP |
| Hero (app) | A peça certa. / Com mais rapidez e precisão. |
| Hero (site) | Encontre a peça certa para o seu negócio |
| Apoio site | Catálogo B2B autorizado — sem preço público. Consulte disponibilidade direto com a HF. |
| Tom | B2B, direto, técnico o suficiente para oficinas/autopeças; parceria e confiança (/Sobre) |
| CTA MVP | **WhatsApp** — “Falar com a HF” / CONSULTAR ESTA PEÇA — sem checkout |

Pilares de mensagem (/Sobre): competitividade comercial · suporte na identificação · variedade · atendimento próximo.

**Proibido:** visual, tokens ou tom “marketplace fonte”.

---

## 2. Dados institucionais (contato)

| Campo | Valor |
|-------|-------|
| Endereço | Av. Rosa Molina Pannochia, 424 — Guarulhos/SP |
| E-mail | marketing@hfcomerciodepecas.com |
| Horário | Seg–Sex 08h–18h · Sáb 09h–14h |
| Instagram | https://www.instagram.com/hfsuspensao/ |
| Fixo / admin / WA default | ver `business.ts` (CTA WA = só `VITE_WHATSAPP_NUMBER`) |

---

## 3. Tokens de UI (app atual) **[Definido]**

Fonte: `src/styles/index.css`.

| Token | Valor | Uso |
|-------|-------|-----|
| `--hf-bg` | `#08090a` | Fundo |
| `--hf-bg-2` | `#0e1012` | Fundo alternativo |
| `--hf-surface` | `#14161a` | Superfícies |
| `--hf-surface-2` | `#1c1f24` | Superfície elevada |
| `--hf-red` | `#b3202a` | Marca / ativo |
| `--hf-red-bright` | `#d12a36` | Hover / links auth |
| `--hf-ink` | `#f5f5f5` | Texto |
| `--hf-muted` | `#a5a8ad` | Secundário |
| `--hf-line` | `rgba(255,255,255,0.1)` | Divisores |
| `--hf-whatsapp` | `#25d366` | CTA WA |
| `--hf-radius` | `14px` | Raio padrão |
| `--hf-container` | `1320px` | Largura max |
| `--hf-header-logo-h` | `56px` | Logo header |

**Regra:** vermelho HF só em CTAs e estados ativos. Tema **dark** + accent vermelho. Nunca tokens externos.

---

## 4. Tipografia

| Camada | Estado |
|--------|--------|
| App hoje | `Inter, Arial, Helvetica, sans-serif` (`index.css`) |
| Guia de marca tipográfica | **Gap** — definir display / body / mono SKU (evitar depender só de Inter como “marca”) |

---

## 5. Logo e assets

- Validação: `docs/logo-validation.md`  
- Header: altura referência `56px`  
- **Gap:** guia de uso (respiro, fundo claro/escuro, mono, favicon)

---

## 6. Shell e padrões de tela (MVP)

```text
[LOGO] [Busca global] [Empresa | Minha conta]
Catálogo · Categorias · Marcas · Aplicações · Atendimento
```

Busca: *Busque por peça, código, marca ou aplicação*.  
PDP: **CONSULTAR ESTA PEÇA** (WhatsApp) — sem preço/comprar no MVP (alinhado ao site).

Aceite: `PRD_UX_B2B_1.0.md`, `ACEITE_UX_B2B.md`.  
Hierarquia admin (lista+guia): `HF_PADRAO_TELAS_UX_OPERACIONAL.md` — comportamento, não marca.

---

## 7. Páginas públicas alinhadas ao site

| Rota / página | Papel de marca |
|---------------|----------------|
| Home | Hero + promessa B2B |
| Catálogo / busca / PDP | Identificação de peça; sem preço público |
| Sobre | Parceria, pilares, confiança |
| Atendimento | Canal humano + WA |

`SITE HF HTML/` = referência histórica; autoridade = **app + este doc + site deployado**.

---

## 8. Próximos preenchimentos

- [ ] Guia de logo (versões e fundos)  
- [ ] Tipografia canônica de marca  
- [ ] Biblioteca de componentes (botão, produto, empty states)  
- [ ] Skin admin lista+guia com tokens HF  
- [ ] Light mode — não é padrão hoje  
