interface FileSystemNode {
  name: string;
  type: "file" | "directory";
  content?: string;
  children?: { [key: string]: FileSystemNode };
  createdAt: number;
  updatedAt: number;
}

export class VirtualFileSystem {
  private static instance: VirtualFileSystem;
  private root: FileSystemNode;
  private currentPath: string[] = [];

  private constructor() {
    const savedFs = localStorage.getItem("virtualFs");
    if (savedFs) {
      this.root = JSON.parse(savedFs);
    } else {
      this.root = {
        name: "/",
        type: "directory",
        children: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.saveToStorage();
    }
  }

  static getInstance(): VirtualFileSystem {
    if (!VirtualFileSystem.instance) {
      VirtualFileSystem.instance = new VirtualFileSystem();
    }
    return VirtualFileSystem.instance;
  }

  private saveToStorage(): void {
    localStorage.setItem("virtualFs", JSON.stringify(this.root));
  }

  private getNodeAtPath(path: string[]): FileSystemNode | null {
    let current = this.root;
    for (const part of path) {
      if (!current.children?.[part]) return null;
      current = current.children[part];
    }
    return current;
  }

  getCurrentPath(): string {
    return "/" + this.currentPath.join("/");
  }

  cd(path: string): string {
    if (path === "/") {
      this.currentPath = [];
      return this.getCurrentPath();
    }

    if (path === "..") {
      if (this.currentPath.length > 0) {
        this.currentPath.pop();
      }
      return this.getCurrentPath();
    }

    const parts = path.split("/").filter((p) => p !== "" && p !== ".");
    const targetPath = [...this.currentPath, ...parts];
    const node = this.getNodeAtPath(targetPath);

    if (!node || node.type !== "directory") {
      throw new Error(`Directory not found: ${path}`);
    }

    this.currentPath = targetPath;
    return this.getCurrentPath();
  }

  ls(path?: string): string[] {
    const targetPath = path
      ? path.split("/").filter((p) => p !== "")
      : this.currentPath;
    const node = this.getNodeAtPath(targetPath);

    if (!node) {
      throw new Error("Directory not found");
    }

    if (node.type !== "directory") {
      throw new Error("Not a directory");
    }

    return Object.entries(node.children || {}).map(([name, node]) => {
      const type = node.type === "directory" ? "d" : "-";
      const timestamp = new Date(node.updatedAt).toLocaleString();
      return `${type} ${name.padEnd(20)} ${timestamp}`;
    });
  }

  mkdir(name: string): void {
    const current = this.getNodeAtPath(this.currentPath);
    if (!current || current.type !== "directory") {
      throw new Error("Invalid current directory");
    }

    if (!current.children) {
      current.children = {};
    }

    if (current.children[name]) {
      throw new Error("Directory already exists");
    }

    current.children[name] = {
      name,
      type: "directory",
      children: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.saveToStorage();
  }

  touch(name: string): void {
    const current = this.getNodeAtPath(this.currentPath);
    if (!current || current.type !== "directory") {
      throw new Error("Invalid current directory");
    }

    if (!current.children) {
      current.children = {};
    }

    if (current.children[name]) {
      throw new Error("File already exists");
    }

    current.children[name] = {
      name,
      type: "file",
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.saveToStorage();
  }

  rm(name: string, recursive = false): void {
    const current = this.getNodeAtPath(this.currentPath);
    if (!current || current.type !== "directory") {
      throw new Error("Invalid current directory");
    }

    const target = current.children?.[name];
    if (!target) {
      throw new Error("File or directory not found");
    }

    if (
      target.type === "directory" &&
      !recursive &&
      Object.keys(target.children || {}).length > 0
    ) {
      throw new Error("Directory not empty. Use -r flag to remove recursively");
    }

    delete current.children![name];
    this.saveToStorage();
  }

  cat(name: string): string {
    const current = this.getNodeAtPath(this.currentPath);
    if (!current || current.type !== "directory") {
      throw new Error("Invalid current directory");
    }

    const file = current.children?.[name];
    if (!file || file.type !== "file") {
      throw new Error("File not found");
    }

    return file.content || "";
  }

  echo(content: string, fileName: string): void {
    const current = this.getNodeAtPath(this.currentPath);
    if (!current || current.type !== "directory") {
      throw new Error("Invalid current directory");
    }

    if (!current.children) {
      current.children = {};
    }

    if (
      !current.children[fileName] ||
      current.children[fileName].type !== "file"
    ) {
      current.children[fileName] = {
        name: fileName,
        type: "file",
        content: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    current.children[fileName].content = content;
    current.children[fileName].updatedAt = Date.now();
    this.saveToStorage();
  }
}
