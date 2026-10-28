import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from '../ui'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <ErrorState title="This page failed to render" error={this.state.error} onRetry={() => this.setState({ error: null })} />
    }
    return this.props.children
  }
}
