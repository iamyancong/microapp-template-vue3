# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY packages/package.json ./packages/
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate && pnpm fetch

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app /app
COPY . .
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate && pnpm install --offline && pnpm -C packages build

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/packages/dist /app/packages/dist
COPY --from=builder /app/server /app/server
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-lock.yaml
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate && pnpm install --prod --filter .
ENV PORT=3100
EXPOSE 3100
CMD ["node", "server/index.mjs"]


