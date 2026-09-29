import { Switch, styled } from '@mui/material';

/**
 * A `Switch` styled after the extension icon's palette: a charcoal track at rest and in
 * either state, with the thumb swapping from the icon's off-white to its accent red-orange
 * when checked. Shared by the popup header's master switch and per-row enable/disable
 * switches in the app.
 */
export const BrandSwitch = styled(Switch)(() => ({
	width: 36,
	height: 20,
	padding: 0,
	'& .MuiSwitch-switchBase': {
		padding: 2,
		'&.Mui-checked': {
			transform: 'translateX(16px)',
			'& .MuiSwitch-thumb': {
				backgroundColor: '#d8533a',
			},
			'& + .MuiSwitch-track': {
				backgroundColor: '#16181c',
				opacity: 1,
			},
		},
	},
	'& .MuiSwitch-thumb': {
		width: 16,
		height: 16,
		backgroundColor: '#f7f6f2',
		boxSizing: 'border-box',
	},
	'& .MuiSwitch-track': {
		borderRadius: 10,
		backgroundColor: '#16181c',
		opacity: 1,
	},
}));
