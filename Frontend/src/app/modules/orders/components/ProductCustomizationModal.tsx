import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    Check,
    Info,
    Minus,
    Plus,
    X,
} from 'lucide-react';

import { formatNumber } from '@/lib/formatNumber';

import { Product } from '../../menu/services/menuService';
import type { OrderItemModifierSnapshot } from '../types/modifiers';
import {
    buildLocalModifierSnapshot,
    groupModifiers,
    normalizeSelectionIds,
    validateCustomizationSelection,
} from '../utils/modifiers';

const MAX_NOTE_LENGTH = 250;

export interface CustomizedProduct {
    product: Product;
    quantity: number;
    notes: string;
    extras_ids: number[];
    removed_ingredient_ids: number[];
    final_price: number;
    modifiers_snapshot: OrderItemModifierSnapshot[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onConfirm: (item: CustomizedProduct) => void;
}

export function ProductCustomizationModal({
    isOpen,
    onClose,
    product,
    onConfirm,
}: Props) {
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

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }

        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!product) {
        return null;
    }

    const extras = (product.extras || []).filter((extra) => extra.is_active);
    const removableIngredients = (product.ingredients || []).filter(
        (ingredient) => ingredient.is_active && ingredient.removable,
    );

    const normalizedExtraIds = normalizeSelectionIds(selectedExtras);
    const normalizedRemovedIngredientIds = normalizeSelectionIds(removedIngredients);

    const selectedExtraItems = extras.filter((extra) =>
        normalizedExtraIds.includes(extra.id),
    );
    const removedIngredientItems = removableIngredients.filter((ingredient) =>
        normalizedRemovedIngredientIds.includes(ingredient.id),
    );

    const modifiersSnapshot = buildLocalModifierSnapshot({
        notes,
        extras: selectedExtraItems,
        removedIngredients: removedIngredientItems,
    });
    const groupedModifiers = groupModifiers(modifiersSnapshot);
    const validation = validateCustomizationSelection({
        selectedExtraIds: selectedExtras,
        availableExtras: extras,
        removedIngredientIds: removedIngredients,
        availableIngredients: removableIngredients,
        notes,
        maxNoteLength: MAX_NOTE_LENGTH,
    });

    const extrasTotal = selectedExtraItems.reduce(
        (sum, extra) => sum + Number(extra.price),
        0,
    );
    const unitPrice = Number(product.price) + extrasTotal;
    const totalPrice = unitPrice * quantity;
    const canConfirm = validation.valid && quantity >= 1;

    const handleToggleExtra = (id: number) => {
        setSelectedExtras((current) =>
            current.includes(id)
                ? current.filter((extraId) => extraId !== id)
                : [...current, id],
        );
    };

    const handleToggleIngredient = (id: number) => {
        setRemovedIngredients((current) =>
            current.includes(id)
                ? current.filter((ingredientId) => ingredientId !== id)
                : [...current, id],
        );
    };

    const handleConfirm = () => {
        if (!canConfirm) {
            return;
        }

        onConfirm({
            product,
            quantity,
            notes: notes.trim(),
            extras_ids: normalizedExtraIds,
            removed_ingredient_ids: normalizedRemovedIngredientIds,
            final_price: unitPrice,
            modifiers_snapshot: modifiersSnapshot,
        });
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:p-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="relative flex-shrink-0">
                            {product.image_url ? (
                                <div className="relative h-48 w-full">
                                    <img
                                        src={
                                            product.image_url.startsWith('http')
                                                ? product.image_url
                                                : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${product.image_url}`
                                        }
                                        alt={product.name}
                                        className="h-full w-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                    <div className="absolute bottom-4 left-4 right-4 text-white">
                                        <h2 className="text-2xl font-bold">{product.name}</h2>
                                        <p className="mt-1 text-lg font-medium text-white/90">
                                            {formatNumber(product.price)}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="border-b border-slate-100 bg-slate-50 p-6 pb-4">
                                    <h2 className="text-2xl font-bold text-slate-900">
                                        {product.name}
                                    </h2>
                                    <p className="mt-1 text-lg font-bold text-orange-600">
                                        {formatNumber(product.price)}
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 rounded-full bg-black/20 p-2 text-white transition-colors hover:bg-black/40"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 space-y-8 overflow-y-auto p-6">
                            {product.description && (
                                <div className="flex items-start gap-3 rounded-xl border border-blue-100/50 bg-blue-50/50 p-4 text-sm leading-relaxed text-slate-600">
                                    <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400" />
                                    <p>{product.description}</p>
                                </div>
                            )}

                            {extras.length > 0 && (
                                <section>
                                    <h3 className="mb-4 flex items-center justify-between text-base font-bold text-slate-900">
                                        Extras opcionales
                                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-normal uppercase tracking-wider text-slate-500">
                                            Multiple seleccion
                                        </span>
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {extras.map((extra) => {
                                            const isSelected = normalizedExtraIds.includes(extra.id);
                                            return (
                                                <label
                                                    key={extra.id}
                                                    className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-3.5 transition-all ${
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
                                                        <div
                                                            className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                                                                isSelected
                                                                    ? 'border-orange-500 bg-orange-500'
                                                                    : 'border-slate-300 bg-white'
                                                            }`}
                                                        >
                                                            {isSelected && (
                                                                <Check className="h-3.5 w-3.5 stroke-[3] text-white" />
                                                            )}
                                                        </div>
                                                        <span
                                                            className={`text-sm font-medium ${
                                                                isSelected
                                                                    ? 'text-orange-900'
                                                                    : 'text-slate-700'
                                                            }`}
                                                        >
                                                            {extra.name}
                                                        </span>
                                                    </div>
                                                    <span
                                                        className={`text-sm font-bold ${
                                                            isSelected
                                                                ? 'text-orange-700'
                                                                : 'text-slate-500'
                                                        }`}
                                                    >
                                                        +{formatNumber(extra.price)}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {removableIngredients.length > 0 && (
                                <section>
                                    <h3 className="mb-4 flex items-center justify-between text-base font-bold text-slate-900">
                                        Ingredientes
                                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-normal uppercase tracking-wider text-slate-500">
                                            Toca para remover
                                        </span>
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {removableIngredients.map((ingredient) => {
                                            const isRemoved = normalizedRemovedIngredientIds.includes(
                                                ingredient.id,
                                            );
                                            return (
                                                <button
                                                    key={ingredient.id}
                                                    type="button"
                                                    onClick={() => handleToggleIngredient(ingredient.id)}
                                                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                                                        isRemoved
                                                            ? 'border-red-200 bg-red-50 text-red-600 line-through decoration-red-300'
                                                            : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {isRemoved ? (
                                                        <X className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                                    )}
                                                    {ingredient.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {normalizedRemovedIngredientIds.length > 0 && (
                                        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-500">
                                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                            Se preparara sin estos ingredientes
                                        </p>
                                    )}
                                </section>
                            )}

                            <section>
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-base font-bold text-slate-900">
                                        Notas para cocina
                                    </h3>
                                    <span className="text-xs text-slate-400">
                                        {notes.trim().length}/{MAX_NOTE_LENGTH}
                                    </span>
                                </div>
                                <textarea
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                    placeholder="Ej: termino de la carne, poca sal, servir aparte..."
                                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 hover:bg-slate-50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50"
                                    rows={3}
                                    maxLength={MAX_NOTE_LENGTH}
                                />
                            </section>

                            {(modifiersSnapshot.length > 0 || !validation.valid) && (
                                <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                                            Resumen de personalizacion
                                        </h3>
                                        <span className="text-xs text-slate-500">
                                            {modifiersSnapshot.length} cambio(s)
                                        </span>
                                    </div>

                                    {groupedModifiers.additions.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                                                Anadir
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {groupedModifiers.additions.map((modifier, index) => (
                                                    <span
                                                        key={`${modifier.choice}-${modifier.source_id ?? index}`}
                                                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                                                    >
                                                        + {modifier.name}
                                                        {modifier.price > 0 &&
                                                            ` (${formatNumber(modifier.price)})`}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {groupedModifiers.removals.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                                                Quitar
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {groupedModifiers.removals.map((modifier, index) => (
                                                    <span
                                                        key={`${modifier.choice}-${modifier.source_id ?? index}`}
                                                        className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
                                                    >
                                                        - Sin {modifier.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {groupedModifiers.notes.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                                                Notas
                                            </p>
                                            {groupedModifiers.notes.map((modifier, index) => (
                                                <div
                                                    key={`${modifier.choice}-${index}`}
                                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                                >
                                                    {modifier.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {!validation.valid && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
                                                <AlertTriangle className="h-4 w-4" />
                                                Revisa la seleccion antes de agregar
                                            </div>
                                            <div className="space-y-1 text-xs text-amber-700">
                                                {validation.issues.map((issue) => (
                                                    <div key={issue}>{issue}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>

                        <div className="flex-shrink-0 border-t border-slate-100 bg-white p-6">
                            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
                                <div className="flex w-full items-center justify-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-2 sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-orange-200 hover:text-orange-600 active:scale-95"
                                    >
                                        <Minus className="h-5 w-5" />
                                    </button>
                                    <span className="w-8 text-center text-lg font-bold text-slate-900">
                                        {quantity}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-orange-200 hover:text-orange-600 active:scale-95"
                                    >
                                        <Plus className="h-5 w-5" />
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={!canConfirm}
                                    className="group flex w-full flex-1 items-center justify-between rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 font-bold text-white shadow-lg shadow-orange-500/25 transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                                >
                                    <span className="text-lg">Agregar al pedido</span>
                                    <div className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 transition-colors group-hover:bg-white/30">
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
