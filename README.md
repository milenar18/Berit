# Berit — Brindes & Presentes

Vitrine estática publicada no GitHub Pages, com login, catálogo administrável, imagens e carrinho conectados ao Supabase.

## Configurar o Supabase

1. As migrações de `supabase/migrations/` já foram aplicadas ao projeto Supabase **Berit**. A migração de categorias cria a tabela, as permissões administrativas e o bucket público de fotos. Se configurar outro projeto, execute os arquivos SQL em ordem pelo SQL Editor.
2. A chave **publishable** do projeto Berit já está em `2.0/assets/js/supabase-config.js`. Ela é própria para uso no navegador; nunca coloque uma chave `secret` ou `service_role` no GitHub.
3. Em **Authentication → URL Configuration**, configure como Site URL o endereço do site publicado e adicione também o endereço de `2.0/views/admin.html` às URLs de redirecionamento permitidas.
4. Publique os arquivos no GitHub e habilite o GitHub Pages para a branch principal, pasta `/ (root)`. O `index.html` da raiz direciona para a vitrine.
5. Para permitir que clientes se cadastrem, mantenha habilitada a opção **Allow new users to sign up** em **Authentication → Settings → User Signups**. Cadastros feitos pelo site recebem o papel `customer` automaticamente; eles não podem administrar o catálogo. Para promover uma conta confiável a administradora, execute no SQL Editor, substituindo o endereço:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where lower(email) = lower('seu-email@exemplo.com'));
```

## Executar localmente

Sirva a pasta por HTTP, por exemplo com a extensão Live Server do VS Code, e abra o endereço local gerado. Os módulos JavaScript e a autenticação não funcionam ao abrir os arquivos diretamente via `file://`.

Os produtos de demonstração e as imagens originais ficam em `2.0/models/catalog-model.js` e `2.0/assets/images/`. No painel administrativo, cadastre categorias com foto e frase de apresentação; depois associe produtos a elas. Categorias e produtos salvos aparecem na vitrine. A exclusão de categoria é bloqueada enquanto houver produtos ligados a ela.
