import { Component, Suspense } from "react";

// Wraps the current screen: shows a short "Loading" note while a screen's file loads, and if a screen fails
// (it cannot be loaded, or it crashes while drawing) shows a message with Reload / Home instead of a blank page.
// The header and sidebar stay usable. Changing screens clears the error (App passes the screen as `resetKey`).
export class ScreenBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error, info) {
    console.error("Screen failed:", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" style={boxStyle}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>This screen could not be opened</div>
          <div style={{ opacity: 0.8, marginBottom: 16 }}>
            Reload the page to try again. If it keeps happening, tell your administrator.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button type="button" style={buttonStyle} onClick={() => window.location.reload()}>Reload</button>
            {this.props.onHome && (
              <button type="button" style={buttonStyle} onClick={this.props.onHome}>Home</button>
            )}
          </div>
        </div>
      );
    }
    return <Suspense fallback={<div style={loadingStyle}>Loading…</div>}>{this.props.children}</Suspense>;
  }
}

const boxStyle = {
  maxWidth: 480, margin: "80px auto", padding: 24, textAlign: "center", color: "#e2e8f0",
  background: "#1e293b", border: "1px solid #334155", borderRadius: 8
};
const buttonStyle = {
  padding: "8px 16px", borderRadius: 6, border: "1px solid #475569", background: "#334155", color: "#f8fafc",
  cursor: "pointer"
};
const loadingStyle = { padding: 40, textAlign: "center", color: "#94a3b8" };
