import type {
    ModifierSelectionValidation,
    GroupedModifiers,
    OrderItemModifierSnapshot,
} from '../types/modifiers';
import type {
    ProductExtra,
    ProductIngredient,
} from '../../menu/services/menuService';

const MAX_NOTE_LENGTH_DEFAULT = 250;

const roundCurrency = (value: number): number =>
    Math.round((value + Number.EPSILON) * 100) / 100;

export const normalizeSelectionIds = (ids: number[] | null | undefined): number[] =>
    Array.from(
        new Set((ids ?? []).filter((value) => Number.isInteger(value) && value > 0)),
    ).sort((left, right) => left - right);

export const areIdListsEqual = (
    left: number[] | null | undefined,
    right: number[] | null | undefined,
): boolean => {
    const normalizedLeft = normalizeSelectionIds(left);
    const normalizedRight = normalizeSelectionIds(right);

    if (normalizedLeft.length !== normalizedRight.length) {
        return false;
    }

    return normalizedLeft.every((value, index) => value === normalizedRight[index]);
};

export const groupModifiers = (
    modifiers: OrderItemModifierSnapshot[] | null | undefined,
): GroupedModifiers =>
    (modifiers ?? []).reduce<GroupedModifiers>(
        (groups, modifier) => {
            if (modifier.choice === 'add') {
                groups.additions.push(modifier);
            } else if (modifier.choice === 'remove') {
                groups.removals.push(modifier);
            } else if (modifier.choice === 'note') {
                groups.notes.push(modifier);
            }
            return groups;
        },
        { additions: [], removals: [], notes: [] },
    );

export const buildLocalModifierSnapshot = ({
    notes,
    extras,
    removedIngredients,
}: {
    notes?: string | null;
    extras: ProductExtra[];
    removedIngredients: ProductIngredient[];
}): OrderItemModifierSnapshot[] => {
    const snapshot: OrderItemModifierSnapshot[] = [];
    const normalizedNotes = notes?.trim();

    if (normalizedNotes) {
        snapshot.push({
            source_type: 'note',
            group_key: 'notes',
            group_label: 'Notas',
            choice: 'note',
            name: normalizedNotes,
            price: 0,
        });
    }

    extras.forEach((extra) => {
        snapshot.push({
            source_id: extra.id,
            source_type: 'extra',
            group_key: 'extras',
            group_label: 'Añadir',
            choice: 'add',
            name: extra.name,
            price: roundCurrency(Number(extra.price)),
        });
    });

    removedIngredients.forEach((ingredient) => {
        snapshot.push({
            source_id: ingredient.id,
            source_type: 'ingredient',
            group_key: 'ingredients',
            group_label: 'Quitar',
            choice: 'remove',
            name: ingredient.name,
            price: 0,
        });
    });

    return snapshot;
};

export const validateCustomizationSelection = ({
    selectedExtraIds,
    availableExtras,
    removedIngredientIds,
    availableIngredients,
    notes,
    maxNoteLength = MAX_NOTE_LENGTH_DEFAULT,
}: {
    selectedExtraIds: number[];
    availableExtras: ProductExtra[];
    removedIngredientIds: number[];
    availableIngredients: ProductIngredient[];
    notes?: string | null;
    maxNoteLength?: number;
}): ModifierSelectionValidation => {
    const issues: string[] = [];
    const extraIdSet = new Set(availableExtras.map((extra) => extra.id));
    const ingredientIdSet = new Set(availableIngredients.map((ingredient) => ingredient.id));

    if (normalizeSelectionIds(selectedExtraIds).length !== selectedExtraIds.length) {
        issues.push('Hay extras duplicados o inválidos en la selección.');
    }

    if (
        selectedExtraIds.some((extraId) => !extraIdSet.has(extraId))
    ) {
        issues.push('La selección incluye extras no disponibles para este plato.');
    }

    if (
        normalizeSelectionIds(removedIngredientIds).length !== removedIngredientIds.length
    ) {
        issues.push('Hay ingredientes removidos duplicados o inválidos.');
    }

    if (
        removedIngredientIds.some((ingredientId) => !ingredientIdSet.has(ingredientId))
    ) {
        issues.push('La selección incluye ingredientes que no se pueden remover.');
    }

    if ((notes?.trim().length ?? 0) > maxNoteLength) {
        issues.push(`Las notas no pueden superar ${maxNoteLength} caracteres.`);
    }

    return {
        valid: issues.length === 0,
        issues,
    };
};
