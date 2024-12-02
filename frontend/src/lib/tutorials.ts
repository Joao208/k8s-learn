export interface TutorialStep {
  id: string;
  instruction: string;
  expectedCommand: string;
  hint: string;
  validation: (output: string) => boolean;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  steps: TutorialStep[];
}

export const tutorials: Tutorial[] = [
  {
    id: "basic-deployment",
    title: "Creating and Managing Deployments",
    description:
      "Learn how to create, inspect and scale deployments in Kubernetes",
    steps: [
      {
        id: "create-deployment",
        instruction: "Create a new nginx deployment",
        expectedCommand: "kubectl create deployment nginx --image=nginx",
        hint: "Use 'kubectl create deployment' with nginx image",
        validation: (output) =>
          output.includes("deployment.apps/nginx created"),
      },
      {
        id: "check-deployment",
        instruction: "Check if the deployment was created successfully",
        expectedCommand: "kubectl get deployments",
        hint: "Use 'kubectl get' to list deployments",
        validation: (output) =>
          output.includes("nginx") && output.includes("1/1"),
      },
      {
        id: "scale-deployment",
        instruction: "Scale the deployment to 3 replicas",
        expectedCommand: "kubectl scale deployment nginx --replicas=3",
        hint: "Use 'kubectl scale' to change the number of replicas",
        validation: (output) => output.includes("deployment.apps/nginx scaled"),
      },
      {
        id: "check-pods",
        instruction: "Check if all pods are running",
        expectedCommand: "kubectl get pods",
        hint: "Use 'kubectl get pods' to see all pods",
        validation: (output) => {
          const podCount = (output.match(/nginx.*Running/g) || []).length;
          return podCount === 3;
        },
      },
      {
        id: "describe-deployment",
        instruction: "Get detailed information about the deployment",
        expectedCommand: "kubectl describe deployment nginx",
        hint: "Use 'kubectl describe' to see deployment details",
        validation: (output) =>
          output.includes("Replicas:") &&
          output.includes("nginx") &&
          output.includes("Strategy:"),
      },
    ],
  },
  {
    id: "exposing-services",
    title: "Exposing Applications",
    description: "Learn how to expose applications using Services",
    steps: [
      {
        id: "create-service",
        instruction: "Expose the nginx deployment as a LoadBalancer service",
        expectedCommand:
          "kubectl expose deployment nginx --port=80 --type=LoadBalancer",
        hint: "Use 'kubectl expose' with type LoadBalancer",
        validation: (output) => output.includes("service/nginx exposed"),
      },
      {
        id: "check-service",
        instruction: "Check the service status",
        expectedCommand: "kubectl get services",
        hint: "Use 'kubectl get svc' to list services",
        validation: (output) =>
          output.includes("nginx") && output.includes("LoadBalancer"),
      },
      {
        id: "describe-service",
        instruction: "Get detailed information about the service",
        expectedCommand: "kubectl describe service nginx",
        hint: "Use 'kubectl describe' to see service details",
        validation: (output) =>
          output.includes("Port:") &&
          output.includes("TargetPort:") &&
          output.includes("LoadBalancer"),
      },
    ],
  },
];
