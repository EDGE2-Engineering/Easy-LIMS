import { STORAGE_KEYS } from './storageKeys';

export const initialLabTests = [
  {
    id: 'T1',
    testType: 'Organic Impurities Analysis',
    materials: 'Aggregate (Coarse)',
    group: 'Chemical',
    testMethodSpecification: 'IS2385 (Part2)',
    numDays: 6,
    price: 3000,
  },
  {
    id: 'T2',
    testType: 'Sieve Analysis',
    materials: 'Aggregate (Coarse)',
    group: 'Physical',
    testMethodSpecification: 'IS2386 (Part1)',
    numDays: 2,
    price: 500,
  },
];

export const getLabTests = () => {
  const stored = localStorage.getItem(STORAGE_KEYS.LAB_TESTS);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.error('Error parsing stored lab tests', e);
    }
  }
  return initialLabTests;
};

export const saveLabTests = (labTests) => {
  localStorage.setItem(STORAGE_KEYS.LAB_TESTS, JSON.stringify(labTests));
  window.dispatchEvent(new Event('storage'));
};
