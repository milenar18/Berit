// View: renderiza o catálogo no DOM sem controlar regras de negócio.
export const CatalogView = (() => {
  const quoteUrl = name => `https://wa.me/5579981422536?text=${encodeURIComponent(`Oi, Berit! Gostaria de fazer um orçamento para: ${name}.`)}`;
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function renderCategories(categories, selectedCategory) {
    document.querySelector('#categoryTrack').innerHTML = categories.map((category, index) => `<button class="category-card group text-left" data-category="${escapeHtml(category.name)}" aria-label="Ver ${escapeHtml(category.name)}"><span class="relative mb-3 block aspect-[1.55/1] overflow-hidden rounded-2xl bg-berit-peach sm:mb-4"><img class="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" src="${escapeHtml(category.image)}" alt="" loading="lazy"><span class="category-number absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[9px] font-semibold tracking-wide text-berit-green">0${index + 1}</span></span><span class="category-info flex items-center justify-between gap-2 px-1"><span class="min-w-0"><strong class="block truncate font-serif text-base text-berit-ink sm:text-lg">${escapeHtml(category.label)}</strong><small class="mt-1 block truncate text-[10px] text-berit-muted sm:text-xs">${escapeHtml(category.note)}</small></span><span class="category-arrow text-sm text-berit-coral transition-transform group-hover:translate-x-1">↗</span></span></button>`).join('');
    document.querySelector('#sideCategories').innerHTML = categories.map(category => `<a class="side-link mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-berit-muted transition hover:bg-berit-cream hover:text-berit-green" href="#catalogo" data-category="${escapeHtml(category.name)}"><span>↗</span> ${escapeHtml(category.label)}</a>`).join('');
    document.querySelector('#filterPills').innerHTML = ['Todos', ...categories.map(category => category.name)].map(name => {
      const selected = name === selectedCategory;
      return `<button class="filter-pill shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${selected ? 'selected border-berit-green bg-berit-green text-white' : 'border-berit-line bg-white text-berit-muted hover:border-berit-green hover:text-berit-green'}" data-filter="${escapeHtml(name)}" aria-pressed="${selected}">${escapeHtml(name)}</button>`;
    }).join('');
  }

  function renderProducts(products) {
    const grid = document.querySelector('#productGrid');
    grid.innerHTML = products.map(product => `<article class="product-card group"><a class="product-photo relative mb-4 block aspect-[4/3] overflow-hidden rounded-2xl bg-berit-peach" href="${quoteUrl(product.name)}" target="_blank" rel="noopener noreferrer" aria-label="Pedir orçamento para ${escapeHtml(product.name)}"><img class="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy"><span class="product-badge absolute left-4 top-4 rounded-full bg-white/90 px-3 py-2 text-[9px] font-semibold tracking-wide text-berit-green">FEITO PARA PRESENTEAR</span><span class="quick-quote absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-2 text-[10px] font-semibold text-berit-green opacity-0 shadow-sm transition-opacity group-hover:opacity-100">Peça seu orçamento ↗</span></a><div class="product-copy px-1"><span class="product-category text-[10px] font-semibold uppercase tracking-widest text-berit-coral">${escapeHtml(product.category)}</span><h3 class="mt-1 font-serif text-xl">${escapeHtml(product.name)}</h3><p class="mt-2 min-h-10 text-sm leading-5 text-berit-muted">${escapeHtml(product.detail)}</p><a href="${quoteUrl(product.name)}" target="_blank" rel="noopener noreferrer" class="product-link mt-3 inline-flex items-center gap-2 text-xs font-semibold text-berit-green">Consultar pelo WhatsApp <span>↗</span></a></div></article>`).join('');
    const empty = products.length === 0;
    document.querySelector('#emptyState').hidden = !empty;
    grid.hidden = empty;
  }

  function renderSelectedCategory(category) {
    document.querySelectorAll('#filterPills [data-filter]').forEach(button => {
      const selected = button.dataset.filter === category;
      button.classList.toggle('selected', selected);
      button.classList.toggle('border-berit-green', selected);
      button.classList.toggle('bg-berit-green', selected);
      button.classList.toggle('text-white', selected);
      button.classList.toggle('border-berit-line', !selected);
      button.classList.toggle('bg-white', !selected);
      button.classList.toggle('text-berit-muted', !selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function setSidebarOpen(open) {
    document.querySelector('#sidebar').classList.toggle('-translate-x-full', !open);
    document.querySelector('#scrim').classList.toggle('hidden', !open);
    document.querySelector('#menuToggle').setAttribute('aria-expanded', String(open));
  }

  return Object.freeze({ renderCategories, renderProducts, renderSelectedCategory, setSidebarOpen });
})();
