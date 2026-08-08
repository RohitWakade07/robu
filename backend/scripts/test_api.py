"""
test_api.py – Standalone endpoint smoke-tester.

Phase 1 : Auth in isolation
    - POST /auth/register  (fresh random user)
    - POST /auth/login     (seeded admin / operator / customer)
    - POST /auth/refresh
    - GET  /auth/me

Phase 2 : Every other endpoint (using the token from Phase 1)
    - Customer Portal  : GET /products, POST /products, POST /orders, GET /orders
    - Warehouse Intake : POST /shipments, GET /shipments, GET /shipments/{id}
    - Robotics Ops     : GET /robots, POST /robots, GET /robots/{id}/health

Run against a live server:
    python scripts/test_api.py
    python scripts/test_api.py --base-url http://localhost:8000
"""

import argparse
import json
import sys
import uuid
from dataclasses import dataclass, field
from typing import Any

import requests  # pip install requests

# ──────────────────────────────────────────────────────────────────────────────
# Config / helpers
# ──────────────────────────────────────────────────────────────────────────────

BASE_URL = "http://localhost:8000"
API      = "/api/v1"

# Seeded credentials (from scripts/seed.py)
ADMIN_EMAIL    = "admin@robu.io"
ADMIN_PASSWORD = "admin12345"

OPERATOR_EMAIL    = "operator@robu.io"
OPERATOR_PASSWORD = "operator123"

CUSTOMER_EMAIL    = "customer@robu.io"
CUSTOMER_PASSWORD = "customer123"

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"


@dataclass
class TestResult:
    name: str
    passed: bool
    status_code: int
    expected_status: int
    detail: str = ""
    response_body: Any = field(default=None, repr=False)


results: list[TestResult] = []


def _label(passed: bool) -> str:
    return f"{GREEN}PASS{RESET}" if passed else f"{RED}FAIL{RESET}"


def check(
    name: str,
    method: str,
    url: str,
    expected_status: int,
    headers: dict | None = None,
    json_body: dict | None = None,
    detail_hint: str = "",
) -> requests.Response | None:
    """Make one HTTP call, record pass/fail, pretty-print the result."""
    try:
        resp = requests.request(
            method,
            url,
            headers=headers or {},
            json=json_body,
            timeout=10,
        )
    except requests.exceptions.ConnectionError:
        r = TestResult(
            name=name,
            passed=False,
            status_code=0,
            expected_status=expected_status,
            detail="CONNECTION REFUSED – is the server running?",
        )
        results.append(r)
        print(f"  [{_label(False)}]  {name}  ->  CONNECTION ERROR")
        return None

    passed = resp.status_code == expected_status
    body: Any = None
    try:
        body = resp.json()
    except Exception:
        body = resp.text

    detail = detail_hint
    if not passed:
        detail = json.dumps(body, indent=2) if isinstance(body, dict) else str(body)

    r = TestResult(
        name=name,
        passed=passed,
        status_code=resp.status_code,
        expected_status=expected_status,
        detail=detail,
        response_body=body,
    )
    results.append(r)

    status_str = f"{resp.status_code}" if passed else f"{RED}{resp.status_code}{RESET} (expected {expected_status})"
    print(f"  [{_label(passed)}]  {name}  ->  HTTP {status_str}")
    if not passed:
        print(f"           {YELLOW}{detail[:200]}{RESET}")
    return resp


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def section(title: str) -> None:
    print(f"\n{BOLD}{CYAN}{'--'*30}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'--'*30}{RESET}")


# ──────────────────────────────────────────────────────────────────────────────
# Phase 1 – Auth in isolation
# ──────────────────────────────────────────────────────────────────────────────

