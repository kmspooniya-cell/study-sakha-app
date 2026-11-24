import { registerRootComponent } from 'expo';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import initializeSkia from './lib/skiaWebInit';

type AppComponent = React.ComponentType;

type ErrorBoundaryState = { error: Error | null };

class AppErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Study Sakha rendered an unrecoverable error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return React.createElement(
        View,
        { style: { flex: 1, backgroundColor: '#0b0c10', alignItems: 'center', justifyContent: 'center', padding: 24 } },
        React.createElement(Text, { style: { color: '#ffffff', textAlign: 'center' } }, 'Study Sakha could not render this screen.'),
        React.createElement(Text, { style: { color: '#aeb7d6', textAlign: 'center', marginTop: 12 } }, this.state.error.message),
      );
    }
    return this.props.children;
  }
}

function AppBootstrap() {
	const [App, setApp] = useState<AppComponent | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		void initializeSkia()
			.then(() => import('./App'))
			.then((app) => {
				if (active) setApp(() => app.default);
			})
			.catch((reason: unknown) => {
				console.error('Application initialization failed:', reason);
				if (active) setError(reason instanceof Error ? reason.message : 'Application initialization failed.');
			});

		return () => {
			active = false;
		};
	}, []);

	if (error) {
		return React.createElement(
			View,
			{ style: { flex: 1, backgroundColor: '#0b0c10', alignItems: 'center', justifyContent: 'center', padding: 24 } },
			React.createElement(Text, { style: { color: '#ffffff', textAlign: 'center' } }, error),
		);
	}

	if (!App) {
		return React.createElement(
			View,
			{ style: { flex: 1, backgroundColor: '#0b0c10', alignItems: 'center', justifyContent: 'center' } },
			React.createElement(ActivityIndicator, { color: '#ffffff' }),
		);
	}

  return React.createElement(AppErrorBoundary, null, React.createElement(App));
}

registerRootComponent(AppBootstrap);
