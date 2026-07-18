"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackagePlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/services/api-client";
import { adjustProductStock } from "@/services/catalog-admin.service";

/**
 * StockAdjustButton — compact per-level adjustment from the product edit
 * page's inventory panel (branch & variant pinned; quantity + type + note).
 */
export function StockAdjustButton({
  productId,
  productName,
  branchId,
  variantId,
  currentQuantity,
}: {
  productId: string;
  productName: string;
  branchId: string;
  variantId: string | null;
  currentQuantity: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<
    "PURCHASE" | "ADJUSTMENT" | "WASTE" | "RETURN" | "TRANSFER"
  >("PURCHASE");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const delta = Number(quantity);
    if (!Number.isInteger(delta) || delta === 0) {
      toast.error("Enter a whole, non-zero quantity.");
      return;
    }
    setSaving(true);
    try {
      const result = await adjustProductStock(productId, {
        branchId,
        variantId,
        type,
        quantity: delta,
        note: note || null,
      });
      toast.success(`Stock updated — ${result.quantity} on hand.`);
      setOpen(false);
      setQuantity("");
      setNote("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't update stock.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <PackagePlusIcon /> Adjust
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>
              {productName} — on hand now:{" "}
              <strong className="tabular-nums">{currentQuantity}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="sa-type">Movement</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger id="sa-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PURCHASE">Purchase — stock in</SelectItem>
                  <SelectItem value="ADJUSTMENT">
                    Adjustment — count correction
                  </SelectItem>
                  <SelectItem value="WASTE">Waste — spoilage / damage</SelectItem>
                  <SelectItem value="RETURN">Return — back into stock</SelectItem>
                  <SelectItem value="TRANSFER">Transfer — between branches</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sa-qty">Quantity (±)</Label>
              <Input
                id="sa-qty"
                type="number"
                step={1}
                placeholder="e.g. 24 or -3"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sa-note">Note (optional)</Label>
              <Input
                id="sa-note"
                maxLength={500}
                placeholder="Supplier delivery #1842"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? "Saving…" : "Save movement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
