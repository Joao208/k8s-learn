const API_URL = "/api/sandbox";

interface SandboxResponse {
  message: string;
  sandboxId: string;
  expiresIn: string;
  queuePosition?: number;
}

export class KubernetesService {
  private static instance: KubernetesService;
  private sandboxCreated: boolean = false;
  private initializationPromise: Promise<SandboxResponse> | null = null;
  private clientIP: string | null = null;

  private constructor() {
    this.getClientIP().catch(console.error);
  }

  static getInstance(): KubernetesService {
    if (!KubernetesService.instance) {
      KubernetesService.instance = new KubernetesService();
    }
    return KubernetesService.instance;
  }

  private async getClientIP(): Promise<string | null> {
    if (this.clientIP) return this.clientIP;

    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      this.clientIP = data.ip;
      return this.clientIP;
    } catch (error) {
      console.error("Failed to get client IP:", error);
      return null;
    }
  }

  private async initialize(): Promise<void> {
    if (this.sandboxCreated) return;

    try {
      const clientIP = await this.getClientIP();
      const response = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(clientIP && { "X-Real-Client-IP": clientIP }),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create sandbox");
      }

      this.sandboxCreated = true;
    } catch (error) {
      console.error("Error creating sandbox:", error);
      throw error;
    }
  }

  async createSandbox(): Promise<SandboxResponse> {
    if (!this.initializationPromise) {
      this.initializationPromise = this.initialize().then(async () => {
        const clientIP = await this.getClientIP();
        const response = await fetch(API_URL, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(clientIP && { "X-Real-Client-IP": clientIP }),
          },
        });

        if (!response.ok) {
          const error = await response.json();
          throw { ...error, status: response.status };
        }

        return response.json();
      });
    }
    return this.initializationPromise;
  }

  async executeCommand(
    command: string,
    type: "kubectl" = "kubectl"
  ): Promise<string> {
    if (!this.sandboxCreated) {
      await this.createSandbox();
    }

    try {
      const response = await fetch(`${API_URL}/exec`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command, type }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.details) {
          throw new Error(`${error.details.stderr || error.details.message}`);
        }
        throw new Error(error.message || "Failed to execute command");
      }

      const data = await response.json();
      return data.output.trimEnd() + "\n";
    } catch (error) {
      console.error("Error executing command:", error);
      throw error;
    }
  }

  async executeKubectlCommand(command: string): Promise<string> {
    return this.executeCommand(command, "kubectl");
  }

  async deleteSandbox(): Promise<void> {
    if (!this.sandboxCreated) return;

    try {
      const response = await fetch(API_URL, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete sandbox");
      }

      this.sandboxCreated = false;
      this.initializationPromise = null;
    } catch (error) {
      console.error("Error deleting sandbox:", error);
      throw error;
    }
  }
}
