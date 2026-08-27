"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO, addDays, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export function StatusDateNav({ date }: { date: string }) {
  const router = useRouter();
  const selected = parseISO(date);
  const prev = format(subDays(selected, 1), "yyyy-MM-dd");
  const next = format(addDays(selected, 1), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" render={<Link href={`/status?date=${prev}`} />}>
        Previous
      </Button>

      <Popover>
        <PopoverTrigger render={<Button variant="outline" size="sm" />}>
          {format(selected, "PPP")}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) router.push(`/status?date=${format(d, "yyyy-MM-dd")}`);
            }}
          />
        </PopoverContent>
      </Popover>

      <Button variant="outline" size="sm" render={<Link href={`/status?date=${next}`} />}>
        Next
      </Button>

      {date !== today && (
        <Button variant="outline" size="sm" render={<Link href={`/status?date=${today}`} />}>
          Today
        </Button>
      )}
    </div>
  );
}
