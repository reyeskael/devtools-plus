import { render, screen } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { memoryLocation } from 'wouter/memory-location';
import { AppRoutes } from './App';
import type { MockResponseItem } from '../shared/items/types';

jest.mock('./components/JsonEditor', () => ({
	JsonEditor: (props: {
		value: string;
		onChange: (value: string) => void;
		disabled?: boolean;
		error?: string;
		disabledCaption?: string;
	}) => (
		<div>
			<textarea
				aria-label="Response Body"
				value={props.value}
				disabled={props.disabled}
				onChange={(event: ChangeEvent<HTMLTextAreaElement>) => props.onChange(event.target.value)}
			/>
			{props.disabled && props.disabledCaption && <span>{props.disabledCaption}</span>}
			{props.error && <span>{props.error}</span>}
		</div>
	),
}));

const STORAGE_KEY = 'popupItemsState';

const fixtureMockResponse: MockResponseItem = {
	id: 'mr-1',
	name: 'Get users',
	kind: 'mock-response',
	enabled: true,
	method: 'GET',
	urlPattern: '/api/users',
	statusCode: 200,
	statusText: 'OK',
};

const seedStorage = (mockResponses: MockResponseItem[] = []) => {
	chrome.storage.local.set({
		[STORAGE_KEY]: { mockResponses, redirects: [], isRunning: true },
	});
};

/** Renders the app's routes starting at `path`, using wouter's in-memory location hook. */
const renderAtPath = (path: string) => {
	const { hook } = memoryLocation({ path });
	render(<AppRoutes hook={hook} />);
};

describe('AppRoutes', () => {
	beforeEach(() => {
		seedStorage([]);
	});

	it('renders the Mock APIs list page at /mock-api', () => {
		renderAtPath('/mock-api');
		expect(screen.getByRole('heading', { name: /mock apis/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
	});

	it('renders the editor in create mode at /mock-api/new', () => {
		renderAtPath('/mock-api/new');
		expect(screen.getByText('New mock')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('Mock name')).toHaveValue('');
	});

	it('renders the editor in edit mode with the :id param at /mock-api/:id', () => {
		seedStorage([fixtureMockResponse]);
		renderAtPath(`/mock-api/${fixtureMockResponse.id}`);
		expect(screen.getByDisplayValue('Get users')).toBeInTheDocument();
	});

	it('redirects to the Mock APIs list page when :id does not match any mock response', () => {
		renderAtPath('/mock-api/does-not-exist');
		expect(screen.getByRole('heading', { name: /mock apis/i })).toBeInTheDocument();
	});

	it('renders the http rules placeholder at /redirects', () => {
		renderAtPath('/redirects');
		expect(screen.getByText(/http rules — not yet implemented/i)).toBeInTheDocument();
	});

	it('redirects an unknown path to the mock API list page', () => {
		renderAtPath('/something-unknown');
		expect(screen.getByRole('heading', { name: /mock apis/i })).toBeInTheDocument();
	});

	it('redirects an empty path to the mock API list page', () => {
		renderAtPath('/');
		expect(screen.getByRole('heading', { name: /mock apis/i })).toBeInTheDocument();
	});
});
