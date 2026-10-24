(function () {
    if (window.UiKeys) return;

    const isActivateKey = (e) => {
        const key = e && e.key;
        return key === 'Enter' || key === ' ' || key === 'Spacebar';
    };

    window.UiKeys = {
        isActivateKey
    };
})();
