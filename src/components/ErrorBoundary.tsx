import { Component } from 'react';
import type  { ErrorInfo, ReactNode } from 'react';
import { GlobalErrorPage } from '../pages/ErrorPage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Developer-friendly console trace
    console.error('🔥 [Unhandled React Render Error]:', error);
    console.error('📌 [Component Stack Trace]:', errorInfo.componentStack);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <GlobalErrorPage />
      );
    }

    return this.props.children;
  }
}