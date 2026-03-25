import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Info, Check } from 'lucide-react';
import { formatNumber } from '@/lib/formatNumber';
import { Product } from '../../menu/services/menuService';

export interface CustomizedProduct {
  product: Product;
  quantity: number;
  notes: string;
  extras_ids: number[];
  removed_ingredient_ids: number[];
  final_price: number;
  extras_names: string[];
  removed_ingredient_names: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onConfirm: (item: CustomizedProduct) => void;
}

export function ProductCustomizationModal({ isOpen, onClose, product, onConfirm }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedExtras, setSelectedExtras] = useState<number[]>([]);
  const [removedIngredients, setRemovedIngredients] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setNotes(product.default_notes || '');
      setSelectedExtras([]);
      setRemovedIngredients([]);
    }
  }, [isOpen, product]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!product) return null;

  const extras = product.extras || [];
  const removableIngredients = product.ingredients?.filter(i => i.removable) || [];

  const handleToggleExtra = (id: number) => {
    setSelectedExtras(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleToggleIngredient = (id: number) => {
    setRemovedIngredients(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const extrasTotal = extras
    .filter(e => selectedExtras.includes(e.id))
    .reduce((sum, e) => sum + Number(e.price), 0);
  
  const unitPrice = Number(product.price) + extrasTotal;
  const totalPrice = unitPrice * quantity;

  const handleConfirm = () => {
    onConfirm({
      product,
      quantity,
      notes: notes.trim(),
      extras_ids: selectedExtras,
      removed_ingredient_ids: removedIngredients,
      final_price: unitPrice,
      extras_names: extras.filter(e => selectedExtras.includes(e.id)).map(e => e.name),
      removed_ingredient_names: removableIngredients.filter(i => removedIngredients.includes(i.id)).map(i => i.name),
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex-shrink-0 relative">
              {product.image_url ? (
                <div className="h-48 w-full relative">
                  <img 
                    src={product.image_url.startsWith('http') ? product.image_url : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${product.image_url}`}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h2 className="text-2xl font-bold">{product.name}</h2>
                    <p className="text-white/90 font-medium text-lg mt-1">{formatNumber(product.price)}</p>
                  </div>
                </div>
              ) : (
                <div className="p-6 pb-4 bg-slate-50 border-b border-slate-100">
                  <h2 className="text-2xl font-bold text-slate-900">{product.name}</h2>
                  <p className="text-orange-600 font-bold text-lg mt-1">{formatNumber(product.price)}</p>
                </div>
              )}
              
              <button 
                onClick={onClose} 
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {product.description && (
                <div className="flex items-start gap-3 bg-blue-50/50 p-4 rounded-xl text-slate-600 text-sm leading-relaxed border border-blue-100/50">
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p>{product.description}</p>
                </div>
              )}

              {/* Extras list */}
              {extras.length > 0 && (
                <section>
                  <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
                    Extras Opcionales
                    <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-wider">Múltiple selección</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {extras.map(extra => {
                      const isSelected = selectedExtras.includes(extra.id);
                      return (
                        <label 
                          key={extra.id}
                          className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-orange-500 bg-orange-50/50 shadow-sm' 
                              : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleExtra(extra.id)}
                            className="hidden"
                          />
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                            </div>
                            <span className={`text-sm font-medium ${isSelected ? 'text-orange-900' : 'text-slate-700'}`}>
                              {extra.name}
                            </span>
                          </div>
                          <span className={`text-sm font-bold ${isSelected ? 'text-orange-700' : 'text-slate-500'}`}>
                            +{formatNumber(extra.price)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Removable Ingredients */}
              {removableIngredients.length > 0 && (
                <section>
                  <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
                    Ingredientes
                    <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-wider">Toca para remover</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {removableIngredients.map(ing => {
                      const isRemoved = removedIngredients.includes(ing.id);
                      return (
                        <button
                          key={ing.id}
                          onClick={() => handleToggleIngredient(ing.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                            isRemoved
                              ? 'bg-red-50 border-red-200 text-red-600 line-through decoration-red-300'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                          }`}
                        >
                          {isRemoved ? <X className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                          {ing.name}
                        </button>
                      );
                    })}
                  </div>
                  {removedIngredients.length > 0 && (
                    <p className="text-xs text-red-500 mt-3 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      Se preparará sin estos ingredientes
                    </p>
                  )}
                </section>
              )}

              {/* Kitchen Notes */}
              <section>
                <h3 className="text-base font-bold text-slate-900 mb-3">Notas para cocina</h3>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ej: Término de la carne, sin sal, etc..."
                  className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 bg-slate-50/50 hover:bg-slate-50 transition-colors resize-none text-sm placeholder:text-slate-400 text-slate-700"
                  rows={3}
                />
              </section>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-slate-100 p-6 bg-white">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                
                {/* Quantity Control */}
                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100 w-full sm:w-auto justify-center">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 active:scale-95 transition-all"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="text-lg font-bold text-slate-900 w-8 text-center">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 active:scale-95 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Submit Action */}
                <button
                  onClick={handleConfirm}
                  className="flex-1 w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl py-4 px-6 flex items-center justify-between font-bold shadow-lg shadow-orange-500/25 transition-transform active:scale-[0.98] group"
                >
                  <span className="text-lg">Agregar al pedido</span>
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg group-hover:bg-white/30 transition-colors">
                    <span>{formatNumber(totalPrice)}</span>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
