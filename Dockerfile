FROM node:22-alpine

ENV NODE_ENV=production

RUN mkdir -p /home/node/app && chown node:node /home/node/app

WORKDIR /home/node/app

USER node

COPY --chown=node:node package*.json ./

RUN npm ci --omit=dev

COPY --chown=node:node server.js ./

EXPOSE 3000

CMD [ "node", "server.js" ]
