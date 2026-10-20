const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('2.0/controllers/catalog-controller.js', 'utf8').replace(/^import .*;\r?\n/gm, '');
const html = fs.readFileSync('2.0/views/home.html', 'utf8');
const nodes = new Map();
let initialize;
let renders = 0;
const node = () => ({
  addEventListener() {}, append() {}, setAttribute() {}, focus() {},
  classList: { remove() {}, contains() { return false; } }
});
const document = {
  querySelector(selector) {
    if (/^#[\w-]+$/.test(selector)) assert(html.includes(`id="${selector.slice(1)}"`), `Missing element ${selector}`);
    if (!nodes.has(selector)) nodes.set(selector, node());
    return nodes.get(selector);
  },
  querySelectorAll() { return []; },
  createElement: node,
  addEventListener(event, callback) { if (event === 'DOMContentLoaded') initialize = callback; }
};
const query = { select() { return this; }, eq() { return this; }, order() { return Promise.resolve({ data: [] }); } };
vm.runInNewContext(source, {
  document, console, Date, setTimeout, clearTimeout, queueMicrotask,
  model: { getProducts() { return []; }, getCategories() { return []; }, setProducts() {}, setCategories() {} },
  view: { renderCategories() {}, renderProducts() { renders++; } },
  supabase: { from() { return query; }, auth: {
    onAuthStateChange() {},
    async getUser() { return { data: { user: null } }; }
  } }, imageUrl: value => value
});
initialize();
setImmediate(() => {
  assert.equal(renders, 2, 'Products must render initially and after catalog loading');
  assert.equal(nodes.get('#adminWelcome').hidden, true, 'Visitors must not see admin controls');
  console.log('PASS: storefront initialization, DOM references and initial/remote product rendering.');
});

async function checkSession(role, expectedName) {
  const elements = new Map();
  let start;
  const sessionDocument = {
    ...document,
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, node());
      return elements.get(selector);
    },
    addEventListener(event, callback) { if (event === 'DOMContentLoaded') start = callback; }
  };
  vm.runInNewContext(source, {
    document: sessionDocument, console, queueMicrotask,
    model: { getProducts() { return []; }, getCategories() { return []; }, setProducts() {}, setCategories() {} },
    view: { renderCategories() {}, renderProducts() {} },
    supabase: {
      from(table) {
        if (table !== 'profiles') return query;
        return { select() { return this; }, eq() { return this; }, async single() {
          return { data: { role, display_name: 'Maria Silva' } };
        } };
      },
      auth: { onAuthStateChange() {}, async getUser() { return { data: { user: { id: 'test-user' } } }; } }
    }, imageUrl: value => value
  });
  start();
  await new Promise(setImmediate);
  assert.equal(elements.get('#adminWelcome').hidden, !expectedName);
  assert.equal(elements.get('#adminFirstName').textContent, expectedName);
  assert.equal(elements.get('header .header-cta').hidden, Boolean(expectedName), 'Quote button must be hidden for admins only');
}
Promise.all([checkSession('admin', 'Maria'), checkSession('customer', '')])
  .then(() => console.log('PASS: admin first name displayed; customer admin controls hidden.'))
  .catch(error => { console.error(error); process.exitCode = 1; });
