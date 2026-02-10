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

# Health check para Docker verificar se o container está saudável
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Comando para iniciar
CMD ["node", "server.js"]
