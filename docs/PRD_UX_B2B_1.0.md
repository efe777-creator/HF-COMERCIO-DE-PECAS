# PRD UX B2B HF — experiência cliente (v1.0)

Fonte de aceite da UI B2B. Produto mestre: `PRD_HF_B2B_1.0.md`.

## Regra de ouro

Autorização só no backend/RLS (`customer_can_see_product` / `search_products`). A UI **nunca** filtra o catálogo completo no client.

## Tokens

| Token | Valor |
|-------|--------|
| bg | `#08090a` |
| red | `#b3202a` |
| red hover | `#d12a36` |
| WhatsApp | `#25d366` |

Vermelho só em CTAs/ativos.

## Shell

```text
[LOGO] [Busca global] [Empresa | Minha conta]
Catálogo · Categorias · Marcas · Aplicações · Atendimento
```

Busca: *Busque por peça, código, marca ou aplicação*.

## Auth

- Login: “Acesse seu catálogo HF” · ENTRAR · Esqueci · SOLICITAR ACESSO · FALAR COM A HF
- Cadastro: nome, e-mail, senha, confirmação; telefone + empresa opcionais; **sem CPF obrigatório**
- Estados: pending / suspended / sem vínculo → mensagem + WhatsApp + Sair

## Home B2B

Hero com busca · 3 caminhos · categorias · destaques (sem preço) · marcas · aplicações · suporte WA.

## Catálogo

Sidebar filtros · ordenação relevância/nome/código · rotas `/busca`, `/categoria/:slug`, `/marca/:slug` · empty + WA.

## Produto / Conta

PDP: CONSULTAR ESTA PEÇA (WA) · referências/aplicações em tabela · sem preço/comprar.  
Conta: empresa no resumo; atalhos catálogo.

## Fora de escopo

Carrinho, checkout, preço, estoque, cotação, pedidos, placa, Mercado Pago.

## Aceite rápido (§95–98)

1. Login → catálogo autorizado (sem preço)
2. Busca / filtros / categoria / marca
3. PDP com consulta WhatsApp
4. Visitante: gate login; pending/suspended com mensagem
