import { gridClasses } from '@mui/x-data-grid';
import StyledDataGrid from '@components/styled/StyledDataGrid';
import { IPaginationModel } from '@objects/interfaces/IPaginationModel';

interface CustomTableProps {
  columns: any;
  rows: any;
  hidePagination?: boolean;
  stripedRows?: boolean;
  isLoading?: boolean;
  filters?: boolean;
  autoSelectAll?: boolean;
  initialState?: any;
  pageSizeOptions?: number[];
  onPaginationModelChange?: (paginationModel: IPaginationModel) => void;
}

const CustomTable = (props: CustomTableProps) => {
  const {
    columns,
    hidePagination,
    stripedRows,
    filters,
    rows,
    isLoading,
    initialState,
    pageSizeOptions,
    onPaginationModelChange
  } = props;

  return (
    <>
      {columns && rows && (
        <StyledDataGrid
          pagination
          loading={isLoading}
          rows={rows}
          columns={columns}
          onPaginationModelChange={onPaginationModelChange}
          disableColumnMenu={!filters}
          pageSizeOptions={pageSizeOptions ?? [10, 25, 50, 100]}
          initialState={
            initialState
              ? {
                  density: 'compact',
                  ...initialState
                }
              : {
                  density: 'compact'
                }
          }
          sx={{
            '& .MuiDataGrid-footerContainer': {
              display: hidePagination || !rows.length ? 'none' : 'block'
            },
            [`& .${gridClasses.cell}:focus, & .${gridClasses.cell}:focus-within`]: {
              outline: 'none'
            },
            [`& .${gridClasses.columnHeader}:focus, & .${gridClasses.columnHeader}:focus-within`]: {
              outline: 'none'
            }
          }}
          disableRowSelectionOnClick
          getRowClassName={(params: any) => {
            let classNames = '';
            if (params.row.is_active == false) {
              classNames += 'disabled ';
            }
            if (stripedRows) {
              classNames += params.indexRelativeToCurrentPage % 2 === 0 ? 'even ' : 'odd ';
            }
            return classNames;
          }}
        />
      )}
    </>
  );
};

export default CustomTable;
