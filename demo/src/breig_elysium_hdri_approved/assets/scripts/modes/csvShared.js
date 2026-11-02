(function () {
    if (window.CsvShared) return;

    const splitRow = (row, delimiter) => {
        const out = [];
        let current = '';
        let inQuotes = false;
        const source = String(row || '');
        const sep = delimiter || ';';

        for (let i = 0; i < source.length; i++) {
            const ch = source[i];
            if (ch === '"') {
                if (inQuotes && source[i + 1] === '"') {
                    current += '"';
                    i++;
                } else inQuotes = !inQuotes;
                continue;
            }

            if (ch === sep && !inQuotes) {
                out.push(current.trim());
                current = '';
                continue;
            }

            current += ch;
        }

        out.push(current.trim());
        return out;
    };

    const parseRows = (text, options) => {
        const delimiter = options?.delimiter || ';';
        const minColumns = Number.isFinite(options?.minColumns) ? options.minColumns : 0;
        const lines = String(text || '')
            .trim()
            .split(/\r?\n/)
            .filter(Boolean);

        const rows = new Array(lines.length);
        let count = 0;
        for (let i = 0; i < lines.length; i++) {
            const parts = splitRow(lines[i], delimiter);
            if (parts.length < minColumns) continue;
            rows[count++] = parts;
        }
        rows.length = count;
        return rows;
    };

    window.CsvShared = {
        splitRow,
        parseRows
    };
})();
