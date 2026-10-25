var Gallery = pc.createScript('gallery');

Gallery.attributes.add('galleryTextAsset', { type: 'asset', assetType: 'text' });
Gallery.attributes.add('swipeThreshold', { type: 'number', default: 50 });
Gallery.attributes.add('swipeMaxVisualShift', { type: 'number', default: 2000 });
Gallery.attributes.add('thumbScrollPadding', { type: 'number', default: 16 });
Gallery.attributes.add('wheelCooldownMs', { type: 'number', default: 180 });
Gallery.attributes.add('thumbResetDelayMs', { type: 'number', default: 10 });
Gallery.attributes.add('transitionMs', { type: 'number', default: 210 });

Gallery.prototype.initialize = function () {
    this.modeButton = null;
    this.panel = null;
    this.mainImage = null;
    this.thumbs = null;
    this.thumbEls = null;
    this.activeThumb = null;
    this.emptyEl = null;
    this.closeButton = null;
    this.lastFocusEl = null;

    this.urls = null;
    this.index = 0;
    this.inited = false;
    this.isOpen = false;

    this.dragging = false;
    this.pointerId = null;
    this.startX = 0;
    this.deltaX = 0;

    this.sliding = false;
    this.slide = null;

    this.wheelUntil = 0;

    this.openHandler = null;
    this.closeHandler = null;
    this.closeKeyHandler = null;
    this.keyHandler = null;
    this.thumbClickHandler = null;
    this.thumbKeyHandler = null;
    this.wheelHandler = null;
    this.dragStartHandler = null;

    this.swipeEl = null;
    this.ptrDownHandler = null;
    this.ptrMoveHandler = null;
    this.ptrUpHandler = null;
    this.ptrCancelHandler = null;
    this.ptrLeaveHandler = null;
    this.ptrLostCaptureHandler = null;
    this.ptrWindowUpHandler = null;
    this.ptrWindowCancelHandler = null;

    this._onUiReady = () => {
        if (this._trySetup()) this.app.off('ui:ready', this._onUiReady);
    };

    if (!this._trySetup()) this.app.on('ui:ready', this._onUiReady);
};

Gallery.prototype._trySetup = function () {
    const btn = document.querySelector('[data-mode="Gallery"]');
    const panel = document.querySelector('.gallery-panel');
    if (!btn || !panel) return false;
    this._setup(btn, panel);
    return true;
};

Gallery.prototype._readUrls = function () {
    let asset = null;
    if (this.galleryTextAsset) {
        if (this.galleryTextAsset.resource) asset = this.galleryTextAsset;
        else if (typeof this.galleryTextAsset === 'number')
            asset = this.app.assets.get(this.galleryTextAsset);
        else if (this.galleryTextAsset.id != null)
            asset = this.app.assets.get(this.galleryTextAsset.id) || this.galleryTextAsset;
    }
    const text = asset?.resource || '';
    return text
        .trim()
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
};

Gallery.prototype._setEmptyVisible = function (visible) {
    if (!this.emptyEl) return;
    this.emptyEl.classList.toggle('visible', !!visible);
    this.emptyEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
};

Gallery.prototype._emitVisibility = function (hidden) {
    if (this.panel) {
        this.panel.classList.toggle('hidden', !!hidden);
        this.panel.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    }

    this.isOpen = !hidden;
    this.app.fire(hidden ? 'input:unlock' : 'input:lock', 'gallery');
    this.app.fire(hidden ? 'gallery:close' : 'gallery:open');

    if (hidden) {
        if (this.modeButton) {
            this.modeButton.classList.remove('active');
            if (typeof this.modeButton.blur === 'function') this.modeButton.blur();
        }
        this._resetVisual();
        this._setEmptyVisible(false);
        if (this.lastFocusEl && typeof this.lastFocusEl.focus === 'function')
            this.lastFocusEl.focus();
        this.lastFocusEl = null;
    } else {
        if (this.modeButton) this.modeButton.classList.add('active');
        if (this.thumbs) {
            setTimeout(() => {
                if (this.thumbs) this.thumbs.scrollLeft = 0;
            }, this.thumbResetDelayMs | 0);
        }
    }
};

Gallery.prototype._focusPrimary = function () {
    if (!this.isOpen) return;
    if (this.closeButton && typeof this.closeButton.focus === 'function') {
        this.closeButton.focus();
        return;
    }

    const firstThumb = this.thumbEls && this.thumbEls[0];
    if (firstThumb && typeof firstThumb.focus === 'function') firstThumb.focus();
};

