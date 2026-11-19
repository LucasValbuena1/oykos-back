# ---- Etapa 1: compilar ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
# npm 11: el npm 10 que trae la imagen falla resolviendo los peers de Nest 12
RUN npm install -g npm@11 && npm ci
COPY . .
RUN npm run build

# ---- Etapa 2: imagen final, solo dependencias de producción ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install -g npm@11 && npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
