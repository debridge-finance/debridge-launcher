FROM node:14
RUN npm install -g typescript@4.3.5 @nestjs/cli@8.1.2
COPY package.json /home/node
COPY package-lock.json /home/node
COPY tsconfig.json /home/node
COPY tsconfig.build.json /home/node
COPY nest-cli.json /home/node
WORKDIR /home/node
RUN npm install
COPY src/  /home/node/src
RUN npm run build

COPY ./wait-for-it.sh .
COPY ./docker-entrypoint.sh .
RUN chmod +x wait-for-it.sh
RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD npm run start
