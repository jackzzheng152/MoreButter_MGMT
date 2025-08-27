// src/hooks/usePersistedState.ts
import { useState, useEffect, useRef } from "react";

export function usePersistedState<T>(key: string, initial: T) {
  // Use a ref to track if this is the first render
  const isFirstRender = useRef(true);

  // Initialize the state from localStorage or with the initial value
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        // console.log(`[usePersistedState] Loading "${key}" from localStorage:`, raw);
        return JSON.parse(raw);
      } else {
        // console.log(`[usePersistedState] No data for "${key}" in localStorage, using initial value:`, initial);
        return initial;
      }
    } catch (error) {
      // console.error(`[usePersistedState] Error loading "${key}" from localStorage:`, error);
      return initial;
    }
  });

  // Create a wrapped version of setState that logs updates
  const setPersistedState = (value: React.SetStateAction<T>) => {
    // console.log(`[usePersistedState] Updating "${key}" state:`, 
    //   typeof value === 'function' 
    //     ? 'Using function updater' 
    //     : value
    // );
    setState(value);
  };

  // Synchronize the state with localStorage whenever it changes
  useEffect(() => {
    // Skip the first render, since we've already loaded from localStorage
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    try {
      const serialized = JSON.stringify(state);
      // console.log(`[usePersistedState] Saving "${key}" to localStorage:`, serialized);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`[usePersistedState] Error saving "${key}" to localStorage:`, error);
    }
  }, [key, state]);

  return [state, setPersistedState] as [T, typeof setState];
}