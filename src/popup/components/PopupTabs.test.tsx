import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PopupTabs } from './PopupTabs';

describe('PopupTabs', () => {
	it('renders exactly 3 tabs', () => {
		render(<PopupTabs value="pinned" onChange={jest.fn()} />);
		expect(screen.getAllByRole('tab')).toHaveLength(3);
	});

	it('renders the tabs in order with the correct labels', () => {
		render(<PopupTabs value="pinned" onChange={jest.fn()} />);
		const tabs = screen.getAllByRole('tab');
		expect(tabs[0]).toHaveTextContent('Pinned');
		expect(tabs[1]).toHaveTextContent('All tools');
		expect(tabs[2]).toHaveTextContent('Active');
	});

	it('marks only the tab matching the value prop as selected', () => {
		render(<PopupTabs value="all" onChange={jest.fn()} />);
		expect(screen.getByRole('tab', { name: /pinned/i })).toHaveAttribute('aria-selected', 'false');
		expect(screen.getByRole('tab', { name: /all tools/i })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tab', { name: /active/i })).toHaveAttribute('aria-selected', 'false');
	});

	it('renders an icon inside each tab', () => {
		render(<PopupTabs value="pinned" onChange={jest.fn()} />);
		expect(screen.getByTestId('PushPinOutlinedIcon')).toBeInTheDocument();
		expect(screen.getByTestId('AppsOutlinedIcon')).toBeInTheDocument();
		expect(screen.getByTestId('BoltIcon')).toBeInTheDocument();
	});

	it('calls onChange with "all" when the All tools tab is clicked', async () => {
		const onChange = jest.fn();
		render(<PopupTabs value="pinned" onChange={onChange} />);
		await userEvent.click(screen.getByRole('tab', { name: /all tools/i }));
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith('all');
	});

	it('calls onChange with "active" when the Active tab is clicked', async () => {
		const onChange = jest.fn();
		render(<PopupTabs value="all" onChange={onChange} />);
		await userEvent.click(screen.getByRole('tab', { name: /active/i }));
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith('active');
	});
});
