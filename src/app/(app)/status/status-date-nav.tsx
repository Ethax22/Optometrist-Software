"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO, addDays, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STATUS_RANGES,
  statusHref,
  type StatusRange,
} from "@/lib/status/date-range";

export function StatusDateNav({ date, range }: { date: string; range: StatusRange }) {
  const router = useRouter();
  const selected = parseISO(date);
  const today = format(new Date(), "yyyy-MM-dd");
  const isDay = range === "day";
  // "Overall" ignores the anchor date entirely, so the date controls would be misleading.
  const showDateControls = range !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={range}
        onValueChange={(value) =>
          router.push(statusHref({ date, range: value as StatusRange }))
        }
      >
        <SelectTrigger size="sm" aria-label="Date range">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_RANGES.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showDateControls && (
        <>
          {isDay && (
            <Button
              variant="outline"
              size="sm"
              render={
                <Link href={statusHref({ date: format(subDays(selected, 1), "yyyy-MM-dd"), range })} />
              }
            >
              Previous
            </Button>
          )}

          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
              {isDay ? format(selected, "PPP") : `Ending ${format(selected, "PPP")}`}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selected}
                onSelect={(d) => {
                  if (d) router.push(statusHref({ date: format(d, "yyyy-MM-dd"), range }));
                }}
              />
            </PopoverContent>
          </Popover>

          {isDay && (
            <Button
              variant="outline"
              size="sm"
              render={
                <Link href={statusHref({ date: format(addDays(selected, 1), "yyyy-MM-dd"), range })} />
              }
            >
              Next
            </Button>
          )}

          {date !== today && (
            <Button variant="outline" size="sm" render={<Link href={statusHref({ date: today, range })} />}>
              Today
            </Button>
          )}
        </>
      )}
    </div>
  );
}
