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
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
import { ListBox, ListBoxItem, Select, SelectPopover, SelectTrigger, SelectValue } from "@heroui/react";
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
  /**
   * Renders a panel beneath a row when it is expanded. Expansion is driven by
   * its own chevron cell so it never competes with `onRowClick`.
   */
  renderSubRow?: (row: T) => ReactNode;
  /** Stable identity for expansion state; defaults to the row index. */
  rowId?: (row: T) => string;
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
  renderSubRow,
  rowId,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
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
                {renderSubRow ? <TableHead className="h-9 w-8" /> : null}
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
                <TableCell
                  colSpan={columns.length + (renderSubRow ? 1 : 0)}
                  className="h-28 text-center text-sm text-muted-foreground"
                >
                  {query ? `No matches for “${query}”.` : emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const id = rowId ? rowId(row.original) : row.id;
                const isOpen = expanded.has(id);
                return (
                  <Fragment key={row.id}>
                    <TableRow
                      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                      className={cn(onRowClick && "cursor-pointer", isOpen && "border-b-0 bg-muted/30")}
                    >
                      {renderSubRow ? (
                        <TableCell className="py-2 pr-0 pl-2">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-label={isOpen ? "Hide orders" : "Show orders"}
                            onClick={(e) => {
                              // Expanding must not also trigger the row's own click.
                              e.stopPropagation();
                              setExpanded((prev) => {
                                const next = new Set(prev);
                                if (next.has(id)) next.delete(id);
                                else next.add(id);
                                return next;
                              });
                            }}
                            className="flex size-6 items-center justify-center rounded transition-colors hover:bg-surface-secondary"
                          >
                            <ChevronDown
                              className={cn(
                                "size-4 text-muted-foreground transition-transform",
                                isOpen && "rotate-180",
                              )}
                            />
                          </button>
                        </TableCell>
                      ) : null}
                      {row.getVisibleCells().map((cell, i) => {
                        const align = (cell.column.columnDef.meta as { align?: string } | undefined)?.align;
                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              "py-2 text-sm",
                              align === "right" && "text-right tabular",
                              align === "center" && "text-center",
                              stickyFirstColumn && i === 0 && !renderSubRow && "sticky left-0 z-10 bg-card",
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {isOpen && renderSubRow ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={columns.length + 1} className="bg-muted/30 p-0">
                          <div className="px-4 py-3">{renderSubRow(row.original)}</div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })
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
          <Select selectedKey={String(pageSize)} onSelectionChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="h-8 w-[86px]">
              <SelectValue />
            </SelectTrigger>
            <SelectPopover><ListBox>
              {[10, 25, 50, 100].map((n) => (
                <ListBoxItem key={n} id={String(n)}>
                  {n} rows
                </ListBoxItem>
              ))}
            </ListBox></SelectPopover>
          </Select>

          <Button
            variant="outline"
            isIconOnly size="sm"
            className="size-8"
            onClick={() => table.previousPage()}
            isDisabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="tabular">
            {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            isIconOnly size="sm"
            className="size-8"
            onClick={() => table.nextPage()}
            isDisabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
