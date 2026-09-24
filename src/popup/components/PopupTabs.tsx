import { Tab, Tabs } from '@mui/material';
import ApiOutlinedIcon from '@mui/icons-material/ApiOutlined';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';

export type PopupTabKey = 'mock-responses' | 'http-rules';

interface PopupTabsProps {
	value: PopupTabKey;
	onChange: (value: PopupTabKey) => void;
}

export const PopupTabs = ({ value, onChange }: PopupTabsProps) => (
	<Tabs value={value} onChange={(_, newValue) => onChange(newValue)} aria-label="Tool tabs">
		<Tab
			label="API Response Mock"
			value="mock-responses"
			icon={<ApiOutlinedIcon />}
			iconPosition="start"
		/>
		<Tab label="HTTP Rules" value="http-rules" icon={<RuleOutlinedIcon />} iconPosition="start" />
	</Tabs>
);
