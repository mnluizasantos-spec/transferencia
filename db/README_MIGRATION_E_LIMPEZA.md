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

## 4. Se o erro 500 continuar

- Em **produção**: Netlify → Functions → `requests` → abra o log da última execução e veja a mensagem de erro completa.
- Em **desenvolvimento** (`netlify dev` ou branch deploy com `NODE_ENV !== 'production'`): a resposta 500 em JSON inclui o campo `error.detail` com a mensagem real (ex.: coluna inexistente), o que facilita o ajuste fino.
