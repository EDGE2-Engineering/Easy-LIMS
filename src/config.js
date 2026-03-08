import { WebStorageStateStore } from 'oidc-client-ts';

/**
 * Application Configuration
 * Centralized configuration for Cognito authentication and other app settings
 */

const region = "us-east-1";
const userPoolId = "us-east-1_fmXaDAY2D";
const clientId = "59guo9f9l0ivjtcsm7ejggguep";
const identityPoolId = "us-east-1:62a1566e-990e-4f51-9830-040effebfb36";
const cognitoDomainPrefix = "edge2-lims";
const domain = `https://${cognitoDomainPrefix}.auth.${region}.amazoncognito.com`;

const origin_url = typeof window !== 'undefined'
    ? window.location.origin
    : "http://localhost:3000";

// Cognito Configuration
export const cognitoConfig = {
    region,
    userPoolId,
    clientId,
    identityPoolId,
    cognitoDomainPrefix,

    // OIDC Configuration for react-oidc-context
    oidc: {
        authority: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
        client_id: clientId,
        redirect_uri: origin_url,
        response_type: "code",
        scope: "phone openid profile email aws.cognito.signin.user.admin",
        post_logout_redirect_uri: origin_url,
        userStore: new WebStorageStateStore({ store: window.localStorage }),
        automaticSilentRenew: true,
        loadUserInfo: true,
    },

    // Logout Configuration
    getLogoutUrl: () => {
        const encodedLogoutUri = encodeURIComponent(origin_url);
        return `${domain}/logout?client_id=${clientId}&logout_uri=${encodedLogoutUri}`;
    },
};

// Hardcoded Departments
export const DEPARTMENTS = {
    ACCOUNTS: "Accounts",
    CHEMICAL_ANALYSIS: "Chemical Analysis",
    LOGISTICS: "Logistics",
    PHYSICAL_TESTING: "Physical Testing",
    SOIL_INVESTIGATION: "Soil Investigation",
    NDT: "Non-Destructive Testing (NDT)",
    MATERIAL_RECEIVING: "Material Receiving"
};

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
    { id: 'QUOTATION_CREATED', label: 'Quotation Created', action: 'Add Material Inward', roles: ['superadmin', 'admin', 'mro'] },
    { id: 'MATERIAL_RECEIVED', label: 'Material Received', action: 'Send for Testing', roles: ['superadmin', 'admin', 'mro'] },
    { id: 'SENT_TO_TESTING_DEPARTMENT', label: 'Sent for Testing', action: 'Start Testing', roles: ['superadmin', 'admin', 'test-staff'] },
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

export const WORKFLOW_STATUS_OPTIONS = WORKFLOW_STEPS.map(step => step.id);

export default cognitoConfig;