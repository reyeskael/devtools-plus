import { ReactElement } from 'react';
import AccessibilityNewOutlinedIcon from '@mui/icons-material/AccessibilityNewOutlined';
import NetworkCheckOutlinedIcon from '@mui/icons-material/NetworkCheckOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined';
import { ToolIconKey } from '../../shared/tools/types';

export const toolIcons: Record<ToolIconKey, ReactElement> = {
	network: <NetworkCheckOutlinedIcon />,
	console: <TerminalOutlinedIcon />,
	storage: <StorageOutlinedIcon />,
	performance: <SpeedOutlinedIcon />,
	accessibility: <AccessibilityNewOutlinedIcon />,
	security: <SecurityOutlinedIcon />,
};
