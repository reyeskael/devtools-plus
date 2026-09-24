import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PopupTabs } from './PopupTabs';

describe('PopupTabs', () => {
	it('renders exactly 2 tabs', () => {
		render(<PopupTabs value="mock-responses" onChange={jest.fn()} />);
		expect(screen.getAllByRole('tab')).toHaveLength(2);
	});

	it('renders the tabs in order with the correct labels', () => {
		render(<PopupTabs value="mock-responses" onChange={jest.fn()} />);
		const tabs = screen.getAllByRole('tab');
		expect(tabs[0]).toHaveTextContent('API Response Mock');
		expect(tabs[1]).toHaveTextContent('HTTP Rules');
	});

	it('marks only the tab matching the value prop as selected', () => {
		render(<PopupTabs value="http-rules" onChange={jest.fn()} />);
		expect(screen.getByRole('tab', { name: /api response mock/i })).toHaveAttribute(
			'aria-selected',
			'false',
		);
		expect(screen.getByRole('tab', { name: /http rules/i })).toHaveAttribute(
			'aria-selected',
			'true',
		);
	});

	it('renders an icon inside each tab', () => {
		render(<PopupTabs value="mock-responses" onChange={jest.fn()} />);
		expect(screen.getByTestId('ApiOutlinedIcon')).toBeInTheDocument();
		expect(screen.getByTestId('RuleOutlinedIcon')).toBeInTheDocument();
	});

	it('calls onChange with "mock-responses" when the API Response Mock tab is clicked', async () => {
		const onChange = jest.fn();
		render(<PopupTabs value="http-rules" onChange={onChange} />);
		await userEvent.click(screen.getByRole('tab', { name: /api response mock/i }));
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith('mock-responses');
	});

	it('calls onChange with "http-rules" when the HTTP Rules tab is clicked', async () => {
		const onChange = jest.fn();
		render(<PopupTabs value="mock-responses" onChange={onChange} />);
		await userEvent.click(screen.getByRole('tab', { name: /http rules/i }));
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith('http-rules');
	});
});
