FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY bin/ bin/
COPY cli/ cli/
COPY lib/ lib/
COPY static/ static/
COPY index.js .

FROM node:24-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY --from=builder /app /app
EXPOSE 3456
CMD ["node", "bin/cli.js", "serve"]
