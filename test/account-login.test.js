const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { getStoreAccountHtml } = require('../views/storeAccount');

function page(identifier, rejectLogin = false) {
    const html = getStoreAccountHtml();
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, { value: '', hidden: false, textContent: '', addEventListener(name, callback) { this[name] = callback; }, replaceChildren() {} });
        return elements.get(id);
    };
    element('loginPhone').value = identifier;
    element('loginPassword').value = 'example-password';
    const calls = [];
    const window = { location: { href: '' } };
    vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], {
        document: { getElementById: element, querySelector: element }, window,
        fetch: async (url, options) => {
            calls.push({ url, payload: options.body && JSON.parse(options.body) });
            const login = url.endsWith('/login');
            return { ok: !(login && rejectLogin), json: async () => login && rejectLogin
                ? { success: false, error: 'Invalid credentials' }
                : { success: true, authenticated: false, customer: { name: 'Customer', phone: identifier }, orders: [] } };
        }
    });
    return { html, element, calls, window };
}

test('account login accepts staff email and routes it through staff authentication', async () => {
    const p = page(' admin@zomoroda.com ');
    const input = p.html.match(/<input id="loginPhone"[^>]*>/)[0];
    const pattern = input.match(/pattern="([^"]*)"/);
    assert.ok(!pattern || new RegExp('^(?:' + pattern[1] + ')$').test('admin@zomoroda.com'), 'email must pass form validation');
    await p.element('loginForm').submit({ preventDefault() {} });
    assert.deepEqual(p.calls.find(call => call.url.endsWith('/login')), {
        url: '/api/store/admin/login', payload: { email: 'admin@zomoroda.com', password: 'example-password' }
    });
    assert.equal(p.window.location.href, '/store/admin');
});

test('phone login still loads the customer account and orders', async () => {
    const p = page('01012345678');
    await p.element('loginForm').submit({ preventDefault() {} });
    assert.equal(p.calls.find(call => call.url.endsWith('/login')).url, '/api/store/customer/login');
    assert.equal(p.element('customerName').textContent, 'Customer');
    assert.ok(p.calls.some(call => call.url === '/api/store/customer/orders'));
    assert.equal(p.window.location.href, '');
});

test('failed staff login shows the error without redirecting or loading customer orders', async () => {
    const p = page('admin@zomoroda.com', true);
    await p.element('loginForm').submit({ preventDefault() {} });
    assert.equal(p.element('notice').textContent, 'Invalid credentials');
    assert.equal(p.window.location.href, '');
    assert.equal(p.calls.some(call => call.url === '/api/store/customer/orders'), false);
    assert.equal(p.element('#loginForm button[type="submit"]').disabled, false);
});
