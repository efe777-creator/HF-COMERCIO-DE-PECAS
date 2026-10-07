import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/** Evita tela branca total quando um filho quebra no render. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[HF] UI crash', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-extrabold text-hf-ink">Algo deu errado</h1>
          <p className="mt-2 text-sm text-hf-muted">
            A página falhou ao carregar. Tente recarregar.
          </p>
          <p className="mt-3 break-all rounded-[10px] border border-hf-line bg-hf-bg p-3 text-left text-xs text-hf-danger">
            {this.state.error.message}
          </p>
          <button
            type="button"
            className="mt-4 rounded-[10px] bg-hf-red px-4 py-2.5 text-sm font-extrabold text-hf-ink"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
