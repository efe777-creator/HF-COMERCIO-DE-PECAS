# Bootstrap de staff (primeiro administrador)

1. Abra o app e crie conta em `/cadastro` (ou Auth do Supabase).
2. Confirme o e-mail se necessário.
3. No SQL Editor do Supabase HF (`owllmfcpbodqmoerdfxx`), rode (troque o e-mail):

```sql
update public.profiles p
set role = 'administrador'
from auth.users u
where p.id = u.id
  and u.email = 'SEU_EMAIL@dominio.com';
```

4. Faça logout/login e acesse `/admin`.
5. Em **Usuários / operadores**, promova outros staff.

Bootstrap de role: se ainda **não existir** nenhum `administrador`, a RPC `admin_set_user_role` permite a primeira promoção via UI (administrador/gerente).
