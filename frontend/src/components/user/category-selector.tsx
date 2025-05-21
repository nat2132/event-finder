import * as React from "react"
import { Check, ChevronsUpDown, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface Category {
  id: string;
  name: string;
}

interface CategorySelectorProps {
  internalCategories?: Category[];
  skiddleCategories?: Category[];
  ticketmasterCategories?: Category[];
  value?: string;
  onChange: (value: string) => void;
}

export function CategorySelector({ value, onChange, internalCategories = [], skiddleCategories = [], ticketmasterCategories = [] }: CategorySelectorProps) {
  const [open, setOpen] = React.useState(false)

  // Helper to get display label for selected value
  const getCategoryLabel = (val: string) => {
    if (val === "all" || val === "") return "All";
    const allCategories = [
      ...internalCategories,
      ...skiddleCategories,
      ...ticketmasterCategories,
    ];
    // Try to match by id first, then by name
    const found = allCategories.find(cat => cat.id === val || cat.name === val);
    if (found) return found.name;
    return "Select category";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between md:w-[200px]">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            {getCategoryLabel(value || "")}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 md:w-[200px]">
        <Command>
          <CommandInput placeholder="Search category..." />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup heading="All">
              <CommandItem
                key="all"
                value="all"
                onSelect={() => {
                  onChange("all");
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", value === "all" || value === "" ? "opacity-100" : "opacity-0")} />
                All
              </CommandItem>
            </CommandGroup>
            {internalCategories.length > 0 && (
              <CommandGroup heading="Internal Categories">
                {internalCategories.map(cat => (
                  <CommandItem
                    key={cat.id}
                    value={cat.id}
                    onSelect={() => {
                      onChange(cat.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === cat.id ? "opacity-100" : "opacity-0")} />
                    {cat.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {skiddleCategories.length > 0 && (
              <CommandGroup heading="Skiddle Categories">
                {skiddleCategories.map(cat => (
                  <CommandItem
                    key={cat.id}
                    value={cat.id}
                    onSelect={() => {
                      onChange(cat.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === cat.id ? "opacity-100" : "opacity-0")} />
                    {cat.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {ticketmasterCategories.length > 0 && (
              <CommandGroup heading="Ticketmaster Categories">
                {ticketmasterCategories.map(cat => (
                  <CommandItem
                    key={cat.id}
                    value={cat.id}
                    onSelect={() => {
                      onChange(cat.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === cat.id ? "opacity-100" : "opacity-0")} />
                    {cat.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {/* Combine and deduplicate categories by name */}
            {(() => {
              const allCategories = [...skiddleCategories, ...ticketmasterCategories];
              // Deduplicate by name (case-insensitive)
              const uniqueCategories = Array.from(
                new Map(
                  allCategories.map(cat => [cat.name.toLowerCase(), cat])
                ).values()
              );
              return uniqueCategories.map(cat => (
                <CommandItem
                  key={cat.id}
                  value={cat.id}
                  onSelect={() => {
                    onChange(cat.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === cat.id ? "opacity-100" : "opacity-0")} />
                  {cat.name}
                </CommandItem>
              ));
            })()}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
