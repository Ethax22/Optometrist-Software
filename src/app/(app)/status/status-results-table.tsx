"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Visit = {
  consultationId: string;
  consultationDate: string;
  time: string;
  patientId: string;
  patientName: string;
  patientUid: string | null;
  hasPrescription: boolean;
};

export function StatusResultsTable({
  visits,
  showDateColumn,
}: {
  visits: Visit[];
  showDateColumn: boolean;
}) {
  const selectable = visits.filter((v) => v.hasPrescription);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const allSelected = selectable.length > 0 && selected.size === selectable.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectable.map((v) => v.patientId)));
  }

  function toggleOne(patientId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  }

  async function downloadSelected() {
    if (selected.size === 0) return;
    setDownloading(true);
    try {
      const response = await fetch("/api/prescriptions/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientIds: [...selected] }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        toast.error(body?.error ?? "Failed to generate the bulk PDF download");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prescriptions-bulk-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  async function downloadSelectedCsv() {
    if (selected.size === 0) return;
    setDownloadingCsv(true);
    try {
      const response = await fetch("/api/prescriptions/export/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientIds: [...selected] }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        toast.error(body?.error ?? "Failed to generate the CSV export");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prescriptions-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingCsv(false);
    }
  }

  const colSpan = (showDateColumn ? 6 : 5) + 1;

  return (
    <div className="space-y-3">
      {selectable.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selected` : "Select clients to bulk-download"}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={selected.size === 0 || downloadingCsv}
              onClick={downloadSelectedCsv}
            >
              {downloadingCsv ? "Preparing CSV..." : "Download Selected (CSV)"}
            </Button>
            <Button size="sm" disabled={selected.size === 0 || downloading} onClick={downloadSelected}>
              {downloading ? "Preparing ZIP..." : "Download Selected (PDF, No Logo)"}
            </Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              {selectable.length > 0 && (
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              )}
            </TableHead>
            {showDateColumn && <TableHead>Date</TableHead>}
            <TableHead>Time</TableHead>
            <TableHead>Patient Name</TableHead>
            <TableHead>UID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visits.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                {showDateColumn ? "No patients in this period." : "No patients on this date."}
              </TableCell>
            </TableRow>
          ) : (
            visits.map((visit) => (
              <TableRow key={visit.consultationId}>
                <TableCell>
                  {visit.hasPrescription && (
                    <input
                      type="checkbox"
                      checked={selected.has(visit.patientId)}
                      onChange={() => toggleOne(visit.patientId)}
                      aria-label={`Select ${visit.patientName}`}
                    />
                  )}
                </TableCell>
                {showDateColumn && <TableCell>{visit.consultationDate}</TableCell>}
                <TableCell>{visit.time}</TableCell>
                <TableCell>{visit.patientName}</TableCell>
                <TableCell>{visit.patientUid ?? "-"}</TableCell>
                <TableCell>{visit.hasPrescription ? "Saved" : "Draft"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/examination/${visit.consultationId}`} />}
                  >
                    View / Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
