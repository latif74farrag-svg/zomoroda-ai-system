// One-off: pulls the product photos embedded in the November consumer catalog PDF (JPEG streams) and writes web-sized copies
// for the store products that had no photo. Usage: node scripts/store-images.js "<consumer catalog>.pdf"
const fs = require('node:fs');
const path = require('node:path');
const { NEW_IMAGES } = require('./store-refresh');

function jpegStreams(buffer) {
    const text = buffer.toString('latin1');
    const found = [];
    for (let from = 0; ;) {
        const at = text.indexOf('/DCTDecode', from);
        if (at < 0) return found;
        const s = text.indexOf('stream', at);
        const start = text[s + 6] === '\r' ? s + 8 : s + 7;
        const end = text.indexOf('endstream', start);
        found.push(buffer.subarray(start, end));
        from = end;
    }
}

async function main() {
    const sharp = require('sharp');
    const pdf = process.argv[2];
    if (!pdf) throw new Error('Provide the consumer catalog PDF');
    const images = jpegStreams(fs.readFileSync(pdf));
    const root = path.join(__dirname, '..');
    const mapFile = path.join(__dirname, 'store_product_images.json');
    const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
    for (const [id, index] of Object.entries(NEW_IMAGES)) {
        if (!images[index]) throw new Error(`PDF has no image #${index}`);
        const name = `nov-${id}.jpg`;
        await sharp(images[index]).resize({ width: 800, withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(path.join(root, 'assets', 'store-products', name));
        map[id] = `/assets/store-products/${name}`;
    }
    delete map['off-120-girl'];
    fs.writeFileSync(mapFile, JSON.stringify(map, null, 1) + '\n');
    console.log(JSON.stringify({ written: Object.keys(NEW_IMAGES).length, total: images.length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
