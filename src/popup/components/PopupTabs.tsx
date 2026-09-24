import { Tab, Tabs } from '@mui/material';
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined';
import BoltIcon from '@mui/icons-material/Bolt';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';

export type PopupTabKey = 'pinned' | 'all' | 'active';

interface PopupTabsProps {
	value: PopupTabKey;
	onChange: (value: PopupTabKey) => void;
}

export const PopupTabs = ({ value, onChange }: PopupTabsProps) => (
	<Tabs value={value} onChange={(_, newValue) => onChange(newValue)} aria-label="Tool tabs">
		<Tab label="Pinned" value="pinned" icon={<PushPinOutlinedIcon />} iconPosition="start" />
		<Tab label="All tools" value="all" icon={<AppsOutlinedIcon />} iconPosition="start" />
		<Tab label="Active" value="active" icon={<BoltIcon />} iconPosition="start" />
	</Tabs>
);
