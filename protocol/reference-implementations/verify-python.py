# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 Agile On Target LLC
#
# This file is part of the Human Presence Protocol SDK
# (https://github.com/AgileOnTarget/hpp-sdk). Licensed under the Apache
# License, Version 2.0; see LICENSE, NOTICE, PATENT-NOTICE.md, and
# PATENT-POLICY.md for the scope of the patent grant. All trademarks
# and patent rights reserved by Agile On Target LLC
# (USPTO Customer No. 224891).

"""
hpp_verify.py — HPP Presence Certificate Verification Library (Python)

Reference implementation for relying party servers.
Platform-agnostic — works with certificates from any HPP client
(browser extension, mobile SDK, native module).

Usage:
    from hpp_verify import verify_presence_certificate, load_hpp_public_key

    public_key = load_hpp_public_key("hpp-server-pubkey.pem")

    @app.route("/api/hpp", methods=["POST"])
    def hpp_callback():
        cert = request.get_json()
        result = verify_presence_certificate(cert, public_key)
        if not result["valid"]:
            return jsonify({"error": result["error"]}), 401
        session["hpp_cert_id"] = result["cert_id"]
        return jsonify({"cert_id": result["cert_id"], "granted": True})

Verification steps (all required):
    1. hpp_server_sig — ECDSA P-256 over canonical payload
    2. rp_id — must match expected domain
    3. expiry_ms — must be in the future
    4. status — must be 'issued'
    5. UV flag — bit 2 of authenticator_data flags byte
    6. Replay prevention — cert_id uniqueness (caller responsibility)

Requires: cryptography >= 41.0.0
    pip install cryptography

Version: 1.0.0
License: Proprietary — Patent Pending
Author: Agile On Target LLC
"""

import json
import time
import base64
import struct
from typing import Optional
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric import ec, utils
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric.ec import ECDSA, EllipticCurvePublicKey
from cryptography.exceptions import InvalidSignature


# ── Constants ─────────────────────────────────────────────────────────────────

SIGNED_FIELDS = [
    "assertion_sig",
    "authenticator_data",
    "cert_id",
    "client_data_json",
    "client_timestamp",
    "credential_id",
    "expiry_ms",
    "nonce",
    "rp_id",
    "server_timestamp",
]
"""Fields included in the canonical signing payload, in alphabetical order."""

REQUIRED_FIELDS = [
    "cert_id", "nonce", "rp_id", "server_timestamp", "client_timestamp",
    "credential_id", "authenticator_data", "assertion_sig", "client_data_json",
    "expiry_ms", "status", "hpp_server_sig",
]
"""Required fields that must be present on every certificate."""


# ── Public API ────────────────────────────────────────────────────────────────

def verify_presence_certificate(
    cert: dict,
    public_key: EllipticCurvePublicKey,
    expected_rp_id: Optional[str] = None,
    clock_tolerance_ms: int = 5000,
) -> dict:
    """
    Verify an HPP Presence Certificate.

    Args:
        cert: The full certificate object from the callback endpoint.
        public_key: The HPP Attestation Server public key.
        expected_rp_id: Expected rp_id (eTLD+1 of your site). Optional.
        clock_tolerance_ms: Clock tolerance for expiry check. Default 5000ms.

    Returns:
        dict with keys:
            valid (bool): True if certificate passes all checks.
            cert_id (str): Certificate ID (present if valid).
            error (str): Error code (present if invalid).
            detail (str): Error description (present if invalid).
    """
    # Step 0: Structural validation
    for field in REQUIRED_FIELDS:
        if field not in cert or cert[field] is None:
            return {"valid": False, "error": "MISSING_FIELD", "detail": f"Missing: {field}"}

    # Step 1: Verify hpp_server_sig (ECDSA P-256 / SHA-256)
    try:
        payload = build_canonical_payload(cert)
        sig_bytes = base64url_decode(cert["hpp_server_sig"])
        # Convert DER signature to verify
        public_key.verify(sig_bytes, payload.encode("utf-8"), ECDSA(hashes.SHA256()))
    except InvalidSignature:
        return {"valid": False, "error": "CERT_SIG_INVALID", "detail": "hpp_server_sig verification failed"}
    except Exception as e:
        return {"valid": False, "error": "CERT_SIG_INVALID", "detail": f"Signature error: {e}"}

    # Step 2: Verify rp_id
    if expected_rp_id and cert["rp_id"] != expected_rp_id:
        return {
            "valid": False,
            "error": "RP_MISMATCH",
            "detail": f"Expected '{expected_rp_id}', got '{cert['rp_id']}'",
        }

    # Step 3: Verify expiry
    now_ms = int(time.time() * 1000)
    if cert["expiry_ms"] <= now_ms - clock_tolerance_ms:
        return {
            "valid": False,
            "error": "CERT_EXPIRED",
            "detail": f"Expired at {cert['expiry_ms']}, current {now_ms}",
        }

    # Step 4: Verify status
    if cert["status"] != "issued":
        return {
            "valid": False,
            "error": "INVALID_STATUS",
            "detail": f"Expected 'issued', got '{cert['status']}'",
        }

    # Step 5: Verify UV flag
    try:
        uv_set = extract_uv_flag(cert["authenticator_data"])
        if not uv_set:
            return {"valid": False, "error": "UV_FLAG_MISSING", "detail": "UV bit not set"}
    except Exception as e:
        return {"valid": False, "error": "UV_FLAG_MISSING", "detail": str(e)}

    # Step 6: Replay prevention is caller responsibility
    # Step 7: action_scope check is caller responsibility for re-attestation

    return {
        "valid": True,
        "cert_id": cert["cert_id"],
        "rp_id": cert["rp_id"],
        "credential_id": cert["credential_id"],
        "expiry_ms": cert["expiry_ms"],
        "server_timestamp": cert["server_timestamp"],
    }


