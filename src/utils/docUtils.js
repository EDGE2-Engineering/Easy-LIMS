/**
 * Document type code mapping and ID generation utility.
 *
 * Format: EESIPL/{YYYY}/{MM}/{CODE}/{NNN}
 *   - YYYY  = current 4-digit year
 *   - MM    = current 2-digit month (01–12)
 *   - CODE  = 2-letter document type code
 *   - NNN   = 3-digit sequential number (zero-padded)
 */

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
 * @param {object} supabaseClient – Supabase client instance
 * @param {string} docType – e.g. 'Quotation', 'Tax Invoice', etc.
 * @returns {Promise<string>} e.g. "EESIPL/2026/02/QN/003"
 */
export const getNextDocNumber = async (supabaseClient, docType) => {
    const code = DOC_TYPE_CODES[docType] || 'QN';
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');

    // Prefix that all doc numbers for this type + month share
    const prefix = `EESIPL/${yyyy}/${mm}/${code}/`;

    try {
        // Fetch all matching records for this type + year/month, sorted desc
        const { data, error } = await supabaseClient
            .from('documents')
            .select('quote_number')
            .eq('document_type', docType)
            .like('quote_number', `${prefix}%`)
            .order('quote_number', { ascending: false })
            .limit(1);

        if (error) throw error;

        let nextSeq = 1;

        if (data && data.length > 0) {
            const lastNumber = data[0].quote_number; // e.g. "EESIPL/2026/02/QN/005"
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
