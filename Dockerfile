FROM node:6.10.3-alpine

WORKDIR /app

COPY . .

RUN apk --no-cache update && \
    apk --no-cache upgrade && \
    sed -i -e 's/"mongojs": "0.18.2"/"mongojs": "2.4.0"/g' package.json && \
    yarn install && \
    yarn cache clean

USER node

CMD ["npm", "start"]