def phase_auth(base: str) -> dict[str, str]:
    """
    Test every auth endpoint independently.
    Returns a dict of {role: access_token} for Phase 2.
    """
    section("PHASE 1 -- AUTH ENDPOINTS (isolated)")

    tokens: dict[str, str] = {}

    # 1a. Health-check – confirm the server is reachable at all
    print(f"\n{BOLD}[0] Server reachability{RESET}")
    resp = check(
        name            = "GET /health",
        method          = "GET",
        url             = f"{base}/health",
        expected_status = 200,
    )
    if resp is None:
        print(f"\n{RED}Server unreachable. Aborting.{RESET}")
        sys.exit(1)

    # 1b. Register a brand-new user (unique email each run)
    uid   = uuid.uuid4().hex[:8]
    email = f"test_{uid}@example.com"
    print(f"\n{BOLD}[1] POST /auth/register{RESET}")
    check(
        name            = "Register new user",
        method          = "POST",
        url             = f"{base}{API}/auth/register",
        expected_status = 201,
        json_body       = {
            "email":     email,
            "password":  "Test@1234",
            "full_name": "Test User",
            "role":      "customer",
        },
    )

    # 1b-edge: duplicate registration must return 409 / 400
    print(f"\n{BOLD}[1b] POST /auth/register -- duplicate should fail{RESET}")
    check(
        name            = "Register duplicate user (expect 409)",
        method          = "POST",
        url             = f"{base}{API}/auth/register",
        expected_status = 409,
        json_body       = {
            "email":     email,
            "password":  "Test@1234",
            "full_name": "Test User",
            "role":      "customer",
        },
    )

    # 1c. Login – one call per seeded role
    for role, creds in [
        ("admin",    (ADMIN_EMAIL,    ADMIN_PASSWORD)),
        ("operator", (OPERATOR_EMAIL, OPERATOR_PASSWORD)),
        ("customer", (CUSTOMER_EMAIL, CUSTOMER_PASSWORD)),
    ]:
        print(f"\n{BOLD}[2] POST /auth/login  ({role}){RESET}")
        resp = check(
            name            = f"Login as {role}",
            method          = "POST",
            url             = f"{base}{API}/auth/login",
            expected_status = 200,
            json_body       = {"email": creds[0], "password": creds[1]},
        )
        if resp and resp.status_code == 200:
            body = resp.json()
            tokens[role]               = body.get("access_token", "")
            tokens[f"{role}_refresh"]  = body.get("refresh_token", "")

    # 1d. Login with wrong password -> 401
    print(f"\n{BOLD}[2b] POST /auth/login -- bad credentials{RESET}")
    check(
        name            = "Login with wrong password (expect 401)",
        method          = "POST",
        url             = f"{base}{API}/auth/login",
        expected_status = 401,
        json_body       = {"email": ADMIN_EMAIL, "password": "WRONG"},
    )

    # 1e. Refresh token
    if tokens.get("admin_refresh"):
        print(f"\n{BOLD}[3] POST /auth/refresh{RESET}")
        resp = check(
            name            = "Refresh admin token",
            method          = "POST",
            url             = f"{base}{API}/auth/refresh",
            expected_status = 200,
            json_body       = {"refresh_token": tokens["admin_refresh"]},
        )
        if resp and resp.status_code == 200:
            tokens["admin"] = resp.json().get("access_token", tokens["admin"])

    # 1f. Refresh with garbage -> 401
    print(f"\n{BOLD}[3b] POST /auth/refresh -- invalid token{RESET}")
    check(
        name            = "Refresh with garbage token (expect 401)",
        method          = "POST",
        url             = f"{base}{API}/auth/refresh",
        expected_status = 401,
        json_body       = {"refresh_token": "this.is.garbage"},
    )

    # 1g. GET /auth/me with valid token
    if tokens.get("admin"):
        print(f"\n{BOLD}[4] GET /auth/me{RESET}")
        check(
            name            = "GET /me with valid token",
            method          = "GET",
            url             = f"{base}{API}/auth/me",
            expected_status = 200,
            headers         = auth_header(tokens["admin"]),
        )

    # 1h. GET /auth/me without token -> 401
    print(f"\n{BOLD}[4b] GET /auth/me -- no token{RESET}")
    check(
        name            = "GET /me without token (expect 401)",
        method          = "GET",
        url             = f"{base}{API}/auth/me",
        expected_status = 401,
    )

    return tokens


# ──────────────────────────────────────────────────────────────────────────────
# Phase 2 – Every other endpoint
# ──────────────────────────────────────────────────────────────────────────────

