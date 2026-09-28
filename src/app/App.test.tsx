import { render, screen } from '@testing-library/react';
import { memoryLocation } from 'wouter/memory-location';
import { AppRoutes } from './App';

/** Renders the app's routes starting at `path`, using wouter's in-memory location hook. */
const renderAtPath = (path: string) => {
	const { hook } = memoryLocation({ path });
	render(<AppRoutes hook={hook} />);
};

describe('AppRoutes', () => {
	it('renders the mock API list placeholder at /mock-api', () => {
		renderAtPath('/mock-api');
		expect(screen.getByText(/mock api list — placeholder, t-05 will replace this/i)).toBeInTheDocument();
	});

	it('renders the mock API create placeholder at /mock-api/new', () => {
		renderAtPath('/mock-api/new');
		expect(
			screen.getByText(/mock api create — placeholder, t-05 will replace this/i),
		).toBeInTheDocument();
	});

	it('renders the mock API edit placeholder with the id param at /mock-api/:id', () => {
		renderAtPath('/mock-api/abc123');
		expect(screen.getByText(/mock api edit \(abc123\)/i)).toBeInTheDocument();
	});

	it('renders the http rules placeholder at /http-rules', () => {
		renderAtPath('/http-rules');
		expect(screen.getByText(/http rules — not yet implemented/i)).toBeInTheDocument();
	});

	it('redirects an unknown path to the mock API list placeholder', () => {
		renderAtPath('/something-unknown');
		expect(screen.getByText(/mock api list — placeholder, t-05 will replace this/i)).toBeInTheDocument();
	});

	it('redirects an empty path to the mock API list placeholder', () => {
		renderAtPath('/');
		expect(screen.getByText(/mock api list — placeholder, t-05 will replace this/i)).toBeInTheDocument();
	});
});
