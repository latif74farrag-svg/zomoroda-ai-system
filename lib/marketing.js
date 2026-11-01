const sectors = {
    pharmacies: { label: 'Pharmacies & agents', products: { ronzawipes: 'Ronza wipes only' } },
    hypermarkets: { label: 'Hypermarkets & wholesalers', products: { ronzawipes: 'Ronza wipes', yonowipes: 'Yono wipes', fragrance: 'Fragrances', kitchenroll: 'Kitchen rolls' } },
    distribution: { label: 'Distribution & warehouses', products: { ronzawipes: 'Ronza wipes', yonowipes: 'Yono wipes', fragrance: 'Fragrances', kitchenroll: 'Kitchen rolls', dryingtowels: 'Drying towels', dishsoap: 'Dish soap' } },
    hotels: { label: 'Hotels & hospitality', products: { privatelabel: 'Private label single tissues', fragrance: 'Fragrances', dryingtowels: 'Drying towels' } },
    supplies: { label: 'Companies & supplies', products: { privatelabel: 'Private label single tissues', fragrance: 'Fragrances', dryingtowels: 'Drying towels' } },
    salon: { label: 'Salons & beauty centers', products: { dryingtowels: 'Drying towels', fragrance: 'Fragrances', ronzawipes: 'Ronza wipes' } },
    moms: { label: 'Moms & direct customers', products: { retailcatalog: 'Retail prices and catalog', affiliate: 'Commission opportunity' } },
    retail: { label: 'Retail customers', products: { retailcatalog: 'Retail prices and catalog', affiliate: 'Commission opportunity' } }
};
const channels = { whatsapp: 'WhatsApp', email: 'Email' };
function draftMessage(sectorId, productType) {
    const sector = sectors[sectorId];
    const product = sector?.products[productType];
    if (!sector || !product) throw Object.assign(new Error('Select a valid sector and product first.'), { status: 400 });
    return `Hello,\n\nZomoroda Cosmetics would like to introduce ${product} to ${sector.label}. Our team can share the approved product details and current terms for your sector.\n\nReply if you would like more information.\n\nZomoroda Cosmetics`;
}
function validateCampaign(input) {
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const message = typeof input.message === 'string' ? input.message.trim() : '';
    const sector = sectors[input.sector];
    if (title.length < 3 || title.length > 120 || !sector || !channels[input.channel] || !Object.hasOwn(sector.products, input.product_type) || message.length < 3 || message.length > 5000) {
        throw Object.assign(new Error('Check the campaign name, sector, channel, product, and message.'), { status: 400 });
    }
    return { title, message, sector: input.sector, channel: input.channel, product_type: input.product_type };
}
module.exports = { sectors, channels, draftMessage, validateCampaign };
