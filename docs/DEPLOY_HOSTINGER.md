# Deploy Hostinger — hfcomerciodepecas.com

## Status (2026-10-14)

| Item | Estado |
|------|--------|
| Site ao vivo | https://hfcomerciodepecas.com — SPA React HF |
| WordPress | Removido do painel; `public_html` substituído pelo build |
| Build | `pnpm build` com `.env.local` (Supabase + WhatsApp) |
| Branch estática | `hostinger-static` (conteúdo do `dist/` + `site.zip`) |
| SSL | HTTP → HTTPS (301) ativo |

## Publicar de novo (caminho que funciona)

A API `hosting_deploy-static-website` (upload TUS) retorna **404** nesta conta. Fluxo validado:

1. Garantir `.env.local` com `VITE_SUPABASE_*` e `VITE_WHATSAPP_NUMBER`
2. `pnpm build`
3. Atualizar a branch `hostinger-static` com o conteúdo de `dist/` **e** um `site.zip` (zip do conteúdo do `dist/`)
4. Hostinger API:
   - `hosting_git_deploy-website-repository` → domínio `hfcomerciodepecas.com`, branch `hostinger-static`, directory `app`
   - `hosting_websites_deploy-static-site-archive` → `archive_path: app/site.zip` (sobrescreve `public_html`)

### Rebuild local + ZIP

```powershell
cd "hf-comercio-de-pecas"
pnpm build
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
Compress-Archive -Path "dist\*" -DestinationPath "hfcomerciodepecas_$stamp.zip" -Force
```

## Supabase Auth (obrigatório no dashboard)

Projeto restaurado (`ACTIVE_HEALTHY`): `owllmfcpbodqmoerdfxx`

[URL Configuration](https://supabase.com/dashboard/project/owllmfcpbodqmoerdfxx/auth/url-configuration):

- **Site URL:** `https://hfcomerciodepecas.com`
- **Redirect URLs:**
  - `https://hfcomerciodepecas.com/**`
  - `https://www.hfcomerciodepecas.com/**`
  - `http://localhost:5173/**` (dev)

> A API MCP do Supabase não expõe update de Auth URLs; configure no dashboard (login pode pedir captcha).

## Conta Hostinger

- User: `u873362946`
- Domínio: `hfcomerciodepecas.com`
- Order: `1006572009`