def load_hpp_public_key(pem_path: str) -> EllipticCurvePublicKey:
    """
    Load the HPP Attestation Server public key from a PEM file.

    Args:
        pem_path: Path to the PEM-encoded ECDSA P-256 public key.

    Returns:
        EllipticCurvePublicKey instance.
    """
    pem_data = Path(pem_path).read_bytes()
    key = serialization.load_pem_public_key(pem_data)
    if not isinstance(key, EllipticCurvePublicKey):
        raise TypeError(f"Expected EC public key, got {type(key).__name__}")
    return key


def load_hpp_public_key_from_string(pem_string: str) -> EllipticCurvePublicKey:
    """Load the HPP public key from a PEM string."""
    key = serialization.load_pem_public_key(pem_string.encode("utf-8"))
    if not isinstance(key, EllipticCurvePublicKey):
        raise TypeError(f"Expected EC public key, got {type(key).__name__}")
    return key


# ── Internal Helpers ──────────────────────────────────────────────────────────

def build_canonical_payload(cert: dict) -> str:
    """
    Build the canonical signing payload from a certificate.
    Keys are sorted alphabetically and serialized with no whitespace.
    """
    payload = {k: cert[k] for k in SIGNED_FIELDS if k in cert}
    return json.dumps(payload, separators=(",", ":"), sort_keys=True)


def base64url_decode(data: str) -> bytes:
    """Decode a base64url string to bytes."""
    padding = 4 - len(data) % 4
    if padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data)


def base64url_encode(data: bytes) -> str:
    """Encode bytes to a base64url string (no padding)."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def extract_uv_flag(auth_data_b64: str) -> bool:
    """
    Extract the UV (User Verified) flag from base64url-encoded authenticator data.
    UV is bit 2 (0x04) of the flags byte at offset 32.

    Args:
        auth_data_b64: base64url-encoded authenticatorData.

    Returns:
        True if UV flag is set.
    """
    buf = base64url_decode(auth_data_b64)
    if len(buf) < 33:
        raise ValueError(f"authenticator_data too short: {len(buf)} bytes (need >= 33)")
    return (buf[32] & 0x04) != 0


def extract_sign_count(auth_data_b64: str) -> int:
    """
    Extract the sign count from authenticator data.
    Sign count is a 32-bit big-endian integer at offset 33-36.

    Args:
        auth_data_b64: base64url-encoded authenticatorData.

    Returns:
        Sign count as integer.
    """
    buf = base64url_decode(auth_data_b64)
    if len(buf) < 37:
        raise ValueError(f"authenticator_data too short: {len(buf)} bytes (need >= 37)")
    return struct.unpack(">I", buf[33:37])[0]


# ── Flask/Django Decorator Helper ─────────────────────────────────────────────

def require_hpp(public_key: EllipticCurvePublicKey, expected_rp_id: str, replay_store=None):
    """
    Decorator factory for Flask routes requiring HPP verification.

    Usage (Flask):
        hpp_key = load_hpp_public_key("hpp-server-pubkey.pem")

        @app.route("/api/hpp", methods=["POST"])
        @require_hpp(hpp_key, "example.com", replay_store=redis_store)
        def hpp_callback():
            cert_id = request.hpp_cert["cert_id"]
            return jsonify({"granted": True, "cert_id": cert_id})

    Args:
        public_key: HPP public key.
        expected_rp_id: Your site's eTLD+1.
        replay_store: Optional store with has(key) and set(key, ttl_ms) methods.
    """
    from functools import wraps

    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            from flask import request, jsonify

            cert = request.get_json(silent=True)
            if not cert:
                return jsonify({"error": "MISSING_BODY"}), 400

            result = verify_presence_certificate(cert, public_key, expected_rp_id)
            if not result["valid"]:
                return jsonify({"error": result["error"], "detail": result.get("detail")}), 401

            # Replay check
            if replay_store:
                if replay_store.has(cert["cert_id"]):
                    return jsonify({"error": "ALREADY_USED"}), 401
                ttl = max(0, cert["expiry_ms"] - int(time.time() * 1000))
                replay_store.set(cert["cert_id"], ttl)

            request.hpp_cert = result
            return f(*args, **kwargs)

        return wrapper
    return decorator
