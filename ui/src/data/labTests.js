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
  return initialLabTests;
};

export const saveLabTests = (labTests) => {
  // No-op: lab tests are always loaded from API via LabTestsContext
};
