import { STORAGE_KEYS } from './storageKeys';

export const initialFieldTests = [
  {
    id: 'S1',
    fieldTestType: 'Drilling Upto 10m',
    unit: 'Per Metre',
    price: 1000,
    qty: 1,
  },
];

export const getFieldTests = () => {
  const stored = localStorage.getItem(STORAGE_KEYS.FIELD_TESTS);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.error('Error parsing stored field tests', e);
    }
  }
  return initialFieldTests;
};

export const saveFieldTests = (fieldTests) => {
  localStorage.setItem(STORAGE_KEYS.FIELD_TESTS, JSON.stringify(fieldTests));
  window.dispatchEvent(new Event('storage'));
};
