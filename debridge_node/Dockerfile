# BUILDER
FROM node:16 as builder

WORKDIR /home/node
COPY . /home/node

RUN npm ci \
    && npm run build \
    && npm prune --production

# PRODUCTION 
FROM node:16

USER node
WORKDIR /home/node

COPY --from=builder /home/node/package*.json /home/node/
COPY --from=builder /home/node/node_modules/ /home/node/node_modules/
COPY --from=builder /home/node/dist/ /home/node/dist/

CMD ["node", "./dist/main.js"]
