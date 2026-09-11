import React from "react";
import { capturarError } from "./errorHandler";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      tieneError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      tieneError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    capturarError({
      error,
      pagina: window.location.pathname,
      componente: errorInfo?.componentStack || "Componente desconocido",
      operacion: "renderizado_react",
      contexto: {
        tipo: "react_error_boundary",
        componentStack: errorInfo?.componentStack || null,
      },
    });
  }

  render() {
    if (this.state.tieneError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              padding: "32px",
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                marginBottom: "16px",
              }}
            >
              ⚠️
            </div>

            <h1
              style={{
                margin: "0 0 10px",
                color: "#111827",
                fontSize: "24px",
              }}
            >
              Liquisistema encontró un problema
            </h1>

            <p
              style={{
                margin: "0 0 24px",
                color: "#6b7280",
                lineHeight: "1.6",
              }}
            >
              Ocurrió un problema inesperado al cargar esta parte del sistema.
              El error ha sido registrado para su revisión.
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                border: "none",
                borderRadius: "10px",
                padding: "12px 20px",
                background: "#111827",
                color: "#ffffff",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Recargar sistema
            </button>

            {import.meta.env.DEV && this.state.error && (
              <details
                style={{
                  marginTop: "24px",
                  textAlign: "left",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    color: "#6b7280",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Ver error técnico
                </summary>

                <pre
                  style={{
                    marginTop: "10px",
                    padding: "12px",
                    background: "#111827",
                    color: "#e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {this.state.error.stack ||
                    this.state.error.message ||
                    String(this.state.error)}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
