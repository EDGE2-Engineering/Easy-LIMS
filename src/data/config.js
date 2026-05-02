export const DEPARTMENTS = [
    { id: 1, name: 'Chemical Analysis' },
    { id: 2, name: 'Physical Testing' },
    { id: 3, name: 'Soil Investigation' },
    { id: 4, name: 'Non-Destructive Testing (NDT)' },
];

export const ROLES = {
    SUPER_ADMIN: {
        slug: 'superadmin',
        label: 'Super Administrator',
        description: 'Global authority with full access to all system modules, configurations, and security settings.'
    },
    ADMIN: {
        slug: 'admin',
        label: 'Administrator',
        description: 'Administrative access for managing users, clients, and laboratory operations.'
    },
    ANALYST: {
        slug: 'analyst',
        label: 'Quality Analyst',
        description: 'Responsible for data verification, report signing, and ensuring quality standards.'
    },
    TECHNICIAN: {
        slug: 'technician',
        label: 'Lab Technician',
        description: 'Field and laboratory personnel responsible for executing tests and inputting raw data.'
    },
    MRO: {
        slug: 'mro',
        label: 'Material Receiving Officer',
        description: 'Handles sample reception, material inwarding, and initial job documentation.'
    },
    ACCOUNTS: {
        slug: 'accounts',
        label: 'Accounts Officer',
        description: 'Manages invoicing, payment tracking, expenses, and financial documentation.'
    }
};

export const WORKFLOW_STATES = {
    JOB_CREATED: 'JOB_CREATED',
    QUOTATION_SENT: 'QUOTATION_SENT',
    WORK_ORDER_RECEIVED: 'WORK_ORDER_RECEIVED',
    MATERIAL_RECEIVED: 'MATERIAL_RECEIVED',
    TECHNICIANS_ASSIGNED: 'TECHNICIANS_ASSIGNED',
    UNDER_TESTING: 'UNDER_TESTING',
    TESTING_COMPLETE: 'TESTING_COMPLETE',
    UNDER_REVIEW: 'UNDER_REVIEW',
    DATA_VERIFIED: 'DATA_VERIFIED',
    REPORT_GENERATED: 'REPORT_GENERATED',
    REPORT_UNDER_REVIEW: 'REPORT_UNDER_REVIEW',
    REPORT_SIGNED: 'REPORT_SIGNED',
    INVOICE_GENERATED: 'INVOICE_GENERATED',
    AWAITING_PAYMENT: 'AWAITING_PAYMENT',
    PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
    REPORT_RELEASED: 'REPORT_RELEASED',
    JOB_COMPLETE: 'JOB_COMPLETE'
};

export const VIEWS = {
    DASHBOARD: 'Dashboard',
    JOBS: 'Jobs',
    MATERIAL_INWARD: 'Material Inward',
    TESTING: 'Testing',
    ACCOUNTS: 'Accounts',
    EXPENSES: 'Expenses',
    WORK_LOG: 'Work Log',
    SETTINGS: 'Settings'
};

export const ACTIONS = {
   SEND_QUOTATION: { name: 'SEND_QUOTATION', label: 'Send Quotation' },
   RECEIVE_WORK_ORDER: { name: 'RECEIVE_WORK_ORDER', label: 'Receive Work Order' },
   RECEIVE_MATERIAL: { name: 'RECEIVE_MATERIAL', label: 'Receive Material' },
   ASSIGN_TECHNICIANS: { name: 'ASSIGN_TECHNICIANS', label: 'Assign Technicians' },
   START_TESTING: { name: 'START_TESTING', label: 'Start Testing' },
   COMPLETE_TESTING: { name: 'COMPLETE_TESTING', label: 'Complete Testing' },
   SUBMIT_FOR_REVIEW: { name: 'SUBMIT_FOR_REVIEW', label: 'Submit for Review' },
   VERIFY_DATA: { name: 'VERIFY_DATA', label: 'Verify Data' },
   REJECT_DATA: { name: 'REJECT_DATA', label: 'Reject' },
   GENERATE_REPORT: { name: 'GENERATE_REPORT', label: 'Generate Report' },
   SUBMIT_REPORT_REVIEW: { name: 'SUBMIT_REPORT_REVIEW', label: 'Submit for Review' },
   SIGN_REPORT: { name: 'SIGN_REPORT', label: 'Sign Report' },
   GENERATE_INVOICE: { name: 'GENERATE_INVOICE', label: 'Generate Invoice' },
   SEND_TO_CLIENT: { name: 'SEND_TO_CLIENT', label: 'Send to Client' },
   CONFIRM_PAYMENT: { name: 'CONFIRM_PAYMENT', label: 'Confirm Payment' },
   RELEASE_REPORT: { name: 'RELEASE_REPORT', label: 'Release Report' },
   ARCHIVE_JOB: { name: 'ARCHIVE_JOB', label: 'Archive Job' }
}; 


