# BUILDER
FROM node:14 as builder
RUN npm install npm@7 -g
RUN npm install -g typescript@4.5.4 @nestjs/cli@8.1.6

WORKDIR /home/node
COPY . /home/node

RUN npm ci \
    && npm run build \
    && npm prune --production

# PRODUCTION 
FROM node:14

USER node
WORKDIR /home/node

COPY --from=builder /home/node/package*.json /home/node/
COPY --from=builder /home/node/node_modules/ /home/node/node_modules/
COPY --from=builder /home/node/dist/ /home/node/dist/

CMD ["node", "./dist/main"]
