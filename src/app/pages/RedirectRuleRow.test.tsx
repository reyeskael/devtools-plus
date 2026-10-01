import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RedirectRuleRow } from './RedirectRuleRow';
import type { RedirectRuleItem } from '../../shared/items/types';

const makeItem = (overrides: Partial<RedirectRuleItem> = {}): RedirectRuleItem => ({
	id: 'redirect-old-api',
	kind: 'redirect',
	name: 'Old API redirect',
	enabled: true,
	matchType: 'wildcard',
	urlPattern: '*.js',
	destination: 'https://localhost:3000/$1',
	methods: ['GET', 'POST'],
	...overrides,
});

describe('RedirectRuleRow', () => {
	it('renders the rule name', () => {
		render(
			<RedirectRuleRow
				item={makeItem({ name: 'Old API redirect' })}
				onEdit={jest.fn()}
				onToggle={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByText('Old API redirect')).toBeInTheDocument();
	});

	it('renders the formatted redirect summary', () => {
		render(
			<RedirectRuleRow
				item={makeItem({
					methods: ['GET', 'POST'],
					urlPattern: '*.js',
					destination: 'https://localhost:3000/$1',
				})}
				onEdit={jest.fn()}
				onToggle={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByText('GET,POST *.js → https://localhost:3000/$1')).toBeInTheDocument();
	});

	it('renders "ALL" in the summary when methods is omitted', () => {
		render(
			<RedirectRuleRow
				item={makeItem({
					methods: undefined,
					urlPattern: '/old/path',
					destination: '/new/path',
				})}
				onEdit={jest.fn()}
				onToggle={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByText('ALL /old/path → /new/path')).toBeInTheDocument();
	});

	it('renders the switch as checked when the item is enabled', () => {
		const item = makeItem({ enabled: true });
		render(
			<RedirectRuleRow
				item={item}
				onEdit={jest.fn()}
				onToggle={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByRole('switch', { name: `${item.name} switch` })).toBeChecked();
	});

	it('renders the switch as unchecked when the item is disabled', () => {
		const item = makeItem({ enabled: false });
		render(
			<RedirectRuleRow
				item={item}
				onEdit={jest.fn()}
				onToggle={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByRole('switch', { name: `${item.name} switch` })).not.toBeChecked();
	});

	it('calls onToggle (and not onEdit) when the switch is clicked', async () => {
		const item = makeItem();
		const onToggle = jest.fn();
		const onEdit = jest.fn();
		render(
			<RedirectRuleRow
				item={item}
				onEdit={onEdit}
				onToggle={onToggle}
				onDelete={jest.fn()}
			/>,
		);
		await userEvent.click(screen.getByRole('switch', { name: `${item.name} switch` }));
		expect(onToggle).toHaveBeenCalledWith(item.id);
		expect(onEdit).not.toHaveBeenCalled();
	});

	it('calls onDelete (and not onEdit) when the delete button is clicked', async () => {
		const item = makeItem();
		const onDelete = jest.fn();
		const onEdit = jest.fn();
		render(
			<RedirectRuleRow
				item={item}
				onEdit={onEdit}
				onToggle={jest.fn()}
				onDelete={onDelete}
			/>,
		);
		await userEvent.click(screen.getByRole('button', { name: `Delete ${item.name}` }));
		expect(onDelete).toHaveBeenCalledWith(item.id);
		expect(onEdit).not.toHaveBeenCalled();
	});

	it('calls onEdit with the item id when the row is clicked', async () => {
		const item = makeItem({ name: 'Old API redirect' });
		const onEdit = jest.fn();
		render(
			<RedirectRuleRow
				item={item}
				onEdit={onEdit}
				onToggle={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		await userEvent.click(screen.getByRole('button', { name: `Edit ${item.name}` }));
		expect(onEdit).toHaveBeenCalledWith(item.id);
	});

	it('calls onEdit when the row is activated with the keyboard', async () => {
		const item = makeItem({ name: 'Old API redirect' });
		const onEdit = jest.fn();
		render(
			<RedirectRuleRow
				item={item}
				onEdit={onEdit}
				onToggle={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		screen.getByRole('button', { name: `Edit ${item.name}` }).focus();
		await userEvent.keyboard('{Enter}');
		expect(onEdit).toHaveBeenCalledWith(item.id);
	});

	it('calls onEdit when the row is activated with the Space key', async () => {
		const item = makeItem({ name: 'Old API redirect' });
		const onEdit = jest.fn();
		render(
			<RedirectRuleRow
				item={item}
				onEdit={onEdit}
				onToggle={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		screen.getByRole('button', { name: `Edit ${item.name}` }).focus();
		await userEvent.keyboard(' ');
		expect(onEdit).toHaveBeenCalledWith(item.id);
	});

	it("reflects a different item name in the row's aria-label", () => {
		const item = makeItem({ name: 'New API redirect' });
		render(
			<RedirectRuleRow
				item={item}
				onEdit={jest.fn()}
				onToggle={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByRole('button', { name: 'Edit New API redirect' })).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'Edit Old API redirect' }),
		).not.toBeInTheDocument();
	});
});
