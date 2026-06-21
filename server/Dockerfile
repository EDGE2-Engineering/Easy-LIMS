# Stage 1: Build UI
FROM node:20-slim AS ui-builder
WORKDIR /ui
COPY ui/package*.json ./
RUN npm install
COPY ui/ ./
RUN npm run build

# Stage 2: Build Server
FROM python:3.11-slim
WORKDIR /app
COPY server/requirements.txt .
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements.txt
COPY server/ .
COPY --from=ui-builder /ui/dist ./dist

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
