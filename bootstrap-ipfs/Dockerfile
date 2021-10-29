FROM node:14
COPY package.json /home/node
COPY package-lock.json /home/node

WORKDIR /home/node
RUN npm install
COPY index.js  /home/node/index.js 
COPY config /home/node/config
COPY ./wait-for-it.sh .
COPY ./docker-entrypoint.sh .
RUN chmod +x wait-for-it.sh
RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "index.js"]
