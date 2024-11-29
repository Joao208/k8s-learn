const API_URL = "/api/sandbox";

export class KubernetesService {
  private static instance: KubernetesService;
  private sandboxCreated: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): KubernetesService {
    if (!KubernetesService.instance) {
      KubernetesService.instance = new KubernetesService();
    }
    return KubernetesService.instance;
  }

  private async initialize(): Promise<void> {
    if (this.sandboxCreated) return;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
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

  async createSandbox(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = this.initialize();
    }
    return this.initializationPromise;
  }

  async executeCommand(command: string): Promise<string> {
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
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to execute command");
      }

      const data = await response.json();
      return data.output.trimEnd() + "\n";
    } catch (error) {
      console.error("Error executing command:", error);
      throw error;
    }
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
