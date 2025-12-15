import { useSearchParams } from "react-router-dom";
import { useCallback, useMemo } from "react";
import type { SortingState } from "@tanstack/react-table";

/**
 * Filter state for upload history table
 */
export interface UploadHistoryFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

/**
 * Complete upload history URL state including pagination, sorting, and filters
 */
interface UploadHistoryUrlState {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  filters: UploadHistoryFilters;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Hook to manage upload history table state (pagination, sorting, filters) via URL search params
 * This enables shareable/bookmarkable table states
 */
export function useUploadHistoryUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse URL params into typed state
  const state = useMemo((): UploadHistoryUrlState => {
    // Pagination
    const pageIndex = parseInt(searchParams.get("page") || "0", 10);
    const pageSize = parseInt(
      searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE),
      10
    );

    // Sorting
    const sortBy = searchParams.get("sortBy");
    const sortDesc = searchParams.get("sortDesc") === "true";
    const sorting: SortingState = sortBy
      ? [{ id: sortBy, desc: sortDesc }]
      : [];

    // Filters
    const statusParam = searchParams.get("status");
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");
    const searchParam = searchParams.get("search");

    const filters: UploadHistoryFilters = {
      status: statusParam || undefined,
      dateFrom: dateFromParam || undefined,
      dateTo: dateToParam || undefined,
      search: searchParam || undefined,
    };

    return { pageIndex, pageSize, sorting, filters };
  }, [searchParams]);

  // Update URL params while preserving the view param
  const updateParams = useCallback(
    (updates: Partial<Record<string, string | null>>) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);

        Object.entries(updates).forEach(([key, value]) => {
          if (value === null || value === undefined || value === "") {
            newParams.delete(key);
          } else {
            newParams.set(key, value);
          }
        });

        return newParams;
      });
    },
    [setSearchParams]
  );

  // For TanStack Table pagination compatibility
  const setPagination = useCallback(
    (
      updater:
        | { pageIndex: number; pageSize: number }
        | ((old: { pageIndex: number; pageSize: number }) => {
            pageIndex: number;
            pageSize: number;
          })
    ) => {
      const newPagination =
        typeof updater === "function"
          ? updater({ pageIndex: state.pageIndex, pageSize: state.pageSize })
          : updater;

      updateParams({
        page:
          newPagination.pageIndex === 0
            ? null
            : String(newPagination.pageIndex),
        pageSize:
          newPagination.pageSize === DEFAULT_PAGE_SIZE
            ? null
            : String(newPagination.pageSize),
      });
    },
    [state.pageIndex, state.pageSize, updateParams]
  );

  // Sorting setter
  const setSorting = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const newSorting =
        typeof updater === "function" ? updater(state.sorting) : updater;

      if (newSorting.length === 0) {
        updateParams({ sortBy: null, sortDesc: null });
      } else {
        updateParams({
          sortBy: newSorting[0].id,
          sortDesc: newSorting[0].desc ? "true" : null,
        });
      }
    },
    [state.sorting, updateParams]
  );

  // Filter setters
  const setFilters = useCallback(
    (filters: UploadHistoryFilters) => {
      updateParams({
        status: filters.status || null,
        dateFrom: filters.dateFrom || null,
        dateTo: filters.dateTo || null,
        search: filters.search || null,
        page: null, // Reset to first page when filters change
      });
    },
    [updateParams]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      search: undefined,
    });
  }, [setFilters]);

  // Clear all: filters, sorting, and search in one atomic operation
  const clearAll = useCallback(() => {
    updateParams({
      // Clear sorting
      sortBy: null,
      sortDesc: null,
      // Clear filters
      status: null,
      dateFrom: null,
      dateTo: null,
      search: null,
      // Reset pagination
      page: null,
    });
  }, [updateParams]);

  // Set search independently
  const setSearch = useCallback(
    (search: string) => {
      setFilters({ ...state.filters, search: search || undefined });
    },
    [state.filters, setFilters]
  );

  // Remove a single filter (for badge dismiss)
  // Uses string type for compatibility with ActiveBadges component
  const removeFilter = useCallback(
    (key: string) => {
      const newFilters = { ...state.filters };
      (newFilters[key as keyof UploadHistoryFilters] as unknown) = undefined;
      setFilters(newFilters);
    },
    [state.filters, setFilters]
  );

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    const { filters } = state;

    if (filters.status) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.search) count++;

    return count;
  }, [state]);

  return {
    // State
    pageIndex: state.pageIndex,
    pageSize: state.pageSize,
    sorting: state.sorting,
    filters: state.filters,
    activeFilterCount,

    // Setters
    setPagination,
    setSorting,
    setFilters,
    clearFilters,
    clearAll,
    removeFilter,
    setSearch,
  };
}
