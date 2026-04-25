
export const DEPARTMENTS = {
    ACCOUNTS: 'Accounts',
    MATERIAL_RECEIVING: 'Material Receiving',
    TESTING: 'Testing'
};

export const ROLES = {
    ADMIN: 'admin',
    ACCOUNTS: 'accounts',
    MRO: 'mro',
    TECHNICIAN: 'technician',
    SENIOR_ANALYST: 'senior_analyst'
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

export const APP_CONFIG = {
    roles: [
        { id: ROLES.ADMIN, name: 'Admin', department: null },
        { id: ROLES.ACCOUNTS, name: 'Accounts Representative', department: DEPARTMENTS.ACCOUNTS },
        { id: ROLES.MRO, name: 'Material Receiving Officer', department: DEPARTMENTS.MATERIAL_RECEIVING },
        { id: ROLES.TECHNICIAN, name: 'Lab Technician', department: DEPARTMENTS.TESTING },
        { id: ROLES.SENIOR_ANALYST, name: 'Senior Analyst', department: DEPARTMENTS.TESTING }
    ],
    
    viewPermissions: {
        [ROLES.ADMIN]: [VIEWS.DASHBOARD, VIEWS.JOBS, VIEWS.MATERIAL_INWARD, VIEWS.TESTING, VIEWS.ACCOUNTS, VIEWS.EXPENSES, VIEWS.WORK_LOG, VIEWS.SETTINGS],
        [ROLES.MRO]: [VIEWS.DASHBOARD, VIEWS.JOBS, VIEWS.MATERIAL_INWARD],
        [ROLES.TECHNICIAN]: [VIEWS.DASHBOARD, VIEWS.TESTING],
        [ROLES.SENIOR_ANALYST]: [VIEWS.DASHBOARD, VIEWS.TESTING, VIEWS.JOBS],
        [ROLES.ACCOUNTS]: [VIEWS.DASHBOARD, VIEWS.JOBS, VIEWS.ACCOUNTS, VIEWS.EXPENSES, VIEWS.WORK_LOG]
    },

    workflow: {
        states: {
            [WORKFLOW_STATES.JOB_CREATED]: {
                label: 'Job Created',
                actions: [
                    { id: 'SEND_QUOTATION', label: 'Send Quotation', targetState: WORKFLOW_STATES.QUOTATION_SENT, roles: [ROLES.ADMIN, ROLES.MRO], navigate: '/doc/new?jobId={jobId}&type=Quotation' }
                ]
            },
            [WORKFLOW_STATES.QUOTATION_SENT]: {
                label: 'Quotation Sent',
                actions: [
                    { id: 'RECEIVE_WORK_ORDER', label: 'Receive Work Order', targetState: WORKFLOW_STATES.WORK_ORDER_RECEIVED, roles: [ROLES.ADMIN, ROLES.MRO] }
                ]
            },
            [WORKFLOW_STATES.WORK_ORDER_RECEIVED]: {
                label: 'Work Order Received',
                actions: [
                    { id: 'RECEIVE_MATERIAL', label: 'Receive Material', targetState: WORKFLOW_STATES.MATERIAL_RECEIVED, roles: [ROLES.ADMIN, ROLES.MRO] }
                ]
            },
            [WORKFLOW_STATES.MATERIAL_RECEIVED]: {
                label: 'Material Received',
                actions: [
                    { id: 'ASSIGN_TECHNICIANS', label: 'Assign Technicians', targetState: WORKFLOW_STATES.TECHNICIANS_ASSIGNED, roles: [ROLES.ADMIN] }
                ]
            },
            [WORKFLOW_STATES.TECHNICIANS_ASSIGNED]: {
                label: 'Technicians Assigned',
                actions: [
                    { id: 'START_TESTING', label: 'Start Testing', targetState: WORKFLOW_STATES.UNDER_TESTING, roles: [ROLES.TECHNICIAN, ROLES.ADMIN] }
                ]
            },
            [WORKFLOW_STATES.UNDER_TESTING]: {
                label: 'Under Testing',
                actions: [
                    { id: 'COMPLETE_TESTING', label: 'Complete Testing', targetState: WORKFLOW_STATES.TESTING_COMPLETE, roles: [ROLES.TECHNICIAN, ROLES.ADMIN] }
                ]
            },
            [WORKFLOW_STATES.TESTING_COMPLETE]: {
                label: 'Testing Complete',
                actions: [
                    { id: 'SUBMIT_FOR_REVIEW', label: 'Submit for Review', targetState: WORKFLOW_STATES.UNDER_REVIEW, roles: [ROLES.TECHNICIAN, ROLES.ADMIN] }
                ]
            },
            [WORKFLOW_STATES.UNDER_REVIEW]: {
                label: 'Under Review',
                actions: [
                    { id: 'VERIFY_DATA', label: 'Verify Data', targetState: WORKFLOW_STATES.DATA_VERIFIED, roles: [ROLES.SENIOR_ANALYST] },
                    { id: 'REJECT_DATA', label: 'Reject (Back to Testing)', targetState: WORKFLOW_STATES.UNDER_TESTING, roles: [ROLES.SENIOR_ANALYST] }
                ]
            },
            [WORKFLOW_STATES.DATA_VERIFIED]: {
                label: 'Data Verified',
                actions: [
                    { id: 'GENERATE_REPORT', label: 'Generate Report', targetState: WORKFLOW_STATES.REPORT_GENERATED, roles: [ROLES.ADMIN, ROLES.MRO] }
                ]
            },
            [WORKFLOW_STATES.REPORT_GENERATED]: {
                label: 'Report Generated',
                actions: [
                    { id: 'SUBMIT_REPORT_REVIEW', label: 'Submit for Signature', targetState: WORKFLOW_STATES.REPORT_UNDER_REVIEW, roles: [ROLES.ADMIN, ROLES.MRO] }
                ]
            },
            [WORKFLOW_STATES.REPORT_UNDER_REVIEW]: {
                label: 'Report Under Review',
                actions: [
                    { id: 'SIGN_REPORT', label: 'Sign & Verify Report', targetState: WORKFLOW_STATES.REPORT_SIGNED, roles: [ROLES.SENIOR_ANALYST] }
                ]
            },
            [WORKFLOW_STATES.REPORT_SIGNED]: {
                label: 'Report Signed',
                actions: [
                    { id: 'GENERATE_INVOICE', label: 'Generate Invoice', targetState: WORKFLOW_STATES.INVOICE_GENERATED, roles: [ROLES.ACCOUNTS], navigate: '/doc/new?jobId={jobId}&type=Tax Invoice' }
                ]
            },
            [WORKFLOW_STATES.INVOICE_GENERATED]: {
                label: 'Invoice Generated',
                actions: [
                    { id: 'SEND_TO_CLIENT', label: 'Awaiting Payment', targetState: WORKFLOW_STATES.AWAITING_PAYMENT, roles: [ROLES.ACCOUNTS] }
                ]
            },
            [WORKFLOW_STATES.AWAITING_PAYMENT]: {
                label: 'Awaiting Payment',
                actions: [
                    { id: 'CONFIRM_PAYMENT', label: 'Release Documents', targetState: WORKFLOW_STATES.PAYMENT_RECEIVED, roles: [ROLES.ACCOUNTS] }
                ]
            },
            [WORKFLOW_STATES.PAYMENT_RECEIVED]: {
                label: 'Payment Received',
                actions: [
                    { id: 'RELEASE_REPORT', label: 'Final Release', targetState: WORKFLOW_STATES.REPORT_RELEASED, roles: [ROLES.ACCOUNTS] }
                ]
            },
            [WORKFLOW_STATES.REPORT_RELEASED]: {
                label: 'Report Released',
                actions: [
                    { id: 'ARCHIVE_JOB', label: 'Complete Job', targetState: WORKFLOW_STATES.JOB_COMPLETE, roles: [ROLES.ADMIN] }
                ]
            },
            [WORKFLOW_STATES.JOB_COMPLETE]: {
                label: 'Job Complete',
                actions: []
            }
        }
    }
};

export const JOB_CATEGORIES = {
    CHEMICAL_TESTING: "Chemical Testing",
    GEOTECHNICAL_TESTING: "Geotechnical/Soil Testing",
    MECHANICAL_TESTING: "Mechanical Testing",
    NON_DESTRUCTIVE_TESTING: "Non Destructive Testing",
    BUILDING_MATERIAL_TESTING: "Building Material Testing",
    HIGHWAY_MATERIAL_TESTING: "Highway Material Testing",

    // Soil: "Soil",
    // GroundWater: "Ground Water",
    // CoarseAggregate: "Coarse Aggregate",
    // FineAggregate: "Fine Aggregate",
    // Cement: "Cement (PPC, OPC, SRPC, RHPC & PSC)",
    // GGBS: "GGBS",
    // HighStrengthDeformedSteelBars: "High Strength Deformed Steel Bars",
    // SolidAndHollowBricks: "Solid and Hollow Bricks",
    // Bricks: "Bricks",
    // HardenedConcreteCore: "Hardened Concrete (Core)",
    // HardenedConcreteCube: "Hardened Concrete (Cube)",
    // PaverBlocks: "Paver Blocks",
    // GranularSubBaseGSB: "Granular Sub Base (GSB)",
    // WetMixMacadamWMM: "Wet Mix Macadam (WMM)",
    // AdmixtureForConstructionPurpose: "Admixture for Construction Purpose",
    // WaterForConstructionPurpose: "Water for Construction Purpose",
    // PotableWater: "Potable Water",
    // HardenedConcrete: "Hardened Concrete"
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
