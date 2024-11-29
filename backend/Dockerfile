FROM ghcr.io/k3d-io/k3d-tools:5.6.0

RUN apk add --no-cache \
    nodejs \
    npm \
    curl

RUN npm install -g pnpm

RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

WORKDIR /app

COPY package*.json ./
RUN pnpm install

COPY . .

EXPOSE 3001

CMD ["pnpm", "start"]
