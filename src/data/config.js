
export const initialSiteContent = {
    global: {
        siteName: "Easy LIMS",
        contactPhone: "+919999999999",
        contactEmail: "edge2@gmail.com",
        address: "EDGE2 - Easy LIMS, Karnataka",
        footerAbout: "EDGE2 - Easy LIMS"
    },
    pagination: {
        // Very conservative - first page has header, client details, totals, bank details, payment terms
        itemsPerFirstPage: 4,
        // Continuation pages have more space (just header + table)
        itemsPerContinuationPage: 5,
        // T&C Pagination
        tcItemsFirstPage: 3,
        tcItemsContinuationPage: 3,
        // Technicals Pagination
        techItemsFirstPage: 3,
        techItemsContinuationPage: 3
    }
};

export const getSiteContent = () => {
    const stored = localStorage.getItem('site_content');
    if (stored) return JSON.parse(stored);
    return initialSiteContent;
};

export const saveSiteContent = (content) => {
    localStorage.setItem('site_content', JSON.stringify(content));
    window.dispatchEvent(new Event('storage-content'));
};

export const TG_NOTIFIER_CONFIG = {
    BOT_TOKEN: import.meta.env.VITE_TG_BOT_TOKEN,
    CHAT_ID: import.meta.env.VITE_TG_CHAT_ID
};

export const enableInfoDiagramZoom = false;

export const DB_TYPES = {
    ACCOUNT: 'account',
    APP_SETTING: 'app_setting',
    CLIENT: 'client',
    CLIENT_SERVICE_PRICE: 'client_service_price',
    CLIENT_TEST_PRICE: 'client_test_price',
    HSN_SAC_CODE: 'hsn_sac_code',
    MATERIAL_INWARD: 'job',
    QUOTATION: 'job',
    REPORT: 'job',
    REPORT_NUMBER: 'job',
    JOB: 'job',
    SERVICE: 'service',
    SERVICE_UNIT_TYPE: 'service_unit_type',
    TECHNICAL: 'technical',
    TERM_AND_CONDITION: 'term_and_condition',
    TEST: 'test',
    USER: 'user'
};

export const WORKFLOW_STEPS = [
    { id: 'RECEIVED', label: 'Material Received', action: 'Send for Testing', roles: ['superadmin', 'admin', 'mro'] },
    { id: 'SENT_TO_DEPARTMENT', label: 'Sent for Testing', action: 'Start Testing', roles: ['superadmin', 'admin', 'test-staff'] },
    { id: 'UNDER_TESTING', label: 'Under Testing', action: 'Mark Test Completed', roles: ['superadmin', 'admin', 'test-staff'] },
    { id: 'TEST_COMPLETED', label: 'Testing Completed', action: 'Generate Report', roles: ['superadmin', 'admin', 'mro'] },
    { id: 'REPORT_GENERATED', label: 'Report Generated', action: 'Submit for Review', roles: ['superadmin', 'admin', 'mro'] },
    { id: 'UNDER_REVIEW', label: 'Under Review', action: 'Sign Report', roles: ['superadmin', 'admin'] },
    { id: 'SIGNED', label: 'Signed', action: 'Mark Payment Pending', roles: ['superadmin', 'admin', 'mro', 'accountant'] },
    { id: 'PAYMENT_PENDING', label: 'Payment Pending', action: 'Mark Payment Received', roles: ['superadmin', 'admin', 'accountant'] },
    { id: 'PAYMENT_RECEIVED', label: 'Payment Received', action: 'Release Report', roles: ['superadmin', 'admin', 'accountant'] },
    { id: 'REPORT_RELEASED', label: 'Report Released', action: 'Complete Job', roles: ['superadmin', 'admin', 'accountant'] },
    { id: 'COMPLETED', label: 'Completed', action: null, roles: [] }
];

