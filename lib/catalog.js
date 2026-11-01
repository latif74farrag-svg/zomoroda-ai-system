const { fail } = require('./commerce');
function createCatalog(store, categories, ttlMs = 5000) {
    const cache = new Map();
    const pending = new Map();
    let generation = 0;
    async function products(category = 'all') {
        if (typeof category !== 'string' || (category !== 'all' && !Object.hasOwn(categories, category))) fail(400, 'Invalid category');
        const current = cache.get(category);
        if (current && current.expires > Date.now()) return current.products;
        if (pending.has(category)) return pending.get(category);
        const version = generation;
        const request = store.getProducts({ category }).then(result => {
            if (version === generation) cache.set(category, { products: result, expires: Date.now() + ttlMs });
            return result;
        }).finally(() => { if (pending.get(category) === request) pending.delete(category); });
        pending.set(category, request);
        return request;
    }
    return { products, invalidate: () => { generation++; cache.clear(); pending.clear(); } };
}
module.exports = { createCatalog };
