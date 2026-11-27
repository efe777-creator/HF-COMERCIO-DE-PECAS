# Spec A4 — Auth (credencial)

**Rotas:** `/cadastro`, `/login`, `/recuperar-senha`  
**Estado:** Vivo  
**Mestre:** [HF_JORNADA_COMERCIAL_PLANO.md](../HF_JORNADA_COMERCIAL_PLANO.md)

## Objetivo

Criar/autenticar usuário (`profiles`). **Não** é cadastro comercial B2B.

## Campos típicos

Nome, e-mail, senha; empresa/telefone opcionais no register.

## Separação

| Rota | Função |
|------|--------|
| `/cadastro` | Conta (auth) |
| `/cadastro-comercial` | Interesse → lead partner |
| `/admin/clientes` | Cadastro oficial + aprovação |

## Não-fazer

Exigir CNPJ completo no register · auto-vincular lista de preços · aprovar acesso

## Smoke

Register cria sessão; não cria lead partner; login leva a `/conta`.
