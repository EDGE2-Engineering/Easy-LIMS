/**
 * Document numbering utility
 */

export const getNextDocNumber = async (api, type, idToken) => {
    try {
        const records = await api.listByType('job', idToken);
        if (!records || records.length === 0) {
            return generateFirstNumber(type);
        }

        // Filter by document type if stored in a field, OR just prefix match
        const prefix = getPrefix(type);

        // Some records might have the number in `quote_number` or inside `quotation.quotation_no`
        const numbers = records
            .map(r => {
                const numStr = r.job_order_no || r.quote_number || (r.quotation && r.quotation.quotation_no) || '';
                if (numStr.startsWith(prefix)) {
                    const num = parseInt(numStr.replace(prefix, ''));
                    return isNaN(num) ? 0 : num;
                }
                return 0;
            })
            .filter(n => n > 0);

        const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
        const nextNum = (maxNum + 1).toString().padStart(4, '0');

        return `${prefix}${nextNum}`;
    } catch (error) {
        console.error("Error getting next doc number:", error);
        return `${getPrefix(type)}${Date.now()}`; // Fallback
    }
};

const getPrefix = (type) => {
    switch (type) {
        case 'Tax Invoice': return 'INV-';
        case 'Quotation': return 'QT-';
        case 'Proforma Invoice': return 'PI-';
        case 'Purchase Order': return 'PO-';
        case 'Delivery Challan': return 'DC-';
        default: return 'DOC-';
    }
};

const generateFirstNumber = (type) => {
    return `${getPrefix(type)}0001`;
};
