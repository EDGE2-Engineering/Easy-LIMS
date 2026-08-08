export const MATERIALS = [];

export const DEPARTMENTS = [
  { id: 1, name: 'Chemical Analysis' },
  { id: 2, name: 'Physical Testing' },
  { id: 3, name: 'Soil Investigation' },
  { id: 4, name: 'Non-Destructive Testing (NDT)' },
  { id: 5, name: 'Mechanical Testing' },
];

export const ROLES = {
  SUPER_ADMIN: {
    slug: 'superadmin',
    label: 'Super Administrator',
    description:
      'Global authority with full access to all system modules, configurations, and security settings.',
  },
  ADMIN: {
    slug: 'admin',
    label: 'Administrator',
    description: 'Administrative access for managing users, clients, and laboratory operations.',
  },
  ANALYST: {
    slug: 'analyst',
    label: 'Test Engineer',
    description:
      'Responsible for data verification, report signing, and ensuring quality standards.',
  },
  TECHNICIAN: {
    slug: 'technician',
    label: 'Lab Technician',
    description:
      'Field and laboratory personnel responsible for executing tests and inputting raw data.',
  },
  MRO: {
    slug: 'mro',
    label: 'Material Receiving Officer',
    description: 'Handles sample reception, material inwarding, and initial job documentation.',
  },
  ACCOUNTS: {
    slug: 'accounts',
    label: 'Accounts Officer',
    description: 'Manages invoicing, payment tracking, expenses, and financial documentation.',
  },
  HUMAN_RESOURCE: {
    slug: 'human_resource',
    label: 'Human Resource Officer',
    description: 'Manages employee leaves, attendance, and payroll.',
  },
};

export const WORKFLOW_STATES = {
  JOB_CREATED: 'JOB_CREATED',
  QUOTATION_SENT: 'QUOTATION_SENT',
  WORK_ORDER_RECEIVED: 'WORK_ORDER_RECEIVED',
  MATERIAL_RECEIVED: 'MATERIAL_RECEIVED',
  TECHNICIANS_ASSIGNED: 'TECHNICIANS_ASSIGNED',
  UNDER_TESTING: 'UNDER_TESTING',
  TEST_DATA_UNDER_REVIEW: 'TEST_DATA_UNDER_REVIEW',
  DATA_VERIFIED: 'DATA_VERIFIED',
  REPORT_GENERATED: 'REPORT_GENERATED',
  REPORT_UNDER_REVIEW: 'REPORT_UNDER_REVIEW',
  REPORT_SIGNED: 'REPORT_SIGNED',
  INVOICE_GENERATED: 'INVOICE_GENERATED',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  REPORT_RELEASED: 'REPORT_RELEASED',
  JOB_COMPLETE: 'JOB_COMPLETE',
};

export const VIEWS = {
  DASHBOARD: 'Dashboard',
  JOBS: 'Jobs',
  TESTING: 'Testing',
  DOCUMENTS: 'Documents',
  EXPENSES: 'Expenses',
  WORK_LOG: 'Leaves',
  UTILITIES: 'Utilities',
  SETTINGS: 'Settings',
  APPROVALS: 'Approvals',
  CLIENT_PRICING: 'Client Pricing',
  ORGANIZATION: 'Organization',
  ANALYST_DASHBOARD: 'Analyst Dashboard',
  ACCOUNTS_DASHBOARD: 'Accounts Dashboard',
  TECHNICIAN_DASHBOARD: 'Technician Dashboard',
  MRO_DASHBOARD: 'MRO Dashboard',
  HR_DASHBOARD: 'HR Dashboard',
  INQUIRIES: 'Inquiries',
  MY_LEAVES: 'My Leaves',
  TICKETS: 'Tickets',
};

