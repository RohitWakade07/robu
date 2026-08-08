"""
Global exception / error-logging middleware.
Catches all unhandled exceptions and every HTTP error ≥ 400,
writes structured ERROR entries to the console, and returns clean JSON.
"""

import logging
import time
import traceback
import uuid
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("robu.request")


class ErrorLoggingMiddleware(BaseHTTPMiddleware):
    """Log every request and capture errors with full tracebacks."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())[:8]
        start = time.perf_counter()

        # Attach request_id so route handlers can use it
        request.state.request_id = request_id

        try:
            response: Response = await call_next(request)
        except Exception as exc:  # noqa: BLE001
            elapsed = (time.perf_counter() - start) * 1000
            logger.error(
                "UNHANDLED EXCEPTION  [%s]  %s %s  (%.1fms)\n%s",
                request_id,
                request.method,
                request.url.path,
                elapsed,
                "".join(traceback.format_exc()),
            )
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "Internal server error",
                    "request_id": request_id,
                },
            )

        elapsed = (time.perf_counter() - start) * 1000
        status = response.status_code

        if status >= 500:
            logger.error(
                "HTTP %d  [%s]  %s %s  (%.1fms)",
                status, request_id, request.method, request.url.path, elapsed,
            )
        elif status >= 400:
            logger.warning(
                "HTTP %d  [%s]  %s %s  (%.1fms)",
                status, request_id, request.method, request.url.path, elapsed,
            )
        else:
            logger.debug(
                "HTTP %d  [%s]  %s %s  (%.1fms)",
                status, request_id, request.method, request.url.path, elapsed,
            )

        response.headers["X-Request-ID"] = request_id
        return response
