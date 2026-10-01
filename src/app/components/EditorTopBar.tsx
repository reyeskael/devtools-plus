import { Box, Breadcrumbs, Button, IconButton, Link, Menu, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { BrandSwitch } from '../../shared/components/BrandSwitch';

interface EditorTopBarProps {
	rootBreadcrumbLabel: string;
	breadcrumbLabel: string;
	onBreadcrumbBack?: () => void;
	enabled: boolean;
	onEnabledChange: (enabled: boolean) => void;
	onSave: () => void;
	overflowMenuItems?: ReactNode;
}

/**
 * An editor's top bar: a "{rootBreadcrumbLabel} > {breadcrumbLabel}" breadcrumb, an enabled
 * `BrandSwitch`, an optional overflow menu, and a Save button. Shared by every item editor
 * (mock responses, redirect rules, …) — only the breadcrumb labels differ per editor.
 *
 * @param props.rootBreadcrumbLabel - The list page's label, e.g. "Mock APIs" or "Redirect Rules".
 * @param props.breadcrumbLabel - The current mode/item label, e.g. "New mock" or the item's name.
 * @param props.onBreadcrumbBack - Called when the root breadcrumb segment is clicked.
 * @param props.enabled - Whether the item is enabled.
 * @param props.onEnabledChange - Called with the new enabled state when the switch is toggled.
 * @param props.onSave - Called when the Save button is clicked.
 * @param props.overflowMenuItems - Menu items to render in the overflow "More" menu; the menu
 * (and its anchor button) is omitted entirely when this is not provided.
 * @returns The editor top bar UI.
 */
export const EditorTopBar = ({
	rootBreadcrumbLabel,
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
				<Link
					component="button"
					underline="hover"
					color="inherit"
					onClick={onBreadcrumbBack}
				>
					{rootBreadcrumbLabel}
				</Link>
				<Typography color="text.primary">{breadcrumbLabel}</Typography>
			</Breadcrumbs>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
				<BrandSwitch
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
