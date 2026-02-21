import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: String(error) };
  }

  componentDidCatch(error) {
    // Keep a console error for quick browser debugging.
    console.error("Root render failed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "1rem", fontFamily: "Segoe UI, sans-serif" }}>
          <h1>Ottera failed to render</h1>
          <p>Open browser devtools console for details.</p>
          <pre>{this.state.message}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
