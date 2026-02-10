export function createSplash() {
    const wrapper = document.createElement('div');
    wrapper.id = 'application-splash-wrapper';

    const splash = document.createElement('div');
    splash.id = 'application-splash';

    const title = document.createElement('div');
    title.textContent = 'Loading Data...';

    const barContainer = document.createElement('div');
    barContainer.id = 'progress-bar-container';

    const bar = document.createElement('div');
    bar.id = 'progress-bar';
    barContainer.appendChild(bar);

    const text = document.createElement('div');
    text.id = 'progress-text';
    text.textContent = '0%';

    splash.append(title, barContainer, text);
    wrapper.appendChild(splash);
    document.body.appendChild(wrapper);
}

export function setSplashProgress(progress01) {
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');
    if (!bar && !text) return;

    let percent = progress01 * 100;
    if (!isFinite(percent)) percent = 0;

    const clamped = Math.max(0, Math.min(100, percent));
    if (bar) bar.style.width = `${clamped}%`;
    if (text) text.textContent = `${Math.round(clamped)}%`;
}

export function hideSplash() {
    const wrapper = document.getElementById('application-splash-wrapper');
    wrapper?.remove();
}

function createAssetResolver(assetInfos) {
    const map = new Map();
    const keys = [];

    for (const info of assetInfos) {
        const asset = info.asset;
        const url = asset?.file?.url || asset?.getFileUrl?.() || asset?.url || null;

        if (!url) continue;

        const clean = String(url).split('?')[0];
        const short = clean.slice(clean.lastIndexOf('/') + 1);

        for (const key of [clean, short]) {
            if (key && !map.has(key)) {
                map.set(key, info);
                keys.push(key);
            }
        }
    }

    return (url) => {
        if (!url) return null;

        const str = typeof url === 'string' ? url : url.url || String(url);
        const clean = str.split('?')[0];
        const short = clean.slice(clean.lastIndexOf('/') + 1);

        if (map.has(clean)) return map.get(clean);
        if (map.has(short)) return map.get(short);

        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (clean.includes(k)) return map.get(k);
        }
        return null;
    };
}

function patchNetworkProgress(resolveAsset, onBytesLoaded) {
    if (XMLHttpRequest.prototype._pcProgressPatched) return () => {};

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const originalFetch = window.fetch?.bind(window);

    XMLHttpRequest.prototype._pcProgressPatched = true;

    XMLHttpRequest.prototype.open = function (_, url, ...rest) {
        this._pcUrl = url;
        return originalOpen.call(this, _, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (body) {
        const info = resolveAsset(this._pcUrl);
        if (info?.size) {
            const finalize = () => onBytesLoaded(info, info.size);

            this.addEventListener('progress', (e) => {
                if (e?.loaded != null) onBytesLoaded(info, Math.min(info.size, e.loaded));
            });

            this.addEventListener('load', finalize);
            this.addEventListener('error', finalize);
            this.addEventListener('abort', finalize);
        }
        return originalSend.call(this, body);
    };

    if (originalFetch) {
        window.fetch = (input, init) => {
            const url = typeof input === 'string' ? input : input?.url;
            const info = resolveAsset(url);
            if (!info?.size) return originalFetch(input, init);

            let loaded = info.loadedBytes || 0;

            return originalFetch(input, init)
                .then((res) => {
                    const reader = res.body?.getReader?.();
                    if (!reader) {
                        onBytesLoaded(info, info.size);
                        return res;
                    }

                    const stream = new ReadableStream({
                        start(controller) {
                            const read = () => {
                                reader
                                    .read()
                                    .then(({ done, value }) => {
                                        if (done) {
                                            onBytesLoaded(info, info.size);
                                            controller.close();
                                            return;
                                        }
                                        loaded += value.byteLength;
                                        onBytesLoaded(info, Math.min(info.size, loaded));
                                        controller.enqueue(value);
                                        read();
                                    })
                                    .catch(() => {
                                        onBytesLoaded(info, info.size);
                                        controller.close();
                                    });
                            };
                            read();
                        }
                    });

                    return new Response(stream, res);
                })
                .catch((err) => {
                    onBytesLoaded(info, info.size);
                    throw err;
                });
        };
    }

    return () => {
        XMLHttpRequest.prototype.open = originalOpen;
        XMLHttpRequest.prototype.send = originalSend;
        if (originalFetch) window.fetch = originalFetch;
        XMLHttpRequest.prototype._pcProgressPatched = false;
    };
}

export function loadAssets(app, assetInfos, onComplete, onProgress) {
    if (!assetInfos?.length) {
        onProgress?.(1);
        onComplete?.(null);
        return;
    }

    const assets = assetInfos.map((i) => i.asset);
    const totalBytes = assetInfos.reduce((s, i) => s + (i.size || 0), 0) || assetInfos.length;

    for (const info of assetInfos) info.loadedBytes = 0;

    let rafId = 0;
    let scheduled = false;

    const emitProgress = () => {
        let loaded = 0;
        for (const i of assetInfos) loaded += i.loadedBytes || 0;

        let p = totalBytes > 0 ? loaded / totalBytes : 1;
        if (!isFinite(p)) p = 0;

        onProgress?.(Math.max(0, Math.min(1, p)));
    };

    const scheduleProgress = () => {
        if (scheduled) return;
        scheduled = true;

        rafId = requestAnimationFrame(() => {
            scheduled = false;
            emitProgress();
        });
    };

    const onBytesLoaded = (info, absoluteBytes) => {
        if (!info?.size) return;
        const clamped = Math.min(info.size, absoluteBytes || 0);
        if (clamped > (info.loadedBytes || 0)) {
            info.loadedBytes = clamped;
            scheduleProgress();
        }
    };

    const resolveAsset = createAssetResolver(assetInfos);
    const restoreNetwork = patchNetworkProgress(resolveAsset, onBytesLoaded);

    const loader = new pc.AssetListLoader(assets, app.assets);
    loader.load((err) => {
        restoreNetwork();

        for (const info of assetInfos) {
            if (info.size && !(info.loadedBytes > 0)) info.loadedBytes = info.size;
        }

        if (rafId) cancelAnimationFrame(rafId);
        emitProgress();

        onComplete?.(err || null);
    });
}
