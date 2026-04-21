(function () {
    if (window.ApartmentsShared) return;

    const normalizeImageArray = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) {
            const out = [];
            for (let i = 0; i < value.length; i++) {
                const src = String(value[i] || '').trim();
                if (src) out.push(src);
            }
            return out;
        }
        const src = String(value || '').trim();
        return src ? [src] : [];
    };
    const normalizeVec3 = (value) => {
        if (!Array.isArray(value) || value.length < 3) return null;
        const x = parseFloat(value[0]);
        const y = parseFloat(value[1]);
        const z = parseFloat(value[2]);
        return isFinite(x) && isFinite(y) && isFinite(z) ? [x, y, z] : null;
    };

    const parseData = (json, lang) => {
        const items = Array.isArray(json) ? json : [json];
        const resolvedLang = window.AppLanguage?.normalize?.(lang) ?? 'en';
        const out = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item) continue;

            const pos = item.position;
            if (!Array.isArray(pos) || pos.length < 3) continue;

            const x = parseFloat(pos[0]);
            const y = parseFloat(pos[1]);
            const z = parseFloat(pos[2]);
            if (!isFinite(x) || !isFinite(y) || !isFinite(z)) continue;

            const itemT = item.translations?.[resolvedLang] || item.translations?.['en'] || {};

            const floors = Array.isArray(item.floors) ? item.floors : [];
            const detailsRows = [];

            for (let f = 0; f < floors.length; f++) {
                const floor = floors[f];
                if (!floor) continue;

                const floorNum = parseFloat(floor.floor);
                const floorRaw = String(floor.floor ?? (f + 1));
                const height = parseFloat(floor.height);
                const apts = Array.isArray(floor.apartments) ? floor.apartments : [];

                const apartments = apts.map(aptItem => {
                    const aptT = aptItem.translations?.[resolvedLang] || aptItem.translations?.['en'] || {};
                    const imageList = normalizeImageArray(aptItem.image);
                    const legacyImageList = normalizeImageArray(aptItem.images);
                    const mergedImages = imageList.length ? imageList : legacyImageList;
                    const planList = normalizeImageArray(
                        aptItem.planImage || aptItem.plan_image || aptItem.plan
                    );
                    const visual = String(aptItem.visual || '').trim();
                    const visualPosition = normalizeVec3(aptItem.visual_position ?? aptItem.visualPosition);
                    const visualRotation = normalizeVec3(aptItem.visual_rotation ?? aptItem.visualRotation);
                    return {
                        name: String(aptT.name || '').trim(),
                        area: String(aptItem.area || '').trim(),
                        bedrooms: String(aptItem.bedrooms ?? '').trim(),
                        availability: String(aptT.availability || '').trim(),
                        description: String(aptT.description || '').trim(),
                        imageUrl: mergedImages[0] || '',
                        planImageUrl: planList[0] || mergedImages[0] || '',
                        images: mergedImages.length ? mergedImages : null,
                        gallery: aptItem.gallery || null,
                        interior: aptItem.interior || null,
                        view: aptItem.view || null,
                        street: aptItem.street || null,
                        visual: visual || '',
                        visualPosition,
                        visualRotation,
                        look: Array.isArray(aptItem.look) && aptItem.look.length >= 2 ? aptItem.look : null,
                        camera: aptItem.camera || null
                    };
                });

                const apt0 = apartments[0] || {};
                detailsRows.push({
                    floorRaw,
                    floorNumber: isFinite(floorNum) ? floorNum : NaN,
                    height: isFinite(height) ? height : 0,
                    apartments,
                    name: apt0.name || '',
                    area: apt0.area || '',
                    bedrooms: apt0.bedrooms || '',
                    availability: apt0.availability || '',
                    description: apt0.description || '',
                    imageUrl: apt0.imageUrl || '',
                    planImageUrl: apt0.planImageUrl || apt0.imageUrl || '',
                    images: apt0.images || null,
                    gallery: apt0.gallery || null,
                    interior: apt0.interior || null,
                    view: apt0.view || null,
                    street: apt0.street || null,
                    visual: apt0.visual || '',
                    visualPosition: apt0.visualPosition || null,
                    visualRotation: apt0.visualRotation || null,
                    look: apt0.look || null,
                    camera: apt0.camera || null
                });
            }

            detailsRows.sort((a, b) => {
                const aNum = a.floorNumber;
                const bNum = b.floorNumber;
                if (isFinite(aNum) && isFinite(bNum)) return aNum - bNum;
                if (isFinite(aNum)) return -1;
                if (isFinite(bNum)) return 1;
                return String(a.floorRaw).localeCompare(String(b.floorRaw));
            });

            out.push({
                iconUrl: String(item.icon || '').trim(),
                title: String(itemT.title || '').trim(),
                worldPos: typeof pc !== 'undefined' ? new pc.Vec3(x, y, z) : { x, y, z },
                camera: item.camera || null,
                detailsRows
            });
        }

        return out;
    };

    window.ApartmentsShared = { parseData };
})();