Gallery.prototype._setActive = function (i) {
    const next = this.thumbEls && this.thumbEls[i];
    if (!next) return;

    if (this.activeThumb && this.activeThumb !== next) this.activeThumb.classList.remove('active');
    next.classList.add('active');
    this.activeThumb = next;
};

Gallery.prototype._ensureActiveVisible = function () {
    const wrap = this.thumbs;
    const thumb = this.activeThumb;
    if (!wrap || !thumb) return;

    const pad = this.thumbScrollPadding | 0;
    const wr = wrap.getBoundingClientRect();
    const tr = thumb.getBoundingClientRect();

    const left = tr.left - wr.left - pad;
    const right = tr.right - wr.right + pad;

    if (left < 0) wrap.scrollTo({ left: wrap.scrollLeft + left, behavior: 'smooth' });
    else if (right > 0) wrap.scrollTo({ left: wrap.scrollLeft + right, behavior: 'smooth' });
};

Gallery.prototype._setIndex = function (i) {
    const urls = this.urls;
    if (!urls || !urls.length) return;

    if (!this.sliding) this._resetVisual();

    if (i < 0) i = urls.length - 1;
    else if (i >= urls.length) i = 0;

    this.index = i;
    if (this.mainImage) {
        this.mainImage.src = urls[i];
        this.mainImage.alt = `Gallery image ${i + 1}`;
    }

    this._setActive(i);
    this._ensureActiveVisible();
};

Gallery.prototype._setup = function (btn, panel) {
    this.modeButton = btn;
    this.panel = panel;
    this.emptyEl = panel.querySelector('.gallery-empty');

    const closeBtn = panel.querySelector('.gallery-close');
    if (closeBtn) {
        this.closeButton = closeBtn;
        this.closeHandler = () => this._emitVisibility(true);
        closeBtn.addEventListener('click', this.closeHandler);
        closeBtn.addEventListener('touchstart', this.closeHandler, { passive: true });
        closeBtn.addEventListener('pointerdown', this.closeHandler, { passive: true });

        this.closeKeyHandler = (e) => {
            if (!this.isOpen) return;
            if (!window.UiKeys?.isActivateKey?.(e)) return;
            e.preventDefault();
            this._emitVisibility(true);
        };
        closeBtn.addEventListener('keydown', this.closeKeyHandler);
    }

    this.openHandler = () => {
        this.lastFocusEl = document.activeElement;
        if (!this.inited) {
            const urls = this._readUrls();
            if (!urls.length) {
                console.warn('Gallery data is empty or missing.');
                this._setEmptyVisible(true);
                this._emitVisibility(false);
                this._focusPrimary();
                return;
            }

            this.inited = true;
            this.urls = urls;

            this.mainImage = panel.querySelector('.gallery-main-image');
            this.thumbs = panel.querySelector('.gallery-thumbnails');

            if (this.thumbs) {
                this.thumbs.replaceChildren();
                this.thumbEls = new Array(urls.length);

                this.thumbClickHandler = (e) => {
                    if (!this.isOpen) return;

                    const img =
                        e.target && e.target.closest ? e.target.closest('img.thumbnail') : null;
                    if (!img) return;

                    if (this.dragging || this.sliding) this._resetVisual();
                    this._setIndex(img.dataset.index | 0);
                };

                this.thumbs.addEventListener('click', this.thumbClickHandler);

                this.thumbKeyHandler = (e) => {
                    if (!this.isOpen) return;
                    if (!window.UiKeys?.isActivateKey?.(e)) return;

                    const img =
                        e.target && e.target.closest ? e.target.closest('img.thumbnail') : null;
                    if (!img) return;

                    e.preventDefault();
                    if (this.dragging || this.sliding) this._resetVisual();
                    this._setIndex(img.dataset.index | 0);
                };

                this.thumbs.addEventListener('keydown', this.thumbKeyHandler);

                for (let i = 0; i < urls.length; i++) {
                    const img = document.createElement('img');
                    img.src = urls[i];
                    img.dataset.index = i;
                    img.loading = 'lazy';
                    img.decoding = 'async';
                    img.className = 'thumbnail';
                    img.tabIndex = 0;
                    img.setAttribute('role', 'button');
                    img.setAttribute('aria-label', `Thumbnail ${i + 1}`);
                    this.thumbs.appendChild(img);
                    this.thumbEls[i] = img;
                }
            }

            this.index = 0;
            if (this.mainImage) {
                this.mainImage.src = urls[0];
                this.mainImage.alt = 'Gallery image 1';
            }

            this._setActive(0);
            this._ensureActiveVisible();

            this._bindSwipe();
            this._bindWheel();
        } else {
            this._setActive(this.index);
            this._ensureActiveVisible();
        }

        this._setEmptyVisible(false);
        this._emitVisibility(false);
        this._focusPrimary();
    };

    btn.addEventListener('click', this.openHandler);

    this.keyHandler = (e) => {
        if (!this.isOpen) return;
        if (e.key === 'Escape') {
            this._emitVisibility(true);
            return;
        }

        if (!this.urls || !this.urls.length) return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const step = e.key === 'ArrowLeft' ? -1 : 1;
            this.slide ? this.slide(step) : this._setIndex(this.index + step);
        }
    };
    document.addEventListener('keydown', this.keyHandler);

    this._emitVisibility(true);
};

