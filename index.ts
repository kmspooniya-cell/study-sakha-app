import { registerRootComponent } from 'expo';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import initializeSkia from './lib/skiaWebInit';

type AppComponent = React.ComponentType;

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

	return React.createElement(App);
}

registerRootComponent(AppBootstrap);
