import { render, screen } from '@testing-library/react';
import { MockApiRow } from './MockApiRow';
import type { MockResponseItem } from '../../shared/items/types';

const makeItem = (overrides: Partial<MockResponseItem> = {}): MockResponseItem => ({
	id: 'mock-user-profile-200',
	kind: 'mock-response',
	name: 'User Profile - 200',
	enabled: true,
	method: 'GET',
	urlPattern: '/api/v1/users/me',
	statusCode: 200,
	statusText: 'OK',
	...overrides,
});

describe('MockApiRow', () => {
	it('renders the method as a chip', () => {
		render(<MockApiRow item={makeItem({ method: 'POST' })} />);
		expect(screen.getByText('POST')).toBeInTheDocument();
	});

	it('renders the mock name', () => {
		render(<MockApiRow item={makeItem({ name: 'User Profile - 200' })} />);
		expect(screen.getByText('User Profile - 200')).toBeInTheDocument();
	});

	it('renders the urlPattern as text', () => {
		render(<MockApiRow item={makeItem({ urlPattern: '/api/v1/users/me' })} />);
		expect(screen.getByText('/api/v1/users/me')).toBeInTheDocument();
	});

	it('renders statusCode and statusText together', () => {
		render(<MockApiRow item={makeItem({ statusCode: 200, statusText: 'OK' })} />);
		expect(screen.getByText('200 OK')).toBeInTheDocument();
	});

	it('renders statusCode alone when there is no statusText', () => {
		render(<MockApiRow item={makeItem({ statusCode: 204, statusText: undefined })} />);
		expect(screen.getByText('204')).toBeInTheDocument();
	});

	it('renders an "Enabled" indicator when the item is enabled', () => {
		render(<MockApiRow item={makeItem({ enabled: true })} />);
		expect(screen.getByText('Enabled')).toBeInTheDocument();
	});

	it('renders a "Disabled" indicator when the item is not enabled', () => {
		render(<MockApiRow item={makeItem({ enabled: false })} />);
		expect(screen.getByText('Disabled')).toBeInTheDocument();
	});
});
