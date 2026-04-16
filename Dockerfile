FROM oven/bun:1.3

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY drizzle.config.ts tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["bun", "run", "src/index.ts"]
