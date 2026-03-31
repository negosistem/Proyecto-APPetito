import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authService, User } from '../services/authService';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    register: (restaurantName: string, ownerName: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    isSuperAdmin: () => boolean; // ← Helper para detectar super admin
    updateUser: (userData: Partial<User>) => void; // ← NUEVO: Permite actualizar datos del usuario en caliente
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const token = localStorage.getItem('access_token');

                if (token) {
                    // Verificar token y obtener datos frescos
                    const userData = await authService.me();

                    // Normalizar rol
                    let roleName = 'user';
                    if (userData.role) {
                        if (typeof userData.role === 'string') {
                            roleName = userData.role;
                        } else if (typeof userData.role === 'object' && (userData.role as any).name) {
                            roleName = (userData.role as any).name;
                        }
                    }

                    const user: User = { ...userData, role: roleName };
                    setUser(user);
                    localStorage.setItem('user', JSON.stringify(user));
                }
            } catch (err) {
                console.error('Error al inicializar auth:', err);
                // Si el token no es válido o expiro, limpiar sesión
                authService.logout();
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            // 1. Login para obtener token
            await authService.login(email, password);

            // 2. Obtener datos reales del usuario desde /auth/me
            const userData = await authService.me();

            // 3. Normalizar datos (por si el backend envía role como objeto o string)
            let roleName = 'user';
            if (userData.role) {
                if (typeof userData.role === 'string') {
                    roleName = userData.role;
                } else if (typeof userData.role === 'object' && (userData.role as any).name) {
                    roleName = (userData.role as any).name;
                }
            }

            const loggedUser: User = {
                ...userData,
                role: roleName
            };

            setUser(loggedUser);
            localStorage.setItem('user', JSON.stringify(loggedUser));
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al iniciar sesión');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (restaurantName: string, ownerName: string, email: string, password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await authService.register({
                restaurant_name: restaurantName,
                owner_name: ownerName,
                email,
                password,
            });

            await login(email, password);
        } catch (err: any) {
            setError(err.message || 'Error al crear la cuenta');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const isSuperAdmin = () => {
        return user?.role === 'super_admin' && user?.id_empresa === null;
    };

    const updateUser = (userData: Partial<User>) => {
        if (user) {
            const updatedUser = { ...user, ...userData };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            register,
            logout,
            isAuthenticated: !!user,
            isLoading,
            error,
            isSuperAdmin,
            updateUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};
