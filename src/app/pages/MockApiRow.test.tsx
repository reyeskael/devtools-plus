import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
		render(<MockApiRow item={makeItem({ method: 'POST' })} onEdit={jest.fn()} />);
		expect(screen.getByText('POST')).toBeInTheDocument();
	});

	it('renders the mock name', () => {
		render(<MockApiRow item={makeItem({ name: 'User Profile - 200' })} onEdit={jest.fn()} />);
		expect(screen.getByText('User Profile - 200')).toBeInTheDocument();
	});

	it('renders the urlPattern as text', () => {
		render(<MockApiRow item={makeItem({ urlPattern: '/api/v1/users/me' })} onEdit={jest.fn()} />);
		expect(screen.getByText('/api/v1/users/me')).toBeInTheDocument();
	});

	it('renders statusCode and statusText together', () => {
		render(<MockApiRow item={makeItem({ statusCode: 200, statusText: 'OK' })} onEdit={jest.fn()} />);
		expect(screen.getByText('200 OK')).toBeInTheDocument();
	});

	it('renders statusCode alone when there is no statusText', () => {
		render(
			<MockApiRow item={makeItem({ statusCode: 204, statusText: undefined })} onEdit={jest.fn()} />,
		);
		expect(screen.getByText('204')).toBeInTheDocument();
	});

	it('renders an "Enabled" indicator when the item is enabled', () => {
		render(<MockApiRow item={makeItem({ enabled: true })} onEdit={jest.fn()} />);
		expect(screen.getByText('Enabled')).toBeInTheDocument();
	});

	it('renders a "Disabled" indicator when the item is not enabled', () => {
		render(<MockApiRow item={makeItem({ enabled: false })} onEdit={jest.fn()} />);
		expect(screen.getByText('Disabled')).toBeInTheDocument();
	});

	it('renders an edit button', () => {
		const item = makeItem({ name: 'User Profile - 200' });
		render(<MockApiRow item={item} onEdit={jest.fn()} />);
		expect(screen.getByRole('button', { name: `Edit ${item.name}` })).toBeInTheDocument();
	});

	it('calls onEdit with the item id when the edit button is clicked', async () => {
		const item = makeItem({ name: 'User Profile - 200' });
		const onEdit = jest.fn();
		render(<MockApiRow item={item} onEdit={onEdit} />);
		await userEvent.click(screen.getByRole('button', { name: `Edit ${item.name}` }));
		expect(onEdit).toHaveBeenCalledWith(item.id);
	});

	it('reflects a different item name in the edit button\'s aria-label', () => {
		const item = makeItem({ name: 'Create Order' });
		render(<MockApiRow item={item} onEdit={jest.fn()} />);
		expect(screen.getByRole('button', { name: 'Edit Create Order' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Edit User Profile - 200' })).not.toBeInTheDocument();
	});
});
