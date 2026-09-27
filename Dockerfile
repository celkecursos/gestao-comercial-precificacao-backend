# ---- Build ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# O .npmrc força a instalação das devDependencies (necessário no build da Hostinger);
# ele é removido aqui para que o prune descarte essas dependências da imagem final.
RUN npm run build \
  && rm .npmrc \
  && npm prune --omit=dev

# ---- Runtime ----
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
