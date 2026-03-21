import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Magic Mind] Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 text-gray-600 p-8">
          <AlertTriangle size={48} className="text-amber-500 mb-4" />
          <h1 className="text-xl font-semibold mb-2">오류가 발생했습니다</h1>
          <p className="text-sm text-gray-400 mb-4 max-w-md text-center">
            예기치 않은 오류가 발생했습니다. 아래 버튼을 클릭하여 앱을 복구하세요.
            작업 중이던 내용은 자동 저장되지 않았을 수 있습니다.
          </p>
          <p className="text-xs text-gray-300 mb-6 font-mono max-w-md truncate">
            {this.state.error?.message}
          </p>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            <RotateCcw size={16} />
            앱 복구
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
