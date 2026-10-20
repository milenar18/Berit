// Controller: mantém o estado da tela e coordena modelo, view e eventos.
import { CatalogModel as model } from '../models/catalog-model.js';
import { CatalogView as view } from '../views/catalog-view.js';
import { supabase, imageUrl } from '../assets/js/supabase-client.js';

const controller = (() => {
  const state = { category: 'Todos', query: '', sort: 'featured' };
  function render() { view.renderProducts(model.getProducts(state)); }

  let adminSessionVersion = 0;
  async function renderAdminSession() {
    const version = ++adminSessionVersion;
    const welcome = document.querySelector('#adminWelcome');
    const name = document.querySelector('#adminFirstName');
    const quoteButton = document.querySelector('header .header-cta');
    welcome.hidden = true;
    quoteButton.hidden = false;
    name.textContent = '';
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user || version !== adminSessionVersion) return;
      const { data: profile, error: profileError } = await supabase.from('profiles')
        .select('display_name,role').eq('id', data.user.id).single();
      if (profileError || profile?.role !== 'admin' || version !== adminSessionVersion) return;
      const fullName = profile.display_name?.trim() || data.user.user_metadata?.name?.trim() || data.user.email?.split('@')[0] || 'Administrador';
      name.textContent = fullName.split(/\s+/)[0];
      quoteButton.hidden = true;
      welcome.hidden = false;
    } catch {
      // Authentication failures must not interrupt the public catalog.
    }
  }

  function setCategory(category) {
    state.category = category;
    view.renderSelectedCategory(category);
    render();
    if (category !== 'Todos') document.querySelector('#catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
    view.setSidebarOpen(false);
  }

  function initialize() {
    supabase.auth.onAuthStateChange(() => {
      queueMicrotask(renderAdminSession);
    });
    renderAdminSession();
    view.renderCategories(model.getCategories(), state.category);
    render();
    Promise.all([
      supabase.from('products').select('id,name,category,detail,image_path,price,promotion_price,promotion_label,is_active').eq('is_active', true).order('created_at'),
      supabase.from('categories').select('name,note,image_path').order('created_at')
    ]).then(([productResult, categoryResult]) => {
      if (productResult.error) throw productResult.error;
      if (categoryResult.error) throw categoryResult.error;
      const savedProducts = (productResult.data || []).map(item => ({ ...item, image: imageUrl(item.image_path) }));
      const savedCategories = (categoryResult.data || []).map(item => ({ ...item, image: item.image_path ? imageUrl(item.image_path, 'category-images') : '' }));
      model.setProducts(savedProducts);
      model.setCategories(savedCategories);
      view.renderCategories(model.getCategories(), state.category);
      render();
    }).catch(error => console.warn('Não foi possível carregar os dados adicionais do catálogo.', error.message));
    document.querySelector('#searchInput').addEventListener('input', event => { state.query = event.target.value; render(); });
    document.querySelector('#searchForm').addEventListener('submit', event => { event.preventDefault(); document.querySelector('#catalogo').scrollIntoView({ behavior: 'smooth' }); });
    document.querySelector('#sortSelect').addEventListener('change', event => { state.sort = event.target.value; render(); });
    document.querySelector('#filterPills').addEventListener('click', event => { const button = event.target.closest('[data-filter]'); if (button) setCategory(button.dataset.filter); });
    document.querySelector('#productGrid').addEventListener('click', event => {
      const button = event.target.closest('[data-product-details]');
      if (!button) return;
      const product = model.getProducts().find(item => String(item.id) === button.dataset.productDetails);
      if (product) view.showProductDetails(product, button);
    });
    const productModal = document.querySelector('#productDetailModal');
    document.querySelector('#productModalClose').addEventListener('click', () => view.closeProductDetails());
    productModal.addEventListener('click', event => {
      if (event.target === productModal) view.closeProductDetails();
    });
    productModal.addEventListener('close', () => {
      if (productModal.returnFocusTo?.isConnected) productModal.returnFocusTo.focus();
      productModal.returnFocusTo = null;
    });
    document.querySelector('#sideCategories').addEventListener('click', event => { const link = event.target.closest('[data-category]'); if (link) { event.preventDefault(); setCategory(link.dataset.category); } });
    document.querySelector('#categoryTrack').addEventListener('click', event => { const card = event.target.closest('[data-category]'); if (card) setCategory(card.dataset.category); });
    document.querySelector('#clearFilters').addEventListener('click', () => {
      state.category = 'Todos'; state.query = ''; state.sort = 'featured';
      document.querySelector('#searchInput').value = '';
      document.querySelector('#sortSelect').value = 'featured';
      view.renderSelectedCategory(state.category); render();
    });
    const sidebar = document.querySelector('#sidebar');
    document.querySelector('#menuToggle').addEventListener('click', () => view.setSidebarOpen(sidebar.classList.contains('-translate-x-full')));
    document.querySelector('#closeMenu').addEventListener('click', () => view.setSidebarOpen(false));
    document.querySelector('#scrim').addEventListener('click', () => view.setSidebarOpen(false));
    document.querySelectorAll('.side-link[href^="#"]').forEach(link => link.addEventListener('click', () => view.setSidebarOpen(false)));
  }

  return Object.freeze({ initialize });
})();

document.addEventListener('DOMContentLoaded', controller.initialize, { once: true });
