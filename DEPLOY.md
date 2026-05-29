# Guia de Deploy — Recife Cap White Label

## Ambientes

| Ambiente | Branch | URL | Banco |
|----------|--------|-----|-------|
| Produção | main | recifecap.com.br | stnewtoijeokpygistmk |
| Staging | staging | staging.recifecap.com.br | (mesmo banco, dados de teste) |

## Fluxo de trabalho

1. Desenvolve na branch `staging`
2. Testa em staging.recifecap.com.br
3. Se aprovado → merge para `main`
4. Vercel publica automaticamente em produção

## Como fazer uma mudança

```bash
# 1. Mudar para branch staging
git checkout staging

# 2. Fazer as alterações
# ... editar arquivos ...

# 3. Publicar no staging
git add -A
git commit -m "feat: descrição da mudança"
git push origin staging

# 4. Testar em staging.recifecap.com.br
# Se aprovado:

# 5. Merge para produção
git checkout main
git merge staging
git push origin main
```

## Como configurar novo cliente

1. Criar projeto no Supabase
2. Criar projeto no Vercel
3. Configurar variáveis de ambiente
4. Apontar domínio do cliente
5. Executar migrations do banco
6. Configurar admin inicial

## Clientes ativos

| Cliente | Domínio | Supabase | Vercel | Status |
|---------|---------|----------|--------|--------|
| Recife Cap | recifecap.com.br | stnewtoijeokpygistmk | recife-cap | Produção |

## Acesso de emergência

Para acessar o painel de qualquer cliente:
- URL: {dominio}/admin
- Credenciais: ver 1Password (pasta White Label)
