import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Without this, any uncaught error anywhere in the tree (a null field from
// the market API, a bad value in a holding, etc.) unmounts the whole app and
// leaves a permanently blank page with nothing but a console error. This
// catches that and shows something actionable instead.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error caught by ErrorBoundary:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 flex items-center justify-center">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-bold text-white mb-2">কিছু একটা সমস্যা হয়েছে</h1>
            <p className="text-slate-400 text-sm mb-4">
              পেজটি লোড করতে গিয়ে একটা ত্রুটি হয়েছে। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-purple-600 text-white text-sm px-4 py-2 rounded"
            >
              রিফ্রেশ করুন
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
