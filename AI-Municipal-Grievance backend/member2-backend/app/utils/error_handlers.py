import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND, HTTP_500_INTERNAL_SERVER_ERROR

logger = logging.getLogger(__name__)


def _error_response(code: str, message: str, details: list[Any] | None = None) -> dict[str, Any]:
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or [],
        },
    }


def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.warning("Validation error: %s", exc.errors())
    details = []
    for err in exc.errors():
        loc = ".".join([str(item) for item in err.get("loc", []) if item != "body"])
        message = err.get("msg", "Invalid input")
        details.append({"field": loc or "body", "message": message})

    return JSONResponse(
        status_code=422,
        content=_error_response(
            code="VALIDATION_ERROR",
            message="Invalid request data",
            details=details,
        ),
    )


def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    if exc.status_code == HTTP_404_NOT_FOUND:
        message = exc.detail if isinstance(exc.detail, str) else "Resource not found"
        code = "COMPLAINT_NOT_FOUND" if "Complaint" in str(message) else "NOT_FOUND"
        return JSONResponse(
            status_code=HTTP_404_NOT_FOUND,
            content=_error_response(
                code=code,
                message=message,
                details=[],
            ),
        )
    if exc.status_code == HTTP_400_BAD_REQUEST:
        message = exc.detail if isinstance(exc.detail, str) else "Bad request"
        return JSONResponse(
            status_code=HTTP_400_BAD_REQUEST,
            content=_error_response(
                code="BAD_REQUEST",
                message=message,
                details=[],
            ),
        )
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_response(
            code="HTTP_ERROR",
            message=str(exc.detail),
            details=[],
        ),
    )


def internal_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_response(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected error occurred",
            details=[],
        ),
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, internal_exception_handler)
