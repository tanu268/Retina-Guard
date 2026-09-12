import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../ui';
import { IconAlert, IconRefresh } from '../ui/icons';

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Catches render errors so a single broken page does not blank the whole
 * workspace mid-shift. The message is written for a technician, not a developer;
 * the stack is available but collapsed.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('RetinaGuard render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-slate-50">
        <div className="max-w-md w-full rounded-none bg-white border border-slate-200 p-8 text-center shadow-[0_4px_8px_-2px_rgb(15_23_42/0.05),0_12px_28px_-6px_rgb(15_23_42/0.10)]">
          <span className="w-12 h-12 rounded-none bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-5">
            <IconAlert size={22} />
          </span>
          <h1 className="text-[19px] font-semibold text-slate-900">This screen stopped responding</h1>
          <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
            No patient data has been lost. Everything already saved on this node
            is intact. Reload to continue working.
          </p>
          <div className="flex gap-2 mt-6">
            <Button variant="outline" fullWidth onClick={() => { window.location.href = '/'; }}>
              Go home
            </Button>
            <Button fullWidth onClick={() => window.location.reload()} icon={<IconRefresh size={15} />}>
              Reload
            </Button>
          </div>
          <details className="mt-6 text-left">
            <summary className="text-[12px] text-slate-400 cursor-pointer hover:text-slate-600">
              Technical detail
            </summary>
            <pre className="mt-2 text-[10.5px] text-slate-500 bg-slate-50 rounded-none p-3 overflow-auto max-h-40 whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
