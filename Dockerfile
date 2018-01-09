FROM node:6.10.3-alpine

WORKDIR /app

COPY . .

RUN sed -i -e 's/"mongojs": "0.18.2"/"mongojs": "2.4.0"/g' package.json && \
    yarn install

USER node

CMD ["npm", "start"]
