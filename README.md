# Berit — Brindes & Presentes

Vitrine de brindes e presentes com catálogo organizado por categorias e painel de administração.

## Executar localmente

Sirva a pasta por HTTP, por exemplo com a extensão Live Server do VS Code, e abra o endereço local gerado. Utilize um servidor local em vez de abrir os arquivos diretamente.

## Gerenciar o catálogo

No painel administrativo, cadastre categorias com foto e frase de apresentação; depois associe produtos a elas. As informações salvas aparecem na vitrine. Para excluir uma categoria, remova ou transfira primeiro os produtos associados.

## Administradores

Na seção **Administradores**, consulte os usuários administrativos cadastrados ou adicione um novo administrador informando nome, e-mail e uma senha provisória de pelo menos 6 caracteres.

Compartilhe os dados de acesso por um canal seguro. O novo administrador deve definir uma senha pessoal no primeiro acesso.

## Verificações locais

- `node scripts/check-admin.cjs`
- `node scripts/check-password-recovery.cjs`
- `node scripts/check-catalog.cjs`
