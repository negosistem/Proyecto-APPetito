import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, Copy, Check, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { tableService, Table } from '../../tables/services/tableService';
import QRPrintTemplate from '../components/QRPrintTemplate';

export default function ConfiguracionQR() {
  const [mesas, setMesas] = useState<Table[]>([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState<Table | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [fgColor, setFgColor] = useState('#0f172a');
  const [qrLevel, setQrLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');

  const COLOR_PRESETS = [
    { name: 'Negro Slate', value: '#0f172a' },
    { name: 'Naranja APPetito', value: '#f97316' },
    { name: 'Azul Real', value: '#1e40af' },
    { name: 'Verde Esmeralda', value: '#065f46' },
    { name: 'Rojo Pasión', value: '#991b1b' },
    { name: 'Púrpura Elegante', value: '#5b21b6' },
  ];

  const GUEST_APP_URL = 'https://appetito-pedidos.vercel.app';
  const qrUrl = mesaSeleccionada
    ? `${GUEST_APP_URL}/m/${mesaSeleccionada.qr_code}`
    : '';

  useEffect(() => {
    const loadTables = async () => {
      setIsLoading(true);
      try {
        const data = await tableService.getTables();
        const activeTables = data.filter(t => t.is_active);
        setMesas(activeTables);
        if (activeTables.length > 0 && !mesaSeleccionada) {
          setMesaSeleccionada(activeTables[0]);
        }
      } catch (error) {
        console.error('Error loading tables:', error);
        toast.error('No se pudieron cargar las mesas');
      } finally {
        setIsLoading(false);
      }
    };
    loadTables();
  }, [refreshTrigger]);

  const copiarURL = () => {
    if (!qrUrl) return;
    navigator.clipboard.writeText(qrUrl);
    setCopiado(true);
    toast.success('URL del menú copiada');
    setTimeout(() => setCopiado(false), 2000);
  };

  const descargarQR = () => {
    if (!mesaSeleccionada) return;
    const svg = document.getElementById('qr-main-view');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `APPetito_Mesa_${mesaSeleccionada.number}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success(`QR Mesa ${mesaSeleccionada.number} descargado`);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        <p className="text-slate-500 font-medium">Cargando configuración de mesas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Configuración QR</h1>
          <p className="text-slate-600">Gestiona los accesos de autoservicio para tus clientes</p>
        </div>
        <button
          onClick={() => setRefreshTrigger(p => p + 1)}
          className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all text-slate-500 hover:text-orange-600"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left: QR Viewer & Actions (7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-bl-full -mr-20 -mt-20 opacity-50 z-0"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Vista Previa</h3>
                  <p className="text-slate-500">Mesa {mesaSeleccionada?.number}</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-8 items-center lg:items-start">
                {/* QR Display */}
                <div className="flex flex-col items-center">
                  <div className="p-8 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border-4 border-slate-50 mb-4 transition-all hover:scale-[1.02]">
                    <QRCodeSVG
                      id="qr-main-view"
                      value={qrUrl}
                      size={240}
                      level={qrLevel}
                      includeMargin={true}
                      fgColor={fgColor}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Escaneable en cualquier dispositivo</p>
                </div>

                {/* Customization Controls */}
                <div className="flex-1 w-full space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Color de Marca</label>
                    <div className="grid grid-cols-6 gap-2">
                      {COLOR_PRESETS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setFgColor(color.value)}
                          className={`w-full aspect-square rounded-full border-4 transition-all hover:scale-110 ${fgColor === color.value ? 'border-white ring-2 ring-orange-500' : 'border-transparent'}`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                      <div className="relative w-full aspect-square rounded-full border-2 border-slate-100 overflow-hidden">
                        <input
                          type="color"
                          value={fgColor}
                          onChange={(e) => setFgColor(e.target.value)}
                          className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 text-xs font-medium truncate">
                        {qrUrl}
                      </div>
                      <button
                        onClick={copiarURL}
                        className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-slate-500 hover:text-orange-600 shadow-sm"
                      >
                        {copiado ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={descargarQR}
                        className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-lg shadow-slate-100 hover:bg-slate-800 active:scale-95 transition-all"
                      >
                        <Download size={16} />
                        PNG
                      </button>
                      <button
                        onClick={handlePrint}
                        className="flex items-center justify-center gap-2 py-3 bg-orange-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 active:scale-95 transition-all"
                      >
                        <Printer size={16} />
                        PLANTILLA
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="bg-slate-900 rounded-3xl p-6 flex gap-4 text-white">
            <div className="bg-slate-800 p-3 rounded-2xl h-fit">
              <ExternalLink size={24} className="text-orange-400" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold">Multidispositivo</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Nuestros códigos están optimizados para leerse instantáneamente en iOS y Android, facilitando el autoservicio sin esperas.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Table Selection (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Seleccionar Mesa</h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                {mesas.length} MESAS
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {mesas.map((mesa) => (
                <button
                  key={mesa.id}
                  onClick={() => setMesaSeleccionada(mesa)}
                  className={`p-4 rounded-2xl font-bold transition-all border-2 flex flex-col items-center justify-center gap-1 ${mesaSeleccionada?.id === mesa.id
                      ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200'
                      : 'bg-white border-slate-100 text-slate-500 hover:border-orange-200 hover:text-orange-600'
                    }`}
                >
                  <span className="text-2xl">{mesa.number}</span>
                  <span className={`text-[10px] uppercase tracking-wider opacity-60 ${mesaSeleccionada?.id === mesa.id ? 'text-white' : 'text-slate-400'}`}>
                    Cap. {mesa.capacity}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Area */}
      {mesaSeleccionada && (
        <div style={{ display: 'none' }}>
          <QRPrintTemplate
            mesaNumber={mesaSeleccionada.number}
            qrUrl={qrUrl}
            fgColor={fgColor}
            level={qrLevel}
          />
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            display: block !important;
          }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}
