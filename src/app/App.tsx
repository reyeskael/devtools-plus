import { Redirect, Route, Router, Switch } from 'wouter';
import type { BaseLocationHook } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { ItemsStateProvider } from '../shared/context/ItemsStateContext';
import { MockApiPage } from './pages/MockApiPage';
import { MockEditorPage } from './pages/MockEditorPage';
import { RedirectRulesPage } from './pages/RedirectRulesPage';
import { RedirectRuleEditorPage } from './pages/RedirectRuleEditorPage';

interface AppRoutesProps {
	/**
	 * Location hook wouter reads/writes the current route through. Defaults to hash-based
	 * routing, matching the `#/page` URLs `openApp` builds. Overridable in tests with wouter's
	 * memory-location hook so routes can be exercised without touching `window.location.hash`.
	 */
	hook?: BaseLocationHook;
}

/**
 * The app's route table, split out from `App` so tests can mount it with an in-memory location
 * hook instead of the real hash-based one.
 *
 * @param props.hook - The wouter location hook to route with.
 * @returns The routed page content.
 */
export const AppRoutes = ({ hook = useHashLocation }: AppRoutesProps = {}) => (
	<ItemsStateProvider>
		<Router hook={hook}>
			<Switch>
				<Route path="/mock-api" component={MockApiPage} />
				<Route path="/mock-api/new">
					<MockEditorPage />
				</Route>
				<Route path="/mock-api/:id">{(params) => <MockEditorPage id={params.id} />}</Route>
				<Route path="/redirects" component={RedirectRulesPage} />
				<Route path="/redirects/new">
					<RedirectRuleEditorPage />
				</Route>
				<Route path="/redirects/:id">
					{(params) => <RedirectRuleEditorPage id={params.id} />}
				</Route>
				<Route>
					<Redirect to="/mock-api" />
				</Route>
			</Switch>
		</Router>
	</ItemsStateProvider>
);

/**
 * The full-page app shell, opened from the popup's Add/Open App actions. Makes no assumptions
 * about being hosted in a browser tab, so it can be mounted from other extension surfaces
 * (like a future DevTools panel) too.
 *
 * @returns The app shell UI.
 */
export const App = () => <AppRoutes />;
