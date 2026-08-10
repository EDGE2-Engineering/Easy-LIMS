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
  return initialFieldTests;
};

export const saveFieldTests = (fieldTests) => {
  // No-op: field tests are always loaded from API via FieldTestsContext
};
