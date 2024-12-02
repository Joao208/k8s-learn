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
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0F172A",
          padding: "40px",
        }}
      >
        <div
          style={{
            width: "90%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#0F172A",
            borderRadius: "12px",
            border: "1px solid #1E293B",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            overflow: "hidden",
          }}
        >
          {/* Barra de título do terminal */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 16px",
              backgroundColor: "#1E293B",
              borderBottom: "1px solid #334155",
            }}
          >
            {/* Seção esquerda - Botões de controle */}
            <div style={{ width: "80px", display: "flex", gap: "8px" }}>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#EF4444",
                }}
              />
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#FCD34D",
                }}
              />
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#4ADE80",
                }}
              />
            </div>
            {/* Seção central - Título */}
            <div
              style={{
                flex: 1,
                textAlign: "center",
                color: "#94A3B8",
                fontSize: 16,
              }}
            >
              Terminal
            </div>
            {/* Seção direita - Espaço vazio para equilíbrio */}
            <div style={{ width: "80px" }} />
          </div>

          {/* Conteúdo do terminal */}
          <div
            style={{
              padding: "40px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <h1
              style={{
                fontSize: 60,
                fontWeight: 800,
                background:
                  "linear-gradient(to bottom right, #60A5FA, #3B82F6)",
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
                margin: 0,
                textAlign: "left",
                maxWidth: "80%",
              }}
            >
              Interactive Kubernetes Playground with a Beautiful Terminal right
              in your browser
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: "#1E293B",
                padding: "16px 24px",
                borderRadius: "8px",
                marginTop: "12px",
                fontFamily: "monospace",
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
      </div>
    ),
    {
      ...size,
    }
  );
}
