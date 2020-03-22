FROM node:12

COPY . /opt/app
WORKDIR /opt/app/src
RUN yarn
# ADD start.sh /
# RUN chmod +x ./start.sh
EXPOSE 7000 7001
CMD node index.js