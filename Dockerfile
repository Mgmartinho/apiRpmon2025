FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm config set strict-ssl false \
  && npm ci --only=production --silent

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3000

# Comando para iniciar
CMD ["node", "server.js"]
