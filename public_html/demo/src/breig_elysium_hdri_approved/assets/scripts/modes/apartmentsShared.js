(function () {
    if (window.ApartmentsShared) return;

    const parseMainCsv = (csvText, minColumns) => {
        const csv = window.CsvShared;
        const rows = csv?.parseRows
            ? csv.parseRows(csvText, { delimiter: ';', minColumns })
            : [];

        const out = [];
        for (let i = 0; i < rows.length; i++) {
            const parts = rows[i];
            if (!parts || parts.length < minColumns) continue;

            const x = parseFloat(parts[3]);
            const y = parseFloat(parts[4]);
            const z = parseFloat(parts[5]);
            if (!isFinite(x) || !isFinite(y) || !isFinite(z)) continue;

            out.push({
                iconUrl: String(parts[0] || '').trim(),
                title: String(parts[1] || '').trim(),
                detailsCsvUrl: String(parts[2] || '').trim(),
                worldPos: typeof pc !== 'undefined' ? new pc.Vec3(x, y, z) : { x, y, z }
            });
        }
        return out;
    };

    const parseDetailsCsv = (csvText, minColumns) => {
        const csv = window.CsvShared;
        const rows = csv?.parseRows
            ? csv.parseRows(csvText, { delimiter: ';', minColumns })
            : [];

        const out = [];
        for (let i = 0; i < rows.length; i++) {
            const parts = rows[i];
            if (!parts || parts.length < minColumns) continue;

            const floorRaw = String(parts[0] || '').trim();
            const floorNumber = parseFloat(floorRaw);
            out.push({
                floorRaw,
                floorNumber: isFinite(floorNumber) ? floorNumber : NaN,
                name: String(parts[1] || '').trim(),
                area: String(parts[2] || '').trim(),
                bedrooms: String(parts[3] || '').trim(),
                availability: String(parts[4] || '').trim(),
                description: String(parts[5] || '').trim(),
                imageUrl: String(parts[6] || '').trim()
            });
        }

        out.sort((a, b) => {
            const aNum = a.floorNumber;
            const bNum = b.floorNumber;
            if (isFinite(aNum) && isFinite(bNum)) return aNum - bNum;
            if (isFinite(aNum)) return -1;
            if (isFinite(bNum)) return 1;
            return String(a.floorRaw).localeCompare(String(b.floorRaw));
        });

        return out;
    };

    window.ApartmentsShared = {
        parseMainCsv,
        parseDetailsCsv
    };
})();
