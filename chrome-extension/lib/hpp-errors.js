/**
 * hpp-errors.js
 * All HPP error codes, display strings, and recovery metadata.
 * Spec reference: Section IX — Error Handling and Recovery
 */

'use strict';

export const HPP_ERRORS = {

  HPP_CHALLENGE_SIG_INVALID: {
    code:     'HPP_CHALLENGE_SIG_INVALID',
    origin:   'extension',
    severity: 'HIGH',
    display:  'Unable to verify server identity. Please try again later.',
    detail:   'Server challenge signature failed verification against pinned key.',
    retry:    false,   // possible MITM — do not retry automatically
  },

  HPP_UV_FLAG_MISSING: {
    code:     'HPP_UV_FLAG_MISSING',
    origin:   'extension',
    severity: 'MEDIUM',
    display:  'Biometric verification is required. Please use Touch ID, Face ID, or Windows Hello.',
    detail:   'WebAuthn assertion returned without UV=1 in authenticator data.',
    retry:    true,
  },

  HPP_CLOCK_SKEW_ERROR: {
    code:     'HPP_CLOCK_SKEW_ERROR',
    origin:   'extension',
    severity: 'MEDIUM',
    display:  'Your device clock may be out of sync. Check your system clock settings and try again.',
    detail:   'client_timestamp delta vs server_timestamp exceeds max_clock_skew_ms.',
    retry:    false,   // user must fix clock first
    actionUrl: 'ms-settings:dateandtime',  // Windows; macOS: 'x-apple.systempreferences:com.apple.Date-Time-Settings.extension'
  },

  HPP_CHALLENGE_EXPIRED: {
    code:     'HPP_CHALLENGE_EXPIRED',
    origin:   'server',
    severity: 'LOW',
    display:  'Verification timed out. Retrying...',
    detail:   'Challenge was not used before server_timestamp + window_ms.',
    retry:    true,    // fetch fresh challenge and retry once
    maxRetries: 1,
    retryExhaustedDisplay: 'Connection too slow for real-time verification. Please check your network and try again.',
  },

  HPP_CREDENTIAL_REVOKED: {
    code:     'HPP_CREDENTIAL_REVOKED',
    origin:   'server',
    severity: 'MEDIUM',
    display:  'This device is no longer enrolled. Please re-enroll to continue.',
    detail:   'Credential was revoked on the HPP Attestation Server.',
    retry:    false,
    action:   'REMOVE_ENROLLMENT',  // background.js should remove from hpp_enrolled_sites
  },

  HPP_ORIGIN_MISMATCH: {
    code:     'HPP_ORIGIN_MISMATCH',
    origin:   'extension',
    severity: 'HIGH',
    display:  'Authentication error. Please refresh the page and try again.',
    detail:   'rp_id in certificate does not match eTLD+1 of current top-level frame.',
    retry:    false,
    // SECURITY: do not expose mismatched origins in display string
  },

  HPP_WEBAUTHN_CANCELLED: {
    code:     'HPP_WEBAUTHN_CANCELLED',
    origin:   'browser',
    severity: 'LOW',
    display:  'Verification cancelled. Password login is available below.',
    detail:   'User dismissed the biometric prompt or WebAuthn was aborted.',
    retry:    false,   // user chose to cancel; do not re-prompt automatically
  },

  HPP_SERVER_UNAVAILABLE: {
    code:     'HPP_SERVER_UNAVAILABLE',
    origin:   'network',
    severity: 'LOW',
    display:  'HPP servers are temporarily unavailable. Falling back to standard login.',
    detail:   'Network request to HPP Attestation Server failed or timed out.',
    retry:    true,
    retryDelayMs: 2000,
    maxRetries:   1,
    fallback:  'STANDARD_LOGIN',
  },

  HPP_UNKNOWN_EXTENSION_ID: {
    code:     'HPP_UNKNOWN_EXTENSION_ID',
    origin:   'server',
    severity: 'CRITICAL',
    display:  'This extension is not recognized by HPP servers. Please reinstall from the Chrome Web Store.',
    detail:   'Server rejected X-HPP-Extension-ID header. Dev build hitting prod, or impersonation.',
    retry:    false,
  },

  HPP_IFRAME_CONTEXT: {
    code:     'HPP_IFRAME_CONTEXT',
    origin:   'extension',
    severity: 'HIGH',
    display:  null,  // silent — never shown to user (abort without UI)
    detail:   'HPP authentication blocked: content script is running in an iframe context.',
    retry:    false,
  },

};

/**
 * Get a user-facing display string for an error code.
 * Falls back to a generic message if the code is unknown.
 */
export function getDisplayMessage(errorCode) {
  return HPP_ERRORS[errorCode]?.display
    ?? 'An unexpected authentication error occurred. Please try again.';
}

/**
 * Check whether an error should be retried automatically.
 */
export function isRetryable(errorCode) {
  return HPP_ERRORS[errorCode]?.retry === true;
}

/**
 * Get the severity level of an error code (for logging).
 */
export function getSeverity(errorCode) {
  return HPP_ERRORS[errorCode]?.severity ?? 'MEDIUM';
}
