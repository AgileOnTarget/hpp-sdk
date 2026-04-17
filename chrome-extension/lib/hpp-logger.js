/**
 * hpp-logger.js
 * Structured logger for the HPP Chrome Extension.
 * Redacts sensitive fields before logging.
 * Spec reference: Section X — File Structure
 */

'use strict';

// Fields that must never appear in full in logs
const REDACTED_FIELDS = new Set([
  'assertion_sig',
  'hpp_server_sig',
  'authenticator_data',
  'private_key',
  'nonce',
]);

// Fields to truncate to 8 chars for identification without exposure
const TRUNCATE_FIELDS = new Set([
  'cert_id',
  'credential_id',
]);

/**
 * Sanitize a log object, redacting or truncating sensitive fields.
 */
function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACTED_FIELDS.has(k)) {
      out[k] = '[REDACTED]';
    } else if (TRUNCATE_FIELDS.has(k) && typeof v === 'string' && v.length > 8) {
      out[k] = v.substring(0, 8) + '...';
    } else if (typeof v === 'object' && v !== null) {
      out[k] = sanitize(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Read debug logging setting from storage.
 * Defaults to false in production, true in dev.
 */
async function isDebugEnabled() {
  try {
    const result = await chrome.storage.sync.get('hpp_settings');
    return result?.hpp_settings?.debug_logging === true;
  } catch {
    return false;
  }
}

class HppLogger {
  constructor(component) {
    this.component = component;
  }

  _format(level, event, data) {
    return {
      level,
      component: this.component,
      event,
      timestamp: Date.now(),
      ...sanitize(data),
    };
  }

  info(event, data = {}) {
    console.log('[HPP]', JSON.stringify(this._format('INFO', event, data)));
  }

  warn(event, data = {}) {
    console.warn('[HPP]', JSON.stringify(this._format('WARN', event, data)));
  }

  error(event, data = {}) {
    console.error('[HPP]', JSON.stringify(this._format('ERROR', event, data)));
  }

  async debug(event, data = {}) {
    if (await isDebugEnabled()) {
      console.debug('[HPP]', JSON.stringify(this._format('DEBUG', event, data)));
    }
  }
}

export function createLogger(component) {
  return new HppLogger(component);
}
