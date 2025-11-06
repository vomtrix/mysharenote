import { useEffect, useRef, useState } from 'react';
import { gridClasses, useGridApiRef } from '@mui/x-data-grid';
import { getVisibleRows } from '@mui/x-data-grid/internals';
import StyledDataGrid from '@components/styled/StyledDataGrid';
import { IPaginationModel } from '@objects/interfaces/IPaginationModel';
import { makeIdsSignature } from '@utils/helpers';

const ROW_HIGHLIGHT_DURATION_MS = 2400;

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
  onRowSelectionModelChange?: (selection: any) => void;
  onVisibleRowChange?: (visibleRowIds: any[]) => void;
}

const CustomTable = ({
  columns,
  hidePagination,
  stripedRows,
  filters,
  rows,
  isLoading,
  initialState,
  pageSizeOptions,
  onPaginationModelChange,
  onRowSelectionModelChange,
  onVisibleRowChange
}: CustomTableProps) => {
  const apiRef = useGridApiRef();

  const [highlightedRows, setHighlightedRows] = useState<Record<string | number, boolean>>({});
  const timersRef = useRef<Record<string | number, ReturnType<typeof setTimeout>>>({});
  const previousRowIdsRef = useRef<Set<string | number>>(new Set());
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const currentIds = new Set<string | number>(safeRows.map((row: any) => row.id));

    if (!hasInitializedRef.current) {
      previousRowIdsRef.current = currentIds;
      hasInitializedRef.current = true;
      return;
    }

    const newIds: Array<string | number> = [];
    currentIds.forEach((id) => {
      if (!previousRowIdsRef.current.has(id)) {
        newIds.push(id);
      }
    });
    previousRowIdsRef.current = currentIds;

    if (newIds.length) {
      setHighlightedRows((prev) => {
        const next = { ...prev };
        newIds.forEach((id) => {
          next[id] = true;
          if (timersRef.current[id]) clearTimeout(timersRef.current[id]);
          timersRef.current[id] = setTimeout(() => {
            setHighlightedRows((current) => {
              if (!current[id]) return current;
              const { [id]: _remove, ...rest } = current;
              return rest;
            });
            delete timersRef.current[id];
          }, ROW_HIGHLIGHT_DURATION_MS);
        });
        return next;
      });
    }
  }, [rows]);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timer) => clearTimeout(timer));
      timersRef.current = {};
    };
  }, []);

  const [lastVisibleSig, setLastVisibleSig] = useState<string | null>(null);

  const handleStateChange = () => {
    if (!onVisibleRowChange) return;
    const current = getVisibleRows(apiRef);
    if (!current.rows.length) return;
    const ids = current.rows.map((r: any) => r.id);
    const sig = makeIdsSignature(ids);
    if (sig !== lastVisibleSig) {
      setLastVisibleSig(sig);
      onVisibleRowChange(ids);
    }
  };

  return (
    <>
      {columns && rows && (
        <StyledDataGrid
          apiRef={apiRef}
          pagination
          loading={isLoading}
          rows={rows ?? []}
          columns={columns}
          onPaginationModelChange={onPaginationModelChange}
          onStateChange={onVisibleRowChange ? handleStateChange : undefined}
          disableColumnMenu={!filters}
          pageSizeOptions={pageSizeOptions ?? [10, 25, 50, 100]}
          checkboxSelectionVisibleOnly={true}
          onRowSelectionModelChange={onRowSelectionModelChange}
          checkboxSelection={!!onRowSelectionModelChange}
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
            if (highlightedRows[params.id]) {
              classNames += 'recently-added ';
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