export const ACTIONS = {
  SEND_QUOTATION: {
    name: 'SEND_QUOTATION',
    label: 'Create Quotation',
    description: 'Generate a formal quotation for the client based on requested tests.',
  },
  RECEIVE_WORK_ORDER: {
    name: 'RECEIVE_WORK_ORDER',
    label: 'Receive Work Order',
    description: "Log the client's confirmed work order into the system.",
  },
  RECEIVE_MATERIAL: {
    name: 'RECEIVE_MATERIAL',
    label: 'Receive Material',
    description: 'Record the arrival of samples and perform material inwarding.',
  },
  ASSIGN_TECHNICIANS: {
    name: 'ASSIGN_TECHNICIANS',
    label: 'Assign Technician',
    description: 'Assign specific lab personnel to perform the required tests.',
  },
  START_TESTING: {
    name: 'START_TESTING',
    label: 'Start Testing',
    description: 'Initiate the laboratory testing process for the assigned samples.',
  },
  COMPLETE_TESTING_AND_SUBMIT_FOR_REVIEW: {
    name: 'COMPLETE_TESTING_AND_SUBMIT_FOR_REVIEW',
    label: 'Complete Testing & Submit for Review',
    description: 'Finish all tests, enter results, and submit them for administrative review.',
  },
  APPROVE_TEST_RESULTS: {
    name: 'APPROVE_TEST_RESULTS',
    label: 'Approve Test Results',
    description: 'Verify and approve the laboratory test data for accuracy.',
  },
  REJECT_TEST_RESULTS: {
    name: 'REJECT_TEST_RESULTS',
    label: 'Reject Test Results',
    description: 'Identify issues in test data and send back for re-testing.',
  },
  GENERATE_REPORT: {
    name: 'GENERATE_REPORT',
    label: 'Generate Report',
    description: 'Prepare the final technical report based on approved test data.',
  },
  SUBMIT_REPORT_REVIEW: {
    name: 'SUBMIT_REPORT_REVIEW',
    label: 'Submit for Review',
    description: 'Submit the generated report for final quality and technical review.',
  },
  SIGN_REPORT: {
    name: 'SIGN_REPORT',
    label: 'Sign Report',
    description: 'Digitally sign the report to finalize and authorize it for release.',
  },
  GENERATE_INVOICE: {
    name: 'GENERATE_INVOICE',
    label: 'Generate Invoice',
    description: 'Create a tax invoice for the services rendered.',
  },
  SEND_TO_CLIENT: {
    name: 'SEND_TO_CLIENT',
    label: 'Send to Client',
    description: 'Dispatch the invoice and notifications to the client.',
  },
  CONFIRM_PAYMENT: {
    name: 'CONFIRM_PAYMENT',
    label: 'Confirm Payment',
    description: 'Verify that payment has been received and logged in accounts.',
  },
  RELEASE_REPORT: {
    name: 'RELEASE_REPORT',
    label: 'Release Report',
    description: 'Officially release the signed report to the client.',
  },
  MARK_JOB_COMPLETE: {
    name: 'MARK_JOB_COMPLETE',
    label: 'Mark as Complete',
    description: 'Close the job after all deliverables and payments are finalized.',
  },
};

export const NAVBAR_ACTIONS = {
  APPLY_LEAVE: 'APPLY_LEAVE',
};

// IDs for main navbar items (used in APP_CONFIG.navbar.navItems)
export const NAV_ITEM_IDS = {
  DASHBOARD: 'dashboard',
  ANALYST_DASHBOARD: 'analyst_dashboard',
  ACCOUNTS_DASHBOARD: 'accounts_dashboard',
  JOBS: 'jobs',
  DOCUMENTS: 'documents',
  EXPENSES: 'expenses',
  TECHNICIAN_DASHBOARD: 'technician_dashboard',
  MRO_DASHBOARD: 'mro_dashboard',
  CLIENTS: 'clients',
  HR_DASHBOARD: 'hr_dashboard',
  BEARING_CAPACITY: 'bearing_capacity',
};

// IDs for settings dropdown sub-items (used in APP_CONFIG.navbar.settingsItems)
export const SETTINGS_ITEM_IDS = {
  ORGANIZATION: 'organization',
  CLIENTS: 'clients',
  CLIENT_PRICING: 'client_pricing',
  FIELD_TESTS: 'field_tests',
  LAB_TESTS: 'lab_tests',
  PACKAGES: 'packages',
  SAMPLING: 'sampling',
  UTILITIES: 'utilities',
  SYSTEM: 'system',
  BEARING_CAPACITY: 'bearing_capacity',
  STATEMENTS: 'statements',
};

export const DOCUMENT_ITEM_TYPE_KEYS = {
  FIELD_TESTS: 'service',
  LAB_TESTS: 'test',
  SAMPLING: 'sampling',
};

