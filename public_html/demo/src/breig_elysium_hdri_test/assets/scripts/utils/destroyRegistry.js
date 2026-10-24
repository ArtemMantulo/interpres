export function createDestroyRegistry(app) {
    const destroyCallbacks = [];
    let destroyed = false;

    const safeCall = (fn) => {
        try {
            fn();
        } catch (err) {
            console.warn('Destroy callback error', err);
        }
    };

    const onAppDestroy = (fn) => {
        if (typeof fn !== 'function') return;
        destroyed ? safeCall(fn) : destroyCallbacks.push(fn);
    };

    app &&
        app.once &&
        app.once('destroy', () => {
            destroyed = true;
            for (let i = 0; i < destroyCallbacks.length; i++) safeCall(destroyCallbacks[i]);
            destroyCallbacks.length = 0;
        });

    return { onAppDestroy };
}
