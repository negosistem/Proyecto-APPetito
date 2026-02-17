/**
 * StatusBadge - Component para mostrar badges de estado
 * Muestra el estado de una empresa con colores diferenciados
 */

import { CheckCircle, Clock, XCircle, Ban } from 'lucide-react';

interface StatusBadgeProps {
    status: 'active' | 'trial' | 'suspended' | 'cancelled';
    size?: 'sm' | 'md';
}

export const StatusBadge = ({ status, size = 'md' }: StatusBadgeProps) => {
    const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

    const configs = {
        active: {
            bg: 'bg-green-100',
            text: 'text-green-700',
            icon: CheckCircle,
            label: 'Activa',
        },
        trial: {
            bg: 'bg-amber-100',
            text: 'text-amber-700',
            icon: Clock,
            label: 'Trial',
        },
        suspended: {
            bg: 'bg-red-100',
            text: 'text-red-700',
            icon: XCircle,
            label: 'Suspendida',
        },
        cancelled: {
            bg: 'bg-gray-100',
            text: 'text-gray-700',
            icon: Ban,
            label: 'Cancelada',
        },
    };

    const config = configs[status];
    const Icon = config.icon;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}
        >
            <Icon className="w-3.5 h-3.5" />
            {config.label}
        </span>
    );
};
