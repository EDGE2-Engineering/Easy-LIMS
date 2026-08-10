const PREFIX = 'easy_lims_';

export const STORAGE_KEYS = {
  SESSION: `${PREFIX}session`,
  CLIENTS: `${PREFIX}clients`,
  LAB_TESTS: `${PREFIX}lab_tests`,
  FIELD_TESTS: `${PREFIX}field_tests`,
  SAMPLING_DATA: `${PREFIX}sampling_data`,
  CONTENT: `${PREFIX}content`,
  IMAGES: `${PREFIX}images`,
  REPORT_FORM: `${PREFIX}report_form`,
  EXPENSES: `${PREFIX}expenses`,
  PACKAGES: `${PREFIX}packages`,
  LAST_ACTIVITY: `${PREFIX}last_activity`,
  AUTH_TOKEN: `${PREFIX}auth_token`,
};

/**
 * Migration mapping: Maps old (legacy) localStorage keys to new standardized keys.
 * This is used to automatically migrate user data on the first launch.
 */
const LEGACY_MAPPING = {
  // Auth
  app_session: STORAGE_KEYS.SESSION,
  // Data
  clients: STORAGE_KEYS.CLIENTS,
  tests: STORAGE_KEYS.LAB_TESTS,
  services: STORAGE_KEYS.FIELD_TESTS,
  easy_lims_tests: STORAGE_KEYS.LAB_TESTS,
  easy_lims_services: STORAGE_KEYS.FIELD_TESTS,
  sampling_data: STORAGE_KEYS.SAMPLING_DATA,
  // Content/Assets
  edge2EasyLIMS_content: STORAGE_KEYS.CONTENT,
  edge2EasyLIMS_images: STORAGE_KEYS.IMAGES,
  site_images: STORAGE_KEYS.IMAGES, // Both old keys map to the same new key
  newReportFormData: STORAGE_KEYS.REPORT_FORM,
};

/**
 * Migrates old localStorage keys to new ones.
 * This should be called once during app initialization.
 */
export const migrateStorageKeys = () => {
  // Purge entity and session data from localStorage as data is now always fetched directly from APIs
  const keysToPurge = [
    STORAGE_KEYS.SESSION,
    STORAGE_KEYS.CLIENTS,
    STORAGE_KEYS.LAB_TESTS,
    STORAGE_KEYS.FIELD_TESTS,
    STORAGE_KEYS.SAMPLING_DATA,
    STORAGE_KEYS.EXPENSES,
    STORAGE_KEYS.PACKAGES,
    'app_session',
    'clients',
    'tests',
    'services',
    'easy_lims_tests',
    'easy_lims_services',
    'sampling_data',
  ];

  keysToPurge.forEach((key) => {
    localStorage.removeItem(key);
  });

  Object.entries(LEGACY_MAPPING).forEach(([oldKey, newKey]) => {
    if (keysToPurge.includes(oldKey) || keysToPurge.includes(newKey)) return;
    const value = localStorage.getItem(oldKey);
    if (value !== null) {
      if (localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, value);
      }
      localStorage.removeItem(oldKey);
    }
  });
};
