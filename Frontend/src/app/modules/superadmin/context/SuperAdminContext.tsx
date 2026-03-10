/**
 * SuperAdminContext
 * Permite que el botón del layout abra el modal de creación de restaurante,
 * y que la CompaniesPage recargue al hacerse un create exitoso.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SuperAdminContextType {
    showCreateRestaurant: boolean;
    openCreateRestaurant: () => void;
    closeCreateRestaurant: () => void;
    refreshCompanies: () => void;          // llamado desde el layout tras éxito
    onCompaniesRefresh: (() => void) | null; // registrado por CompaniesPage
    registerRefreshFn: (fn: () => void) => void;
}

const SuperAdminContext = createContext<SuperAdminContextType>({
    showCreateRestaurant: false,
    openCreateRestaurant: () => {},
    closeCreateRestaurant: () => {},
    refreshCompanies: () => {},
    onCompaniesRefresh: null,
    registerRefreshFn: () => {},
});

export const useSuperAdmin = () => useContext(SuperAdminContext);

export const SuperAdminProvider = ({ children }: { children: ReactNode }) => {
    const [showCreateRestaurant, setShowCreateRestaurant] = useState(false);
    const [onCompaniesRefresh, setOnCompaniesRefresh] = useState<(() => void) | null>(null);

    const openCreateRestaurant = useCallback(() => setShowCreateRestaurant(true), []);
    const closeCreateRestaurant = useCallback(() => setShowCreateRestaurant(false), []);
    const refreshCompanies = useCallback(() => onCompaniesRefresh?.(), [onCompaniesRefresh]);
    const registerRefreshFn = useCallback((fn: () => void) => setOnCompaniesRefresh(() => fn), []);

    return (
        <SuperAdminContext.Provider value={{
            showCreateRestaurant,
            openCreateRestaurant,
            closeCreateRestaurant,
            refreshCompanies,
            onCompaniesRefresh,
            registerRefreshFn,
        }}>
            {children}
        </SuperAdminContext.Provider>
    );
};
