# Frontend multi-stage Dockerfile: build React app then serve with nginx

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
ENV CI=true NODE_ENV=production

# Install deps with retry logic
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps --prefer-offline --no-audit 2>&1 || npm install --legacy-peer-deps

# Copy sources and build
COPY . .
RUN npm run build

# Production stage - nginx
FROM nginx:stable-alpine
LABEL org.opencontainers.image.source="https://github.com/akshaymogaveera/sqip-frontend"

# Remove default nginx files and copy built app
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx config (SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


