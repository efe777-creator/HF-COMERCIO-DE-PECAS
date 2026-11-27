# Spec A3 — Cadastro inicial (interesse comercial)

**Rota canônica:** `/cadastro-comercial`  
**Alias:** `/seja-parceiro` → redirect  
**Estado:** Parcial — hoje [`SejaParceiroPage`](../../../../src/pages/Leads/SejaParceiroPage.tsx)  
**Hierarquia:** formulário público (sub-tela simples; sem Adaptive)  
**Mestre:** [HF_JORNADA_COMERCIAL_PLANO.md](../HF_JORNADA_COMERCIAL_PLANO.md)

## Objetivo

Manifestar interesse sem cadastro empresarial completo. Cria `leads` `kind=partner`.

## Atores

Visitante (e logado sem customer active)

## Campos

| Grupo | Campo | Obrigatório |
|-------|-------|-------------|
| Empresa | CNPJ | Sim |
| Empresa | Nome / razão | Sim |
| Responsável | Nome | Sim |
| Responsável | WhatsApp | Sim |
| Responsável | E-mail | Sim |
| Perfil | Enum | Sim |
| Interesse | Enum | Sim |
| Extra | Mensagem / origem | Não |

**Perfil:** Distribuidor · Autopeças · Autocenter · Mecânico autônomo · Oficina · Outros  

**Interesse:** Lista de preços · Dúvidas sobre peças · Condições comerciais · Falar com consultor · Outro  

Persistir perfil/interesse em colunas dedicadas (evolução) ou, até lá, estrutura estável no `message` — preferir colunas na implementação.

## Comportamento

1. Validar essenciais + dígitos CNPJ.  
2. Checar duplicidade: CNPJ já em `customers` ou lead partner aberto → avisar (não bloquear cego; staff decide).  
3. `createLead(kind=partner, source, document=CNPJ, business_profile, interest, …)`.  
4. Confirmação ao usuário.  
5. Aviso staff `request_received` → `/admin/pedidos/solicitacoes?lead=` (kind novo; ver E1). Fail soft se notify falhar.

## Técnicas (mestre §15 · §20)

- **Debounce / duplo clique:** desabilitar submit após primeiro envio; dedupe server por CNPJ+fonte em janela curta.  
- **UTM vs source:** capturar UTM em sessionStorage na Home; até decisão §21, compactar em `source` ou gravar attribution se coluna existir.  
- **Perfil/interesse:** preferir cols `business_profile` / `interest` (não só textarea).  
- **Não** criar `customers` neste form.

## Estados

Loading envio · Sucesso protocolo · Erro real Supabase · Validação campo

## Não-fazer

Auto-aprovar cliente · criar `customers` · misturar com `/cadastro` (auth) · Graph API · novo `leads.status`

## Smoke

Envio com CNPJ aparece em Solicitações; sem criar customer; redirect `/seja-parceiro` funciona; S1 antirregress (CNPJ duplicado).
