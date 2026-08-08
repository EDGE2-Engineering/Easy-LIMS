# Stage 1: Build UI frontend with Node.js
FROM node:20-slim AS ui-builder
WORKDIR /app/ui
COPY ui/package*.json ./
RUN npm install --no-audit --no-fund
COPY ui ./
RUN npm run build

# Stage 2: Runtime container with Python 3.12 & Node.js
FROM python:3.12-slim
WORKDIR /app

# Install Node.js, npm & git
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    npm \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY server/requirements.txt ./server/
RUN pip install --no-cache-dir -r server/requirements.txt uvicorn

# Copy compiled UI dist from builder stage into server/dist
COPY --from=ui-builder /app/ui/dist ./server/dist

# Copy server application code
COPY server ./server

WORKDIR /app/server

EXPOSE 8000

ENV PORT=8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
