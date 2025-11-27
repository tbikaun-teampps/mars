import { useSearchParams } from "react-router-dom";
import { useCallback, useMemo } from "react";
import type { SortingState } from "@tanstack/react-table";

/**
 * Filter state for materials table
 */
export interface MaterialFilters {
  materialType: string[];
  minTotalValue?: number;
  maxTotalValue?: number;
  minTotalQuantity?: number;
  maxTotalQuantity?: number;
  lastReviewedFilter?: string;
  nextReviewFilter?: string;
  hasReviews?: boolean;
  hasErrors?: boolean;
  hasWarnings?: boolean;
}

/**
 * Complete table URL state including pagination, sorting, and filters
 */
export interface TableUrlState {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  filters: MaterialFilters;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Hook to manage table state (pagination, sorting, filters) via URL search params
 * This enables shareable/bookmarkable table states
 */
export function useTableUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse URL params into typed state
  const state = useMemo((): TableUrlState => {
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
    const materialTypeParam = searchParams.get("materialType");
    const materialType = materialTypeParam
      ? materialTypeParam.split(",").filter(Boolean)
      : [];

    const minTotalValue = searchParams.get("minValue");
    const maxTotalValue = searchParams.get("maxValue");
    const minTotalQuantity = searchParams.get("minQty");
    const maxTotalQuantity = searchParams.get("maxQty");
    const lastReviewedFilter = searchParams.get("lastReviewed");
    const nextReviewFilter = searchParams.get("nextReview");
    const hasReviewsParam = searchParams.get("hasReviews");
    const hasErrorsParam = searchParams.get("hasErrors");
    const hasWarningsParam = searchParams.get("hasWarnings");

    const filters: MaterialFilters = {
      materialType,
      minTotalValue: minTotalValue ? parseFloat(minTotalValue) : undefined,
      maxTotalValue: maxTotalValue ? parseFloat(maxTotalValue) : undefined,
      minTotalQuantity: minTotalQuantity
        ? parseFloat(minTotalQuantity)
        : undefined,
      maxTotalQuantity: maxTotalQuantity
        ? parseFloat(maxTotalQuantity)
        : undefined,
      lastReviewedFilter: lastReviewedFilter || undefined,
      nextReviewFilter: nextReviewFilter || undefined,
      hasReviews: hasReviewsParam ? hasReviewsParam === "true" : undefined,
      hasErrors: hasErrorsParam ? hasErrorsParam === "true" : undefined,
      hasWarnings: hasWarningsParam ? hasWarningsParam === "true" : undefined,
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

  // Pagination setters
  const setPageIndex = useCallback(
    (pageIndex: number) => {
      updateParams({ page: pageIndex === 0 ? null : String(pageIndex) });
    },
    [updateParams]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      updateParams({
        pageSize: pageSize === DEFAULT_PAGE_SIZE ? null : String(pageSize),
        page: null, // Reset to first page when changing page size
      });
    },
    [updateParams]
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
        page: newPagination.pageIndex === 0 ? null : String(newPagination.pageIndex),
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
    (
      updater: SortingState | ((old: SortingState) => SortingState)
    ) => {
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
    (filters: MaterialFilters) => {
      updateParams({
        materialType:
          filters.materialType.length > 0
            ? filters.materialType.join(",")
            : null,
        minValue:
          filters.minTotalValue !== undefined
            ? String(filters.minTotalValue)
            : null,
        maxValue:
          filters.maxTotalValue !== undefined
            ? String(filters.maxTotalValue)
            : null,
        minQty:
          filters.minTotalQuantity !== undefined
            ? String(filters.minTotalQuantity)
            : null,
        maxQty:
          filters.maxTotalQuantity !== undefined
            ? String(filters.maxTotalQuantity)
            : null,
        lastReviewed: filters.lastReviewedFilter || null,
        nextReview: filters.nextReviewFilter || null,
        hasReviews:
          filters.hasReviews !== undefined
            ? String(filters.hasReviews)
            : null,
        hasErrors:
          filters.hasErrors !== undefined ? String(filters.hasErrors) : null,
        hasWarnings:
          filters.hasWarnings !== undefined
            ? String(filters.hasWarnings)
            : null,
        page: null, // Reset to first page when filters change
      });
    },
    [updateParams]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      materialType: [],
      minTotalValue: undefined,
      maxTotalValue: undefined,
      minTotalQuantity: undefined,
      maxTotalQuantity: undefined,
      lastReviewedFilter: undefined,
      nextReviewFilter: undefined,
      hasReviews: undefined,
      hasErrors: undefined,
      hasWarnings: undefined,
    });
  }, [setFilters]);

  // Remove a single filter (for badge dismiss)
  const removeFilter = useCallback(
    (key: keyof MaterialFilters, value?: string) => {
      const newFilters = { ...state.filters };

      if (key === "materialType" && value) {
        // Remove specific material type from array
        newFilters.materialType = newFilters.materialType.filter(
          (t) => t !== value
        );
      } else {
        // Clear the filter value
        (newFilters[key] as unknown) = undefined;
      }

      setFilters(newFilters);
    },
    [state.filters, setFilters]
  );

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    const { filters } = state;

    if (filters.materialType.length > 0) count++;
    if (filters.minTotalValue !== undefined) count++;
    if (filters.maxTotalValue !== undefined) count++;
    if (filters.minTotalQuantity !== undefined) count++;
    if (filters.maxTotalQuantity !== undefined) count++;
    if (filters.lastReviewedFilter) count++;
    if (filters.nextReviewFilter) count++;
    if (filters.hasReviews !== undefined) count++;
    if (filters.hasErrors !== undefined) count++;
    if (filters.hasWarnings !== undefined) count++;

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
    setPageIndex,
    setPageSize,
    setPagination,
    setSorting,
    setFilters,
    clearFilters,
    removeFilter,
  };
}
