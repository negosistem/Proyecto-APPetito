/**
 * LoadingSpinner - Componente de carga genérico
 */

export const LoadingSpinner = ({ text = 'Cargando...' }: { text?: string }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-600 text-sm">{text}</p>
        </div>
    );
};
