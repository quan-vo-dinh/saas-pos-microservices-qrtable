#!/usr/bin/env python3
"""Generate labeled placeholder PNGs for Chapter 6 visual evidence."""

from __future__ import annotations

from pathlib import Path
import textwrap

from PIL import Image, ImageDraw, ImageFont


WIDTH = 1600
HEIGHT = 900

PLACEHOLDERS = [
    ("chapter6-01-allure-overview.png", "C6-EV-01", "Allure overview / test summary"),
    ("chapter6-02-allure-critical-suites.png", "C6-EV-02", "Allure suites or critical test groups"),
    ("chapter6-03-terminal-test-summary.png", "C6-EV-03", "Terminal summary of representative test command"),
    ("chapter6-04-e2e-playwright-overview.png", "C6-EV-04", "Playwright E2E detail: step-2.7 realtime"),
    ("chapter6-05-e2e-customer-tracking.png", "C6-EV-05", "Customer tracking after QR order"),
    ("chapter6-06-e2e-pos-live-order-accepted.png", "C6-EV-06", "POS live order accepted by waiter"),
    ("chapter6-07-e2e-kds-ticket-finished.png", "C6-EV-07", "KDS ticket processed by kitchen"),
    ("chapter6-08-e2e-customer-served-after-reload.png", "C6-EV-08", "Customer sees SERVED after reconnect/reload"),
    ("chapter6-09-order-saga-tests.png", "C6-EV-09", "Order Confirm Saga terminal/Allure result"),
    ("chapter6-10-saas-onboarding-saga-tests.png", "C6-EV-10", "SaaS Onboarding Mini-Saga terminal/Allure result"),
    ("chapter6-11-postgres-order-outbox-state.png", "C6-EV-11", "PostgreSQL order/outbox state"),
    ("chapter6-12-kafka-order-confirmed-event.png", "C6-EV-12", "Kafka order.confirmed event"),
    ("chapter6-13-keycloak-role-mapping.png", "C6-EV-13", "Keycloak role mapping"),
    ("chapter6-14-permission-smoke-terminal.png", "C6-EV-14", "Permission smoke terminal output"),
    ("chapter6-15-ui-blocked-low-role.png", "C6-EV-15", "UI blocked for low role or missing entitlement"),
    ("chapter6-16-ui-full-access-correct-role.png", "C6-EV-16", "UI full access for correct role"),
    ("chapter6-17-kafkio-topic-event.png", "C6-EV-17", "Kafkio topic/event runtime view"),
    ("chapter6-18-redisinsight-kds-projection.png", "C6-EV-18", "Redis Insight KDS/session projection"),
    ("chapter6-20-nx-project-graph.png", "C6-EV-20", "Nx project graph"),
    ("chapter6-22-docker-image-or-compose-build.png", "C6-EV-22", "Docker image or Compose build evidence"),
    ("chapter6-23a-vercel-customer-pwa.png", "C6-EV-23A", "Vercel customer PWA deployment evidence"),
    ("chapter6-23b-vercel-management-app.png", "C6-EV-23B", "Vercel management app deployment evidence"),
]


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def write_placeholder(path: Path, artifact_id: str, title: str) -> None:
    image = Image.new("RGB", (WIDTH, HEIGHT), (248, 250, 252))
    draw = ImageDraw.Draw(image)
    title_font = load_font(52, bold=True)
    id_font = load_font(36, bold=True)
    body_font = load_font(30)
    small_font = load_font(22)

    margin = 70
    draw.rounded_rectangle(
        [margin, margin, WIDTH - margin, HEIGHT - margin],
        radius=28,
        fill=(255, 255, 255),
        outline=(203, 213, 225),
        width=4,
    )
    draw.rounded_rectangle(
        [margin + 40, margin + 40, margin + 260, margin + 105],
        radius=18,
        fill=(219, 234, 254),
        outline=(37, 99, 235),
        width=2,
    )
    draw.text((margin + 65, margin + 55), artifact_id, font=id_font, fill=(30, 64, 175))
    draw.text((margin + 40, margin + 160), "PLACEHOLDER", font=title_font, fill=(15, 23, 42))

    y = margin + 245
    for line in textwrap.wrap(title, width=62):
        draw.text((margin + 40, y), line, font=body_font, fill=(51, 65, 85))
        y += 42

    note = (
        "Replace this PNG with a real QRTable capture using the same filename. "
        "See docs/graduation-thesis-resources/thesis-chapter6-visual-evidence-capture-guide.md."
    )
    y = HEIGHT - margin - 105
    for line in textwrap.wrap(note, width=100):
        draw.text((margin + 40, y), line, font=small_font, fill=(100, 116, 139))
        y += 30

    image.save(path)


def main() -> None:
    out_dir = Path(__file__).resolve().parent.parent / "assets" / "screenshots"
    out_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    for filename, artifact_id, title in PLACEHOLDERS:
        path = out_dir / filename
        if not path.exists():
            write_placeholder(path, artifact_id, title)
            count += 1
    print(f"Generated {count} missing Chapter 6 placeholders in {out_dir}")


if __name__ == "__main__":
    main()
