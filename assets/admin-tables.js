// Progressive enhancement for admin data tables: search box, result count and status badges.
// Presentation only: it never edits cell text, so each page's own logic keeps working.
(function () {
    var MIN_ROWS = 6;
    var STATUS_HEADERS = ['الحالة', 'المرحلة', 'status'];
    var GOOD = ['active', 'approved', 'received', 'delivered', 'resolved', 'completed', 'done', 'نشط', 'مفعل', 'معتمد', 'تم', 'مستلم', 'مكتمل', 'متاح', 'نعم'];
    var WARN = ['draft', 'pending', 'proposed', 'running', 'new', 'مسودة', 'بانتظار', 'قيد', 'جديد', 'مقترح'];
    var BAD = ['cancelled', 'canceled', 'rejected', 'dead', 'failed', 'disabled', 'delivery_failed', 'returned', 'معطل', 'ملغي', 'ألغي', 'مرفوض', 'فشل', 'موقوف', 'تعذر', 'مرتجع', 'لا'];

    // Folds Arabic spelling variants and digits so "اسم" finds "إسم" and "٣" finds "3".
    function normalize(value) {
        return String(value == null ? '' : value).toLowerCase()
            .replace(/[ً-ٟـ]/g, '')
            .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
            .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 1632); })
            .replace(/\s+/g, ' ').trim();
    }

    function variant(text) {
        var t = normalize(text);
        if (!t) return '';
        function hit(list) { return list.some(function (word) { var w = normalize(word); return t === w || t.indexOf(w + ' ') === 0; }); }
        if (hit(BAD)) return 'bad';
        if (hit(WARN)) return 'warn';
        if (hit(GOOD)) return 'good';
        return 'neutral';
    }

    if (typeof module !== 'undefined' && module.exports) { module.exports = { normalize: normalize, variant: variant }; return; }

    // Action cells (buttons such as "cancel") are not data, so their labels must not match a search.
    function rowText(row) {
        return Array.prototype.map.call(row.cells, function (cell) { return cell.querySelector('button') ? '' : cell.textContent; }).join(' ');
    }

    function dataRows(table) {
        var body = table.tBodies[0];
        return body ? Array.prototype.filter.call(body.rows, function (row) { return row.cells.length > 1; }) : [];
    }

    function applyBadges(table, statusColumns) {
        dataRows(table).forEach(function (row) {
            statusColumns.forEach(function (index) {
                var cell = row.cells[index];
                if (!cell || cell.querySelector('input,select,button')) return;
                var kind = variant(cell.textContent);
                cell.classList.toggle('zs-badge', Boolean(kind));
                ['good', 'warn', 'bad', 'neutral'].forEach(function (name) { cell.classList.toggle('zs-badge-' + name, kind === name); });
            });
        });
    }

    function enhance(table) {
        if (table.dataset.zsTable || table.hasAttribute('data-no-filter') || !table.tHead || !table.tBodies[0]) return;
        if (table.tBodies[0].querySelector('input,select,textarea')) return; // editable line tables are not data lists
        table.dataset.zsTable = 'pending';
        var statusColumns = [];
        Array.prototype.forEach.call(table.tHead.rows[0].cells, function (th, index) {
            if (STATUS_HEADERS.indexOf(normalize(th.textContent)) !== -1) statusColumns.push(index);
        });
        var bar = null, input = null, count = null;

        function refresh() {
            var rows = dataRows(table);
            applyBadges(table, statusColumns);
            if (rows.length < MIN_ROWS) { if (bar) bar.hidden = true; rows.forEach(function (row) { row.hidden = false; }); return; }
            if (!bar) {
                bar = document.createElement('div'); bar.className = 'zs-tablebar';
                input = document.createElement('input'); input.type = 'text'; input.setAttribute('inputmode', 'search'); input.autocomplete = 'off';
                input.setAttribute('aria-label', 'بحث في الجدول'); input.placeholder = 'ابحث في الجدول…';
                count = document.createElement('span'); count.setAttribute('role', 'status'); count.setAttribute('aria-live', 'polite');
                bar.append(input, count);
                (table.closest('.zs-scroll,.scroll') || table).before(bar);
                input.addEventListener('input', refresh);
            }
            bar.hidden = false;
            var query = normalize(input.value), shown = 0;
            rows.forEach(function (row) {
                var match = !query || normalize(rowText(row)).indexOf(query) !== -1;
                row.hidden = !match; if (match) shown++;
            });
            count.textContent = query ? (shown ? shown + ' من ' + rows.length : 'لا توجد نتائج مطابقة') : rows.length + ' صف';
        }

        var queued = false;
        new MutationObserver(function () { if (queued) return; queued = true; Promise.resolve().then(function () { queued = false; refresh(); }); })
            .observe(table.tBodies[0], { childList: true });
        refresh();
    }

    function scan() { Array.prototype.forEach.call(document.querySelectorAll('table'), enhance); }
    // Tables are usually filled after fetch(), and some pages create them later, so keep watching.
    new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
    scan();
})();
