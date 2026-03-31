export type ModifierChoice = 'add' | 'remove' | 'note';
export type ModifierSourceType = 'extra' | 'ingredient' | 'note';
export type ModifierGroupKey = 'extras' | 'ingredients' | 'notes';

export interface OrderItemModifierSnapshot {
    source_id?: number | null;
    source_type: ModifierSourceType;
    group_key: ModifierGroupKey;
    group_label: string;
    choice: ModifierChoice;
    name: string;
    price: number;
}

export interface GroupedModifiers {
    additions: OrderItemModifierSnapshot[];
    removals: OrderItemModifierSnapshot[];
    notes: OrderItemModifierSnapshot[];
}

export interface ModifierSelectionValidation {
    valid: boolean;
    issues: string[];
}
