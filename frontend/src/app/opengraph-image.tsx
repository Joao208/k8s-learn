import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "K8s Learn - Interactive Kubernetes Playground with a Beautiful Terminal right in your browser";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#030711",
          backgroundImage:
            "linear-gradient(45deg, #0F172A 25%, transparent 25%), linear-gradient(-45deg, #0F172A 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #0F172A 75%), linear-gradient(-45deg, transparent 75%, #0F172A 75%)",
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0F172A",
            padding: "40px 60px",
            borderRadius: "20px",
            border: "1px solid #1E293B",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        >
          <h1
            style={{
              fontSize: 60,
              fontWeight: 800,
              background: "linear-gradient(to bottom right, #60A5FA, #3B82F6)",
              backgroundClip: "text",
              color: "transparent",
              margin: 0,
              lineHeight: 1.2,
              textAlign: "center",
            }}
          >
            K8s Learn
          </h1>
          <p
            style={{
              fontSize: 30,
              color: "#E2E8F0",
              margin: "20px 0",
              textAlign: "center",
            }}
          >
            Interactive Kubernetes Playground with a Beautiful Terminal right in
            your browser
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: "#1E293B",
              padding: "12px 24px",
              borderRadius: "10px",
              marginTop: "20px",
            }}
          >
            <p
              style={{
                fontSize: 24,
                color: "#4ADE80",
                margin: 0,
              }}
            >
              $
            </p>
            <p
              style={{
                fontSize: 24,
                color: "#E2E8F0",
                margin: 0,
              }}
            >
              kubectl get started
            </p>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
