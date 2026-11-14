const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalize, variant } = require('../assets/admin-tables');

test('search normalization folds Arabic spelling variants and digits', () => {
    assert.equal(normalize('  إسم   المُنتَج '), normalize('اسم المنتج'));
    assert.equal(normalize('مدرسة'), normalize('مدرسه'));
    assert.equal(normalize('طلب ٣٠'), 'طلب 30');
    assert.equal(normalize(null), '');
});

test('status badges classify known states and leave unknown ones neutral', () => {
    assert.equal(variant('approved'), 'good');
    assert.equal(variant('نشط'), 'good');
    assert.equal(variant('draft'), 'warn');
    assert.equal(variant('قيد المراجعة'), 'warn');
    assert.equal(variant('cancelled'), 'bad');
    assert.equal(variant('ملغي'), 'bad');
    assert.equal(variant('تعذر التسليم'), 'bad');
    assert.equal(variant('مرتجع'), 'bad');
    assert.equal(variant('تم التأكيد'), 'good');
    assert.equal(variant('something else'), 'neutral');
    assert.equal(variant('لاحقاً'), 'neutral', 'a short word must not match as a prefix of another word');
    assert.equal(variant(''), '');
});
