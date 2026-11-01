# Waggle runs TypeScript directly on Node (no build step) and keeps SQLite in a mounted volume.
FROM node:26-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY campaigns.json ./
EXPOSE 3000
CMD ["node", "src/index.ts"]