def phase_endpoints(base: str, tokens: dict[str, str]) -> None:
    admin_hdr    = auth_header(tokens.get("admin", ""))
    op_hdr       = auth_header(tokens.get("operator", ""))
    customer_hdr = auth_header(tokens.get("customer", ""))

    # ── Customer Portal ───────────────────────────────────────────────────────
    section("PHASE 2A -- CUSTOMER PORTAL  (/products, /orders)")

    print(f"\n{BOLD}[5] GET /products -- public (no auth){RESET}")
    check(
        name            = "List products (no auth -- expect 200)",
        method          = "GET",
        url             = f"{base}{API}/products",
        expected_status = 200,
    )

    print(f"\n{BOLD}[6] POST /products -- admin only{RESET}")
    resp = check(
        name            = "Create product (admin)",
        method          = "POST",
        url             = f"{base}{API}/products",
        expected_status = 201,
        headers         = admin_hdr,
        json_body       = {
            "sku":        f"SKU-TEST-{uuid.uuid4().hex[:4].upper()}",
            "name":       "API Test Widget",
            "unit_price": 9.99,
        },
    )
    product_id: str | None = None
    if resp and resp.status_code == 201:
        product_id = resp.json().get("id")

    print(f"\n{BOLD}[6b] POST /products -- customer (expect 403){RESET}")
    check(
        name            = "Create product as customer (expect 403)",
        method          = "POST",
        url             = f"{base}{API}/products",
        expected_status = 403,
        headers         = customer_hdr,
        json_body       = {"sku": "SKU-HACK", "name": "Hacker Widget", "unit_price": 0.01},
    )

    # Grab a product from the GET /products list to use for the order
    first_product_id = None
    resp = requests.get(f"{base}{API}/products", timeout=10)
    if resp.status_code == 200 and resp.json():
        # Let's pick a product that likely has inventory (seeded products)
        for p in resp.json():
            if not p["sku"].startswith("SKU-TEST-"):
                first_product_id = p["id"]
                break

    if first_product_id:
        print(f"\n{BOLD}[7] POST /orders -- customer{RESET}")
        resp = check(
            name            = "Create order (customer)",
            method          = "POST",
            url             = f"{base}{API}/orders",
            expected_status = 201,
            headers         = customer_hdr,
            json_body       = {
                "items": [{"product_id": first_product_id, "quantity": 2}],
            },
        )
    else:
        print(f"  {YELLOW}[SKIP] No valid product available; skipping POST /orders{RESET}")

    print(f"\n{BOLD}[8] GET /orders -- customer sees own orders{RESET}")
    check(
        name            = "List orders (customer)",
        method          = "GET",
        url             = f"{base}{API}/orders",
        expected_status = 200,
        headers         = customer_hdr,
    )

    print(f"\n{BOLD}[8b] GET /orders -- no auth (expect 401){RESET}")
    check(
        name            = "List orders without token (expect 401)",
        method          = "GET",
        url             = f"{base}{API}/orders",
        expected_status = 401,
    )

    # ── Warehouse Intake ──────────────────────────────────────────────────────
    section("PHASE 2B -- WAREHOUSE INTAKE  (/shipments)")

    print(f"\n{BOLD}[9] POST /shipments -- operator{RESET}")
    resp = check(
        name            = "Create shipment (operator)",
        method          = "POST",
        url             = f"{base}{API}/shipments",
        expected_status = 201,
        headers         = op_hdr,
        json_body       = {
            "items": [{"expected_quantity": 10}],
            "notes": "API smoke test",
        },
    )
    shipment_id: str | None = None
    if resp and resp.status_code == 201:
        shipment_id = resp.json().get("id")

    print(f"\n{BOLD}[9b] POST /shipments -- customer (expect 403){RESET}")
    check(
        name            = "Create shipment as customer (expect 403)",
        method          = "POST",
        url             = f"{base}{API}/shipments",
        expected_status = 403,
        headers         = customer_hdr,
        json_body       = {"items": [{"expected_quantity": 1}]},
    )

    print(f"\n{BOLD}[10] GET /shipments -- operator{RESET}")
    check(
        name            = "List shipments (operator)",
        method          = "GET",
        url             = f"{base}{API}/shipments",
        expected_status = 200,
        headers         = op_hdr,
    )

    if shipment_id:
        print(f"\n{BOLD}[11] GET /shipments/{{id}} -- operator{RESET}")
        check(
            name            = "Get shipment by ID (operator)",
            method          = "GET",
            url             = f"{base}{API}/shipments/{shipment_id}",
            expected_status = 200,
            headers         = op_hdr,
        )

        print(f"\n{BOLD}[11b] GET /shipments/{{id}} -- 404 for bogus ID{RESET}")
        check(
            name            = "Get shipment with fake ID (expect 404)",
            method          = "GET",
            url             = f"{base}{API}/shipments/00000000-0000-0000-0000-000000000000",
            expected_status = 404,
            headers         = op_hdr,
        )
    else:
        print(f"  {YELLOW}[SKIP] No shipment_id; skipping individual GET /shipments/{{id}}{RESET}")

    # ── Robotics Operations ───────────────────────────────────────────────────
    section("PHASE 2C -- ROBOTICS OPERATIONS  (/robots)")

    print(f"\n{BOLD}[12] GET /robots -- admin only{RESET}")
    check(
        name            = "List robots (admin)",
        method          = "GET",
        url             = f"{base}{API}/robots",
        expected_status = 200,
        headers         = admin_hdr,
    )

    print(f"\n{BOLD}[12b] GET /robots -- operator (expect 403){RESET}")
    check(
        name            = "List robots as operator (expect 403)",
        method          = "GET",
        url             = f"{base}{API}/robots",
        expected_status = 403,
        headers         = op_hdr,
    )

    print(f"\n{BOLD}[13] POST /robots -- admin{RESET}")
    resp = check(
        name            = "Create robot (admin)",
        method          = "POST",
        url             = f"{base}{API}/robots",
        expected_status = 201,
        headers         = admin_hdr,
        json_body       = {
            "name":          f"AMR-Test-{uuid.uuid4().hex[:6]}",
            "model":         "AMR-001",
            "serial_number": f"ROBU-{uuid.uuid4().hex[:6].upper()}",
            "status":        "offline",
            "battery_level": 100.0,
            "is_enabled":    True
        },
    )
    robot_id: str | None = None
    if resp and resp.status_code == 201:
        robot_id = resp.json().get("id")

    if robot_id:
        print(f"\n{BOLD}[14] GET /robots/{{id}}/health -- admin{RESET}")
        check(
            name            = "Get robot health (admin)",
            method          = "GET",
            url             = f"{base}{API}/robots/{robot_id}/health",
            expected_status = 200,
            headers         = admin_hdr,
        )
    else:
        print(f"  {YELLOW}[SKIP] No robot_id; skipping GET /robots/{{id}}/health{RESET}")


