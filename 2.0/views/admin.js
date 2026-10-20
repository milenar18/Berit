import { supabase, isConfigured, imageUrl } from '../assets/js/supabase-client.js';
import { CatalogModel } from '../models/catalog-model.js';

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const formatMoney = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
const productPriceMarkup = product => {
  if (product.price == null) return '<span class="text-sm font-semibold text-berit-muted">Consulte o preço</span>';
  if (product.promotion_price != null) return `<span class="inline-flex flex-wrap items-center gap-x-2 gap-y-1"><del class="text-xs text-berit-muted">${formatMoney(product.price)}</del><strong class="text-base text-berit-green">${formatMoney(product.promotion_price)}</strong>${product.promotion_label ? `<span class="rounded-full bg-berit-lime px-2 py-1 text-[10px] font-bold uppercase text-berit-green">${escapeHtml(product.promotion_label)}</span>` : ''}</span>`;
  return `<strong class="text-sm text-berit-ink">${formatMoney(product.price)}</strong>`;
};
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxImageSize = 5 * 1024 * 1024;
const recoveryParams = new URLSearchParams(location.hash.slice(1));
const recoveryLinkError = recoveryParams.has('error') || new URLSearchParams(location.search).has('error');
let mode = recoveryParams.get('type') === 'recovery' ? 'recovery' : 'login';
let authBusy = false;
let user = null;
let products = [];
let categories = [];
let editingProductId = null;
let editingCategoryName = null;
let productSearchQuery = '';
const adminPageSize = 6;
let categoryPage = 1;
let productPage = 1;

function message(element, text, error = false) {
  element.textContent = text;
  element.className = `text-sm ${error ? 'text-red-700' : 'text-berit-muted'}`;
}

