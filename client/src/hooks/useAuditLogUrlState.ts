import { useSearchParams } from "react-router-dom";
import { useCallback, useMemo } from "react";
import type { SortingState } from "@tanstack/react-table";

/**
 * Filter state for audit log table
 */
export interface AuditLogFilters {
  materialNumber?: number;
  dateFrom?: string;
  dateTo?: string;
  changedByUserId?: string;
  search?: string;
}

/**
 * Complete audit log URL state including pagination, sorting, and filters
 */
export interface AuditLogUrlState {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  filters: AuditLogFilters;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Hook to manage audit log table state (pagination, sorting, filters) via URL search params
 * This enables shareable/bookmarkable table states
 */
export function useAuditLogUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse URL params into typed state
  const state = useMemo((): AuditLogUrlState => {
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
    const materialNumberParam = searchParams.get("materialNumber");
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");
    const changedByUserIdParam = searchParams.get("changedByUserId");
    const searchParam = searchParams.get("search");

    const filters: AuditLogFilters = {
      materialNumber: materialNumberParam
        ? parseInt(materialNumberParam, 10)
        : undefined,
      dateFrom: dateFromParam || undefined,
      dateTo: dateToParam || undefined,
      changedByUserId: changedByUserIdParam || undefined,
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
    (filters: AuditLogFilters) => {
      updateParams({
        materialNumber:
          filters.materialNumber !== undefined
            ? String(filters.materialNumber)
            : null,
        dateFrom: filters.dateFrom || null,
        dateTo: filters.dateTo || null,
        changedByUserId: filters.changedByUserId || null,
        search: filters.search || null,
        page: null, // Reset to first page when filters change
      });
    },
    [updateParams]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      materialNumber: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      changedByUserId: undefined,
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
      materialNumber: null,
      dateFrom: null,
      dateTo: null,
      changedByUserId: null,
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
  const removeFilter = useCallback(
    (key: keyof AuditLogFilters) => {
      const newFilters = { ...state.filters };
      (newFilters[key] as unknown) = undefined;
      setFilters(newFilters);
    },
    [state.filters, setFilters]
  );

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    const { filters } = state;

    if (filters.materialNumber !== undefined) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.changedByUserId) count++;
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
