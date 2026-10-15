// Model: dados e regras de consulta do catálogo.
export const CatalogModel = (() => {
  const categories = [
    { name: 'Canecas', label: 'Canecas', image: '../assets/images/Caneca Mãe.jpeg', note: 'Um café com mais carinho' },
    { name: 'Garrafas', label: 'Garrafas', image: '../assets/images/Garrafa Térmica.jpeg', note: 'Para acompanhar seu dia' },
    { name: 'Chaveiros', label: 'Chaveiros', image: '../assets/images/Chaveiro Pai.jpeg', note: 'Leve uma lembrança com você' },
    { name: 'Relógios', label: 'Relógios', image: '../assets/images/Relógio mapa mundi.png', note: 'O tempo dos bons momentos' },
    { name: 'Quebra-cabeças', label: 'Quebra-cabeças', image: '../assets/images/Quebra-cabeça hulk.png', note: 'Diversão em cada peça' },
    { name: 'Presentes', label: 'Presentes', image: '../assets/images/Relógio Azulejo.jpeg', note: 'Ideias para surpreender' }
  ];
  const products = [
    { id: 'demo-caneca-personalizada', name: 'Caneca personalizada', category: 'Canecas', image: '../assets/images/Caneca.jpeg', detail: 'Um clássico para personalizar do seu jeito.' },
    { id: 'demo-caneca-mae', name: 'Caneca Mãe', category: 'Canecas', image: '../assets/images/Caneca Mãe.jpeg', detail: 'Uma lembrança carinhosa para quem sempre cuida.' },
    { id: 'demo-caneca-vaquinha', name: 'Caneca Vaquinha', category: 'Canecas', image: '../assets/images/Caneca Vaquinha.jpeg', detail: 'Estampa divertida para alegrar a rotina.' },
    { id: 'demo-caneca-infantil', name: 'Caneca infantil', category: 'Canecas', image: '../assets/images/Caneca Polímero Criança.jpeg', detail: 'Leve, colorida e feita para os pequenos.' },
    { id: 'demo-garrafa-termica', name: 'Garrafa térmica', category: 'Garrafas', image: '../assets/images/Garrafa Térmica.jpeg', detail: 'Sua bebida favorita sempre por perto.' },
    { id: 'demo-garrafa-canudo', name: 'Garrafa térmica com canudo', category: 'Garrafas', image: '../assets/images/Garrafa Térmica Canudo.jpeg', detail: 'Praticidade para levar a todos os lugares.' },
    { id: 'demo-chaveiro-personalizado', name: 'Chaveiro personalizado', category: 'Chaveiros', image: '../assets/images/Chaveiro.jpeg', detail: 'Um detalhe especial para carregar todo dia.' },
    { id: 'demo-chaveiro-pai', name: 'Chaveiro Pai', category: 'Chaveiros', image: '../assets/images/Chaveiro Pai.jpeg', detail: 'Um presente cheio de significado.' },
    { id: 'demo-relogio-azulejo', name: 'Relógio azulejo', category: 'Relógios', image: '../assets/images/Relógio Azulejo.jpeg', detail: 'Um toque especial para decorar a casa.' },
    { id: 'demo-relogio-mapa', name: 'Relógio mapa-múndi', category: 'Relógios', image: '../assets/images/Relógio mapa mundi.png', detail: 'Para quem sonha com novos destinos.' },
    { id: 'demo-quebra-cabeca-hulk', name: 'Quebra-cabeça Hulk', category: 'Quebra-cabeças', image: '../assets/images/Quebra-cabeça hulk.png', detail: 'Diversão garantida para fãs e colecionadores.' }
  ];
  let remoteProducts = [];
  function getCategories() {
    const result = categories.map(category => ({ ...category }));
    for (const product of [...products, ...remoteProducts]) {
      if (!result.some(category => category.name === product.category)) {
        result.push({ name: product.category, label: product.category, image: product.image, note: 'Novidades personalizadas' });
      }
    }
    return result;
  }
  function getProducts(filters = {}) {
    const query = (filters.query || '').trim().toLocaleLowerCase('pt-BR');
    const result = [...products, ...remoteProducts].filter(product =>
      (!filters.category || filters.category === 'Todos' || product.category === filters.category) &&
      (!query || `${product.name} ${product.category} ${product.detail}`.toLocaleLowerCase('pt-BR').includes(query))
    );
    if (filters.sort === 'az') result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (filters.sort === 'za') result.sort((a, b) => b.name.localeCompare(a.name, 'pt-BR'));
    return result.map(product => ({ ...product }));
  }

  function setProducts(items) { remoteProducts = Array.isArray(items) ? items.map(item => ({ ...item })) : []; }
  return Object.freeze({ getCategories, getProducts, setProducts });
})();