Gallery.prototype._bindWheel = function () {
    const panel = this.panel;
    if (!panel) return;

    const el = panel.querySelector('.gallery-content');
    if (!el) return;

    this.wheelHandler = (e) => {
        if (!this.isOpen) return;

        const now = performance.now();
        if (now < this.wheelUntil) return;

        const dy = e.deltaY || 0;
        if (!dy) return;

        e.preventDefault();

        const step = dy > 0 ? 1 : -1;
        this.slide ? this.slide(step) : this._setIndex(this.index + step);
        this.wheelUntil = now + (this.wheelCooldownMs | 0);
    };

    el.addEventListener('wheel', this.wheelHandler, { passive: false });
};

Gallery.prototype._bindSwipe = function () {
    const panel = this.panel;
    const img = this.mainImage;
    if (!panel || !img) return;

    const el = panel.querySelector('.gallery-content');
    if (!el) return;

    this.swipeEl = el;

    const TRANSITION_MS = this.transitionMs | 0 || 210;
    const TRANSITION_STYLE = 'transform ' + TRANSITION_MS + 'ms ease';

    this.dragStartHandler = (e) => e.preventDefault();
    img.addEventListener('dragstart', this.dragStartHandler);

    const setX = (x, animated) => {
        img.style.transition = animated ? TRANSITION_STYLE : 'none';
        img.style.transform = 'translateX(' + x + 'px)';
    };

    const clamp = (x) => {
        const m = this.swipeMaxVisualShift;
        return x < -m ? -m : x > m ? m : x;
    };

    const release = () => {
        if (this.pointerId === null) return;
        try {
            el.releasePointerCapture(this.pointerId);
        } catch {}
        this.pointerId = null;
    };

    this.slide = (step) => {
        if (this.sliding || !this.isOpen) return;
        this.sliding = true;

        const w = el.clientWidth || 1;
        const oldOffset = -step * w;
        const newStart = step * w;

        setX(oldOffset, true);

        setTimeout(() => {
            img.style.transition = 'none';
            img.style.transform = 'translateX(' + newStart + 'px)';

            this._setIndex(this.index + step);

            requestAnimationFrame(() => {
                setX(0, true);
                setTimeout(() => {
                    img.style.transition = 'none';
                    this.sliding = false;
                }, TRANSITION_MS);
            });
        }, TRANSITION_MS);
    };

    this.ptrDownHandler = (e) => {
        if (!this.isOpen) return;
        if (this.sliding) return;
        if (e.button !== undefined && e.button !== 0) return;

        e.preventDefault();

        this.pointerId = e.pointerId;
        try {
            el.setPointerCapture(this.pointerId);
        } catch {}

        this.dragging = true;
        this.startX = e.clientX;
        this.deltaX = 0;

        img.style.transition = 'none';
    };

    this.ptrMoveHandler = (e) => {
        if (!this.dragging) return;
        if (this.pointerId !== null && e.pointerId !== this.pointerId) return;

        this.deltaX = e.clientX - this.startX;
        setX(clamp(this.deltaX), false);
    };

    const end = (e, cancelled) => {
        if (!this.dragging) return;
        if (this.pointerId !== null && e && e.pointerId !== this.pointerId) return;

        this.dragging = false;
        release();

        const dx = this.deltaX;
        this.deltaX = 0;

        if (!cancelled && Math.abs(dx) >= this.swipeThreshold) this.slide(dx < 0 ? 1 : -1);
        else {
            setX(0, true);
            setTimeout(() => {
                img.style.transition = 'none';
            }, TRANSITION_MS);
        }
    };

    this.ptrUpHandler = (e) => end(e, false);
    this.ptrCancelHandler = (e) => end(e, true);
    this.ptrLeaveHandler = (e) => end(e, true);
    this.ptrLostCaptureHandler = (e) => end(e, true);
    this.ptrWindowUpHandler = (e) => end(e, false);
    this.ptrWindowCancelHandler = (e) => end(e, true);

    el.addEventListener('pointerdown', this.ptrDownHandler);
    el.addEventListener('pointermove', this.ptrMoveHandler);
    el.addEventListener('pointerup', this.ptrUpHandler);
    el.addEventListener('pointercancel', this.ptrCancelHandler);
    el.addEventListener('pointerleave', this.ptrLeaveHandler);
    el.addEventListener('lostpointercapture', this.ptrLostCaptureHandler);
    window.addEventListener('pointerup', this.ptrWindowUpHandler);
    window.addEventListener('pointercancel', this.ptrWindowCancelHandler);
};