export const APP_CONFIG = {
    workflow: {
        states: {
            [WORKFLOW_STATES.JOB_CREATED]: {
                label: 'Job Created',
                actions: [
                    { id: ACTIONS.SEND_QUOTATION.name, label: ACTIONS.SEND_QUOTATION.label, targetState: WORKFLOW_STATES.QUOTATION_SENT, roles: [ROLES.ADMIN.slug, ROLES.MRO.slug], navigate: '/doc/new?jobId={jobId}&type=Quotation' }
                ]
            },
            [WORKFLOW_STATES.QUOTATION_SENT]: {
                label: 'Quotation Sent',
                actions: [
                    { id: ACTIONS.RECEIVE_WORK_ORDER.name, label: ACTIONS.RECEIVE_WORK_ORDER.label, targetState: WORKFLOW_STATES.WORK_ORDER_RECEIVED, roles: [ROLES.ADMIN.slug, ROLES.MRO.slug] }
                ]
            },
            [WORKFLOW_STATES.WORK_ORDER_RECEIVED]: {
                label: 'Work Order Received',
                actions: [
                    { id: ACTIONS.RECEIVE_MATERIAL.name, label: ACTIONS.RECEIVE_MATERIAL.label, targetState: WORKFLOW_STATES.MATERIAL_RECEIVED, roles: [ROLES.ADMIN.slug, ROLES.MRO.slug] }
                ]
            },
            [WORKFLOW_STATES.MATERIAL_RECEIVED]: {
                label: 'Material Received',
                actions: [
                    { id: ACTIONS.ASSIGN_TECHNICIANS.name, label: ACTIONS.ASSIGN_TECHNICIANS.label, targetState: WORKFLOW_STATES.TECHNICIANS_ASSIGNED, roles: [ROLES.ADMIN.slug] }
                ]
            },
            [WORKFLOW_STATES.TECHNICIANS_ASSIGNED]: {
                label: 'Technicians Assigned',
                actions: [
                    { id: ACTIONS.START_TESTING.name, label: ACTIONS.START_TESTING.label, targetState: WORKFLOW_STATES.UNDER_TESTING, roles: [ROLES.TECHNICIAN.slug, ROLES.ADMIN.slug] }
                ]
            },
            [WORKFLOW_STATES.UNDER_TESTING]: {
                label: 'Under Testing',
                actions: [
                    { id: ACTIONS.COMPLETE_TESTING.name, label: ACTIONS.COMPLETE_TESTING.label, targetState: WORKFLOW_STATES.TESTING_COMPLETE, roles: [ROLES.TECHNICIAN.slug, ROLES.ADMIN.slug] }
                ]
            },
            [WORKFLOW_STATES.TESTING_COMPLETE]: {
                label: 'Testing Complete',
                actions: [
                    { id: ACTIONS.SUBMIT_FOR_REVIEW.name, label: ACTIONS.SUBMIT_FOR_REVIEW.label, targetState: WORKFLOW_STATES.UNDER_REVIEW, roles: [ROLES.TECHNICIAN.slug, ROLES.ADMIN.slug] }
                ]
            },
            [WORKFLOW_STATES.UNDER_REVIEW]: {
                label: 'Under Review',
                actions: [
                    { id: ACTIONS.VERIFY_DATA.name, label: ACTIONS.VERIFY_DATA.label, targetState: WORKFLOW_STATES.DATA_VERIFIED, roles: [ROLES.ANALYST.slug] },
                    { id: ACTIONS.REJECT_DATA.name, label: ACTIONS.REJECT_DATA.label, targetState: WORKFLOW_STATES.UNDER_TESTING, roles: [ROLES.ANALYST.slug] }
                ]
            },
            [WORKFLOW_STATES.DATA_VERIFIED]: {
                label: 'Data Verified',
                actions: [
                    { id: ACTIONS.GENERATE_REPORT.name, label: ACTIONS.GENERATE_REPORT.label, targetState: WORKFLOW_STATES.REPORT_GENERATED, roles: [ROLES.ADMIN.slug, ROLES.MRO.slug] }
                ]
            },
            [WORKFLOW_STATES.REPORT_GENERATED]: {
                label: 'Report Generated',
                actions: [
                    { id: ACTIONS.SUBMIT_REPORT_REVIEW.name, label: ACTIONS.SUBMIT_REPORT_REVIEW.label, targetState: WORKFLOW_STATES.REPORT_UNDER_REVIEW, roles: [ROLES.ADMIN.slug, ROLES.MRO.slug] }
                ]
            },
            [WORKFLOW_STATES.REPORT_UNDER_REVIEW]: {
                label: 'Report Under Review',
                actions: [
                    { id: ACTIONS.SIGN_REPORT.name, label: ACTIONS.SIGN_REPORT.label, targetState: WORKFLOW_STATES.REPORT_SIGNED, roles: [ROLES.ANALYST.slug] }
                ]
            },
            [WORKFLOW_STATES.REPORT_SIGNED]: {
                label: 'Report Signed',
                actions: [
                    { id: ACTIONS.GENERATE_INVOICE.name, label: ACTIONS.GENERATE_INVOICE.label, targetState: WORKFLOW_STATES.INVOICE_GENERATED, roles: [ROLES.ACCOUNTS.slug], navigate: '/doc/new?jobId={jobId}&type=Tax Invoice' }
                ]
            },
            [WORKFLOW_STATES.INVOICE_GENERATED]: {
                label: 'Invoice Generated',
                actions: [
                    { id: ACTIONS.SEND_TO_CLIENT.name, label: ACTIONS.SEND_TO_CLIENT.label, targetState: WORKFLOW_STATES.AWAITING_PAYMENT, roles: [ROLES.ACCOUNTS.slug] }
                ]
            },
            [WORKFLOW_STATES.AWAITING_PAYMENT]: {
                label: 'Awaiting Payment',
                actions: [
                    { id: ACTIONS.CONFIRM_PAYMENT.name, label: ACTIONS.CONFIRM_PAYMENT.label, targetState: WORKFLOW_STATES.PAYMENT_RECEIVED, roles: [ROLES.ACCOUNTS.slug] }
                ]
            },
            [WORKFLOW_STATES.PAYMENT_RECEIVED]: {
                label: 'Payment Received',
                actions: [
                    { id: ACTIONS.RELEASE_REPORT.name, label: ACTIONS.RELEASE_REPORT.label, targetState: WORKFLOW_STATES.REPORT_RELEASED, roles: [ROLES.ACCOUNTS.slug] }
                ]
            },
            [WORKFLOW_STATES.REPORT_RELEASED]: {
                label: 'Report Released',
                actions: [
                    { id: ACTIONS.ARCHIVE_JOB.name, label: ACTIONS.ARCHIVE_JOB.label, targetState: WORKFLOW_STATES.JOB_COMPLETE, roles: [ROLES.ADMIN.slug] }
                ]
            },
            [WORKFLOW_STATES.JOB_COMPLETE]: {
                label: 'Job Complete',
                actions: []
            }
        }
    },
    viewPermissions: {
        [ROLES.SUPER_ADMIN.slug]: Object.values(VIEWS),
        [ROLES.ADMIN.slug]: Object.values(VIEWS),
        [ROLES.ANALYST.slug]: [VIEWS.DASHBOARD, VIEWS.JOBS, VIEWS.TESTING],
        [ROLES.TECHNICIAN.slug]: [VIEWS.DASHBOARD, VIEWS.TESTING],
        [ROLES.MRO.slug]: [VIEWS.DASHBOARD, VIEWS.MATERIAL_INWARD, VIEWS.JOBS],
        [ROLES.ACCOUNTS.slug]: [VIEWS.DASHBOARD, VIEWS.ACCOUNTS, VIEWS.EXPENSES, VIEWS.WORK_LOG]
    }
};


export const TG_NOTIFIER_CONFIG = {
    BOT_TOKEN: "YOUR_BOT_TOKEN",
    CHAT_ID: "YOUR_CHAT_ID"
};

export const getSiteContent = () => ({
    global: {
        siteName: "Easy LIMS"
    }
});

export const enableInfoDiagramZoom = true;
