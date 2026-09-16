/**
 * Utility functions for Base64 encoding and decoding resource IDs (Jobs, Documents, etc.)
 * in URLs to avoid exposing raw database sequence IDs.
 */

/**
 * Checks whether a given string is already an encoded Base64 ID representing digits.
 * @param {string|number} val
 * @returns {boolean}
 */
export function isEncodedId(val) {
  if (val === null || val === undefined || val === '') return false;
  const str = String(val).trim();
  // If it's purely digits, it's an unencoded numeric ID
  if (/^\d+$/.test(str)) return false;

  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const decoded = atob(base64);
    return /^\d+$/.test(decoded);
  } catch (e) {
    return false;
  }
}

/**
 * Encodes a numeric ID to Base64 (e.g. 430 -> "NDMw").
 * Idempotent: if passed an already-encoded ID, returns it as-is.
 * @param {string|number} id
 * @returns {string}
 */
export function encodeId(id) {
  if (id === null || id === undefined || id === '') return '';
  const str = String(id).trim();
  if (isEncodedId(str)) return str;

  try {
    return btoa(str);
  } catch (e) {
    return str;
  }
}

/**
 * Decodes a Base64 ID back to its numeric database ID string (e.g. "NDMw" -> "430").
 * Backward compatible: if passed an already numeric ID (e.g. "430" or 430), returns it as string.
 * @param {string|number} val
 * @returns {string}
 */
export function decodeId(val) {
  if (val === null || val === undefined || val === '') return '';
  const str = String(val).trim();
  if (/^\d+$/.test(str)) return str;

  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const decoded = atob(base64);
    if (/^\d+$/.test(decoded)) {
      return decoded;
    }
    return decoded || str;
  } catch (e) {
    return str;
  }
}
