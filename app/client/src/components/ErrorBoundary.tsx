import { Component, type ReactNode } from 'react';
import Icon from './Icon';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * One page failing must never blank the whole Academy (a single odd value in a query result once
 * did). The failing page is replaced by a plain message with a way out; the menu keeps working,
 * and nothing saved is touched. App.tsx gives each page its own boundary, reset on navigation.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('A page failed to show:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card page-error" role="alert">
        <h2 style={{ marginTop: 0 }}><Icon name="bulb" size={20} /> Something went wrong on this page</h2>
        <p>Your saved work and your progress are safe. This is a problem in the app, not something you did.</p>
        <div className="row">
          <button className="btn primary" onClick={() => window.location.reload()}><Icon name="refresh" size={15} />Reload this page</button>
          <a className="btn" href="#/"><Icon name="home" size={15} />Go to Home</a>
        </div>
        <details className="tech-details" style={{ marginTop: 10 }}>
          <summary className="mini muted">Technical details</summary>
          <pre className="mono mini" style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>{String(this.state.error?.message || this.state.error)}</pre>
        </details>
      </div>
    );
  }
}
