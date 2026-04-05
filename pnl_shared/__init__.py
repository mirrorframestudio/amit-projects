"""
pnl_shared — shared utilities for monday-pnl and weekly-pnl.

Import pattern (add to each project's src/ files):
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
    from pnl_shared.excel_styles import HEADER_FONT, apply_header_row, set_rtl, auto_width
"""
