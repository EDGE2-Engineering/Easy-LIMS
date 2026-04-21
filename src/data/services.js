
export const initialServices = [
    {
        id: 'S1',
        serviceType: 'Drilling Upto 10m',
        unit: 'Per Metre',
        price: 1000,
        qty: 1
    }
];

export const getServices = () => {
    const stored = localStorage.getItem('services');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
            console.error("Error parsing stored services", e);
        }
    }
    return initialServices;
};

export const saveServices = (services) => {
    localStorage.setItem('services', JSON.stringify(services));
    window.dispatchEvent(new Event('storage'));
};
