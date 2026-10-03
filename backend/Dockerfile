# ==============================================================================
# Metron Production Backend Dockerfile (Phase 9)
# Multi-stage Python 3.13 image using Astral uv package manager
# ==============================================================================

FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder

WORKDIR /app

# Enable bytecode compilation and fast caching
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

# Install dependencies into virtual environment
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# ==============================================================================
# Production Runtime Stage
# ==============================================================================
FROM python:3.13-slim-bookworm AS runner

# Create non-root system user for production security hardening
RUN groupadd -r metron && useradd -r -g metron -s /bin/false appuser

WORKDIR /app

# Copy virtual environment from builder stage
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Copy application code and migrations
COPY app /app/app
COPY migrations /app/migrations

# Assign ownership to non-root user
RUN chown -R appuser:metron /app

# Run as non-root user
USER appuser

# Expose REST API port
EXPOSE 8000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').getcode() == 200 else 1)"

# Production ASGI server entrypoint
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
