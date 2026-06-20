# # ---------- Stage 1: Build the app ----------
# FROM node:20-alpine as build

# WORKDIR /app
# COPY package*.json ./
# RUN npm install

# COPY . .
# RUN npm run build

# # ---------- Stage 2: Serve with Nginx ----------
# FROM nginx:alpine

# # Copy build output to nginx html directory
# COPY --from=build /app/dist /usr/share/nginx/html

# # Copy custom nginx config (optional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# EXPOSE 5173

# CMD ["nginx", "-g", "daemon off;"]

# frontend/Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]