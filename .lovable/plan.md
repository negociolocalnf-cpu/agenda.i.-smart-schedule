## Objetivo

Adicionar uma seção dedicada de **WhatsApp** dentro de `Configurações`, onde cada assinante define:
- Modo de envio: **manual (wa.me)**, **API oficial (Meta Cloud)** ou **ambos**
- **Templates** editáveis de confirmação e lembrete (com variáveis `{paciente}`, `{data}`, `{hora}`, `{profissional}`, `{clinica}`)
- **Credenciais Meta** (Phone Number ID + Access Token), salvas com segurança
- **Status de verificação** das credenciais (não verificado / verificando / válido / inválido + última verificação)

> Esta etapa entrega **apenas a tela de configurações**. O botão "Confirmar via WhatsApp" na Agenda fica para o próximo passo.

---

## 1. Banco de dados (migration)

Nova tabela `whatsapp_settings` (uma linha por usuário):

| coluna | tipo | observação |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid UNIQUE NOT NULL | dono da configuração |
| `mode` | text NOT NULL DEFAULT `'manual'` | `'manual' | 'api' | 'both'` (validado por trigger) |
| `confirmation_template` | text NOT NULL DEFAULT template padrão PT-BR |
| `reminder_template` | text NOT NULL DEFAULT template padrão PT-BR |
| `clinic_name` | text | usado na variável `{clinica}` |
| `meta_phone_number_id` | text | só usado se `mode != 'manual'` |
| `meta_access_token` | text | **NUNCA** retornado ao client (ver view) |
| `meta_business_account_id` | text | opcional |
| `verification_status` | text NOT NULL DEFAULT `'not_verified'` | `not_verified | verifying | valid | invalid` |
| `verification_error` | text | mensagem da última falha |
| `verified_at` | timestamptz | última verificação bem-sucedida |
| `created_at` / `updated_at` | timestamptz |

**RLS:**
- Habilitar RLS.
- `own_select_whatsapp_settings` / `own_insert` / `own_update` / `own_delete` com `auth.uid() = user_id`.

**Trigger** `tg_set_updated_at` em UPDATE.

**View segura** `whatsapp_settings_safe` (SECURITY INVOKER) que expõe todas as colunas **exceto** `meta_access_token`, e em vez disso um booleano `has_access_token`. O frontend lê dessa view; só edge functions com service role leem o token cru.

---

## 2. Edge Functions

### 2.1 `whatsapp-save-settings`
- Valida JWT do usuário.
- Body validado com Zod: `mode`, `confirmation_template`, `reminder_template`, `clinic_name`, `meta_phone_number_id`, `meta_access_token` (opcional — se vier vazio mantém o existente), `meta_business_account_id`.
- Faz upsert em `whatsapp_settings` por `user_id`.
- Sempre que `mode != 'manual'` e credenciais mudarem → reseta `verification_status` para `'not_verified'`.
- Retorna o registro **sem** o token.

### 2.2 `whatsapp-verify-credentials`
- Valida JWT.
- Carrega `meta_phone_number_id` + `meta_access_token` do usuário (via service role).
- Se faltar credencial → retorna 400 amigável.
- Marca `verification_status='verifying'`.
- Faz `GET https://graph.facebook.com/v21.0/{phone_number_id}?fields=verified_name,display_phone_number` com `Authorization: Bearer {access_token}`.
- Em sucesso: grava `verification_status='valid'`, `verified_at=now()`, `verification_error=null`, devolve `{ verified_name, display_phone_number }`.
- Em falha: `verification_status='invalid'`, `verification_error=<mensagem da Meta>`.
- CORS habilitado, segue padrão dos outros edge functions do projeto.

> Nenhum dos dois precisa de `verify_jwt = false` no `config.toml` — usam validação de JWT em código (padrão atual).

---

## 3. Frontend

