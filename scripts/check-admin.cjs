const fs = require('node:fs');
const assert = require('node:assert/strict');
const js = fs.readFileSync('2.0/views/admin.js', 'utf8');
const html = fs.readFileSync('2.0/views/admin.html', 'utf8');
const home = fs.readFileSync('2.0/views/home.html', 'utf8');
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]));
for (const [, id] of js.matchAll(/\$\('#([\w-]+)'\)/g)) {
  assert(ids.has(id), `Missing admin element: ${id}`);
}
assert(!js.includes('signUp('));
assert(!js.includes("from('cart_items')"));
assert(!html.includes('id="customerPanel"'));
assert(/<a href="#inicio" class="footer-brand\b/.test(home));
assert(home.includes('aria-label="Acessar administração"'));
assert(home.includes('id="adminWelcome" hidden'));
assert(js.indexOf('await requireAdmin();', js.indexOf('async function showSignedIn')) < js.indexOf('await loadProducts();', js.indexOf('async function showSignedIn')));
console.log('PASS: admin DOM references, removed signup/customer UI, authorization before data loading.');
