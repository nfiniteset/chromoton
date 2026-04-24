import { useState, useEffect } from 'react';

/**
 * Custom hook to persist state in localStorage
 *
 * @param key - localStorage key
 * @param defaultValue - default value if no stored value exists
 * @returns [storedValue, setValue] tuple like useState
 */
export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  // Initialize with value from localStorage or default
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error loading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  // Update localStorage when value changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error saving localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
}
