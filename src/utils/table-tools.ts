export type DatePreset = "custom" | "month" | "3months" | "year";

export type ExportColumn<T> = {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

const toTitle = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatCsvValue = (value: string | number | boolean | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  const raw = String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

export const exportToCsv = <T>(
  filename: string,
  columns: ExportColumn<T>[],
  rows: T[]
) => {
  const headerRow = columns.map((col) => formatCsvValue(col.header)).join(",");
  const dataRows = rows.map((row) =>
    columns.map((col) => formatCsvValue(col.value(row))).join(",")
  );

  const csvContent = [headerRow, ...dataRows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();

  URL.revokeObjectURL(url);
};

export const buildExportColumns = <T extends Record<string, unknown>>(
  columns: Array<{ accessorKey?: string; header?: unknown; id?: string }>
): ExportColumn<T>[] =>
  columns
    .filter((column) => typeof column.accessorKey === "string" && column.id !== "actions")
    .map((column) => {
      const accessorKey = column.accessorKey as string;
      const headerLabel = typeof column.header === "string" ? column.header : toTitle(accessorKey);
      return {
        header: headerLabel,
        value: (row: T) => row[accessorKey] as string | number | boolean | null | undefined,
      };
    });

export const getDateRange = (
  preset: DatePreset,
  customStart: string,
  customEnd: string
) => {
  const now = new Date();

  if (preset === "custom") {
    const start = customStart ? new Date(`${customStart}T00:00:00`) : null;
    const end = customEnd ? new Date(`${customEnd}T23:59:59`) : null;
    return { start, end };
  }

  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { start, end: now };
  }

  if (preset === "3months") {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
    return { start, end: now };
  }

  const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  return { start, end: now };
};

export const filterRows = <T>(
  rows: T[],
  searchValue: string,
  dateRange: { start: Date | null; end: Date | null },
  getRowDate: (row: T) => Date | null
) => {
  const query = searchValue.trim().toLowerCase();

  return rows.filter((row) => {
    const matchesSearch = query.length === 0
      ? true
      : JSON.stringify(row).toLowerCase().includes(query);

    if (!matchesSearch) {
      return false;
    }

    if (!dateRange.start && !dateRange.end) {
      return true;
    }

    const rowDate = getRowDate(row);
    if (!rowDate) {
      return false;
    }

    if (dateRange.start && rowDate < dateRange.start) {
      return false;
    }

    if (dateRange.end && rowDate > dateRange.end) {
      return false;
    }

    return true;
  });
};