# ──────────────────────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────────────────────

def print_summary() -> None:
    section("SUMMARY")
    passed = [r for r in results if r.passed]
    failed = [r for r in results if not r.passed]
    total  = len(results)

    print(f"\n  Total : {total}")
    print(f"  {GREEN}Passed{RESET}: {len(passed)}")
    print(f"  {RED}Failed{RESET}: {len(failed)}\n")

    if failed:
        print(f"{BOLD}Failed tests:{RESET}")
        for r in failed:
            print(f"  {RED}x{RESET}  {r.name}  ->  HTTP {r.status_code}  (expected {r.expected_status})")
            if r.detail:
                print(f"     {YELLOW}{r.detail[:300]}{RESET}")

    print()
    if failed:
        sys.exit(1)   # non-zero exit so CI pipelines catch it


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Robu API smoke-tester")
    parser.add_argument(
        "--base-url",
        default=BASE_URL,
        help=f"Base server URL (default: {BASE_URL})",
    )
    parser.add_argument(
        "--phase",
        choices=["auth", "endpoints", "all"],
        default="all",
        help="Which phase to run (default: all)",
    )
    args = parser.parse_args()

    base = args.base_url.rstrip("/")

    print(f"\n{BOLD}Robu API Smoke-Tester{RESET}  ->  {CYAN}{base}{RESET}\n")

    tokens: dict[str, str] = {}

    if args.phase in ("auth", "all"):
        tokens = phase_auth(base)

    if args.phase in ("endpoints", "all"):
        if not tokens and args.phase == "endpoints":
            # If running endpoints-only, login first to get tokens
            for role, creds in [
                ("admin",    (ADMIN_EMAIL,    ADMIN_PASSWORD)),
                ("operator", (OPERATOR_EMAIL, OPERATOR_PASSWORD)),
                ("customer", (CUSTOMER_EMAIL, CUSTOMER_PASSWORD)),
            ]:
                r = requests.post(
                    f"{base}{API}/auth/login",
                    json={"email": creds[0], "password": creds[1]},
                    timeout=10,
                )
                if r.status_code == 200:
                    tokens[role]              = r.json().get("access_token", "")
                    tokens[f"{role}_refresh"] = r.json().get("refresh_token", "")
        phase_endpoints(base, tokens)

    print_summary()
