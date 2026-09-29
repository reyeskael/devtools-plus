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
		render(<MockApiRow item={makeItem({ method: 'POST' })} onEdit={jest.fn()} onToggle={jest.fn()} onDelete={jest.fn()} />);
		expect(screen.getByText('POST')).toBeInTheDocument();
	});

	it('renders the mock name', () => {
		render(
			<MockApiRow
				item={makeItem({ name: 'User Profile - 200' })}
				onEdit={jest.fn()}
				onToggle={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByText('User Profile - 200')).toBeInTheDocument();
	});

	it('renders the urlPattern as text', () => {
		render(
			<MockApiRow
				item={makeItem({ urlPattern: '/api/v1/users/me' })}
				onEdit={jest.fn()}
				onToggle={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByText('/api/v1/users/me')).toBeInTheDocument();
	});

	it('renders statusCode and statusText together', () => {
		render(
			<MockApiRow
				item={makeItem({ statusCode: 200, statusText: 'OK' })}
				onEdit={jest.fn()}
				onToggle={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByText('200 OK')).toBeInTheDocument();
	});

	it('renders statusCode alone when there is no statusText', () => {
		render(
			<MockApiRow
				item={makeItem({ statusCode: 204, statusText: undefined })}
				onEdit={jest.fn()}
				onToggle={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByText('204')).toBeInTheDocument();
	});

	it('renders the switch as checked when the item is enabled', () => {
		const item = makeItem({ enabled: true });
		render(<MockApiRow item={item} onEdit={jest.fn()} onToggle={jest.fn()} onDelete={jest.fn()} />);
		expect(screen.getByRole('switch', { name: `${item.name} switch` })).toBeChecked();
	});

	it('renders the switch as unchecked when the item is disabled', () => {
		const item = makeItem({ enabled: false });
		render(<MockApiRow item={item} onEdit={jest.fn()} onToggle={jest.fn()} onDelete={jest.fn()} />);
		expect(screen.getByRole('switch', { name: `${item.name} switch` })).not.toBeChecked();
	});

	it('calls onToggle (and not onEdit) when the switch is clicked', async () => {
		const item = makeItem();
		const onToggle = jest.fn();
		const onEdit = jest.fn();
		render(<MockApiRow item={item} onEdit={onEdit} onToggle={onToggle} onDelete={jest.fn()} />);
		await userEvent.click(screen.getByRole('switch', { name: `${item.name} switch` }));
		expect(onToggle).toHaveBeenCalledWith(item.id);
		expect(onEdit).not.toHaveBeenCalled();
	});

	it('calls onDelete (and not onEdit) when the delete button is clicked', async () => {
		const item = makeItem();
		const onDelete = jest.fn();
		const onEdit = jest.fn();
		render(<MockApiRow item={item} onEdit={onEdit} onToggle={jest.fn()} onDelete={onDelete} />);
		await userEvent.click(screen.getByRole('button', { name: `Delete ${item.name}` }));
		expect(onDelete).toHaveBeenCalledWith(item.id);
		expect(onEdit).not.toHaveBeenCalled();
	});

	it('calls onEdit with the item id when the row is clicked', async () => {
		const item = makeItem({ name: 'User Profile - 200' });
		const onEdit = jest.fn();
		render(<MockApiRow item={item} onEdit={onEdit} onToggle={jest.fn()} onDelete={jest.fn()} />);
		await userEvent.click(screen.getByRole('button', { name: `Edit ${item.name}` }));
		expect(onEdit).toHaveBeenCalledWith(item.id);
	});

	it('calls onEdit when the row is activated with the keyboard', async () => {
		const item = makeItem({ name: 'User Profile - 200' });
		const onEdit = jest.fn();
		render(<MockApiRow item={item} onEdit={onEdit} onToggle={jest.fn()} onDelete={jest.fn()} />);
		screen.getByRole('button', { name: `Edit ${item.name}` }).focus();
		await userEvent.keyboard('{Enter}');
		expect(onEdit).toHaveBeenCalledWith(item.id);
	});

	it('reflects a different item name in the row\'s aria-label', () => {
		const item = makeItem({ name: 'Create Order' });
		render(<MockApiRow item={item} onEdit={jest.fn()} onToggle={jest.fn()} onDelete={jest.fn()} />);
		expect(screen.getByRole('button', { name: 'Edit Create Order' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Edit User Profile - 200' })).not.toBeInTheDocument();
	});
});
