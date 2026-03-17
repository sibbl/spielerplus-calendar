FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

# Final stage
FROM base AS release
COPY --from=install /app/node_modules ./node_modules
COPY package.json bun.lock tsconfig.json index.ts ./
COPY src/ ./src/
RUN mkdir -p /app/cache && chown -R bun:bun /app

USER bun
EXPOSE 3000/tcp

ENTRYPOINT ["bun", "run", "index.ts"]
