
export const initialTests = [
    {
        id: 'T1',
        testType: 'Organic Impurities Analysis',
        materials: 'Aggregate (Coarse)',
        group: 'Chemical',
        testMethodSpecification: 'IS2385 (Part2)',
        numDays: 6,
        price: 3000
    },
    {
        id: 'T2',
        testType: 'Sieve Analysis',
        materials: 'Aggregate (Coarse)',
        group: 'Physical',
        testMethodSpecification: 'IS2386 (Part1)',
        numDays: 2,
        price: 500
    }
];

export const getTests = () => {
    const stored = localStorage.getItem('tests');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
            console.error("Error parsing stored tests", e);
        }
    }
    return initialTests;
};

export const saveTests = (tests) => {
    localStorage.setItem('tests', JSON.stringify(tests));
    window.dispatchEvent(new Event('storage'));
};
