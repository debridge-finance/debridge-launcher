FROM ubuntu:20.04

ARG DEBIAN_FRONTEND=noninteractive
COPY . /
RUN apt-get update; apt-get install npm -y
RUN npm i

CMD node index.js 
