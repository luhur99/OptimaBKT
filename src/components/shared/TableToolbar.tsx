import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePreset } from "@/utils/table-tools";

interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  datePreset: DatePreset;
  onDatePresetChange: (value: DatePreset) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onExport: () => void;
  exportDisabled?: boolean;
  searchPlaceholder?: string;
}

export const TableToolbar = ({
  searchValue,
  onSearchChange,
  datePreset,
  onDatePresetChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onExport,
  exportDisabled = false,
  searchPlaceholder = "Cari data...",
}: TableToolbarProps) => {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-700 bg-gray-900/40 p-4 md:flex-row md:items-end md:justify-between">
      <div className="flex w-full flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="glassmorphism border-gray-700 text-gray-300"
          />
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <div className="min-w-[180px]">
            <Select value={datePreset} onValueChange={(value) => onDatePresetChange(value as DatePreset)}>
              <SelectTrigger className="glassmorphism border-gray-700 text-gray-300">
                <SelectValue placeholder="Filter tanggal" />
              </SelectTrigger>
              <SelectContent className="glassmorphism border-gray-700 text-gray-300">
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="month">Bulan ini</SelectItem>
                <SelectItem value="3months">3 bulan terakhir</SelectItem>
                <SelectItem value="year">Tahun ini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {datePreset === "custom" && (
            <div className="flex gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
                className="glassmorphism border-gray-700 text-gray-300"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(event) => onEndDateChange(event.target.value)}
                className="glassmorphism border-gray-700 text-gray-300"
              />
            </div>
          )}
        </div>
      </div>
      <Button
        type="button"
        onClick={onExport}
        disabled={exportDisabled}
        className="bg-neon-cyan text-deep-charcoal hover:bg-neon-cyan/80 neon-glow-hover transition-all duration-300"
      >
        Export Excel
      </Button>
    </div>
  );
};
