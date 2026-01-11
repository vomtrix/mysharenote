import { alpha, styled } from '@mui/system';
import { DataGrid, gridClasses } from '@mui/x-data-grid';
import { SECONDARY_GREY_4, SECONDARY_RED_1 } from '@styles/colors';

const getAdditionalRowStyles = (theme: any) => {
  const primary = theme.palette.primary.main;
  const evenBg = theme.palette.mode === 'dark' ? alpha('#fff', 0.03) : alpha('#000', 0.02);
  const highlightColor =
    theme.palette.mode === 'dark' ? alpha(primary, 0.35) : alpha(primary, 0.18);
  return {
    '@keyframes rowHighlightPulse': {
      '0%': {
        backgroundColor: highlightColor
      },
      '60%': {
        backgroundColor: theme.palette.mode === 'dark' ? alpha(primary, 0.22) : alpha(primary, 0.1)
      },
      '100%': {
        backgroundColor: 'inherit'
      }
    },
    [`& .${gridClasses.row}.even`]: {
      backgroundColor: evenBg,
      '&:hover, &.Mui-hovered': {
        backgroundColor: alpha(primary, 0.12),
        '@media (hover: none)': {
          backgroundColor: 'transparent'
        }
      },
      '&.Mui-selected': {
        backgroundColor: alpha(primary, 0.16),
        '&:hover, &.Mui-hovered': {
          backgroundColor: alpha(primary, 0.24),
          // Reset on touch devices, it doesn't add specificity
          '@media (hover: none)': {
            backgroundColor: alpha(primary, 0.24)
          }
        }
      }
    },
    [`& .${gridClasses.row}.odd`]: {
      '&:hover, &.Mui-hovered': {
        backgroundColor: alpha(primary, 0.12),
        '@media (hover: none)': {
          backgroundColor: 'transparent'
        }
      },
      '&.Mui-selected': {
        backgroundColor: alpha(primary, 0.16),
        '&:hover, &.Mui-hovered': {
          backgroundColor: alpha(primary, 0.24),
          // Reset on touch devices, it doesn't add specificity
          '@media (hover: none)': {
            backgroundColor: alpha(primary, 0.24)
          }
        }
      }
    },
    [`& .${gridClasses.row}.disabled`]: {
      backgroundColor: alpha(SECONDARY_RED_1, 1),
      '&:hover, &.Mui-hovered': {
        backgroundColor: alpha(SECONDARY_RED_1, 1),
        '@media (hover: none)': {
          backgroundColor: 'transparent'
        }
      },
      '&.Mui-selected': {
        backgroundColor: alpha(SECONDARY_RED_1, 1),
        '&:hover, &.Mui-hovered': {
          backgroundColor: alpha(SECONDARY_RED_1, 1),
          // Reset on touch devices, it doesn't add specificity
          '@media (hover: none)': {
            backgroundColor: alpha(SECONDARY_RED_1, 1)
          }
        }
      }
    },
    [`& .${gridClasses.row}.recently-added`]: {
      backgroundColor: highlightColor,
      animation: 'rowHighlightPulse 2.4s ease-out',
      '&.Mui-selected': {
        backgroundColor: alpha(primary, 0.3),
        '&:hover, &.Mui-hovered': {
          backgroundColor: alpha(primary, 0.36),
          '@media (hover: none)': {
            backgroundColor: alpha(primary, 0.36)
          }
        }
      }
    }
  };
};

const StyledDataGrid: any = styled(DataGrid)(({ theme }) => ({
  border: 0,
  backgroundColor:
    theme.palette.mode === 'dark' ? SECONDARY_GREY_4 : theme.palette.background.paper,
  color: theme.palette.text.primary,
  '& .text-blue': {
    color: theme.palette.primary.main
  },
  '& .text-center': {
    textAlign: 'center'
  },
  '& .text-uppercase': {
    textTransform: 'uppercase'
  },
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor:
      theme.palette.mode === 'dark' ? SECONDARY_GREY_4 : theme.palette.background.default,
    '& .MuiDataGrid-columnHeaderTitle': {
      fontWeight: 'normal'
    }
  },
  '& .MuiDataGrid-footerContainer': {
    backgroundColor:
      theme.palette.mode === 'dark' ? SECONDARY_GREY_4 : theme.palette.background.default
  },
  '& .MuiDataGrid-columnHeader': {
    backgroundColor:
      theme.palette.mode === 'dark' ? SECONDARY_GREY_4 : theme.palette.background.default
  },
  '& .MuiDataGrid-container--top': {
    backgroundColor:
      theme.palette.mode === 'dark' ? SECONDARY_GREY_4 : theme.palette.background.default
  },
  ...getAdditionalRowStyles(theme)
}));

export default StyledDataGrid;
