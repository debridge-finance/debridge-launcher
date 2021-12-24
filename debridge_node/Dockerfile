FROM node:14 as builder
RUN npm install npm@7 -g
RUN npm install -g typescript@4.5.4 @nestjs/cli@8.1.6
RUN mkdir /build

COPY package.json /build
COPY package-lock.json /build
COPY tsconfig.json /build
COPY tsconfig.build.json /build
COPY nest-cli.json /build
COPY src  /build/src

WORKDIR /build

RUN mkdir stats

RUN npm install
RUN npm run build

FROM node:14
RUN mkdir /app
WORKDIR /app
COPY --from=builder /build/dist /app/dist
COPY --from=builder /build/node_modules /app/node_modules
COPY --from=builder /build/stats /app/stats
COPY --from=builder /build/package.json /app
COPY --from=builder /build/package-lock.json /app

CMD npm run start:prod
