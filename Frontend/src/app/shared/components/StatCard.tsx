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
            className={`bg-white rounded-2xl p-4 shadow-lg border border-slate-100 cursor-pointer relative overflow-hidden group`}
            onClick={onClick}
        >
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
                <div className={`text-${color.split('-')[1]}-500 transform scale-125`}>
                    {icon}
                </div>
            </div>

            <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl ${color} shadow-lg shadow-${color.split('-')[1]}-500/30`}>
                    {icon}
                </div>
                {change !== 0 && (
                    <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} px-1.5 py-0.5 rounded-lg`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{Math.abs(change)}%</span>
                    </div>
                )}
            </div>

            <h3 className="text-slate-500 text-xs font-medium mb-1">{title}</h3>
            <p className="text-xl font-bold text-slate-800 tracking-tight">{value}</p>
        </motion.div>
    );
};

export default StatCard;
