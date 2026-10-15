// Controller: mantém o estado da tela e coordena modelo, view e eventos.
import { CatalogModel as model } from '../models/catalog-model.js';
import { CatalogView as view } from '../views/catalog-view.js';
import { supabase, imageUrl } from '../assets/js/supabase-client.js';

const controller = (() => {
  const state = { category: 'Todos', query: '', sort: 'featured' };
  let accountRenderVersion = 0;

  function render() { view.renderProducts(model.getProducts(state)); }
  async function renderAccountLink(user) {
    const version = ++accountRenderVersion;
    const link = document.querySelector('#accountLink');
    const label = document.querySelector('#accountLinkLabel');
    if (!user) {
      label.textContent = 'Entrar';
      link.setAttribute('aria-label', 'Entrar na área da conta');
      return;
    }

    let name = user.user_metadata?.name || user.user_metadata?.full_name;
    const { data } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
    if (version !== accountRenderVersion) return;
    name = data?.display_name || name || user.email?.split('@')[0] || 'Minha conta';
    label.textContent = `Olá, ${name}`;
    link.setAttribute('aria-label', `Abrir conta de ${name}`);
  }

  function setCategory(category) {
    state.category = category;
    view.renderSelectedCategory(category);
    render();
    if (category !== 'Todos') document.querySelector('#catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
    view.setSidebarOpen(false);
  }

  function initialize() {
    supabase.auth.onAuthStateChange((event, session) => {
      if (['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) {
        queueMicrotask(() => renderAccountLink(session?.user || null));
      }
    });
    view.renderCategories(model.getCategories(), state.category);
    render();
    Promise.all([
      supabase.from('products').select('id,name,category,detail,image_path').order('created_at'),
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