### 3.1 Hook `src/hooks/useWhatsappSettings.tsx`
- Busca de `whatsapp_settings_safe` filtrando por `user_id`.
- Expõe: `settings`, `loading`, `refetch`, `save(payload)`, `verify()`, `saving`, `verifying`.
- `save` e `verify` chamam as edge functions via `supabase.functions.invoke`.

### 3.2 Componente `src/components/dashboard/WhatsappSettingsCard.tsx`
Estrutura visual (padrão das outras seções de Configurações — `rounded-2xl border border-border bg-card p-6 shadow-soft`):

- **Header**: título "WhatsApp" + subtítulo "Confirme consultas pelo seu próprio número".
- **Badge de status global**: `Modo: Manual` / `API oficial` / `Ambos` + bolinha de verificação (verde/cinza/vermelho/amarelo).
- **Bloco "Modo de envio"**: `RadioGroup` com 3 opções (Manual, API oficial Meta, Ambos) + descrição curta de cada.
- **Bloco "Identificação"**: Input `clinic_name`.
- **Bloco "Templates"** (sempre visível):
  - Textarea `confirmation_template`
  - Textarea `reminder_template`
  - Pequena legenda listando variáveis disponíveis (`{paciente}`, `{data}`, `{hora}`, `{profissional}`, `{clinica}`)
  - Pré-visualização ao vivo de uma das mensagens com dados fictícios.
- **Bloco "Credenciais Meta"** (visível apenas se `mode != 'manual'`):
  - Input `meta_phone_number_id`
  - Input `meta_access_token` tipo `password`, com placeholder "•••• (mantém atual)" quando já existe; botão "mostrar/ocultar".
  - Input opcional `meta_business_account_id`.
  - Linha de **status de verificação**:
    - `not_verified` → cinza "Credenciais não verificadas"
    - `verifying` → spinner "Verificando…"
    - `valid` → verde com check, "Verificado em <data>" + nome/numero retornados
    - `invalid` → vermelho com mensagem de erro
  - Botão **"Verificar credenciais"** (chama `verify()`).
  - Pequeno link de ajuda explicando onde achar Phone Number ID e Access Token no Meta Business Manager.
- **Footer do card**: botões `Salvar alterações` (primário) e `Cancelar` (volta ao estado salvo). Validação client-side via Zod (modo válido, templates não vazios e ≤ 1000 chars, ids alfanuméricos).

### 3.3 Integração na página
Em `src/pages/dashboard/Configuracoes.tsx`, adicionar `<WhatsappSettingsCard />` logo abaixo da seção "Assinatura". A seção fica visível para todos, mas com aviso "Disponível apenas com assinatura ativa" + botão desabilitado quando `useSubscription().isActive === false` (consistente com o resto do app).

---

## 4. Segurança

- `meta_access_token` **nunca** trafega para o frontend (view `whatsapp_settings_safe` o omite; edge functions só o leem via service role).
- Validação Zod no edge function (tamanhos máximos, formato dos IDs).
- RLS por `auth.uid() = user_id`.
- Sem logs do token nos edge functions.

---

## 5. O que NÃO entra nesta etapa

- Botão "Confirmar via WhatsApp" na Agenda e o edge function `whatsapp-send-confirmation` (próxima etapa, após esta tela estar validada).
- Lembretes automáticos agendados (cron).
- Coluna `confirmation_sent_at` em `appointments` (entra junto com o botão de envio).

---

## Arquivos que serão criados/editados

**Criados**
- `supabase/migrations/<timestamp>_whatsapp_settings.sql`
- `supabase/functions/whatsapp-save-settings/index.ts`
- `supabase/functions/whatsapp-verify-credentials/index.ts`
- `src/hooks/useWhatsappSettings.tsx`
- `src/components/dashboard/WhatsappSettingsCard.tsx`

**Editados**
- `src/pages/dashboard/Configuracoes.tsx` (montar o card)
- `src/integrations/supabase/types.ts` (regenerado automaticamente após a migration)

Posso prosseguir com essa implementação?