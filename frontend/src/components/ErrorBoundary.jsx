import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const { fallback } = this.props;
    if (fallback) return fallback;

    return (
      <div className="flex items-center justify-center min-h-[40vh] p-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md grid gap-4">
          <div className="text-3xl">Something went wrong</div>
          <p className="text-slate-500 text-sm">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            className="bg-[#4C5C2D] text-[#fff8dd] rounded-xl px-4 py-3 hover:bg-[#3a4822] transition"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
