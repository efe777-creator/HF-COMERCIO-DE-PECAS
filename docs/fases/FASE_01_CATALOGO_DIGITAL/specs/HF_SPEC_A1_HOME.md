# Spec A1 — Home (aquisição)

**Rota:** `/`  
**Estado:** Vivo — evoluir CTAs e origem  
**Hierarquia:** loja (não Adaptive)  
**Mestre:** [HF_JORNADA_COMERCIAL_PLANO.md](../HF_JORNADA_COMERCIAL_PLANO.md)

## Objetivo

Descoberta e porta de entrada: catálogo, cotação, cadastro comercial.

## Atores

Visitante · Cliente autenticado

## Campos / conteúdo

- Hero + busca + CTAs: Catálogo · Por veículo · **Cotação** · **Cadastro comercial** (hoje “Seja parceiro” / Cotação) · Conta
- Origem: quando URL tiver UTM/`ref`, persistir em sessionStorage para o cadastro inicial / cotação (`source`)

## Ações

| Ação | Destino |
|------|---------|
| Cotação | `/cotacao` |
| Cadastro comercial | `/cadastro-comercial` |
| Explorar | `/catalogo` |

## Estados

Loading hero/dados · Vazio N/A · Erro soft em blocos secundários

## Não-fazer

Checkout · preço público · Graph API

## Smoke

CTA Cotação e Cadastro comercial visíveis desktop/mobile; deep-link preserva UTM até o form.
