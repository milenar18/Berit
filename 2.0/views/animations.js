(() => {
  const h = React.createElement;
  const { useEffect, useState } = React;
  const slides = [
    { image: '../assets/images/Caneca Mãe.jpeg', alt: 'Caneca personalizada com estampa floral' },
    { image: '../assets/images/Garrafa Térmica.jpeg', alt: 'Garrafa térmica personalizada' },
    { image: '../assets/images/Chaveiro Pai.jpeg', alt: 'Chaveiro personalizado para presentear' },
  ];

  function DynamicSite() {
    const [active, setActive] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      const selector = '.hero-copy, .category-card, .product-card, .personalize-art, .contact-copy, .contact-card';
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('react-reveal-visible');
        observer.unobserve(entry.target);
      }), { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
      const observe = () => document.querySelectorAll(selector).forEach(element => {
        if (element.dataset.reactReveal) return;
        element.dataset.reactReveal = 'true';
        element.classList.add('react-reveal');
        observer.observe(element);
      });
      observe();
      const mutations = new MutationObserver(observe);
      mutations.observe(document.body, { childList: true, subtree: true });
      return () => { mutations.disconnect(); observer.disconnect(); };
    }, []);

    useEffect(() => {
      const image = document.querySelector('.main-image img');
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let timer;
      const changeSlide = (next) => {
        image.classList.add('hero-image-changing');
        window.setTimeout(() => {
          image.src = slides[next].image;
          image.alt = slides[next].alt;
          setActive(next);
          requestAnimationFrame(() => image.classList.remove('hero-image-changing'));
        }, prefersReducedMotion ? 0 : 220);
      };
      if (!prefersReducedMotion) timer = window.setInterval(() => changeSlide((active + 1) % slides.length), 6000);
      return () => window.clearInterval(timer);
    }, [active]);

    useEffect(() => {
      let frame = 0;
      const update = () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          setProgress(max > 0 ? window.scrollY / max : 0);
          frame = 0;
        });
      };
      window.addEventListener('scroll', update, { passive: true });
      update();
      return () => window.removeEventListener('scroll', update);
    }, []);

    const heroIndex = document.querySelector('.hero-index');
    return h(React.Fragment, null,
      h('div', { className: 'reading-progress', 'aria-hidden': 'true', style: { transform: `scaleX(${progress})` } }),
      heroIndex && ReactDOM.createPortal(h(React.Fragment, null,
        h('span', { className: 'hero-current-index' }, String(active + 1).padStart(2, '0')),
        h('i', null),
        h('span', null, String(slides.length).padStart(2, '0')),
        h('div', { className: 'hero-slide-controls', 'aria-label': 'Imagens em destaque' }, slides.map((slide, index) => h('button', {
          key: slide.image,
          type: 'button',
          className: `hero-slide-dot${active === index ? ' active' : ''}`,
          'aria-label': `Mostrar imagem ${index + 1} de ${slides.length}`,
          'aria-pressed': active === index,
          onClick: () => {
            const image = document.querySelector('.main-image img');
            image.classList.add('hero-image-changing');
            window.setTimeout(() => {
              image.src = slide.image;
              image.alt = slide.alt;
              setActive(index);
              requestAnimationFrame(() => image.classList.remove('hero-image-changing'));
            }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220);
          },
        })))
      ), heroIndex)
    );
  }

  const mount = document.createElement('div');
  mount.id = 'react-dynamic-site';
  document.body.appendChild(mount);
  ReactDOM.createRoot(mount).render(h(DynamicSite));
})();
