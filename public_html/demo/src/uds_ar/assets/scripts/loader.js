export function createSplash() {
    const wrapper = document.createElement('div');
    wrapper.id = 'application-splash-wrapper';

    const splash = document.createElement('div');
    splash.id = 'application-splash';

    const title = document.createElement('div');
    title.textContent = 'Loading Data...';

    const progressBarContainer = document.createElement('div');
    progressBarContainer.id = 'progress-bar-container';

    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    progressBarContainer.appendChild(progressBar);

    const progressText = document.createElement('div');
    progressText.id = 'progress-text';
    progressText.textContent = '0%';

    splash.appendChild(title);
    splash.appendChild(progressBarContainer);
    splash.appendChild(progressText);
    wrapper.appendChild(splash);
    document.body.appendChild(wrapper);
}

export function setSplashProgress(progress) {
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');

    if (!bar && !text) return;

    let percent = progress * 100;
    if (!isFinite(percent) || isNaN(percent)) percent = 0;

    const clamped = Math.max(0, Math.min(100, percent));

    if (bar) {
        bar.style.width = `${clamped}%`;
    }

    if (text) {
        text.textContent = `${Math.round(clamped)}%`;
    }
}

export function hideSplash() {
    const wrapper = document.getElementById('application-splash-wrapper');
    if (!wrapper) return;

    wrapper.parentElement?.removeChild(wrapper);
}

export function loadAssets(app, assetList, onComplete, onProgress) {
    if (!assetList || !assetList.length) {
        onProgress?.(1);
        onComplete?.(null);
        return;
    }

    const assets = assetList.map(({ asset }) => asset);
    const totalSize =
        assetList.reduce((sum, { size }) => sum + (size || 0), 0) ||
        assetList.length;

    for (const info of assetList) {
        info.loadedBytes = 0;
    }

    function recalcProgress() {
        let loaded = 0;
        for (const info of assetList) {
            loaded += info.loadedBytes || 0;
        }

        let progress = totalSize > 0 ? loaded / totalSize : 1;
        if (!isFinite(progress) || isNaN(progress)) progress = 0;

        progress = Math.max(0, Math.min(1, progress));
        onProgress?.(progress);
    }

    const urlToInfo = new Map();

    for (const info of assetList) {
        const asset = info.asset;
        const fileUrl =
            asset.file?.url ||
            (typeof asset.getFileUrl === 'function'
                ? asset.getFileUrl()
                : null) ||
            asset.url ||
            null;

        if (fileUrl) {
            urlToInfo.set(fileUrl, info);
        }
    }

    function findInfoByUrl(url) {
        if (!url) return null;

        const direct = urlToInfo.get(url);
        if (direct) return direct;

        for (const [key, info] of urlToInfo) {
            if (url.includes(key) || key.includes(url)) {
                return info;
            }
        }
        return null;
    }

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
        this._url = url;
        return originalOpen.call(this, method, url, async, user, password);
    };

    XMLHttpRequest.prototype.send = function (body) {
        const xhr = this;
        const info = findInfoByUrl(xhr._url);

        if (info) {
            const size = info.size || 0;

            xhr.addEventListener('progress', (event) => {
                if (!size) return;

                if (event.lengthComputable && event.total > 0) {
                    const ratio = event.loaded / event.total;
                    const newLoaded = Math.min(size, size * ratio);

                    if (newLoaded > (info.loadedBytes || 0)) {
                        info.loadedBytes = newLoaded;
                        recalcProgress();
                    }
                }
            });

            xhr.addEventListener('load', () => {
                if (size && (info.loadedBytes || 0) < size) {
                    info.loadedBytes = size;
                    recalcProgress();
                }
            });

            xhr.addEventListener('error', () => {
                if (size && (info.loadedBytes || 0) < size) {
                    info.loadedBytes = size;
                    recalcProgress();
                }
            });
        }

        return originalSend.call(xhr, body);
    };

    const listLoader = new pc.AssetListLoader(assets, app.assets);

    listLoader.load((err ) => {
        XMLHttpRequest.prototype.open = originalOpen;
        XMLHttpRequest.prototype.send = originalSend;

        for (const info of assetList) {
            if (info.size && !(info.loadedBytes > 0)) {
                info.loadedBytes = info.size;
            }
        }

        recalcProgress();
        onComplete?.(err || null);
    });
}