import { dynamoGenericApi } from '../lib/dynamoGenericApi';
import { DB_TYPES } from '../data/config';

const DOC_TYPE_CODES = {
    'Quotation': 'QN',
    'Tax Invoice': 'TI',
    'Proforma Invoice': 'PI',
    'Purchase Order': 'PO',
    'Delivery Challan': 'DC',
};

/**
 * Build a document ID string from its parts.
 */
const buildDocID = (code, yyyy, mm, seq) =>
    `EESIPL/${yyyy}/${mm}/${code}/${String(seq).padStart(3, '0')}`;

/**
 * Query the database for the highest existing sequence number
 * for the given document type in the current year/month,
 * then return the next sequential document ID.
 *
 * @param {object} _unused – No longer used
 * @param {string} docType – e.g. 'Quotation', 'Tax Invoice', etc.
 * @param {string} idToken - Cognito ID token
 * @returns {Promise<string>} e.g. "EESIPL/2026/02/QN/003"
 */
export const getNextDocNumber = async (_unused, docType, idToken) => {
    const code = DOC_TYPE_CODES[docType] || 'QN';
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');

    // Prefix that all doc numbers for this type + month share
    const prefix = `EESIPL/${yyyy}/${mm}/${code}/`;

    try {
        // Fetch all accounts from DynamoDB
        // Note: For better performance in large datasets, a GSI with sort key on quote_number would be better
        const accounts = await dynamoGenericApi.listByType(DB_TYPES.ACCOUNT, idToken);

        // Filter those that match the prefix and type
        const matchingAccounts = accounts
            .filter(acc =>
                acc.document_type === docType &&
                acc.quote_number &&
                acc.quote_number.startsWith(prefix)
            )
            .sort((a, b) => b.quote_number.localeCompare(a.quote_number));

        let nextSeq = 1;

        if (matchingAccounts.length > 0) {
            const lastNumber = matchingAccounts[0].quote_number; // e.g. "EESIPL/2026/02/QN/005"
            const parts = lastNumber.split('/');
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSeq)) {
                nextSeq = lastSeq + 1;
            }
        }

        return buildDocID(code, yyyy, mm, nextSeq);
    } catch (err) {
        console.error('Error fetching next doc number:', err);
        // Fallback: return sequence 001 if DB query fails
        return buildDocID(code, yyyy, mm, 1);
    }
};

