import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
    mesaNumber: string;
    qrUrl: string;
    fgColor: string;
    level: 'L' | 'M' | 'Q' | 'H';
}

const QRPrintTemplate: React.FC<Props> = ({ mesaNumber, qrUrl, fgColor, level }) => {
    return (
        <div className="hidden print:block print:w-full print:h-screen bg-white p-10">
            <div
                className="border-8 rounded-[3rem] h-full flex flex-col items-center justify-between p-12 text-center"
                style={{ borderColor: fgColor }}
            >
                {/* Header - Brand */}
                <div className="space-y-4">
                    <h1 className="text-6xl font-black text-slate-900 tracking-tighter">
                        APP<span style={{ color: fgColor }}>etito</span>
                    </h1>
                    <div className="h-2 w-32 mx-auto rounded-full" style={{ backgroundColor: fgColor, opacity: 0.5 }}></div>
                </div>

                {/* Central Content */}
                <div className="space-y-8 flex flex-col items-center">
                    <div className="p-8 bg-white border-4 border-slate-100 rounded-[2.5rem] shadow-2xl">
                        <QRCodeSVG
                            value={qrUrl}
                            size={400}
                            level={level}
                            includeMargin={true}
                            fgColor={fgColor}
                            bgColor="#ffffff"
                        />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-8xl font-black text-slate-900 uppercase">MESA {mesaNumber}</h2>
                        <p className="text-3xl font-bold text-slate-500 uppercase tracking-[0.2em] mt-4">
                            Escanea para ver el menú
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="space-y-4">
                    <p className="text-2xl font-medium text-slate-400">
                        ¡Disfruta tu experiencia con nosotros!
                    </p>
                    <div className="text-sm font-mono text-slate-300">
                        {qrUrl}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QRPrintTemplate;
