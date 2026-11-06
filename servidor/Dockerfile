# Servidor do Terrário: o arquivo único gerado por servidor/construir.mjs, num Node 22 enxuto.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY dist/index.mjs ./index.mjs
USER node
EXPOSE 8080
CMD ["node", "index.mjs"]
