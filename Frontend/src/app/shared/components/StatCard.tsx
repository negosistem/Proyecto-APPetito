import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
    title: string;
    value: string;
    change: number;
    icon: React.ReactNode;
    color: string;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, color, onClick }) => {
    const isPositive = change >= 0;

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className={`bg-white rounded-2xl p-6 shadow-lg border border-slate-100 cursor-pointer relative overflow-hidden group`}
            onClick={onClick}
        >
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                <div className={`text-${color.split('-')[1]}-500 transform scale-150`}>
                    {icon}
                </div>
            </div>

            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${color} shadow-lg shadow-${color.split('-')[1]}-500/30`}>
                    {icon}
                </div>
                {change !== 0 && (
                    <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} px-2 py-1 rounded-lg`}>
                        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span>{Math.abs(change)}%</span>
                    </div>
                )}
            </div>

            <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </motion.div>
    );
};

export default StatCard;
