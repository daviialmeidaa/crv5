FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
COPY api/requirements.txt ./api/requirements.txt
RUN python3 -m venv .venv && .venv/bin/pip install --no-cache-dir -r requirements.txt
COPY package*.json ./
COPY scripts/patch-node-sped-pdf.js ./scripts/patch-node-sped-pdf.js
RUN npm ci --omit=dev --no-audit --no-fund
COPY . .
ENV PORT=3000 FASTAPI_PYTHON=/app/.venv/bin/python
EXPOSE 3000
CMD ["npm", "start"]
