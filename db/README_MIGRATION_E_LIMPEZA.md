# Migration e limpeza do banco (entregar_em, numero_remessa, purge >45 dias)

## 1. Aplicar a migration (corrige o erro 500)

O código em produção já usa as colunas `entregar_em` e `numero_remessa`. Se o banco ainda não tiver essas colunas, a listagem de solicitações retorna 500.

**Opção A – Script Node (recomendado)**  
Na raiz do projeto, com `DATABASE_URL` definida (arquivo `.env` ou ambiente):

```bash
npm run migrate
```

**Opção B – SQL direto no Neon**  
Abra o Neon SQL Editor, conecte no mesmo banco usado pelo Netlify, e execute o conteúdo de:

- `db/migration_entregar_em_numero_remessa.sql`

## 2. Soft delete de solicitações com mais de 45 dias

**Opção A – Script Node**  
Com `DATABASE_URL` definida:

```bash
npm run soft-delete
```

**Opção B – SQL direto no Neon**  
Execute o conteúdo de:

- `db/soft_delete_older_45_days.sql`

## 3. Deploy no Netlify

Depois de rodar a migration (e, se quiser, o soft delete):

```bash
npm run deploy
```

Se a pasta ainda não estiver vinculada a um site, escolha "Link this directory to an existing site" e selecione o site. Em seguida o deploy será concluído.

## 4. Usuários e senhas (apenas Flexíveis e Salto)

**Admin, Separador e Solicitante** continuam com a senha antiga **admin123**. Apenas os usuários novos **Flexíveis** e **Salto** têm senhas distintas (bcrypt 10 rounds).

**Para os logins Flexíveis e Salto funcionarem no Neon:**

1. No **Neon SQL Editor**, execute o conteúdo de:
   - `db/update_passwords_neon.sql`  
   (insere ou atualiza Flexíveis e Salto com as senhas corretas)

2. Ou execute todo o seed: `db/seed_users.sql` (mantém admin123 nos antigos e usa as senhas novas só para Flexíveis e Salto).

**Senhas dos novos usuários:**

| Usuário   | Email                  | Senha inicial  |
|-----------|------------------------|----------------|
| Flexíveis | flexiveis@antilhas.com | Flexiveis#2025 |
| Salto     | salto@antilhas.com     | Salto#2025     |

**Para regenerar apenas os hashes de Flexíveis e Salto** (e reescrever `db/update_passwords_neon.sql` e `db/SENHAS_INICIAIS.md`):

```bash
npm run generate-passwords
```

## 5. Se o erro 500 continuar

- Em **produção**: Netlify → Functions → `requests` → abra o log da última execução e veja a mensagem de erro completa.
- Em **desenvolvimento** (`netlify dev` ou branch deploy com `NODE_ENV !== 'production'`): a resposta 500 em JSON inclui o campo `error.detail` com a mensagem real (ex.: coluna inexistente), o que facilita o ajuste fino.
