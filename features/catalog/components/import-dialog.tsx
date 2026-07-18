"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpIcon, Loader2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { downloadCsv, parseCsv, toCsv } from "@/utils/csv";
import { ApiError } from "@/services/api-client";
import { importProducts } from "@/services/catalog-admin.service";
import { PRODUCT_CSV_COLUMNS } from "../constants";
import { productImportRowSchema } from "../schemas";

type ParsedRow = {
  row: number;
  data: Record<string, unknown>;
  valid: boolean;
  error?: string;
};

const TEMPLATE_ROW = {
  name: "Chicken Tikka Pizza",
  slug: "",
  category: "Pizzas",
  price: "15.99",
  compare_at_price: "18.99",
  sku: "PIZ-TIK-001",
  barcode: "",
  food_type: "NON_VEGETARIAN",
  spicy_level: "MEDIUM",
  short_description: "Smoky tikka chunks, wood-fired",
  is_active: "true",
  is_featured: "true",
  is_trending: "false",
  is_popular: "true",
};

/**
 * ImportDialog — CSV-import wizard: template download → file parse →
 * per-row client-side validation preview → server upsert (slug-keyed).
 */
export function ImportDialog() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [skipped, setSkipped] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);

  const validRows = rows?.filter((r) => r.valid) ?? [];

  function reset() {
    setRows(null);
    setSkipped([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("CSV too large — keep imports under 2 MB.");
      return;
    }
    const parsed = parseCsv(await file.text());
    if (!parsed.headers.includes("name")) {
      toast.error("Missing required column: name.");
      return;
    }
    if (parsed.rows.length === 0) {
      toast.error("No data rows found in this file.");
      return;
    }
    if (parsed.rows.length > 500) {
      toast.error("Import in batches of 500 rows or fewer.");
      return;
    }

    setSkipped(parsed.skippedLines);
    setRows(
      parsed.rows.map((raw, index) => {
        const result = productImportRowSchema.safeParse(raw);
        return {
          row: index + 2,
          data: raw,
          valid: result.success,
          error: result.success
            ? undefined
            : (result.error.issues[0]?.message ?? "Invalid row"),
        };
      }),
    );
  }

  async function handleImport() {
    if (!validRows.length) return;
    setImporting(true);
    try {
      const summary = await importProducts(
        validRows.map((r) => ({ row: r.row, data: r.data })),
      );
      toast.success(
        `Imported ${summary.created + summary.updated} products — ${summary.created} new, ${summary.updated} updated.`,
      );
      if (summary.failed.length) {
        toast.warning(
          `${summary.failed.length} row(s) failed on the server (see console).`,
        );
        console.warn("[import] server-side failures", summary.failed);
      }
      setOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <UploadIcon /> Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import products from CSV</DialogTitle>
          <DialogDescription>
            Rows upsert by slug — existing dishes get updated, new ones created.
            Categories are auto-created by name.
          </DialogDescription>
        </DialogHeader>

        {!rows ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="border-muted-foreground/30 hover:border-primary/60 hover:bg-primary/[0.03] flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors"
            >
              <FileUpIcon className="text-primary size-7" />
              <span className="text-sm font-medium">Choose a .csv file</span>
              <span className="text-muted-foreground text-xs">
                Up to 500 rows · required column: name
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() =>
                downloadCsv(
                  "products-template.csv",
                  toCsv([...PRODUCT_CSV_COLUMNS], [TEMPLATE_ROW]),
                )
              }
            >
              Download starter template
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="success">{validRows.length} ready</Badge>
              {rows.length - validRows.length > 0 ? (
                <Badge variant="destructive">
                  {rows.length - validRows.length} invalid
                </Badge>
              ) : null}
              {skipped.length > 0 ? (
                <Badge variant="warning">{skipped.length} malformed skipped</Badge>
              ) : null}
            </div>
            <div className="max-h-64 overflow-y-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.row}>
                      <TableCell className="text-muted-foreground text-xs">
                        {row.row}
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-sm">
                        {String(row.data.name ?? "—")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {String(row.data.category ?? "—")}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {String(row.data.price ?? "—")}
                      </TableCell>
                      <TableCell>
                        {row.valid ? (
                          <Badge variant="outline">OK</Badge>
                        ) : (
                          <span
                            className="text-destructive block max-w-44 truncate text-xs"
                            title={row.error}
                          >
                            {row.error}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          {rows ? (
            <Button type="button" variant="ghost" onClick={reset} disabled={importing}>
              Choose another file
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={() => void handleImport()}
            disabled={!validRows.length || importing}
          >
            {importing ? <Loader2Icon className="animate-spin" /> : null}
            Import {validRows.length ? `${validRows.length} products` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
