FROM python:3.12-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:${PATH}"

COPY apps/api/requirements.txt /tmp/requirements.txt
RUN pip install --requirement /tmp/requirements.txt


FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:${PATH}"

RUN groupadd --gid 10001 citymind \
    && useradd --uid 10001 --gid citymind --create-home --shell /usr/sbin/nologin citymind

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY apps/api/alembic.ini ./alembic.ini
COPY apps/api/alembic ./alembic
COPY apps/api/app ./app
COPY data ./data
COPY TRIPOLI_CITY_KNOWLEDGE.md ./TRIPOLI_CITY_KNOWLEDGE.md

RUN chown -R citymind:citymind /app
USER citymind

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/ready', timeout=3)"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
