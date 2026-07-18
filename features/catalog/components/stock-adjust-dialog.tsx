"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/services/api-client";
import { adjustProductStock } from "@/services/catalog-admin.service";
import { stockAdjustSchema, type StockAdjustInput } from "../schemas";
import { numberChange } from "./number-change";
import type { BranchOption, ProductListRow } from "../types";

const MOVEMENT_TYPES = [
  { value: "PURCHASE", label: "Purchase — stock in" },
  { value: "ADJUSTMENT", label: "Adjustment — count correction" },
  { value: "WASTE", label: "Waste — spoilage / damage" },
  { value: "RETURN", label: "Return — back into stock" },
  { value: "TRANSFER", label: "Transfer — between branches" },
] as const;

/**
 * StockAdjustDialog — one ledger-consistent movement against a branch level.
 * Positive quantities add stock, negative remove (validated server-side).
 */
export function StockAdjustDialog({
  product,
  branches,
  onClose,
}: {
  product: ProductListRow;
  branches: BranchOption[];
  onClose: () => void;
}) {
  const router = useRouter();

  const form = useForm<StockAdjustInput>({
    resolver: zodResolver(stockAdjustSchema),
    defaultValues: {
      branchId: branches.find((b) => b.isMain)?.id ?? branches[0]?.id ?? "",
      type: "PURCHASE",
      quantity: Number.NaN,
      note: null,
      lowStockThreshold: null,
    },
  });

  async function onSubmit(values: StockAdjustInput) {
    try {
      const result = await adjustProductStock(product.id, values);
      toast.success(`Stock updated — ${result.quantity} on hand.`);
      router.refresh();
      onClose();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't update stock.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock — {product.name}</DialogTitle>
          <DialogDescription>
            Every change is journaled in the inventory ledger with your name and
            timestamp.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pick a branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name} ({branch.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Movement</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MOVEMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity (±)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step={1}
                        placeholder="e.g. 24 or -3"
                        {...field}
                        value={Number.isNaN(field.value) ? "" : field.value}
                        onChange={numberChange(field.onChange, { nullable: false })}
                      />
                    </FormControl>
                    <FormDescription>
                      On hand now:{" "}
                      <strong className="tabular-nums">
                        {product.stockOnHand ?? "—"}
                      </strong>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lowStockThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low-stock alert below</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="keep current"
                        {...field}
                        value={field.value ?? ""}
                        onChange={numberChange(field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Supplier delivery #1842"
                      maxLength={500}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Save movement"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