Gallery.prototype._resetVisual = function () {
    const img = this.mainImage;
    if (!img) return;

    this.dragging = false;
    this.pointerId = null;
    this.deltaX = 0;
    this.sliding = false;

    img.style.transition = 'none';
    img.style.transform = 'translateX(0px)';
};

Gallery.prototype.onDestroy = function () {
    if (this._onUiReady) this.app.off('ui:ready', this._onUiReady);

    if (this.modeButton && this.openHandler)
        this.modeButton.removeEventListener('click', this.openHandler);
    if (this.keyHandler) document.removeEventListener('keydown', this.keyHandler);

    if (this.panel && this.closeHandler) {
        const closeBtn = this.panel.querySelector('.gallery-close');
        closeBtn && closeBtn.removeEventListener('click', this.closeHandler);
        closeBtn && closeBtn.removeEventListener('touchstart', this.closeHandler);
        closeBtn && closeBtn.removeEventListener('pointerdown', this.closeHandler);
        closeBtn &&
            this.closeKeyHandler &&
            closeBtn.removeEventListener('keydown', this.closeKeyHandler);
    }

    if (this.thumbs) {
        this.thumbClickHandler && this.thumbs.removeEventListener('click', this.thumbClickHandler);
        this.thumbKeyHandler && this.thumbs.removeEventListener('keydown', this.thumbKeyHandler);
    }

    if (this.panel && this.wheelHandler) {
        const el = this.panel.querySelector('.gallery-content');
        el && el.removeEventListener('wheel', this.wheelHandler);
    }

    if (this.mainImage && this.dragStartHandler)
        this.mainImage.removeEventListener('dragstart', this.dragStartHandler);

    if (this.swipeEl) {
        this.ptrDownHandler && this.swipeEl.removeEventListener('pointerdown', this.ptrDownHandler);
        this.ptrMoveHandler && this.swipeEl.removeEventListener('pointermove', this.ptrMoveHandler);
        this.ptrUpHandler && this.swipeEl.removeEventListener('pointerup', this.ptrUpHandler);
        this.ptrCancelHandler &&
            this.swipeEl.removeEventListener('pointercancel', this.ptrCancelHandler);
        this.ptrLeaveHandler &&
            this.swipeEl.removeEventListener('pointerleave', this.ptrLeaveHandler);
        this.ptrLostCaptureHandler &&
            this.swipeEl.removeEventListener('lostpointercapture', this.ptrLostCaptureHandler);
    }
    if (this.ptrWindowUpHandler)
        window.removeEventListener('pointerup', this.ptrWindowUpHandler);
    if (this.ptrWindowCancelHandler)
        window.removeEventListener('pointercancel', this.ptrWindowCancelHandler);

    this.modeButton = null;
    this.panel = null;
    this.mainImage = null;
    this.thumbs = null;
    this.thumbEls = null;
    this.activeThumb = null;
    this.emptyEl = null;
    this.closeButton = null;
    this.lastFocusEl = null;

    this.openHandler = null;
    this.closeHandler = null;
    this.closeKeyHandler = null;
    this.keyHandler = null;
    this.thumbClickHandler = null;
    this.thumbKeyHandler = null;
    this.wheelHandler = null;
    this.dragStartHandler = null;

    this.swipeEl = null;
    this.ptrDownHandler = null;
    this.ptrMoveHandler = null;
    this.ptrUpHandler = null;
    this.ptrCancelHandler = null;
    this.ptrLeaveHandler = null;
    this.ptrLostCaptureHandler = null;
    this.ptrWindowUpHandler = null;
    this.ptrWindowCancelHandler = null;

    this.urls = null;
    this.slide = null;
};
