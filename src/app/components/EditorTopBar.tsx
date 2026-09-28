import { Box, Breadcrumbs, Button, IconButton, Link, Menu, Switch, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState } from 'react';
import type { ReactNode } from 'react';

interface EditorTopBarProps {
	breadcrumbLabel: string;
	onBreadcrumbBack?: () => void;
	enabled: boolean;
	onEnabledChange: (enabled: boolean) => void;
	onSave: () => void;
	overflowMenuItems?: ReactNode;
}

/**
 * The mock response editor's top bar: a "Mock APIs > {breadcrumbLabel}" breadcrumb, an enabled
 * `Switch`, an optional overflow menu, and a Save button.
 *
 * @param props.breadcrumbLabel - The current mode/item label, e.g. "New mock" or the item's name.
 * @param props.onBreadcrumbBack - Called when the "Mock APIs" breadcrumb segment is clicked.
 * @param props.enabled - Whether the mock is enabled.
 * @param props.onEnabledChange - Called with the new enabled state when the switch is toggled.
 * @param props.onSave - Called when the Save button is clicked.
 * @param props.overflowMenuItems - Menu items to render in the overflow "More" menu; the menu
 * (and its anchor button) is omitted entirely when this is not provided.
 * @returns The editor top bar UI.
 */
export const EditorTopBar = ({
	breadcrumbLabel,
	onBreadcrumbBack,
	enabled,
	onEnabledChange,
	onSave,
	overflowMenuItems,
}: EditorTopBarProps) => {
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const open = Boolean(anchorEl);

	/** Closes the overflow menu. */
	const handleClose = () => {
		setAnchorEl(null);
	};

	return (
		<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
			<Breadcrumbs>
				<Link component="button" underline="hover" color="inherit" onClick={onBreadcrumbBack}>
					Mock APIs
				</Link>
				<Typography color="text.primary">{breadcrumbLabel}</Typography>
			</Breadcrumbs>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
				<Switch
					checked={enabled}
					onChange={(event) => onEnabledChange(event.target.checked)}
					slotProps={{ input: { 'aria-label': 'Enabled' } }}
				/>
				{overflowMenuItems && (
					<>
						<IconButton
							onClick={(event) => setAnchorEl(event.currentTarget)}
							aria-label={open ? 'Close more menu' : 'Open more menu'}
						>
							<MoreVertIcon />
						</IconButton>
						<Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
							{overflowMenuItems}
						</Menu>
					</>
				)}
				<Button variant="contained" onClick={onSave}>
					Save
				</Button>
			</Box>
		</Box>
	);
};
