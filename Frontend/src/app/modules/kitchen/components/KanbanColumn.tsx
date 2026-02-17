import { motion } from 'framer-motion';

interface Props {
    title: string;
    color: 'red' | 'yellow' | 'blue' | 'green';
    orders: any[];
    count: number;
    onOrderClick: (order: any) => void;
}

export default function KanbanColumn({ title, color, orders, count, onOrderClick }: Props) {
    const colorClasses = {
        red: 'bg-red-100 text-red-700 border-red-300',
        yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        blue: 'bg-blue-100 text-blue-700 border-blue-300',
        green: 'bg-green-100 text-green-700 border-green-300'
    };

    const ticketBorderColors = {
        red: 'border-red-500 shadow-red-200',
        yellow: 'border-yellow-500 shadow-yellow-200',
        blue: 'border-blue-500 shadow-blue-200',
        green: 'border-green-500 shadow-green-200'
    };

    return (
        <div className="flex flex-col h-full">
            {/* Column Header */}
            <div className={`${colorClasses[color]} px-4 py-3 rounded-t-xl border-2 font-semibold text-center`}>
                {title}
                <span className="ml-2 px-2 py-1 bg-white/50 rounded-full text-sm">
                    {count}
                </span>
            </div>

            {/* Orders List */}
            <div className="flex-1 bg-white border-2 border-t-0 rounded-b-xl p-3 overflow-y-auto space-y-3">
                {orders.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        Sin órdenes
                    </div>
                ) : (
                    orders.map((order) => (
                        <motion.div
                            key={order.id}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`bg-white border-2 ${ticketBorderColors[color]} rounded-xl p-4 cursor-pointer hover:shadow-lg transition`}
                            onClick={() => onOrderClick(order)}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-bold text-lg">#{order.order_number}</span>
                                <span className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">
                                    {order.table}
                                </span>
                            </div>

                            {/* Hora de Llegada */}
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                <span>⏰</span>
                                <span>
                                    {order.kitchen_received_at ? new Date(order.kitchen_received_at).toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                    }) : 'N/A'}
                                </span>
                                <span className="ml-auto text-orange-600 font-semibold">
                                    {order.elapsed_minutes}m
                                </span>
                            </div>

                            {/* Items Preview */}
                            <div className="space-y-1">
                                {order.items.slice(0, 3).map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                        <span className={`w-2 h-2 rounded-full ${item.state === 'ready' ? 'bg-green-500' :
                                                item.state === 'preparing' ? 'bg-blue-500' :
                                                    'bg-gray-300'
                                            }`}></span>
                                        <span>{item.quantity}x {item.product_name}</span>
                                    </div>
                                ))}
                                {order.items.length > 3 && (
                                    <div className="text-xs text-gray-500">
                                        +{order.items.length - 3} más...
                                    </div>
                                )}
                            </div>

                            {/* Progress Bar */}
                            {order.progress.percentage > 0 && (
                                <div className="mt-3">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full transition-all"
                                            style={{ width: `${order.progress.percentage}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1 text-center">
                                        {order.progress.completed}/{order.progress.total} listos
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
