# k8s-learn

An interactive web application to learn and practice Kubernetes commands through a web terminal.

![K8s Learn Terminal](assets/screenshot.png)

🔗 [Acesse o K8s Learn](https://k8s-learn.joaobarros.dev/)

## 🚀 Features

- Interactive web terminal
- kubectl command execution
- User-friendly interface for Kubernetes resource visualization
- Safe environment for practice and learning

## 🛠️ Technologies

- Frontend: React + TypeScript
- Backend: Node.js
- Kubernetes

## 📦 Installation

### Prerequisites

- Node.js
- pnpm
- Kubernetes cluster (local or remote)
- k3d installed locally

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

### Backend

1. Copy the environment variables file:

```bash
cd backend
cp .env.example .env
```

2. Install dependencies and start the server:

```bash
pnpm install
pnpm dev
```

## 🔒 Security

- Each user gets an isolated Kubernetes sandbox environment
- Sandboxes automatically expire after 1 hour
- All commands are executed in an isolated k3d cluster
- No persistent storage between sessions
- Cookie-based session management with secure defaults

## 🤝 Contributing

Contributions are always welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
