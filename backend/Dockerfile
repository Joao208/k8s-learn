FROM alpine:3.18

RUN apk add --no-cache \
    nodejs \
    npm \
    curl \
    docker-cli \
    wget

RUN wget -q -O /usr/local/bin/k3d https://github.com/k3d-io/k3d/releases/download/v5.6.0/k3d-linux-amd64 && \
    chmod +x /usr/local/bin/k3d

RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
