import * as React from "react";
import {
  Column,
  ColumnDef,
  ColumnFiltersState,
  ColumnPinningState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  PaginationState,
  OnChangeFn,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  // Manual pagination props
  manualPagination?: boolean;
  pageCount?: number;
  pagination?: PaginationState;
  totalRows?: number;
  onPaginationChange?: OnChangeFn<PaginationState>;
  // Manual sorting props
  manualSorting?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  // Column pinning props
  columnPinning?: ColumnPinningState;
  // Custom search panel component
  searchPanel?: React.ReactNode;
  // Custom filter panel component
  filterPanel?: React.ReactNode;
  // Custom sort panel component
  sortPanel?: React.ReactNode;
  // Active filter/sort badges component
  activeFilterBadges?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  manualPagination = false,
  pageCount,
  pagination: externalPagination,
  totalRows,
  onPaginationChange,
  manualSorting = false,
  sorting: externalSorting,
  onSortingChange,
  columnPinning,
  searchPanel,
  filterPanel,
  sortPanel,
  activeFilterBadges,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>(
    []
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [internalPagination, setInternalPagination] =
    React.useState<PaginationState>({
      pageIndex: 0,
      pageSize: 20,
    });

  // Scroll indicator state
  const tableRef = React.useRef<HTMLTableElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const scrollContainer = tableRef.current?.parentElement;
    if (!scrollContainer) return;
    setCanScrollLeft(scrollContainer.scrollLeft > 0);
    setCanScrollRight(
      scrollContainer.scrollLeft <
        scrollContainer.scrollWidth - scrollContainer.clientWidth - 1
    );
  }, []);

  React.useEffect(() => {
    const scrollContainer = tableRef.current?.parentElement;
    if (!scrollContainer) return;
    checkScroll();
    scrollContainer.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    const observer = new ResizeObserver(checkScroll);
    observer.observe(scrollContainer);
    return () => {
      scrollContainer.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  const scrollLeft = () => {
    tableRef.current?.parentElement?.scrollBy({
      left: -200,
      behavior: "smooth",
    });
  };

  const scrollRight = () => {
    tableRef.current?.parentElement?.scrollBy({
      left: 200,
      behavior: "smooth",
    });
  };

  const table = useReactTable({
    data,
    columns,
    onSortingChange: onSortingChange || setInternalSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: onPaginationChange || setInternalPagination,
    manualPagination,
    manualSorting,
    pageCount: pageCount ?? -1,
    defaultColumn: {
      size: 150, // Default column width for offset calculations
      minSize: 10,
      maxSize: 500,
    },
    state: {
      sorting: externalSorting || internalSorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: externalPagination || internalPagination,
      columnPinning: columnPinning || { left: [], right: [] },
    },
  });

  // Calculate pinned column widths for arrow positioning
  const leftPinnedWidth = React.useMemo(() => {
    const leftPinned = columnPinning?.left || [];
    return leftPinned.reduce((acc, colId) => {
      const col = table.getColumn(colId);
      return acc + (col?.getSize() || 0);
    }, 0);
  }, [columnPinning?.left, table]);

  const rightPinnedWidth = React.useMemo(() => {
    const rightPinned = columnPinning?.right || [];
    return rightPinned.reduce((acc, colId) => {
      const col = table.getColumn(colId);
      return acc + (col?.getSize() || 0);
    }, 0);
  }, [columnPinning?.right, table]);

  // These are the important styles to make sticky column pinning work!
  // Based on official TanStack Table example
  const getCommonPinningStyles = (
    column: Column<TData>,
    isHeader?: boolean
  ): React.CSSProperties => {
    const isPinned = column.getIsPinned();
    const isLastLeftPinnedColumn =
      isPinned === "left" && column.getIsLastColumn("left");
    const isFirstRightPinnedColumn =
      isPinned === "right" && column.getIsFirstColumn("right");

    return {
      boxShadow: isLastLeftPinnedColumn
        ? "-2px 0 2px -2px gray inset"
        : isFirstRightPinnedColumn
        ? "2px 0 2px -2px gray inset"
        : undefined,
      left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
      right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
      position: isPinned ? "sticky" : "relative",
      zIndex: isPinned ? 1 : 0,
      backgroundColor: "white",
      fontWeight: isHeader ? "600" : "normal",
      fontSize: isHeader ? "12px" : "inherit",
    };
  };

  return (
    <div className="w-full">
      <div
        className={cn(
          "flex items-center gap-2 py-2 sticky top-0 z-30 bg-background",
          activeFilterBadges ? "justify-between" : "justify-end"
        )}
      >
        <div>{activeFilterBadges}</div>
        <div className="flex gap-2">
          {searchPanel}
          {sortPanel}
          {filterPanel}
        </div>
      </div>
      <div className="border relative">
        {canScrollLeft && (
          <button
            type="button"
            onClick={scrollLeft}
            className="absolute top-0 bottom-0 z-20 flex items-center px-1 bg-gradient-to-r from-white via-white/80 to-transparent cursor-pointer hover:from-muted"
            style={{ left: leftPinnedWidth }}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            onClick={scrollRight}
            className="absolute top-0 bottom-0 z-20 flex items-center px-1 bg-gradient-to-l from-white via-white/80 to-transparent cursor-pointer hover:from-muted"
            style={{ right: rightPinnedWidth }}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
        <Table ref={tableRef}>
          <colgroup>
            {table.getAllColumns().map((column) => (
              <col key={column.id} style={{ width: `${column.getSize()}px` }} />
            ))}
          </colgroup>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={getCommonPinningStyles(header.column, true)}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? "cursor-pointer" : ""}
                >
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <TableCell
                        key={cell.id}
                        style={getCommonPinningStyles(cell.column)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4 sticky bottom-0 z-30 bg-background">
        <div className="flex-1 text-xs text-muted-foreground">
          Showing {table.getRowModel().rows.length} of {totalRows || 0} row
          {totalRows || 0 > 1 ? "s" : ""}.
        </div>
        {manualPagination && pageCount !== undefined && (
          <div className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {pageCount}
          </div>
        )}
        <div className="space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
