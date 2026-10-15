import { supabase, isConfigured, imageUrl } from '../assets/js/supabase-client.js';
import { CatalogModel } from '../models/catalog-model.js';

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxImageSize = 5 * 1024 * 1024;
let mode = 'login';
let user = null;
let products = [];
let categories = [];
let customers = [];
let customersError = '';
let cartItems = [];
let editingProductId = null;
let editingCategoryName = null;

function message(element, text, error = false) {
  element.textContent = text;
  element.className = `text-sm ${error ? 'text-red-700' : 'text-berit-muted'}`;
}

function renderAuth() {
  const registering = mode === 'register';
  const recovery = mode === 'recovery';
  $('#authTitle').textContent = recovery ? 'Escolha uma nova senha' : registering ? 'Criar conta' : 'Entre na sua conta';
  $('#authIntro').textContent = recovery ? 'Defina uma nova senha para sua conta.' : registering ? 'Crie sua conta para salvar seu carrinho.' : 'Entre para acessar seu carrinho ou administrar o catálogo.';
  $('#nameWrap').classList.toggle('hidden', !registering);
  $('#name').required = registering;
  $('#passwordHint').textContent = registering || recovery ? 'Use pelo menos 8 caracteres.' : '';
  $('#authSubmit').textContent = recovery ? 'Salvar nova senha' : registering ? 'Criar conta' : 'Entrar';
  $('#modeToggle').classList.toggle('hidden', recovery);
  $('#modeToggle').textContent = registering ? 'Já tem conta? Entrar' : 'Ainda não tem conta? Cadastre-se';
  $('#forgotButton').classList.toggle('hidden', registering || recovery);
}

function normalizeProduct(row) { return { ...row, image: imageUrl(row.image_path) }; }
function normalizeCategory(row) { return { ...row, image: row.image_path ? imageUrl(row.image_path, 'category-images') : '' }; }

