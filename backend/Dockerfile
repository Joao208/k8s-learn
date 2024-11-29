FROM alpine:3.18

RUN apk add --no-cache \
    nodejs \
    npm \
    curl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
