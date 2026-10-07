# HF Comércio de Peças

Catálogo digital de peças automotivas — aplicação independente construída sobre a arquitetura validada no projeto FAL (referência técnica), com identidade, banco e dados próprios da HF.

## MVP

- Catálogo público (busca, categorias, aplicações por veículo)
- Admin (produtos, categorias, marcas, aplicações, importação, operadores)
- Publicação via `status`: draft | published | archived
- CTA WhatsApp (sem checkout / pagamento / frete / estoque físico)

## Setup

```bash
cp .env.example .env.local
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY do projeto Supabase HF
pnpm install   # ou npm install
pnpm dev
```

## Documentação

Ver pasta `docs/`:

- `MAPA_FAL_PARA_HF.md`
- `ARQUITETURA_HF.md`
- `ROADMAP_HF.md`
- `MODELO_CATALOGO_HF.md`
- `REGRAS_IMPORTACAO_HF.md`

## Segurança

Nunca versionar `.env.local`. Nunca usar credenciais ou projeto Supabase da FAL.