async function loadProducts() {
  const [{ data: productRows, error: productError }, { data: categoryRows, error: categoryError }] = await Promise.all([
    supabase.from('products').select('id,name,category,detail,image_path,created_at').order('created_at'),
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

async function loadCustomers() {
  const { data, error } = await supabase.from('profiles').select('id,display_name,created_at').eq('role', 'customer').order('created_at', { ascending: false });
  if (error) {
    customers = [];
    customersError = error.message;
  } else {
    customers = data || [];
    customersError = '';
  }
  renderAdminCustomers();
}

function renderAdminCustomers(query = $('#customerSearch').value) {
  const normalized = query.trim().toLocaleLowerCase('pt-BR');
  const visible = customers.filter(customer => !normalized || (customer.display_name || 'Cliente').toLocaleLowerCase('pt-BR').includes(normalized));
  const list = $('#customerList');
  const recent = $('#recentCustomers');
  $('#customerCount').textContent = customers.length;
  $('#customerListCount').textContent = `${visible.length} ${visible.length === 1 ? 'cliente' : 'clientes'}`;
  if (customersError) {
    const errorMarkup = `<p class="rounded-2xl bg-red-50 p-4 text-sm text-red-700">Não foi possível carregar clientes: ${escapeHtml(customersError)}</p>`;
    list.innerHTML = errorMarkup;
    recent.innerHTML = errorMarkup;
    return;
  }
  const item = customer => `<article class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-berit-line p-4"><div><strong class="block text-sm">${escapeHtml(customer.display_name || 'Cliente')}</strong><span class="mt-1 block text-xs text-berit-muted">Cadastro em ${new Date(customer.created_at).toLocaleDateString('pt-BR')}</span></div><span class="rounded-full bg-berit-cream px-3 py-1 text-xs font-semibold text-berit-green">Cliente</span></article>`;
  list.innerHTML = visible.length ? visible.map(item).join('') : '<p class="rounded-2xl bg-berit-cream p-4 text-sm text-berit-muted">Nenhum cliente encontrado.</p>';
  recent.innerHTML = customers.length ? customers.slice(0, 4).map(item).join('') : '<p class="rounded-2xl bg-berit-cream p-4 text-sm text-berit-muted">Ainda não há clientes cadastrados.</p>';
}

function showAdminPanel(panelId) {
  ['adminOverview', 'adminCustomers', 'adminCategories', 'adminProducts'].forEach(id => $(`#${id}`).classList.toggle('hidden', id !== panelId));
  document.querySelectorAll('.admin-tab').forEach(button => {
    const selected = button.dataset.adminTab === panelId;
    button.setAttribute('aria-selected', String(selected));
    button.classList.toggle('bg-berit-green', selected);
    button.classList.toggle('text-white', selected);
    button.classList.toggle('border', !selected);
    button.classList.toggle('border-berit-line', !selected);
    button.classList.toggle('bg-white', !selected);
    button.classList.toggle('text-berit-muted', !selected);
  });
}

function renderAdminProducts() {
  $('#productCategory').innerHTML = categories.map(category => `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`).join('');
  $('#categoryProductCount').textContent = `${categories.length} ${categories.length === 1 ? 'categoria' : 'categorias'}`;
  $('#productCount').textContent = `${products.length} ${products.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}`;
  $('#productsSummary').textContent = $('#productCount').textContent;
  $('#categoryCount').textContent = categories.length;
  $('#customProducts').innerHTML = products.length ? products.map(item => `<article class="flex items-center gap-3 rounded-2xl border border-berit-line p-3"><img src="${escapeHtml(item.image)}" alt="" class="h-14 w-14 rounded-xl object-cover"><div class="min-w-0 flex-1"><strong class="block truncate text-sm">${escapeHtml(item.name)}</strong><span class="block truncate text-xs text-berit-muted">${escapeHtml(item.category)}</span></div><button class="edit-product rounded-full px-3 py-2 text-xs font-semibold text-berit-green hover:bg-berit-cream" data-id="${escapeHtml(item.id)}">Editar</button><button class="delete-product rounded-full px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" data-id="${escapeHtml(item.id)}">Excluir</button></article>`).join('') : '<p class="rounded-2xl bg-berit-cream p-4 text-sm text-berit-muted">Ainda não há produtos cadastrados.</p>';
  $('#customCategories').innerHTML = categories.length ? categories.map(category => `<article class="flex items-center gap-3 rounded-2xl border border-berit-line p-3"><img src="${escapeHtml(category.image || '../assets/images/Caneca.jpeg')}" alt="" class="h-14 w-14 rounded-xl object-cover"><div class="min-w-0 flex-1"><strong class="block truncate text-sm">${escapeHtml(category.name)}</strong><span class="block truncate text-xs text-berit-muted">${escapeHtml(category.note || 'Sem descrição')}</span></div><button class="edit-category rounded-full px-3 py-2 text-xs font-semibold text-berit-green hover:bg-berit-cream" data-name="${escapeHtml(category.name)}">Editar</button><button class="delete-category rounded-full px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" data-name="${escapeHtml(category.name)}">Excluir</button></article>`).join('') : '<p class="rounded-2xl bg-berit-cream p-4 text-sm text-berit-muted">Cadastre sua primeira categoria.</p>';
}

function renderCustomerCatalog(query = '') {
  const normalized = query.trim().toLocaleLowerCase('pt-BR');
  const visible = CatalogModel.getProducts().filter(item => !normalized || `${item.name} ${item.category} ${item.detail}`.toLocaleLowerCase('pt-BR').includes(normalized));
  $('#customerCatalog').innerHTML = visible.length ? visible.map(item => `<article class="overflow-hidden rounded-2xl border border-berit-line"><img class="aspect-[4/3] w-full object-cover" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy"><div class="p-4"><span class="text-[10px] font-semibold uppercase tracking-widest text-berit-green">${escapeHtml(item.category)}</span><h3 class="mt-1 font-serif text-lg">${escapeHtml(item.name)}</h3><p class="mt-1 min-h-10 text-xs leading-5 text-berit-muted">${escapeHtml(item.detail)}</p><button class="add-to-cart mt-3 rounded-full bg-berit-green px-4 py-2 text-xs font-bold text-white hover:bg-berit-dark" data-id="${escapeHtml(item.id)}">Adicionar ao carrinho +</button></div></article>`).join('') : '<p class="text-sm text-berit-muted">Nenhum produto encontrado.</p>';
}

function renderCart() {
  const count = cartItems.reduce((total, item) => total + item.quantity, 0);
  $('#cartCount').textContent = count ? `(${count} ${count === 1 ? 'item' : 'itens'})` : '';
  $('#shoppingCart').innerHTML = cartItems.length ? cartItems.map(item => `<article class="flex items-center gap-3 rounded-xl border border-berit-line p-3"><img src="${escapeHtml(item.image)}" alt="" class="h-12 w-12 rounded-lg object-cover"><div class="min-w-0 flex-1"><strong class="block truncate text-xs">${escapeHtml(item.name)}</strong><div class="mt-1 flex items-center gap-2"><button class="cart-quantity rounded-full border border-berit-line px-2" data-action="decrease" data-id="${escapeHtml(item.product_key)}">−</button><span class="text-xs text-berit-muted">${item.quantity}</span><button class="cart-quantity rounded-full border border-berit-line px-2" data-action="increase" data-id="${escapeHtml(item.product_key)}">+</button></div></div><button class="cart-remove px-2 text-xs font-semibold text-red-700" data-id="${escapeHtml(item.product_key)}">Remover</button></article>`).join('') : '<p class="rounded-xl bg-berit-cream p-4 text-sm text-berit-muted">Seu carrinho está vazio. Escolha os produtos de que gostou.</p>';
  const checkout = $('#checkoutButton');
  checkout.classList.toggle('hidden', !cartItems.length);
  checkout.classList.toggle('flex', Boolean(cartItems.length));
  const details = cartItems.map(item => `• ${item.name} (${item.category}) — quantidade: ${item.quantity}`).join('\n');
  checkout.href = `https://wa.me/5579981422536?text=${encodeURIComponent(`Oi, Berit! Tenho interesse nestes produtos:\n${details}\n\nGostaria de solicitar um orçamento.`)}`;
}

async function loadCart() {
  const { data, error } = await supabase.from('cart_items').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
  if (error) throw error;
  cartItems = data || [];
  renderCart();
}

async function showSignedIn() {
  user = (await supabase.auth.getUser()).data.user;
  if (!user) return showAuth();
  const profileResult = await supabase.from('profiles').select('display_name,role').eq('id', user.id).single();
  if (profileResult.error) throw profileResult.error;
  $('#authPanel').classList.add('hidden');
  await loadProducts();
  if (profileResult.data.role === 'admin') {
    await loadCustomers();
    $('#customerPanel').classList.add('hidden');
    $('#adminPanel').classList.remove('hidden');
    renderAdminProducts();
    renderAdminCustomers();
    showAdminPanel('adminOverview');
  } else {
    $('#adminPanel').classList.add('hidden');
    $('#customerPanel').classList.remove('hidden');
    $('#greeting').textContent = profileResult.data.display_name || user.email || 'cliente';
    renderCustomerCatalog();
    await loadCart();
  }
}

function showAuth() {
  $('#authPanel').classList.remove('hidden');
  $('#adminPanel').classList.add('hidden');
  $('#customerPanel').classList.add('hidden');
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

$('#modeToggle').addEventListener('click', () => { mode = mode === 'login' ? 'register' : 'login'; message($('#authMessage'), ''); renderAuth(); });
$('#authForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!isConfigured()) return message($('#authMessage'), 'Adicione a chave publishable do Supabase em assets/js/supabase-config.js.', true);
  const email = $('#email').value.trim().toLowerCase();
  const password = $('#password').value;
  try {
    let result;
    if (mode === 'recovery') {
      result = await supabase.auth.updateUser({ password });
      if (result.error) throw result.error;
      mode = 'login';
      await supabase.auth.signOut();
      renderAuth();
      return message($('#authMessage'), 'Senha atualizada. Entre com a nova senha.');
    } else if (mode === 'register') {
      result = await supabase.auth.signUp({ email, password, options: { data: { name: $('#name').value.trim() } } });
      if (result.error) throw result.error;
      if (!result.data.session) return message($('#authMessage'), 'Cadastro iniciado. Confirme o link enviado ao seu e-mail e depois entre.');
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
    }
    await showSignedIn();
  } catch (error) { message($('#authMessage'), error.message || 'Não foi possível acessar sua conta.', true); }
});

$('#forgotButton').addEventListener('click', async () => {
  const email = $('#email').value.trim().toLowerCase();
  if (!email) return message($('#authMessage'), 'Informe seu e-mail para receber o link de redefinição.', true);
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}` });
  message($('#authMessage'), error ? error.message : 'Se esse e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.', Boolean(error));
});

document.querySelectorAll('.logout').forEach(button => button.addEventListener('click', async () => { await supabase.auth.signOut(); location.reload(); }));
$('#catalogSearch').addEventListener('input', event => renderCustomerCatalog(event.target.value));
$('#customerSearch').addEventListener('input', event => renderAdminCustomers(event.target.value));
$('#adminPanel').addEventListener('click', event => {
  const button = event.target.closest('[data-admin-tab]');
  if (button) showAdminPanel(button.dataset.adminTab);
});

$('#customerCatalog').addEventListener('click', async event => {
  const button = event.target.closest('.add-to-cart');
  if (!button) return;
  const product = CatalogModel.getProducts().find(item => item.id === button.dataset.id);
  const existing = cartItems.find(item => item.product_key === product.id);
  const row = { user_id: user.id, product_key: product.id, name: product.name, category: product.category, detail: product.detail, image: product.image, quantity: Math.min(99, (existing?.quantity || 0) + 1), updated_at: new Date().toISOString() };
  const { error } = await supabase.from('cart_items').upsert(row, { onConflict: 'user_id,product_key' });
  if (error) return message($('#shoppingCart'), error.message, true);
  await loadCart();
});

$('#shoppingCart').addEventListener('click', async event => {
  const button = event.target.closest('.cart-remove, .cart-quantity');
  if (!button) return;
  const item = cartItems.find(row => row.product_key === button.dataset.id);
  if (!item) return;
  const remove = button.classList.contains('cart-remove') || (button.dataset.action === 'decrease' && item.quantity === 1);
  const result = remove
    ? await supabase.from('cart_items').delete().eq('user_id', user.id).eq('product_key', item.product_key)
    : await supabase.from('cart_items').update({ quantity: Math.min(99, item.quantity + (button.dataset.action === 'increase' ? 1 : -1)), updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('product_key', item.product_key);
  if (result.error) return message($('#shoppingCart'), result.error.message, true);
  await loadCart();
});

$('#productForm').addEventListener('submit', async event => {
  event.preventDefault();
  const file = $('#productImage').files[0];
  if ((!editingProductId || file) && imageFileError(file)) return message($('#productMessage'), imageFileError(file), true);
  if (!categories.some(category => category.name === $('#productCategory').value)) return message($('#productMessage'), 'Selecione uma categoria cadastrada.', true);
  message($('#productMessage'), 'Salvando produto…');
  let newImagePath = null;
  try {
    if (file) newImagePath = await uploadImage(file, 'product-images');
    const payload = { name: $('#productName').value.trim(), category: $('#productCategory').value, detail: $('#productDetail').value.trim() };
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
supabase.auth.onAuthStateChange(event => {
  if (event === 'PASSWORD_RECOVERY') {
    mode = 'recovery';
    showAuth();
    renderAuth();
    message($('#authMessage'), 'Informe uma nova senha.');
  }
});
supabase.auth.getSession().then(({ data, error }) => error ? message($('#authMessage'), error.message, true) : data.session ? showSignedIn().catch(err => message($('#authMessage'), err.message, true)) : showAuth());
