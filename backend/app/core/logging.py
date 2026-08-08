"""
Structured console logging for the Robu backend.
Outputs coloured, human-readable lines in dev and JSON-compatible lines in prod.
"""

import logging
import sys
import traceback
from datetime import datetime, timezone

# ── ANSI colour codes (stripped automatically when output is not a TTY) ───────
RESET   = "\033[0m"
BOLD    = "\033[1m"
RED     = "\033[31m"
YELLOW  = "\033[33m"
GREEN   = "\033[32m"
CYAN    = "\033[36m"
MAGENTA = "\033[35m"
DIM     = "\033[2m"

LEVEL_COLOURS = {
    "DEBUG":    CYAN,
    "INFO":     GREEN,
    "WARNING":  YELLOW,
    "ERROR":    RED,
    "CRITICAL": f"{BOLD}{RED}",
}


class ColourFormatter(logging.Formatter):
    """Pretty-print coloured log records to the console."""

    use_colour: bool

    def __init__(self, use_colour: bool = True) -> None:
        super().__init__()
        self.use_colour = use_colour and sys.stderr.isatty()

    def format(self, record: logging.LogRecord) -> str:  # noqa: A003
        now = datetime.now(tz=timezone.utc).strftime("%H:%M:%S.%f")[:-3]
        level = record.levelname
        colour = LEVEL_COLOURS.get(level, RESET) if self.use_colour else ""
        reset  = RESET if self.use_colour else ""
        dim    = DIM   if self.use_colour else ""
        bold   = BOLD  if self.use_colour else ""

        name_short = record.name.split(".")[-1]  # last segment only

        prefix = f"{dim}{now}{reset} {colour}{bold}{level:<8}{reset} {dim}[{name_short}]{reset}"
        message = record.getMessage()

        lines = [f"{prefix}  {message}"]

        # Always print full tracebacks for exceptions
        if record.exc_info:
            tb = "".join(traceback.format_exception(*record.exc_info))
            for tb_line in tb.rstrip().splitlines():
                lines.append(f"  {RED if self.use_colour else ''}{tb_line}{reset}")

        if record.stack_info:
            lines.append(f"  {record.stack_info}")

        return "\n".join(lines)


def configure_logging(level: str = "INFO", use_colour: bool = True) -> None:
    """
    Call once at application startup.
    Sets the root logger + silences noisy third-party libs.
    """
    numeric_level = getattr(logging, level.upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(ColourFormatter(use_colour=use_colour))
    handler.setLevel(numeric_level)

    root = logging.getLogger()
    root.setLevel(numeric_level)
    # Remove any handlers added by uvicorn or pytest before us
    root.handlers.clear()
    root.addHandler(handler)

    # ── Tune noisy libraries ────────────────────────────────────────────────
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)   # hide 200s
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("websockets").setLevel(logging.WARNING)

    logging.getLogger(__name__).info(
        "Logging configured  level=%s  colour=%s", level.upper(), use_colour
    )
