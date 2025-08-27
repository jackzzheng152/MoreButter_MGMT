import { useState } from "react";

export type SortDirection = 'asc' | 'desc';
export interface SortConfig<T = string> {
  key: T;
  direction: SortDirection;
}

export function useSort<T = string>(initialKey: T, initialDirection: SortDirection = 'asc') {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({ key: initialKey, direction: initialDirection });

  const handleSort = (key: T) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  return { sortConfig, handleSort, setSortConfig };
}

export function sortData<Item, Key extends string | number>(
  data: Item[],
  sortConfig: SortConfig<Key>,
  getSortValue: (item: Item, key: Key) => string | number
): Item[] {
  if (!sortConfig.key) return data;
  return [...data].sort((a, b) => {
    const aValue = getSortValue(a, sortConfig.key);
    const bValue = getSortValue(b, sortConfig.key);
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }
    // fallback to string compare
    return sortConfig.direction === 'asc'
      ? String(aValue).localeCompare(String(bValue), undefined, { sensitivity: 'base' })
      : String(bValue).localeCompare(String(aValue), undefined, { sensitivity: 'base' });
  });
} 