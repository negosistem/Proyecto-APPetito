import { apiClient } from '@/app/shared/services/apiClient';

export interface Product {
    id: number;
    name: string;
    description?: string | null;
    price: number;
    category: string;
    image_url?: string | null;
    video_url?: string | null;
    is_active: boolean;
}

export const menuService = {
    /**
     * Obtiene todos los productos activos
     */
    async getProducts(): Promise<Product[]> {
        return apiClient.get<Product[]>('/api/products');
    },

    /**
     * Crea un nuevo producto
     */
    async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
        return apiClient.post<Product>('/api/products', product);
    },

    /**
     * Actualiza un producto existente
     */
    async updateProduct(id: number, product: Partial<Omit<Product, 'id'>>): Promise<Product> {
        return apiClient.patch<Product>(`/api/products/${id}`, product);
    },

    /**
     * Elimina un producto
     */
    async deleteProduct(id: number): Promise<void> {
        return apiClient.delete(`/api/products/${id}`);
    },

    /**
     * Sube un archivo de imagen o video
     */
    async uploadMedia(file: File, fileType: 'image' | 'video'): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_type', fileType);

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/products/upload-media?file_type=${fileType}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al subir archivo');
        }

        return response.json();
    },

    /**
     * Obtiene las categorías únicas de los productos
     */
    async getCategories(products: Product[]): Promise<string[]> {
        const categories = products.map(p => p.category);
        return Array.from(new Set(categories));
    }
};

