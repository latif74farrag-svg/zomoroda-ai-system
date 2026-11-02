// Collects the legacy business data (lead spreadsheets, outreach history, funnel state, message scripts) for lib/leads and lib/templates.
const fs = require('node:fs');
const path = require('node:path');
const { classifySector } = require('../lib/leads');

const STAGE_MAP = {
    welcome_sent_waiting_for_interest: 'welcomed', catalog_sent_waiting_for_pricing_or_quantity: 'catalog_sent', pricing_sent_waiting_for_quantity: 'prices_sent',
    greeted: 'welcomed', catalog_sent: 'catalog_sent', prices_sent: 'prices_sent', order_inquired: 'order_inquired'
};
const CATEGORY_MAP = { salon: 'salon', hotels: 'hotels', pharmacies: 'pharmacies', hypermarkets: 'hypermarkets', distribution: 'distribution', moms: 'moms' };

function readJson(dir, name) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readSheet(dir, name) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) return [];
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(file);
    return workbook.SheetNames.flatMap(sheet => XLSX.utils.sheet_to_json(workbook.Sheets[sheet]));
}

// One spreadsheet cell may hold several numbers ("(+202) 2269/2/3", "2696-2697"); short suffix fragments are not numbers.
function splitNumbers(cell) {
    const text = String(cell ?? '').trim();
    const egyptLandline = /^\(?\+?202\)?/.test(text);
    const parts = text.replace(/^\(\+\d+\)/, '').split(/[\/\-–،,;\n]+/).map(part => part.replace(/\D/g, '')).filter(digits => digits.length >= 7);
    if (!parts.length) return [text];
    return parts.map(digits => (egyptLandline && digits.length <= 9 ? '202' + digits : digits));
}

const time = value => { const ms = Date.parse(value); return Number.isFinite(ms) && ms > 86400000 ? ms : null; };

function collectLeads(dir) {
    const rows = [];
    const counts = {};
    const add = (source, row) => { rows.push({ ...row, source }); counts[source] = (counts[source] || 0) + 1; };

    for (const [file, fallback] of [['فنادق.xlsx', 'hotels'], ['توريدات.xlsx', 'supplies']]) {
        for (const row of readSheet(dir, file)) {
            const name = row['اسم الجهة / الشركة'] || '';
            const category = row['القطاع / التصنيف'] || '';
            const sector = classifySector(`${name} ${category}`);
            for (const contact of splitNumbers(row['رقم الهاتف'])) add(file, { contact, name, sector: sector === 'unknown' ? fallback : sector, notes: String(row['تفاصيل إضافية'] || category) });
        }
    }
    for (const row of readSheet(dir, 'Salon.xlsx')) for (const contact of splitNumbers(row['رقم التليفون'])) add('Salon.xlsx', { contact, name: row['اسم العميل '] || '', sector: 'salon' });
    for (const row of readSheet(dir, 'ايميلات فنادق.xlsx')) {
        const name = row['اسم المنشأة / الشركة'] || '';
        add('ايميلات فنادق.xlsx', { contact: row['البريد الإلكتروني'], name, sector: 'hotels', notes: row['رقم الهاتف المباشر'] ? `هاتف: ${row['رقم الهاتف المباشر']}` : '' });
    }

    for (const row of readJson(dir, 'contacted_numbers.json') || []) add('contacted_numbers.json', { contact: row.chatId, lastContactAt: time(row.lastSentDate) });
    for (const row of readJson(dir, 'funnel_stages.json') || []) add('funnel_stages.json', { contact: row.chatId, sector: CATEGORY_MAP[row.categoryKey] || 'unknown', stage: STAGE_MAP[row.stage] || 'new', lastContactAt: null });
    for (const [phone, state] of Object.entries(readJson(dir, 'outreach_state.json') || {})) {
        if (/^تجربة/.test(state.name || '')) continue;
        add('outreach_state.json', { contact: phone, name: state.name || '', lastContactAt: time(state.sentAt) });
    }
    for (const [phone, state] of Object.entries(readJson(dir, 'conversation_state.json') || {})) add('conversation_state.json', { contact: phone, stage: STAGE_MAP[state.step] || 'new' });
    return { rows, counts };
}

// The legacy file has PM2 config appended after its exports, which replaces them, so evaluate only the data part.
function loadLegacyMessages(dir) {
    const file = path.join(dir, 'messages_config.js');
    if (!fs.existsSync(file)) return {};
    const source = fs.readFileSync(file, 'utf8');
    const end = source.indexOf('function getRandomScript');
    if (end < 0) throw new Error('messages_config.js format not recognised');
    return new Function(source.slice(0, end) + '; return MESSAGES_CONFIG;')();
}

module.exports = { collectLeads, loadLegacyMessages };
