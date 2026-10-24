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

export function setSplashProgress(value) {
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');
    if (bar && text) {
        let percent = Math.floor(value * 100);
        if (!isFinite(percent) || isNaN(percent)) percent = 0;
        percent = Math.min(Math.max(percent, 0), 100);
        bar.style.width = percent + '%';
        text.textContent = percent + '%';
    }
}

export function hideSplash() {
    const splash = document.getElementById('application-splash-wrapper');
    if (splash) splash.remove();
}

export async function loadAssets(app, assetList, onComplete, onProgress) {
    let totalBytes = assetList.reduce((sum, a) => sum + (a.size || 0), 0);
    let loadedBytes = 0;

    await Promise.all(assetList.map(({ asset, size }) => {
        return fetchWithProgress(asset.file.url, size, (delta) => {
            loadedBytes += delta;
            onProgress?.(loadedBytes / totalBytes);
        }).then(buffer => {
            const file = new File([buffer], asset.name);
            const fileUrl = URL.createObjectURL(file);

            asset.file.url = fileUrl;
            app.assets.add(asset);
            return new Promise(resolve => {
                app.assets.load(asset);
                asset.ready(resolve);
            });
        });
    }));

    onProgress?.(1);
    onComplete?.();
}

async function fetchWithProgress(url, size, onChunk) {
    const response = await fetch(url);
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        onChunk(value.length);
    }

    const blob = new Blob(chunks);
    return await blob.arrayBuffer();
}
