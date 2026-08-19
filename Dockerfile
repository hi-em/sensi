# Sensi — single-container deploy. Stage 1 builds the React SPA; stage 2 runs the
# FastAPI backend which also serves the built static files (one shareable origin).
FROM node:20-slim AS web
WORKDIR /web
COPY web/package.json ./
RUN npm install --no-audit --no-fund
COPY web/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
COPY python/requirements.txt ./python/requirements.txt
RUN pip install --no-cache-dir -r python/requirements.txt
COPY python/ /app/python/
COPY personas/ /app/personas/
# The image ships the curated demo persona (not a developer's personal one), so
# public visitors land as a returning user with a consistent, instant demo.
RUN cp /app/personas/persona.wren-demo.json /app/personas/persona.json
COPY randomized_layouts/ /app/randomized_layouts/
# resulting_layout/ is runtime output only (git-ignored, nothing reads it back) —
# create it empty rather than copying, so builds work from a clean checkout.
RUN mkdir -p /app/resulting_layout
COPY --from=web /web/dist /app/web/dist
ENV PYTHONUNBUFFERED=1
WORKDIR /app/python
EXPOSE 8000
# LLM credentials must be supplied at runtime, e.g. `docker run --env-file .env ...`
# Shell form so $PORT (injected by Cloud Run and most PaaS hosts) is honored;
# falls back to 8000 for local `docker run -p 8000:8000`.
CMD uvicorn api.server:app --host 0.0.0.0 --port ${PORT:-8000}
