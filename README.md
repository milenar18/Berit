# Berit — Brindes & Presentes

Vitrine pública sem login de clientes, com catálogo administrável e imagens conectados ao Supabase. O acesso em `2.0/views/admin.html` é exclusivo de administradores.

## Configurar o Supabase

1. As migrações de `supabase/migrations/` já foram aplicadas ao projeto Supabase **Berit**. Elas configuram categorias, fotos, permissões administrativas e a consulta administrativa a nomes e datas de cadastro dos clientes. Se configurar outro projeto, execute os arquivos SQL em ordem pelo SQL Editor.
2. A chave **publishable** do projeto Berit já está em `2.0/assets/js/supabase-config.js`. Ela é própria para uso no navegador; nunca coloque uma chave `secret` ou `service_role` no GitHub.
3. Em **Authentication → URL Configuration**, configure como Site URL o endereço do site publicado e adicione também o endereço de `2.0/views/admin.html` às URLs de redirecionamento permitidas.
4. Publique os arquivos no GitHub e habilite o GitHub Pages para a branch principal, pasta `/ (root)`. O `index.html` da raiz direciona para a vitrine.
5. Mantenha **Allow new users to sign up** desabilitado em **Authentication → Settings → User Signups**. A proteção de banco em `supabase/admin-only.sql` também rejeita cadastros públicos, remove o acesso ao antigo carrinho e restringe perfis a administradores. Ela já foi aplicada ao projeto Berit; aplique-a após as migrações ao configurar outro projeto. Para provisionar novos administradores, use a Admin API em ambiente confiável com `app_metadata: { role: 'admin' }`; nunca use `user_metadata` para conceder permissões. Os administradores existentes são preservados.

As consultas usam os filtros estruturados do SDK Supabase, sem concatenar entradas em SQL. As políticas RLS verificam o papel administrativo na tabela `profiles`, inclusive para chamadas diretas à API. Não adicione endpoints que executem SQL fornecido pelo navegador. Ocultar o link do painel não torna o HTML privado: a autorização dos dados é feita no banco.

## Executar localmente

Sirva a pasta por HTTP, por exemplo com a extensão Live Server do VS Code, e abra o endereço local gerado. Os módulos JavaScript e a autenticação não funcionam ao abrir os arquivos diretamente via `file://`.

Os produtos de demonstração e as imagens originais ficam em `2.0/models/catalog-model.js` e `2.0/assets/images/`. No painel administrativo, cadastre categorias com foto e frase de apresentação; depois associe produtos a elas. Categorias e produtos salvos aparecem na vitrine. A exclusão de categoria é bloqueada enquanto houver produtos ligados a ela.

## Cadastro de administradores e primeiro acesso

No painel, abra **Administradores** e informe nome, e-mail e uma senha provisória de pelo menos 6 caracteres. Compartilhe os dados de acesso com o novo administrador por um canal seguro; o cadastro não envia e-mail automaticamente. O novo administrador precisa definir e confirmar uma senha pessoal antes de acessar o catálogo administrativo.

O backend `supabase/functions/create-admin/index.ts` usa a Admin API apenas no servidor, valida a sessão e exige um perfil administrativo com senha definitiva. A função `create-admin` já foi publicada no projeto Berit. A proteção em `supabase/admin-provisioning.sql` já foi aplicada; em outro projeto, aplique-a depois de `admin-only.sql` e publique a Edge Function com verificação de JWT habilitada. A chave service_role fica exclusivamente nos secrets do Supabase.

O banco mantém `profiles.must_change_password` protegido contra alterações pelo navegador e bloqueia operações administrativas enquanto a troca está pendente. Uma alteração de senha pelo Supabase Auth libera a conta. Administradores já existentes não recebem essa exigência retroativamente.

Após `admin-provisioning.sql`, aplique `supabase/fix-admin-registration.sql` ao configurar outro projeto. Essa correção já foi aplicada ao Berit: a validação do novo administrador ocorre ao fim da transação, após a Admin API gravar `app_metadata`, mantendo o cadastro público bloqueado.

Verificações locais: `node scripts/check-admin.cjs`, `node scripts/check-password-recovery.cjs` e `node scripts/check-catalog.cjs`.
