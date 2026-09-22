import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popup } from './Popup';

jest.mock('../shared/chrome/openApp', () => ({
	openApp: jest.fn(),
}));

import { openApp } from '../shared/chrome/openApp';

describe('Popup', () => {
	it('renders the Open App button', () => {
		render(<Popup />);
		expect(screen.getByRole('button', { name: /open app/i })).toBeInTheDocument();
	});

	it('calls openApp when clicked', async () => {
		render(<Popup />);
		await userEvent.click(screen.getByRole('button', { name: /open app/i }));
		expect(openApp).toHaveBeenCalledTimes(1);
	});
});
