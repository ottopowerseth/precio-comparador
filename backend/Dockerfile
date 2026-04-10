FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# El contexto de build es la raíz del repo, el package.json está en backend/
COPY backend/package*.json ./
RUN npm install

COPY backend/ .

EXPOSE 3005

CMD ["node", "server.js"]
