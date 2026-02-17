export const clearCache = () => {
    // Limpiar datos específicos, NO el token de autenticación
    const keysToRemove = [
        'cached_orders',
        'cached_tables',
        'cached_stats',
        'last_fetch_time'
    ];

    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });
};

export const clearAllExceptAuth = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    localStorage.clear();

    if (token) localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', user);
};
