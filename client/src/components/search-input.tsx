import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: SearchInputProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync local value when external value changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Auto-expand if there's a value
  React.useEffect(() => {
    if (value) {
      setIsExpanded(true);
    }
  }, [value]);

  const handleExpand = () => {
    setIsExpanded(true);
    // Focus input after animation starts
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleCollapse = () => {
    if (!localValue) {
      setIsExpanded(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (localValue) {
        // Clear and collapse
        setLocalValue("");
        onChange("");
      }
      setIsExpanded(false);
      inputRef.current?.blur();
    } else if (e.key === "Enter") {
      onChange(localValue);
      inputRef.current?.blur();
    }
  };

  const handleBlur = () => {
    // Apply value on blur
    if (localValue !== value) {
      onChange(localValue);
    }
    handleCollapse();
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleExpand}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          "hover:bg-accent hover:text-accent-foreground",
          "h-9 px-3 rounded-md cursor-pointer",
          isExpanded && "bg-accent"
        )}
      >
        <Search className="h-4 w-4" />
        {!isExpanded && "Search"}
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isExpanded ? "w-64 opacity-100" : "w-0 opacity-0"
        )}
      >
        <Input
          ref={inputRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="h-9"
        />
      </div>
    </div>
  );
}

interface ActiveSearchBadgeProps {
  value: string;
  onClear: () => void;
}

export function ActiveSearchBadge({ value, onClear }: ActiveSearchBadgeProps) {
  if (!value) return null;

  // Truncate long search terms
  const displayValue = value.length > 20 ? value.slice(0, 20) + "..." : value;

  return (
    <Badge
      variant="secondary"
      className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
    >
      Search: "{displayValue}"
      <button
        onClick={onClear}
        className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}
