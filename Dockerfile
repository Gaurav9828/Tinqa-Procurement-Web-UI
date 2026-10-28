# syntax=docker/dockerfile:1.7
# TinQa Procurement Web UI (React + Vite), served by nginx.
# VITE_* values are baked into the bundle at build time, so pass the real API URLs per environment:
#   docker build \
#     --build-arg VITE_API_BASE_URL=https://procurement-api.example.com/api \
#     --build-arg VITE_ECOMMERCE_API_BASE_URL=https://api.example.com/api \
#     -t tinqa-procurement-web-ui .
#   docker run -p 5173:80 tinqa-procurement-web-ui

# ---------- Stage 1: build ----------
# The Playwright image (Node + Chromium, same version as @playwright/test) so the build's end-to-end gate can run
FROM mcr.microsoft.com/playwright:v1.64.1-noble AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY . .

# Values already in the environment win over the committed .env file
ARG VITE_API_BASE_URL=http://localhost:9090/api
ARG VITE_ECOMMERCE_API_BASE_URL=http://localhost:8080/api
ARG VITE_ALLOWED_IMAGE_HOSTS=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_ECOMMERCE_API_BASE_URL=$VITE_ECOMMERCE_API_BASE_URL \
    VITE_ALLOWED_IMAGE_HOSTS=$VITE_ALLOWED_IMAGE_HOSTS

# Runs the strict quality gate before and the end-to-end gate after the build (scripts/*-gate.mjs)
RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginx:1.27-alpine
RUN rm -f /etc/nginx/conf.d/default.conf && mkdir -p /etc/nginx/snippets
COPY nginx.conf /etc/nginx/conf.d/app.conf
COPY nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
