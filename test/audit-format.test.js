const test = require('node:test');
const assert = require('node:assert/strict');
const { formatEntry } = require('../lib/audit-format');

const names = new Map([['staff-1', 'أحمد']]);
const row = (action, resource, details, actor = 'staff-1') => ({ id: 1, actor, action, resource, details: JSON.stringify(details), created_at: 1 });

test('agent pause/resume reads as a sentence with the staff name, not a UUID or JSON', () => {
    assert.equal(formatEntry(row('agent.control', 'global', { paused: true }), names).text, 'أحمد أوقف جميع الوكلاء');
    assert.equal(formatEntry(row('agent.control', 'marketing', { paused: false }), names).text, 'أحمد شغّل وكيل التسويق');
});

test('catalog save mentions an image change', () => {
    const entry = formatEntry(row('catalog.saved', 'p1', { price_minor: 10200, active: true, image_changed: true }), names);
    assert.match(entry.text, /غيّر صورته/);
    assert.match(entry.text, /102/);
});

test('whatsapp agent entries are categorised and unknown actions never throw', () => {
    const sent = formatEntry(row('agent.whatsapp.sent', 'x', { to: '••••1234', count: 2 }, 'agent:whatsapp'), names);
    assert.equal(sent.category, 'whatsapp');
    assert.match(sent.text, /وكيل واتساب/);
    const unknown = formatEntry({ id: 2, actor: 'staff-1', action: 'something.new', resource: 'r', details: 'not json', created_at: 1 }, names);
    assert.match(unknown.text, /something\.new/);
});
