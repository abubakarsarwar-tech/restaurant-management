"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { GripIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ProductUpsertInput } from "../schemas";
import { numberChange } from "./number-change";

/**
 * VariantsField — purchasable SKUs (sizes, deals) with their own pricing,
 * SKU/barcode, an optional attribute axis (Size→Large…) and exactly one
 * default selection (auto-fixed on save if none chosen).
 */
export function VariantsField() {
  const form = useFormContext<ProductUpsertInput>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Variants & sizes</h3>
          <p className="text-muted-foreground text-xs">
            Add sizes or bundles. The base price is shown as “from” when variants exist.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              name: "",
              option: { group: "Size", value: "" },
              sku: null,
              barcode: null,
              price: 0,
              compareAtPrice: null,
              cost: null,
              isDefault: fields.length === 0,
              isActive: true,
            })
          }
        >
          <PlusIcon /> Add variant
        </Button>
      </div>

      {form.formState.errors.variants?.root ? (
        <p className="text-destructive text-xs">
          {form.formState.errors.variants.root.message}
        </p>
      ) : null}

      {fields.length === 0 ? (
        <div className="bg-muted/30 text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-xs">
          No variants — this dish sells at its base price. Add one to offer sizes like
          Small / Medium / Large.
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <Card key={field.id} className="shadow-none">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start gap-2">
                  <GripIcon className="text-muted-foreground/50 mt-3 size-4 shrink-0" />
                  <div className="grid flex-1 gap-3 sm:grid-cols-[1.2fr_1fr_1fr]">
                    <FormField
                      control={form.control}
                      name={`variants.${index}.name`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder='Large 12"' {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.option.group`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Axis</FormLabel>
                          <FormControl>
                            <Input placeholder="Size" {...f} value={f.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.option.value`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Value</FormLabel>
                          <FormControl>
                            <Input placeholder="Large" {...f} value={f.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive mt-6"
                    onClick={() => remove(index)}
                    aria-label="Remove variant"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <FormField
                    control={form.control}
                    name={`variants.${index}.price`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.01"
                            {...f}
                            value={Number.isNaN(f.value) ? "" : (f.value ?? "")}
                            onChange={numberChange(f.onChange, { nullable: false })}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variants.${index}.compareAtPrice`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Compare-at</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.01"
                            placeholder="—"
                            {...f}
                            value={f.value ?? ""}
                            onChange={numberChange(f.onChange)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variants.${index}.cost`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Cost</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.01"
                            placeholder="—"
                            {...f}
                            value={f.value ?? ""}
                            onChange={numberChange(f.onChange)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variants.${index}.sku`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input placeholder="—" {...f} value={f.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variants.${index}.barcode`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Barcode</FormLabel>
                        <FormControl>
                          <Input placeholder="—" {...f} value={f.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-end gap-4 pb-2.5">
                    <FormField
                      control={form.control}
                      name={`variants.${index}.isDefault`}
                      render={({ field: f }) => (
                        <FormItem className="flex items-center gap-1.5">
                          <FormControl>
                            <Checkbox
                              checked={f.value}
                              onCheckedChange={(checked) => {
                                if (!checked) return; // radio semantics
                                form.setValue(
                                  "variants",
                                  form.getValues("variants").map((v, i) => ({
                                    ...v,
                                    isDefault: i === index,
                                  })),
                                  { shouldDirty: true },
                                );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="cursor-pointer text-xs font-normal">
                            Default
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.isActive`}
                      render={({ field: f }) => (
                        <FormItem className="flex items-center gap-1.5">
                          <FormControl>
                            <Checkbox
                              checked={f.value}
                              onCheckedChange={(checked) => f.onChange(!!checked)}
                            />
                          </FormControl>
                          <FormLabel className="cursor-pointer text-xs font-normal">
                            Active
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
