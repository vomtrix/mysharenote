import React from 'react';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

type Props = {
  title: React.ReactNode;
  tooltip: string;
};

const InfoHeader: React.FC<Props> = ({ title, tooltip }) => {
  return (
    <Box display="flex" alignItems="center" gap={0.5}>
      <Box>{title}</Box>
      <Tooltip
        title={tooltip}
        slotProps={{ tooltip: { sx: { maxWidth: 320 } } }}
        placement="top"
        arrow>
        <IconButton size="small" sx={{ color: (theme) => theme.palette.text.secondary, p: 0.25 }}>
          <InfoOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default InfoHeader;
