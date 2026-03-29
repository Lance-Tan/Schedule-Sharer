# Stage 1: Build Angular app
FROM node:22.12-bullseye AS build
WORKDIR /app

# Copy dependency files first
COPY package*.json ./
RUN npm ci

# Copy the rest of the project
COPY . .

# Angular build (production mode)
RUN npm run build --configuration=production

# Stage 2: Serve app using Nginx
FROM nginx:alpine
COPY --from=build /app/dist/ScheduLink-FrontEnd/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]