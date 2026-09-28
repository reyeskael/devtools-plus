import { Tab, Tabs } from '@mui/material';
import ApiOutlinedIcon from '@mui/icons-material/ApiOutlined';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';

export type PopupTabKey = 'mock-responses' | 'http-rules';

interface PopupTabsProps {
	value: PopupTabKey;
	onChange: (value: PopupTabKey) => void;
}

/**
 * Tab switcher between the popup's "API Mock" and "HTTP Rules" panels.
 *
 * @param props.value - The currently active tab.
 * @param props.onChange - Called with the newly selected tab.
 * @returns The tabs UI.
 */
export const PopupTabs = ({ value, onChange }: PopupTabsProps) => (
	<Tabs value={value} onChange={(_, newValue) => onChange(newValue)} aria-label="Tool tabs">
		<Tab
			label="API Mock"
			value="mock-responses"
			icon={<ApiOutlinedIcon />}
			iconPosition="start"
		/>
		<Tab label="HTTP Rules" value="http-rules" icon={<RuleOutlinedIcon />} iconPosition="start" />
	</Tabs>
);
