"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  /** Enables the search box; receives a row and returns its searchable text. */
  searchAccessor?: (row: T) => string;
  searchPlaceholder?: string;
  initialSorting?: SortingState;
  pageSize?: number;
  /** Rendered between the search box and the table — segment filters, etc. */
  toolbar?: ReactNode;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  stickyFirstColumn?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  searchAccessor,
  searchPlaceholder = "Search…",
  initialSorting = [],
  pageSize: initialPageSize = 25,
  toolbar,
  emptyMessage = "Nothing to show for this period.",
  onRowClick,
  stickyFirstColumn = false,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    if (!searchAccessor || !query.trim()) return data;
    const needle = query.trim().toLowerCase();
    return data.filter((row) => searchAccessor(row).toLowerCase().includes(needle));
  }, [data, query, searchAccessor]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, pagination: { pageIndex: 0, pageSize } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
  });

  return (
    <div className="space-y-3">
      {(searchAccessor || toolbar) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchAccessor ? (
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 pl-8"
              />
            </div>
          ) : null}
          {toolbar}
        </div>
      )}

      {/* Wide tables scroll inside their own container; the page never does. */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header, i) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const align = (header.column.columnDef.meta as { align?: string } | undefined)?.align;
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "h-9 text-xs whitespace-nowrap",
                        align === "right" && "text-right",
                        align === "center" && "text-center",
                        stickyFirstColumn && i === 0 && "sticky left-0 z-10 bg-muted/40",
                      )}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                            align === "right" && "flex-row-reverse",
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3" />
                          ) : (
                            <ChevronsUpDown className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28 text-center text-sm text-muted-foreground">
                  {query ? `No matches for “${query}”.` : emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {row.getVisibleCells().map((cell, i) => {
                    const align = (cell.column.columnDef.meta as { align?: string } | undefined)?.align;
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "py-2 text-sm",
                          align === "right" && "text-right tabular",
                          align === "center" && "text-center",
                          stickyFirstColumn && i === 0 && "sticky left-0 z-10 bg-card",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="tabular">
          {filtered.length === 0
            ? "0 rows"
            : `Showing ${table.getState().pagination.pageIndex * pageSize + 1}–${Math.min(
                (table.getState().pagination.pageIndex + 1) * pageSize,
                filtered.length,
              )} of ${filtered.length.toLocaleString()}`}
        </span>

        <div className="flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger size="sm" className="h-8 w-[86px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} rows
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="tabular">
            {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
