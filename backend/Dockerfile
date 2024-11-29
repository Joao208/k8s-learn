FROM alpine:3.18

RUN apk add --no-cache \
    nodejs \
    npm \
    curl \
    docker-cli \
    wget \
    shadow

RUN groupadd -g 998 docker

RUN useradd -m -s /bin/sh -u 1000 node && \
    usermod -aG docker node

RUN wget -q -O /usr/local/bin/kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64 && \
    chmod +x /usr/local/bin/kind

RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN chown -R node:node /app

USER node

EXPOSE 3001

CMD ["npm", "start"]
