#!/usr/bin/env python3
"""Generate white PNG placeholders for Phase 5D screenshot scaffold."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

WIDTH = 1280
HEIGHT = 720

CHAPTER5 = [
    "chapter5-01-customer-qr-session.png",
    "chapter5-02-customer-menu-browsing.png",
    "chapter5-03-customer-cart-submit.png",
    "chapter5-04-customer-order-tracking.png",
    "chapter5-04-customer-request-payment.png",
    "chapter5-05-staff-pos-table-map.png",
    "chapter5-06-staff-order-confirm.png",
    "chapter5-07-kds-queue.png",
    "chapter5-08-kds-ticket-status.png",
    "chapter5-09-owner-menu-management.png",
    "chapter5-10-owner-table-qr-management.png",
    "chapter5-11-owner-payment-settings.png",
    "chapter5-11-owner-subscription.png",
    "chapter5-12-admin-tenant-onboarding.png",
    "chapter5-13-owner-dashboard-reporting.png",
    "chapter5-14-admin-platform-analytics.png",
]

# Phụ lục A rút gọn 2026-06-05 — chỉ màn bổ sung, không trùng Chương 5
APPENDIX_A = [
    "appendix-a-15-pos-service-requests.png",
    "appendix-a-16-pos-bills.png",
    "appendix-a-35-owner-staff.png",
    "appendix-a-39-owner-sepay-callback.png",
    "appendix-a-46-admin-tenants.png",
    "appendix-a-47-admin-tenant-detail.png",
    "appendix-a-49-admin-billing.png",
    "appendix-a-53-auth-login.png",
]


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def write_white_png(path: Path, width: int, height: int) -> None:
    row = b"\x00" + b"\xff\xff\xff" * width
    raw = row * height
    compressed = zlib.compress(raw, 9)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", ihdr)
        + _png_chunk(b"IDAT", compressed)
        + _png_chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def main() -> None:
    out_dir = Path(__file__).resolve().parent.parent / "assets" / "screenshots"
    out_dir.mkdir(parents=True, exist_ok=True)
    names = CHAPTER5 + APPENDIX_A
    for name in names:
        path = out_dir / name
        if path.exists():
            continue
        write_white_png(path, WIDTH, HEIGHT)
    print(f"Created {len(names)} placeholders in {out_dir}")


if __name__ == "__main__":
    main()
