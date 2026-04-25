const PREFIX = 'easy_lims_';

export const STORAGE_KEYS = {
    SESSION: `${PREFIX}session`,
    CLIENTS: `${PREFIX}clients`,
    TESTS: `${PREFIX}tests`,
    SERVICES: `${PREFIX}services`,
    SAMPLING_DATA: `${PREFIX}sampling_data`,
    CONTENT: `${PREFIX}content`,
    IMAGES: `${PREFIX}images`,
    REPORT_FORM: `${PREFIX}report_form`,
    EXPENSES: `${PREFIX}expenses`,
};

/**
 * Migration mapping: Maps old (legacy) localStorage keys to new standardized keys.
 * This is used to automatically migrate user data on the first launch.
 */
const LEGACY_MAPPING = {
    // Auth
    'app_session': STORAGE_KEYS.SESSION,
    // Data
    'clients': STORAGE_KEYS.CLIENTS,
    'tests': STORAGE_KEYS.TESTS,
    'services': STORAGE_KEYS.SERVICES,
    'sampling_data': STORAGE_KEYS.SAMPLING_DATA,
    // Content/Assets
    'edge2Easy Billing_content': STORAGE_KEYS.CONTENT,
    'edge2Easy Billing_images': STORAGE_KEYS.IMAGES,
    'site_images': STORAGE_KEYS.IMAGES, // Both old keys map to the same new key
    'newReportFormData': STORAGE_KEYS.REPORT_FORM,
};

/**
 * Migrates old localStorage keys to new ones.
 * This should be called once during app initialization.
 */
export const migrateStorageKeys = () => {
    Object.entries(LEGACY_MAPPING).forEach(([oldKey, newKey]) => {
        const value = localStorage.getItem(oldKey);
        if (value !== null) {
            // Only migrate if the new key doesn't already have data
            if (localStorage.getItem(newKey) === null) {
                localStorage.setItem(newKey, value);
            }
            // Remove old key after migration
            localStorage.removeItem(oldKey);
        }
    });
};
