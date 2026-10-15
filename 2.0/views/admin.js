import { supabase, isConfigured, imageUrl } from '../assets/js/supabase-client.js';
import { CatalogModel } from '../models/catalog-model.js';

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let mode = 'login';
let user = null;
let products = [];
let cartItems = [];

function message(element, text, error = false) {
  element.textContent = text;
  element.className = `text-sm ${error ? 'text-red-700' : 'text-berit-muted'}`;
}

function renderAuth() {
  const recovery = mode === 'recovery';
  $('#authTitle').textContent = recovery ? 'Escolha uma nova senha' : 'Entre na sua conta';
  $('#authIntro').textContent = recovery ? 'Defina uma nova senha para sua conta.' : 'Acesso restrito a contas autorizadas.';
  $('#passwordHint').textContent = recovery ? 'Use pelo menos 8 caracteres.' : '';
  $('#authSubmit').textContent = recovery ? 'Salvar nova senha' : 'Entrar';
  $('#forgotButton').classList.toggle('hidden', recovery);
}

function normalizeProduct(row) {
  return { ...row, image: imageUrl(row.image_path) };
}

async function loadProducts() {
  const { data, error } = await supabase.from('products').select('id,name,category,detail,image_path,created_at').order('created_at');
  if (error) throw error;
  products = (data || []).map(normalizeProduct);
  return [...CatalogModel.getProducts(), ...products];
}

function renderAdminProducts() {
  $('#categoryOptions').innerHTML = [...new Set(products.map(item => item.category))].map(category => `<option value="${escapeHtml(category)}"></option>`).join('');
  $('#customProducts').innerHTML = products.length ? products.map(item => `<article class="flex items-center gap-3 rounded-2xl border border-berit-line p-3"><img src="${escapeHtml(item.image)}" alt="" class="h-14 w-14 rounded-xl object-cover"><div class="min-w-0 flex-1"><strong class="block truncate text-sm">${escapeHtml(item.name)}</strong><span class="block truncate text-xs text-berit-muted">${escapeHtml(item.category)}</span></div><button class="delete-product rounded-full px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" data-id="${escapeHtml(item.id)}">Excluir</button></article>`).join('') : '<p class="rounded-2xl bg-berit-cream p-4 text-sm text-berit-muted">Ainda não há produtos cadastrados.</p>';
}

function renderCustomerCatalog(query = '') {
  const normalized = query.trim().toLocaleLowerCase('pt-BR');
  const visible = [...CatalogModel.getProducts(), ...products].filter(item => !normalized || `${item.name} ${item.category} ${item.detail}`.toLocaleLowerCase('pt-BR').includes(normalized));
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
    $('#customerPanel').classList.add('hidden');
    $('#adminPanel').classList.remove('hidden');
    renderAdminProducts();
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

$('#customerCatalog').addEventListener('click', async event => {
  const button = event.target.closest('.add-to-cart');
  if (!button) return;
  const product = [...CatalogModel.getProducts(), ...products].find(item => item.id === button.dataset.id);
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
  if (!file || file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return message($('#productMessage'), 'Selecione JPG, PNG ou WebP de até 5 MB.', true);
  message($('#productMessage'), 'Salvando produto…');
  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const uploaded = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: false });
  if (uploaded.error) return message($('#productMessage'), uploaded.error.message, true);
  const saved = await supabase.from('products').insert({ name: $('#productName').value.trim(), category: $('#productCategory').value.trim(), detail: $('#productDetail').value.trim(), image_path: path }).select().single();
  if (saved.error) {
    await supabase.storage.from('product-images').remove([path]);
    return message($('#productMessage'), saved.error.message, true);
  }
  $('#productForm').reset();
  message($('#productMessage'), 'Produto salvo no catálogo.');
  await loadProducts();
  renderAdminProducts();
});

$('#customProducts').addEventListener('click', async event => {
  const button = event.target.closest('.delete-product');
  if (!button) return;
  const product = products.find(item => item.id === button.dataset.id);
  const removed = await supabase.from('products').delete().eq('id', product.id);
  if (removed.error) return message($('#productMessage'), removed.error.message, true);
  await supabase.storage.from('product-images').remove([product.image_path]);
  await loadProducts();
  renderAdminProducts();
});

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