export const DOCUMENT_ITEM_TYPES = {
  FIELD_TESTS: {
    key: DOCUMENT_ITEM_TYPE_KEYS.FIELD_TESTS,
    label: 'Field Test',
  },
  LAB_TESTS: {
    key: DOCUMENT_ITEM_TYPE_KEYS.LAB_TESTS,
    label: 'Lab Test',
  },
  SAMPLING: {
    key: DOCUMENT_ITEM_TYPE_KEYS.SAMPLING,
    label: 'Sampling',
  },
};

export const DOCUMENT_ITEM_TYPE_OPTIONS = Object.values(DOCUMENT_ITEM_TYPES);

export const getDocumentItemTypeLabel = (key) =>
  DOCUMENT_ITEM_TYPE_OPTIONS.find((itemType) => itemType.key === key)?.label || key;

export const APP_CONFIG = {
  workflow: {
    states: {
      [WORKFLOW_STATES.JOB_CREATED]: {
        label: 'Job Created',
        color: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
        actions: [
          {
            id: ACTIONS.SEND_QUOTATION.name,
            label: ACTIONS.SEND_QUOTATION.label,
            description: ACTIONS.SEND_QUOTATION.description,
            targetState: WORKFLOW_STATES.QUOTATION_SENT,
            roles: [ROLES.ADMIN.slug, ROLES.MRO.slug],
            navigate: '/doc/new?jobId={jobId}&type=Quotation',
          },
        ],
      },
      [WORKFLOW_STATES.QUOTATION_SENT]: {
        label: 'Quotation Created',
        color: { bg: '#fffbeb', text: '#92400e', border: '#fcd34d' },
        actions: [
          {
            id: ACTIONS.RECEIVE_WORK_ORDER.name,
            label: ACTIONS.RECEIVE_WORK_ORDER.label,
            description: ACTIONS.RECEIVE_WORK_ORDER.description,
            targetState: WORKFLOW_STATES.WORK_ORDER_RECEIVED,
            roles: [ROLES.ADMIN.slug, ROLES.MRO.slug],
          },
        ],
      },
      [WORKFLOW_STATES.WORK_ORDER_RECEIVED]: {
        label: 'Work Order Received',
        color: { bg: '#fff7ed', text: '#9a3412', border: '#fdba74' },
        actions: [
          {
            id: ACTIONS.RECEIVE_MATERIAL.name,
            label: ACTIONS.RECEIVE_MATERIAL.label,
            description: ACTIONS.RECEIVE_MATERIAL.description,
            targetState: WORKFLOW_STATES.MATERIAL_RECEIVED,
            roles: [ROLES.ADMIN.slug, ROLES.MRO.slug],
          },
        ],
      },
      [WORKFLOW_STATES.MATERIAL_RECEIVED]: {
        label: 'Material Received',
        color: { bg: '#fef3c7', text: '#78350f', border: '#f59e0b' },
        actions: [
          {
            id: ACTIONS.ASSIGN_TECHNICIANS.name,
            label: ACTIONS.ASSIGN_TECHNICIANS.label,
            description: ACTIONS.ASSIGN_TECHNICIANS.description,
            targetState: WORKFLOW_STATES.TECHNICIANS_ASSIGNED,
            roles: [ROLES.ADMIN.slug, ROLES.MRO.slug],
          },
        ],
      },
      [WORKFLOW_STATES.TECHNICIANS_ASSIGNED]: {
        label: 'Technician Assigned',
        color: { bg: '#fef9c3', text: '#713f12', border: '#fde047' },
        actions: [
          {
            id: ACTIONS.START_TESTING.name,
            label: ACTIONS.START_TESTING.label,
            description: ACTIONS.START_TESTING.description,
            targetState: WORKFLOW_STATES.UNDER_TESTING,
            roles: [ROLES.TECHNICIAN.slug, ROLES.ADMIN.slug, ROLES.ANALYST.slug],
          },
        ],
      },
      [WORKFLOW_STATES.UNDER_TESTING]: {
        label: 'Under Testing',
        color: { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
        actions: [
          {
            id: ACTIONS.COMPLETE_TESTING_AND_SUBMIT_FOR_REVIEW.name,
            label: ACTIONS.COMPLETE_TESTING_AND_SUBMIT_FOR_REVIEW.label,
            description: ACTIONS.COMPLETE_TESTING_AND_SUBMIT_FOR_REVIEW.description,
            targetState: WORKFLOW_STATES.TEST_DATA_UNDER_REVIEW,
            roles: [ROLES.TECHNICIAN.slug, ROLES.ADMIN.slug, ROLES.ANALYST.slug],
          },
        ],
      },
      [WORKFLOW_STATES.TEST_DATA_UNDER_REVIEW]: {
        label: 'Under Review',
        color: { bg: '#f5f3ff', text: '#6d28d9', border: '#c4b5fd' },
        actions: [
          {
            id: ACTIONS.APPROVE_TEST_RESULTS.name,
            label: ACTIONS.APPROVE_TEST_RESULTS.label,
            description: ACTIONS.APPROVE_TEST_RESULTS.description,
            targetState: WORKFLOW_STATES.DATA_VERIFIED,
            roles: [ROLES.ADMIN.slug, ROLES.ANALYST.slug],
          },
          {
            id: ACTIONS.REJECT_TEST_RESULTS.name,
            label: ACTIONS.REJECT_TEST_RESULTS.label,
            description: ACTIONS.REJECT_TEST_RESULTS.description,
            targetState: WORKFLOW_STATES.UNDER_TESTING,
            roles: [ROLES.ADMIN.slug, ROLES.ANALYST.slug],
          },
        ],
      },
      [WORKFLOW_STATES.DATA_VERIFIED]: {
        label: 'Data Verified',
        color: { bg: '#ede9fe', text: '#5b21b6', border: '#a78bfa' },
        actions: [
          {
            id: ACTIONS.GENERATE_REPORT.name,
            label: ACTIONS.GENERATE_REPORT.label,
            description: ACTIONS.GENERATE_REPORT.description,
            targetState: WORKFLOW_STATES.REPORT_GENERATED,
            roles: [ROLES.ADMIN.slug, ROLES.ANALYST.slug],
          },
        ],
      },
      [WORKFLOW_STATES.REPORT_GENERATED]: {
        label: 'Report Generated',
        color: { bg: '#fdf4ff', text: '#7e22ce', border: '#d8b4fe' },
        actions: [
          {
            id: ACTIONS.SUBMIT_REPORT_REVIEW.name,
            label: ACTIONS.SUBMIT_REPORT_REVIEW.label,
            description: ACTIONS.SUBMIT_REPORT_REVIEW.description,
            targetState: WORKFLOW_STATES.REPORT_UNDER_REVIEW,
            roles: [ROLES.ADMIN.slug],
          },
        ],
      },
      [WORKFLOW_STATES.REPORT_UNDER_REVIEW]: {
        label: 'Report Under Review',
        color: { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
        actions: [
          {
            id: ACTIONS.SIGN_REPORT.name,
            label: ACTIONS.SIGN_REPORT.label,
            description: ACTIONS.SIGN_REPORT.description,
            targetState: WORKFLOW_STATES.REPORT_SIGNED,
            roles: [ROLES.ADMIN.slug],
          },
        ],
      },
      [WORKFLOW_STATES.REPORT_SIGNED]: {
        label: 'Report Signed',
        color: { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' },
        actions: [
          {
            id: ACTIONS.GENERATE_INVOICE.name,
            label: ACTIONS.GENERATE_INVOICE.label,
            description: ACTIONS.GENERATE_INVOICE.description,
            targetState: WORKFLOW_STATES.INVOICE_GENERATED,
            roles: [ROLES.ACCOUNTS.slug],
            navigate: '/doc/new?jobId={jobId}&type=Tax Invoice',
          },
        ],
      },
      [WORKFLOW_STATES.INVOICE_GENERATED]: {
        label: 'Invoice Generated',
        color: { bg: '#f0fdfa', text: '#0f766e', border: '#5eead4' },
        actions: [
          {
            id: ACTIONS.SEND_TO_CLIENT.name,
            label: ACTIONS.SEND_TO_CLIENT.label,
            description: ACTIONS.SEND_TO_CLIENT.description,
            targetState: WORKFLOW_STATES.AWAITING_PAYMENT,
            roles: [ROLES.ACCOUNTS.slug],
          },
        ],
      },
      [WORKFLOW_STATES.AWAITING_PAYMENT]: {
        label: 'Awaiting Payment',
        color: { bg: '#fff1f2', text: '#be123c', border: '#fda4af' },
        actions: [
          {
            id: ACTIONS.CONFIRM_PAYMENT.name,
            label: ACTIONS.CONFIRM_PAYMENT.label,
            description: ACTIONS.CONFIRM_PAYMENT.description,
            targetState: WORKFLOW_STATES.PAYMENT_RECEIVED,
            roles: [ROLES.ACCOUNTS.slug],
          },
        ],
      },
      [WORKFLOW_STATES.PAYMENT_RECEIVED]: {
        label: 'Payment Received',
        color: { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
        actions: [
          {
            id: ACTIONS.RELEASE_REPORT.name,
            label: ACTIONS.RELEASE_REPORT.label,
            description: ACTIONS.RELEASE_REPORT.description,
            targetState: WORKFLOW_STATES.REPORT_RELEASED,
            roles: [ROLES.ACCOUNTS.slug],
          },
        ],
      },
      [WORKFLOW_STATES.REPORT_RELEASED]: {
        label: 'Report Released',
        color: { bg: '#dcfce7', text: '#166534', border: '#4ade80' },
        actions: [
          {
            id: ACTIONS.MARK_JOB_COMPLETE.name,
            label: ACTIONS.MARK_JOB_COMPLETE.label,
            description: ACTIONS.MARK_JOB_COMPLETE.description,
            targetState: WORKFLOW_STATES.JOB_COMPLETE,
            roles: [ROLES.ADMIN.slug],
          },
        ],
      },
      [WORKFLOW_STATES.JOB_COMPLETE]: {
        label: 'Job Complete',
        color: { bg: '#bbf7d0', text: '#14532d', border: '#22c55e' },
        actions: [],
      },
    },
  },
  navbar: {
    // ── Button-level actions (e.g. Apply Leave in user dropdown) ──────────
    // List NAVBAR_ACTIONS values each role is allowed to trigger.
    // An empty array means no extra actions are shown for that role.
    permissions: {
      [ROLES.SUPER_ADMIN.slug]: [],
      [ROLES.ADMIN.slug]: [],
      [ROLES.ANALYST.slug]: [NAVBAR_ACTIONS.APPLY_LEAVE],
      [ROLES.TECHNICIAN.slug]: [NAVBAR_ACTIONS.APPLY_LEAVE],
      [ROLES.MRO.slug]: [NAVBAR_ACTIONS.APPLY_LEAVE],
      [ROLES.ACCOUNTS.slug]: [NAVBAR_ACTIONS.APPLY_LEAVE],
      [ROLES.HUMAN_RESOURCE.slug]: [NAVBAR_ACTIONS.APPLY_LEAVE],
    },

    // ── Main navbar links ─────────────────────────────────────────────────
    // List NAV_ITEM_IDS values each role can see in the top navigation bar.
    // Set a role to null (or omit it) to fall back to viewPermissions logic.
    navItems: {
      [ROLES.SUPER_ADMIN.slug]: [NAV_ITEM_IDS.DASHBOARD, NAV_ITEM_IDS.JOBS, NAV_ITEM_IDS.DOCUMENTS],
      [ROLES.ADMIN.slug]: [NAV_ITEM_IDS.DASHBOARD, NAV_ITEM_IDS.JOBS, NAV_ITEM_IDS.DOCUMENTS],
      [ROLES.ANALYST.slug]: [
        NAV_ITEM_IDS.ANALYST_DASHBOARD,
        NAV_ITEM_IDS.JOBS,
        NAV_ITEM_IDS.BEARING_CAPACITY,
      ],
      [ROLES.TECHNICIAN.slug]: [NAV_ITEM_IDS.TECHNICIAN_DASHBOARD, NAV_ITEM_IDS.JOBS],
      [ROLES.MRO.slug]: [NAV_ITEM_IDS.MRO_DASHBOARD, NAV_ITEM_IDS.JOBS, NAV_ITEM_IDS.CLIENTS],
      [ROLES.ACCOUNTS.slug]: [
        NAV_ITEM_IDS.ACCOUNTS_DASHBOARD,
        NAV_ITEM_IDS.DOCUMENTS,
        NAV_ITEM_IDS.EXPENSES,
        NAV_ITEM_IDS.CLIENTS,
      ],
      [ROLES.HUMAN_RESOURCE.slug]: [NAV_ITEM_IDS.HR_DASHBOARD],
    },

    // ── Settings dropdown sub-items ───────────────────────────────────────
    // List SETTINGS_ITEM_IDS values each role can see in the Settings menu.
    // Set a role to null (or omit it) to fall back to viewPermissions logic.
    settingsItems: {
      [ROLES.SUPER_ADMIN.slug]: [
        SETTINGS_ITEM_IDS.ORGANIZATION,
        SETTINGS_ITEM_IDS.CLIENTS,
        SETTINGS_ITEM_IDS.CLIENT_PRICING,
        SETTINGS_ITEM_IDS.FIELD_TESTS,
        SETTINGS_ITEM_IDS.LAB_TESTS,
        SETTINGS_ITEM_IDS.PACKAGES,
        SETTINGS_ITEM_IDS.SAMPLING,
        SETTINGS_ITEM_IDS.UTILITIES,
        SETTINGS_ITEM_IDS.SYSTEM,
      ],
      [ROLES.ADMIN.slug]: [
        SETTINGS_ITEM_IDS.ORGANIZATION,
        SETTINGS_ITEM_IDS.CLIENTS,
        SETTINGS_ITEM_IDS.CLIENT_PRICING,
        SETTINGS_ITEM_IDS.FIELD_TESTS,
        SETTINGS_ITEM_IDS.LAB_TESTS,
        SETTINGS_ITEM_IDS.PACKAGES,
        SETTINGS_ITEM_IDS.SAMPLING,
        SETTINGS_ITEM_IDS.UTILITIES,
        SETTINGS_ITEM_IDS.SYSTEM,
      ],
      [ROLES.ANALYST.slug]: [],
      [ROLES.TECHNICIAN.slug]: [],
      [ROLES.MRO.slug]: [],
      [ROLES.ACCOUNTS.slug]: [],
      [ROLES.HUMAN_RESOURCE.slug]: [SETTINGS_ITEM_IDS.ORGANIZATION],
    },
  },
  viewPermissions: {
    [ROLES.SUPER_ADMIN.slug]: Object.values(VIEWS).filter(
      (v) => v !== VIEWS.ANALYST_DASHBOARD && v !== VIEWS.ACCOUNTS_DASHBOARD
    ),
    [ROLES.ADMIN.slug]: Object.values(VIEWS).filter(
      (v) => v !== VIEWS.ANALYST_DASHBOARD && v !== VIEWS.ACCOUNTS_DASHBOARD
    ),
    [ROLES.ANALYST.slug]: [
      VIEWS.ANALYST_DASHBOARD,
      VIEWS.JOBS,
      VIEWS.SETTINGS,
      VIEWS.MY_LEAVES,
      VIEWS.TICKETS,
    ],
    [ROLES.TECHNICIAN.slug]: [
      VIEWS.TECHNICIAN_DASHBOARD,
      VIEWS.JOBS,
      VIEWS.TESTING,
      VIEWS.MY_LEAVES,
      VIEWS.TICKETS,
    ],
    [ROLES.MRO.slug]: [
      VIEWS.MRO_DASHBOARD,
      VIEWS.JOBS,
      VIEWS.SETTINGS,
      VIEWS.MY_LEAVES,
      VIEWS.TICKETS,
    ],
    [ROLES.ACCOUNTS.slug]: [
      VIEWS.ACCOUNTS_DASHBOARD,
      VIEWS.DOCUMENTS,
      VIEWS.EXPENSES,
      VIEWS.SETTINGS,
      VIEWS.MY_LEAVES,
      VIEWS.TICKETS,
    ],
    [ROLES.HUMAN_RESOURCE.slug]: [
      VIEWS.HR_DASHBOARD,
      VIEWS.WORK_LOG,
      VIEWS.APPROVALS,
      VIEWS.MY_LEAVES,
      VIEWS.TICKETS,
    ],
  },
};

export const TG_NOTIFIER_CONFIG = {
  BOT_TOKEN: 'YOUR_BOT_TOKEN',
  CHAT_ID: 'YOUR_CHAT_ID',
};

export const getSiteContent = () => ({
  global: {
    siteName: 'Easy LIMS',
  },
});

export const enableInfoDiagramZoom = true;

export const TICKET_STATUSES = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  NEED_MORE_DETAILS: 'Need More Details',
  NEEDS_VERIFICATION: 'Needs Verification',
  VERIFIED: 'Verified',
  RESOLVED: 'Resolved',
  INVALID_REQUIREMENT: 'Invalid Requirement',
  CLOSED: 'Closed',
  DEFERRED: 'Deferred',
};