function pageItems(items, requestedPage) {
  const totalPages = Math.max(1, Math.ceil(items.length / adminPageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  return {
    page,
    totalPages,
    items: items.slice((page - 1) * adminPageSize, page * adminPageSize)
  };
}

function paginationMarkup(listName, page, totalPages) {
  if (totalPages <= 1) return '';
  return `<nav class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-berit-line pt-4" aria-label="Paginação de ${listName}"><span class="text-xs text-berit-muted">Página ${page} de ${totalPages}</span><div class="flex items-center gap-2"><button type="button" class="admin-pagination-button rounded-full border border-berit-line px-4 py-2 text-xs font-semibold text-berit-green transition hover:border-berit-green disabled:cursor-not-allowed disabled:opacity-40" data-pagination="${listName}" data-direction="previous" ${page === 1 ? 'disabled' : ''} aria-label="Página anterior de ${listName}">Anterior</button><button type="button" class="admin-pagination-button rounded-full border border-berit-line px-4 py-2 text-xs font-semibold text-berit-green transition hover:border-berit-green disabled:cursor-not-allowed disabled:opacity-40" data-pagination="${listName}" data-direction="next" ${page === totalPages ? 'disabled' : ''} aria-label="Próxima página de ${listName}">Próxima</button></div></nav>`;
}

function renderAuth() {
  const recovery = mode === 'recovery' || mode === 'first-password';
  $('#authTitle').textContent = recovery ? 'Escolha uma nova senha' : 'Login administrativo';
  $('#authIntro').textContent = recovery ? 'Defina uma nova senha para sua conta administrativa.' : 'Acesso exclusivo para administradores da Berit.';
  $('#emailField').classList.toggle('hidden', recovery);
  $('#email').disabled = recovery;
  $('#email').required = !recovery;
  $('#confirmPasswordField').classList.toggle('hidden', !recovery);
  $('#confirmPassword').disabled = !recovery;
  $('#confirmPassword').required = recovery;
  if (mode === 'first-password') {
    $('#authTitle').textContent = 'Troque sua senha provisória';
    $('#authIntro').textContent = 'Para acessar o painel, defina uma senha pessoal diferente da senha provisória.';
  }
  $('#passwordHint').textContent = recovery ? 'Use pelo menos 6 caracteres.' : '';
  $('#password').minLength = recovery ? 6 : 1;
  $('#confirmPassword').minLength = 6;
  $('#password').autocomplete = recovery ? 'new-password' : 'current-password';
  $('#authSubmit').textContent = recovery ? 'Salvar nova senha' : 'Entrar';
  $('#forgotButton').classList.toggle('hidden', recovery);
}

function normalizeProduct(row) { return { ...row, image: imageUrl(row.image_path) }; }
function normalizeCategory(row) { return { ...row, image: row.image_path ? imageUrl(row.image_path, 'category-images') : '' }; }

async function loadProducts() {
  const [{ data: productRows, error: productError }, { data: categoryRows, error: categoryError }] = await Promise.all([
    supabase.from('products').select('id,name,category,detail,image_path,sku,price,promotion_price,promotion_label,is_active,created_at').order('created_at'),
    supabase.from('categories').select('name,note,image_path,created_at').order('created_at')
  ]);
  if (productError) throw productError;
  if (categoryError) throw categoryError;
  products = (productRows || []).map(normalizeProduct);
  categories = (categoryRows || []).map(normalizeCategory);
  CatalogModel.setProducts(products);
  CatalogModel.setCategories(categories);
  return CatalogModel.getProducts();
}

function showAdminPanel(panelId) {
  ['adminOverview', 'adminCategories', 'adminProducts', 'adminAdministrators'].forEach(id => $(`#${id}`).classList.toggle('hidden', id !== panelId));
  document.querySelectorAll('.admin-tab').forEach(button => {
    const selected = button.dataset.adminTab === panelId;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  setAdminSidebarOpen(false);
  if (panelId === 'adminAdministrators') loadAdministrators();
}

async function loadAdministrators() {
  const button = $('#refreshAdministrators');
  if (button.disabled) return;
  button.disabled = true;
  $('#administratorsList').replaceChildren();
  message($('#administratorsMessage'), 'Carregando administradores…');
  try {
    const { data, error } = await supabase.from('profiles')
      .select('id,display_name,created_at,must_change_password')
      .eq('role', 'admin').order('created_at', { ascending: false });
    if (error) throw error;
    if (!user || $('#adminPanel').classList.contains('hidden')) return;
    const administrators = data || [];
    $('#administratorsList').innerHTML = administrators.map(admin => {
      const date = new Date(admin.created_at).toLocaleDateString('pt-BR');
      return `<li class="rounded-2xl border border-berit-line p-4"><div class="flex flex-wrap items-center justify-between gap-2"><strong class="min-w-0 break-words text-sm">${escapeHtml(admin.display_name || 'Administrador sem nome')}${admin.id === user.id ? ' (você)' : ''}</strong><span class="rounded-full bg-berit-lime px-3 py-1 text-xs font-semibold text-berit-dark">${admin.must_change_password ? 'Troca de senha pendente' : 'Acesso liberado'}</span></div><p class="mt-2 text-xs text-berit-muted">Cadastrado em ${escapeHtml(date)}</p></li>`;
    }).join('');
    message($('#administratorsMessage'), administrators.length
      ? `${administrators.length} ${administrators.length === 1 ? 'administrador cadastrado' : 'administradores cadastrados'}.`
      : 'Nenhum administrador cadastrado.');
  } catch (error) {
    message($('#administratorsMessage'), 'Não foi possível carregar os administradores. Clique em Atualizar para tentar novamente.', true);
  } finally {
    button.disabled = false;
  }
}

$('#refreshAdministrators').addEventListener('click', loadAdministrators);

function setAdminSidebarOpen(open) {
  const wasOpen = !$('#adminSidebar').classList.contains('-translate-x-full');
  $('#adminSidebar').classList.toggle('-translate-x-full', !open);
  $('#adminScrim').classList.toggle('hidden', !open);
  $('#adminMenuToggle').setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('overflow-hidden', open && window.matchMedia('(max-width: 1023px)').matches);
  if (!open && wasOpen && window.matchMedia('(max-width: 1023px)').matches) $('#adminMenuToggle').focus();
}

function renderAdminProducts() {
  const productNormalized = productSearchQuery.trim().toLocaleLowerCase('pt-BR');
  const visibleProducts = products.filter(item => {
    const searchable = `${item.name} ${item.category} ${item.detail} ${item.sku || ''}`.toLocaleLowerCase('pt-BR');
    return !productNormalized || searchable.includes(productNormalized);
  });
  const pagedCategories = pageItems(categories, categoryPage);
  categoryPage = pagedCategories.page;
  $('#productCategory').innerHTML = categories.map(category => `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`).join('');
  $('#categoryProductCount').textContent = `${categories.length} ${categories.length === 1 ? 'categoria' : 'categorias'}`;
  $('#productCount').textContent = `${products.length} ${products.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}`;
  const hasProductSearch = Boolean(productNormalized);
  $('#productsSummary').textContent = hasProductSearch
    ? `${visibleProducts.length} de ${products.length} ${products.length === 1 ? 'produto' : 'produtos'}`
    : $('#productCount').textContent;
  $('#categoryCount').textContent = categories.length;
  const productCard = item => `<article class="flex items-center gap-3 rounded-2xl border border-berit-line p-3"><img src="${escapeHtml(item.image)}" alt="" class="h-14 w-14 rounded-xl object-cover"><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><strong class="block truncate text-sm">${escapeHtml(item.name)}</strong>${item.is_active === false ? '<span class="rounded-full bg-berit-cream px-2 py-1 text-[10px] font-bold uppercase text-berit-muted">Inativo</span>' : ''}</div><span class="block truncate text-xs text-berit-muted">${item.sku ? `SKU ${escapeHtml(item.sku)} · ` : ''}${escapeHtml(item.detail)}</span><div class="mt-1">${productPriceMarkup(item)}</div></div><button class="edit-product rounded-full px-3 py-2 text-xs font-semibold text-berit-green hover:bg-berit-cream" data-id="${escapeHtml(item.id)}">Editar</button><button class="delete-product rounded-full px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" data-id="${escapeHtml(item.id)}">Excluir</button></article>`;
  const categoryOrder = new Map(categories.map((category, index) => [category.name, index]));
  const groupedVisibleProducts = [...visibleProducts].sort((a, b) =>
    (categoryOrder.get(a.category) ?? categories.length) - (categoryOrder.get(b.category) ?? categories.length) ||
    a.category.localeCompare(b.category, 'pt-BR') ||
    a.name.localeCompare(b.name, 'pt-BR')
  );
  const pagedProducts = pageItems(groupedVisibleProducts, productPage);
  productPage = pagedProducts.page;
  const groupedProducts = categories.map(category => ({
    name: category.name,
    total: visibleProducts.filter(item => item.category === category.name).length,
    items: pagedProducts.items.filter(item => item.category === category.name)
  })).filter(group => group.items.length);
  const knownCategories = new Set(categories.map(category => category.name));
  const uncategorized = pagedProducts.items.filter(item => !knownCategories.has(item.category));
  if (uncategorized.length) groupedProducts.push({ name: 'Outros produtos', total: visibleProducts.filter(item => !knownCategories.has(item.category)).length, items: uncategorized });
  $('#customProducts').innerHTML = groupedProducts.length ? groupedProducts.map(group => `<section class="space-y-3 rounded-2xl border border-berit-line bg-white p-4"><div class="flex items-center justify-between gap-3 border-b border-berit-line pb-3"><h4 class="font-serif text-lg text-berit-ink">${escapeHtml(group.name)}</h4><span class="shrink-0 rounded-full bg-berit-cream px-3 py-1 text-xs font-semibold text-berit-muted">${group.total} ${group.total === 1 ? 'produto' : 'produtos'}</span></div><div class="space-y-3">${group.items.map(productCard).join('')}</div></section>`).join('') : `<p class="rounded-2xl bg-berit-cream p-4 text-sm text-berit-muted">${products.length ? 'Nenhum produto corresponde à busca.' : 'Ainda não há produtos cadastrados.'}</p>`;
  $('#productPagination').innerHTML = paginationMarkup('produtos', productPage, pagedProducts.totalPages);
  $('#customCategories').innerHTML = categories.length ? pagedCategories.items.map(category => `<article class="flex items-center gap-3 rounded-2xl border border-berit-line p-3"><img src="${escapeHtml(category.image || '../assets/images/Caneca.jpeg')}" alt="" class="h-14 w-14 rounded-xl object-cover"><div class="min-w-0 flex-1"><strong class="block truncate text-sm">${escapeHtml(category.name)}</strong><span class="block truncate text-xs text-berit-muted">${escapeHtml(category.note || 'Sem descrição')}</span></div><button class="edit-category rounded-full px-3 py-2 text-xs font-semibold text-berit-green hover:bg-berit-cream" data-name="${escapeHtml(category.name)}">Editar</button><button class="delete-category rounded-full px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" data-name="${escapeHtml(category.name)}">Excluir</button></article>`).join('') : `<p class="rounded-2xl bg-berit-cream p-4 text-sm text-berit-muted">Cadastre sua primeira categoria.</p>`;
  $('#categoryPagination').innerHTML = paginationMarkup('categorias', categoryPage, pagedCategories.totalPages);
}

async function requireAdmin() {
  const { data, error } = await supabase.auth.getUser();
  const currentUser = data?.user;
  const profile = currentUser && !error
    ? await supabase.from('profiles').select('role,must_change_password').eq('id', currentUser.id).single()
    : null;
  if (!profile || profile.error || profile.data?.role !== 'admin') {
    user = null;
    showAuth();
    await supabase.auth.signOut({ scope: 'local' });
    throw new Error('Acesso restrito a administradores.');
  }
  user = currentUser;
  if (profile.data.must_change_password && mode !== 'recovery' && mode !== 'first-password') {
    mode = 'first-password';
    $('#authForm').reset();
    renderAuth();
    message($('#authMessage'), 'A troca da senha provisória é obrigatória.');
  }
}

async function showSignedIn() {
  showAuth();
  await requireAdmin();
  if (mode === 'recovery' || mode === 'first-password') return;
  await loadProducts();
  $('#authPanel').classList.add('hidden');
  $('#adminHeaderActions').classList.remove('hidden');
  $('#adminHeaderActions').classList.add('flex');
  $('#adminMenuToggle').style.display = '';
  $('#accountBackLink').classList.add('hidden');
  $('#adminPanel').classList.remove('hidden');
  renderAdminProducts();
  showAdminPanel('adminOverview');
}

function showAuth() {
  $('#authPanel').classList.remove('hidden');
  $('#adminPanel').classList.add('hidden');
  $('#adminHeaderActions').classList.add('hidden');
  $('#adminHeaderActions').classList.remove('flex');
  $('#adminMenuToggle').style.display = 'none';
  $('#accountBackLink').classList.remove('hidden');
  setAdminSidebarOpen(false);
}

function imageFileError(file) {
  if (!file) return 'Selecione uma imagem JPG, PNG ou WebP de até 5 MB.';
  if (!allowedImageTypes.includes(file.type) || file.size > maxImageSize) return 'Use uma imagem JPG, PNG ou WebP de até 5 MB.';
  return '';
}

async function uploadImage(file, bucket) {
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const result = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (result.error) throw result.error;
  return path;
}

function resetProductForm() {
  editingProductId = null;
  $('#productForm').reset();
  $('#productFormTitle').textContent = 'Cadastrar produto';
  $('#productSubmit').textContent = 'Salvar produto';
  $('#cancelProductEdit').classList.add('hidden');
  $('#productImage').required = true;
}

function resetCategoryForm() {
  editingCategoryName = null;
  $('#categoryForm').reset();
  $('#categoryFormTitle').textContent = 'Nova categoria';
  $('#categorySubmit').textContent = 'Salvar categoria';
  $('#cancelCategoryEdit').classList.add('hidden');
  $('#categoryImage').required = true;
  $('#categoryImageHint').textContent = 'JPG, PNG ou WebP; até 5 MB.';
}

$('#authForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!isConfigured()) return message($('#authMessage'), 'Adicione a chave publishable do Supabase em assets/js/supabase-config.js.', true);
  const email = $('#email').value.trim().toLowerCase();
  if (authBusy) return;
  const password = $('#password').value;
  if ((mode === 'recovery' || mode === 'first-password') && password !== $('#confirmPassword').value) return message($('#authMessage'), 'As senhas não coincidem.', true);
  authBusy = true;
  $('#authSubmit').disabled = true;
  $('#forgotButton').disabled = true;
  try {
    let result;
    if (mode === 'recovery' || mode === 'first-password') {
      await requireAdmin();
      result = await supabase.auth.updateUser({ password });
      if (result.error) throw result.error;
      mode = 'login';
      await supabase.auth.signOut();
      $('#authForm').reset();
      renderAuth();
      return message($('#authMessage'), 'Senha atualizada. Entre com a nova senha.');
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
    }
    await showSignedIn();
  } catch (error) { message($('#authMessage'), error.message || 'Não foi possível acessar sua conta.', true); }
  finally { authBusy = false; $('#authSubmit').disabled = false; $('#forgotButton').disabled = false; }
});

$('#forgotButton').addEventListener('click', async () => {
  if (authBusy) return;
  if (!isConfigured()) return message($('#authMessage'), 'A recuperação está indisponível. Entre em contato com a Berit.', true);
  if (!$('#email').reportValidity()) return;
  const email = $('#email').value.trim().toLowerCase();
  authBusy = true;
  $('#forgotButton').disabled = true;
  $('#authSubmit').disabled = true;
  message($('#authMessage'), 'Enviando link de recuperação…');
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) throw error;
    message($('#authMessage'), 'Se esse e-mail estiver cadastrado, enviaremos um link para redefinir sua senha. Confira também a pasta de spam.');
  } catch (error) {
    message($('#authMessage'), error.status === 429 ? 'Aguarde alguns minutos antes de solicitar outro link.' : 'Não foi possível enviar o link. Tente novamente em alguns minutos.', true);
  } finally {
    authBusy = false;
    $('#forgotButton').disabled = false;
    $('#authSubmit').disabled = false;
  }
});

document.querySelectorAll('.logout').forEach(button => button.addEventListener('click', async () => { await supabase.auth.signOut(); location.reload(); }));
$('#productSearch').addEventListener('input', event => {
  productSearchQuery = event.target.value;
  productPage = 1;
  renderAdminProducts();
});
$('#adminMenuToggle').addEventListener('click', () => setAdminSidebarOpen($('#adminSidebar').classList.contains('-translate-x-full')));
$('#adminMenuClose').addEventListener('click', () => setAdminSidebarOpen(false));
$('#adminScrim').addEventListener('click', () => setAdminSidebarOpen(false));
$('#adminPanel').addEventListener('click', event => {
  const paginationButton = event.target.closest('.admin-pagination-button');
  if (paginationButton && !paginationButton.disabled) {
    const pageDelta = paginationButton.dataset.direction === 'next' ? 1 : -1;
    const listName = paginationButton.dataset.pagination;
    if (listName === 'categorias') {
      categoryPage += pageDelta;
      renderAdminProducts();
    } else if (listName === 'produtos') {
      productPage += pageDelta;
      renderAdminProducts();
    }
    return;
  }
  const button = event.target.closest('[data-admin-tab]');
  if (button) showAdminPanel(button.dataset.adminTab);
});
$('#adminSidebar').addEventListener('keydown', event => {
  const tabs = [...document.querySelectorAll('.admin-tab')];
  const currentIndex = tabs.indexOf(event.target.closest('.admin-tab'));
  if (currentIndex < 0) return;
  let nextIndex;
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
  else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = tabs.length - 1;
  else return;
  event.preventDefault();
  tabs[nextIndex].focus();
  showAdminPanel(tabs[nextIndex].dataset.adminTab);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && window.matchMedia('(max-width: 1023px)').matches && !$('#adminSidebar').classList.contains('-translate-x-full')) {
    setAdminSidebarOpen(false);
  }
});

