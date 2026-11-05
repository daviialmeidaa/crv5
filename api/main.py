from contextlib import asynccontextmanager
import os

from fastapi import FastAPI, Request
from fastapi.openapi.docs import get_swagger_ui_html, get_swagger_ui_oauth2_redirect_html
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .config import Settings
from .database import PostgresDatabase
from .routers.vba import router as vba_router
from .security import LegacyAPIError


def create_app(settings=None, database=None):
    settings = settings or Settings.from_env()
    owns_database = database is None
    database = database if database is not None else PostgresDatabase(settings)

    @asynccontextmanager
    async def lifespan(app):
        if owns_database:
            database.open()
        try:
            yield
        finally:
            if owns_database:
                database.close()

    app = FastAPI(
        title="Hub Nexomed API", version="1.0.0",
        description="API do Hub Nexomed. Contratos da integração VBA preservados.",
        docs_url=None, openapi_url="/api/openapi.json",
        swagger_ui_oauth2_redirect_url="/api/docs/oauth2-redirect",
        redoc_url=None, lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.database = database

    @app.get("/docs/", include_in_schema=False)
    @app.get("/docs", include_in_schema=False)
    @app.get("/api/docs/", include_in_schema=False)
    @app.get("/api/docs", include_in_schema=False)
    def swagger_docs():
        return get_swagger_ui_html(
            openapi_url=app.openapi_url,
            title=f"{app.title} - Swagger UI",
            oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
            swagger_favicon_url="/assets/images/favicon.ico",
        )

    @app.get("/api/docs/oauth2-redirect", include_in_schema=False)
    def swagger_oauth2_redirect():
        return get_swagger_ui_oauth2_redirect_html()

    @app.exception_handler(LegacyAPIError)
    async def legacy_error(request: Request, exc: LegacyAPIError):
        return JSONResponse(status_code=exc.status_code, content={"error": exc.message})

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, exc: RequestValidationError):
        return JSONResponse(status_code=400, content={"error": "JSON inválido."})

    @app.get("/api/health", include_in_schema=False)
    def health():
        return {"status": "ok", "service": "nexomed-api", "pid": os.getpid()}

    app.include_router(vba_router)

    original_openapi = app.openapi

    def documented_openapi():
        schema = original_openapi()
        # A validação de transporte usa 400; nenhum endpoint legado retorna 422.
        for path in schema["paths"].values():
            for operation in path.values():
                operation.get("responses", {}).pop("422", None)
        return schema

    app.openapi = documented_openapi
    return app


app = create_app()
