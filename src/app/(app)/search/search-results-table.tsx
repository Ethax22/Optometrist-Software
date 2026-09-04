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

type Patient = {
  id: string;
  name: string;
  uidEmpId: string | null;
  age: number;
  gender: string;
  mobile: string | null;
};

export function SearchResultsTable({ results }: { results: Patient[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const allSelected = results.length > 0 && selected.size === results.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(results.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  return (
    <div className="space-y-3">
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>UID / Emp Id</TableHead>
            <TableHead>Age / Gender</TableHead>
            <TableHead>Mobile</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No patients found.
              </TableCell>
            </TableRow>
          ) : (
            results.map((patient) => (
              <TableRow key={patient.id} className="hover:bg-muted/50">
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(patient.id)}
                    onChange={() => toggleOne(patient.id)}
                    aria-label={`Select ${patient.name}`}
                  />
                </TableCell>
                <TableCell>
                  <Link href={`/patients/${patient.id}`} className="block">
                    {patient.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/patients/${patient.id}`} className="block">
                    {patient.uidEmpId ?? "-"}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/patients/${patient.id}`} className="block">
                    {patient.age} / {patient.gender}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/patients/${patient.id}`} className="block">
                    {patient.mobile ?? "-"}
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