$('#productForm').addEventListener('submit', async event => {
  event.preventDefault();
  const file = $('#productImage').files[0];
  if ((!editingProductId || file) && imageFileError(file)) return message($('#productMessage'), imageFileError(file), true);
  if (!categories.some(category => category.name === $('#productCategory').value)) return message($('#productMessage'), 'Selecione uma categoria cadastrada.', true);
  const normalPrice = $('#productPrice').value === '' ? null : Number($('#productPrice').value);
  const promotionPrice = $('#productPromotionPrice').value === '' ? null : Number($('#productPromotionPrice').value);
  if (promotionPrice !== null && (normalPrice === null || promotionPrice >= normalPrice)) {
    return message($('#productMessage'), 'O preço promocional precisa ser menor que o preço normal.', true);
  }
  message($('#productMessage'), 'Salvando produto…');
  let newImagePath = null;
  try {
    if (file) newImagePath = await uploadImage(file, 'product-images');
    const payload = {
      name: $('#productName').value.trim(),
      sku: $('#productSku').value.trim() || null,
      category: $('#productCategory').value,
      detail: $('#productDetail').value.trim(),
      price: normalPrice,
      promotion_price: promotionPrice,
      promotion_label: $('#productPromotionLabel').value.trim(),
      is_active: $('#productActive').checked
    };
    if (newImagePath) payload.image_path = newImagePath;
    const result = editingProductId
      ? await supabase.from('products').update(payload).eq('id', editingProductId).select().single()
      : await supabase.from('products').insert({ ...payload, image_path: newImagePath }).select().single();
    if (result.error) throw result.error;
    const previous = products.find(item => item.id === editingProductId);
    if (previous && newImagePath && previous.image_path && !/^https?:\/\//i.test(previous.image_path)) await supabase.storage.from('product-images').remove([previous.image_path]);
    resetProductForm();
    message($('#productMessage'), 'Produto salvo no catálogo.');
    await loadProducts();
    renderAdminProducts();
  } catch (error) {
    if (newImagePath) await supabase.storage.from('product-images').remove([newImagePath]);
    message($('#productMessage'), error.message || 'Não foi possível salvar o produto.', true);
  }
});

$('#customProducts').addEventListener('click', async event => {
  const editButton = event.target.closest('.edit-product');
  const deleteButton = event.target.closest('.delete-product');
  if (editButton) {
    const product = products.find(item => item.id === editButton.dataset.id);
    if (!product) return;
    editingProductId = product.id;
    $('#productName').value = product.name;
    $('#productCategory').value = product.category;
    $('#productDetail').value = product.detail;
    $('#productSku').value = product.sku || '';
    $('#productPrice').value = product.price ?? '';
    $('#productPromotionPrice').value = product.promotion_price ?? '';
    $('#productPromotionLabel').value = product.promotion_label || '';
    $('#productActive').checked = product.is_active !== false;
    $('#productImage').required = false;
    $('#productFormTitle').textContent = 'Editar produto';
    $('#productSubmit').textContent = 'Salvar alterações';
    $('#cancelProductEdit').classList.remove('hidden');
    message($('#productMessage'), 'A imagem atual será mantida se você não selecionar outra.');
    $('#productForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (deleteButton) {
    const product = products.find(item => item.id === deleteButton.dataset.id);
    if (!product) return;
    if (!confirm(`Excluir o produto “${product.name}”?`)) return;
    const removed = await supabase.from('products').delete().eq('id', product.id);
    if (removed.error) return message($('#productMessage'), removed.error.message, true);
    if (product.image_path && !/^https?:\/\//i.test(product.image_path)) await supabase.storage.from('product-images').remove([product.image_path]);
    await loadProducts();
    renderAdminProducts();
    message($('#productMessage'), 'Produto excluído.');
  }
});

$('#cancelProductEdit').addEventListener('click', resetProductForm);

$('#categoryForm').addEventListener('submit', async event => {
  event.preventDefault();
  const file = $('#categoryImage').files[0];
  const current = categories.find(category => category.name === editingCategoryName);
  if ((!editingCategoryName || file || !current?.image_path) && imageFileError(file)) return message($('#categoryMessage'), imageFileError(file), true);
  if (editingCategoryName && !current) return message($('#categoryMessage'), 'Categoria não encontrada. Atualize a página e tente novamente.', true);
  message($('#categoryMessage'), 'Salvando categoria…');
  let newImagePath = null;
  try {
    if (file) newImagePath = await uploadImage(file, 'category-images');
    const name = $('#categoryName').value.trim();
    const payload = { name, note: $('#categoryNote').value.trim(), updated_at: new Date().toISOString() };
    if (newImagePath) payload.image_path = newImagePath;
    const result = editingCategoryName
      ? await supabase.from('categories').update(payload).eq('name', editingCategoryName).select().single()
      : await supabase.from('categories').insert({ ...payload, image_path: newImagePath }).select().single();
    if (result.error) throw result.error;
    if (current && newImagePath && current.image_path) await supabase.storage.from('category-images').remove([current.image_path]);
    resetCategoryForm();
    message($('#categoryMessage'), 'Categoria salva.');
    await loadProducts();
    renderAdminProducts();
  } catch (error) {
    if (newImagePath) await supabase.storage.from('category-images').remove([newImagePath]);
    message($('#categoryMessage'), error.message || 'Não foi possível salvar a categoria.', true);
  }
});

$('#customCategories').addEventListener('click', async event => {
  const editButton = event.target.closest('.edit-category');
  const deleteButton = event.target.closest('.delete-category');
  if (editButton) {
    const category = categories.find(item => item.name === editButton.dataset.name);
    if (!category) return;
    editingCategoryName = category.name;
    $('#categoryName').value = category.name;
    $('#categoryNote').value = category.note;
    $('#categoryImage').required = !category.image_path;
    $('#categoryFormTitle').textContent = `Editar ${category.name}`;
    $('#categorySubmit').textContent = 'Salvar alterações';
    $('#categoryImageHint').textContent = 'Opcional: escolha uma nova imagem para substituir a atual.';
    $('#cancelCategoryEdit').classList.remove('hidden');
    message($('#categoryMessage'), 'A foto atual será mantida se você não selecionar outra.');
    $('#categoryForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (deleteButton) {
    const category = categories.find(item => item.name === deleteButton.dataset.name);
    if (!category) return;
    if (!confirm(`Excluir a categoria “${category.name}”?`)) return;
    const removed = await supabase.from('categories').delete().eq('name', category.name);
    if (removed.error) {
      const inUse = removed.error.code === '23503';
      return message($('#categoryMessage'), inUse ? 'Esta categoria possui produtos. Reclassifique ou exclua esses produtos antes.' : removed.error.message, true);
    }
    if (category.image_path) await supabase.storage.from('category-images').remove([category.image_path]);
    await loadProducts();
    renderAdminProducts();
    message($('#categoryMessage'), 'Categoria excluída.');
  }
});

$('#cancelCategoryEdit').addEventListener('click', resetCategoryForm);

renderAuth();
if (!isConfigured()) message($('#authMessage'), 'A configuração do Supabase está incompleta. Veja o README para conectar o projeto.', true);
showAuth();
supabase.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_OUT') { user = null; mode = 'login'; renderAuth(); showAuth(); }
  if (event === 'PASSWORD_RECOVERY') {
    mode = 'recovery';
    showAuth();
    renderAuth();
    $('#authForm').reset();
    history.replaceState(null, '', location.pathname);
    message($('#authMessage'), 'Informe e confirme uma nova senha.');
  }
});
supabase.auth.getSession().then(async ({ data, error }) => {
  if (recoveryLinkError || error || (mode === 'recovery' && !data.session)) {
    mode = 'login';
    renderAuth();
    showAuth();
    history.replaceState(null, '', location.pathname);
    message($('#authMessage'), 'O link de recuperação é inválido ou expirou. Informe seu e-mail e solicite um novo link.', true);
    return;
  }
  if (data.session) await showSignedIn();
  else showAuth();
}).catch(error => message($('#authMessage'), error.message || 'Não foi possível verificar sua sessão.', true));

$('#newAdminForm').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('#newAdminSubmit');
  if (button.disabled) return;
  button.disabled = true;
  message($('#newAdminMessage'), 'Cadastrando administrador…');
  try {
    const { data, error } = await supabase.functions.invoke('create-admin', { body: {
      name: $('#newAdminName').value.trim(), email: $('#newAdminEmail').value.trim(), password: $('#newAdminPassword').value
    } });
    if (error) {
      const detail = await error.context?.json?.().catch(() => null);
      throw new Error(detail?.error || 'Não foi possível cadastrar o administrador. Tente novamente.');
    }
    $('#newAdminForm').reset();
    message($('#newAdminMessage'), data.message);
    await loadAdministrators();
  } catch (error) { message($('#newAdminMessage'), error.message, true); }
  finally { button.disabled = false; }
});
