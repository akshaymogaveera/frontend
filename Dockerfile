# Frontend multi-stage Dockerfile: build React app then serve with nginx

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
ENV CI=true NODE_ENV=production

# Install system dependencies
RUN apk add --no-cache git

# Configure npm for better reliability
RUN npm config set registry https://registry.npmjs.org/
RUN npm config set fetch-retry-mintimeout 20000
RUN npm config set fetch-retry-maxtimeout 120000
RUN npm config set network-timeout 300000

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with fallback
RUN npm install --legacy-peer-deps --prefer-offline --no-audit --no-fund || npm install --legacy-peer-deps

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


