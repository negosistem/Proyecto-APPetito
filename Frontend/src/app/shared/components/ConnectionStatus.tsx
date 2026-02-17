import { Wifi, WifiOff, RefreshCcw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConnectionStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Ping al backend cada 2 minutos para verificar salud real
        const interval = setInterval(async () => {
            setIsChecking(true);
            try {
                const response = await fetch('http://localhost:8000/health');
                if (!response.ok) throw new Error();
                setIsOnline(true);
            } catch {
                setIsOnline(false);
            } finally {
                setTimeout(() => setIsChecking(false), 2000);
            }
        }, 120000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    className="fixed bottom-6 right-6 z-[100]"
                >
                    <div className="bg-red-500 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-white/20 backdrop-blur-md">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <WifiOff size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Sin conexión</p>
                            <p className="text-[10px] opacity-80 uppercase tracking-widest font-black">Reintentando...</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {isChecking && isOnline && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed bottom-6 right-6 z-[100]"
                >
                    <div className="bg-slate-900/80 text-white px-3 py-2 rounded-xl flex items-center gap-2 backdrop-blur-sm border border-white/10">
                        <RefreshCcw size={14} className="animate-spin text-blue-400" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Sincronizando...</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
