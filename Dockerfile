FROM python:3.12-slim

WORKDIR /app

# Install Node.js & npm for UI build
RUN apt-get update && apt-get install -y nodejs npm git && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY server/requirements.txt ./server/
RUN pip install --no-cache-dir -r server/requirements.txt uvicorn

# Copy UI source code and build frontend dist
COPY ui ./ui
RUN cd ui && npm install && npm run build && mkdir -p /app/server/dist && cp -r dist/* /app/server/dist/

# Copy server code
COPY server ./server

WORKDIR /app/server

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
