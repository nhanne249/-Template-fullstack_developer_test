# Stage 1: Build the Vite + React frontend
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package.json
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Setup backend
FROM node:22-alpine

WORKDIR /app/backend

# Copy backend package.json
COPY backend/package*.json ./

# Install backend dependencies
RUN npm install

# Copy backend source
COPY backend/ ./

# Copy built frontend from Stage 1 into the position expected by the backend
# Express is configured to look at ../frontend/dist relative to the backend workspace
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Expose backend port
EXPOSE 3000

# Start backend server
CMD ["npm", "start"]
