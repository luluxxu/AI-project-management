FROM node:20-slim

WORKDIR /app

# better-sqlite3 needs build tools
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install dependencies (leverage Docker cache)
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci && npm --prefix frontend ci

# Copy source
COPY . .

# Build frontend
RUN npm run build

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/taskpilot.db

CMD ["node", "backend/index.js"]
