#!/usr/bin/env python3
"""Regenerate appendices/a-ui-gallery.tex from APPENDIX_GROUPS.

Hand-edits to a-ui-gallery.tex are canonical; run this only when restructuring groups.
"""

from __future__ import annotations

from pathlib import Path

# (section title, group caption stem, [(filename, label, short desc), ...])
APPENDIX_GROUPS = [
    (
        "Client POS (nhân viên)",
        "Client POS — vận hành bổ sung (trái→phải): yêu cầu phục vụ và danh sách hóa đơn.",
        "fig:appendix-a-pos-service-and-bills",
        [
            (
                "appendix-a-15-pos-service-requests.png",
                "fig:appendix-a-pos-service-requests",
                "POS \\texttt{/pos/service-requests}",
            ),
            (
                "appendix-a-16-pos-bills.png",
                "fig:appendix-a-pos-bills",
                "POS \\texttt{/pos/bills}",
            ),
        ],
        "mgmt_2col",
    ),
    (
        "Client quản trị chủ quán",
        None,
        None,
        [],
        "skip_section_header_only",
    ),
]

# Maintained manually in a-ui-gallery.tex after 2026-06-05 trim; generator kept for reference.


def main() -> None:
    out = Path(__file__).resolve().parent.parent / "appendices" / "a-ui-gallery.tex"
    print(f"Appendix A is hand-maintained: {out}")
    print("Edit a-ui-gallery.tex directly; see chapter-05-ui-gallery-scaffold-plan.md §5.")


if __name__ == "__main__":
    main()
