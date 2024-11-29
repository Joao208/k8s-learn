FROM ubuntu:22.04

# Evitar prompts durante a instalação
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependências e Node.js 20.x
RUN apt-get update && apt-get install -y curl ca-certificates gnupg
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get update && apt-get install -y \
    nodejs \
    docker.io \
    conntrack \
    systemd \
    && rm -rf /var/lib/apt/lists/*

# Instalar kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Instalar minikube
RUN curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && \
    chmod +x minikube && \
    mv minikube /usr/local/bin/

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
