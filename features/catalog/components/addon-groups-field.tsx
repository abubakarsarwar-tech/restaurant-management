"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { ProductUpsertInput } from "../schemas";
import { numberChange } from "./number-change";

/**
 * AddonGroupsField — nested editor: groups ("Extra Toppings", min/max rules)
 * each with its options + per-option price and max quantity. Drives the
 * customer modal's customizers.
 */
export function AddonGroupsField() {
  const form = useFormContext<ProductUpsertInput>();
  const groups = useFieldArray({ control: form.control, name: "addonGroups" });

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Add-on groups</h3>
          <p className="text-muted-foreground text-xs">
            Extras & choices — “Extra Toppings”, “Choose your dip”. Set min/max to enforce
            selections at checkout.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            groups.append({
              name: "",
              isRequired: false,
              minSelections: 0,
              maxSelections: null,
              addons: [{ name: "", price: 0, maxQuantity: 1, isActive: true }],
            })
          }
        >
          <PlusIcon /> Add group
        </Button>
      </div>

      {groups.fields.length === 0 ? (
        <div className="bg-muted/30 text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-xs">
          No add-ons. Create a group to upsell toppings, dips and extras.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.fields.map((group, groupIndex) => (
            <GroupCard
              key={group.id}
              groupIndex={groupIndex}
              onRemove={() => groups.remove(groupIndex)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupCard({
  groupIndex,
  onRemove,
}: {
  groupIndex: number;
  onRemove: () => void;
}) {
  const form = useFormContext<ProductUpsertInput>();
  const addons = useFieldArray({
    control: form.control,
    name: `addonGroups.${groupIndex}.addons`,
  });

  return (
    <Card className="shadow-none">
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-[1.4fr_repeat(2,minmax(0,0.6fr))_auto]">
          <FormField
            control={form.control}
            name={`addonGroups.${groupIndex}.name`}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel>Group name</FormLabel>
                <FormControl>
                  <Input placeholder="Extra Toppings" {...f} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`addonGroups.${groupIndex}.minSelections`}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel>Min picks</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
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
            name={`addonGroups.${groupIndex}.maxSelections`}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel>Max picks</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="∞"
                    {...f}
                    value={f.value ?? ""}
                    onChange={numberChange(f.onChange)}
                  />
                </FormControl>
                <p className="text-muted-foreground text-[11px]">Empty = unlimited</p>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-end justify-end gap-3 pb-1.5">
            <FormField
              control={form.control}
              name={`addonGroups.${groupIndex}.isRequired`}
              render={({ field: f }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={f.value} onCheckedChange={f.onChange} />
                  </FormControl>
                  <FormLabel className="text-xs font-normal">Required</FormLabel>
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              aria-label="Remove group"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        </div>

        {form.formState.errors.addonGroups?.[groupIndex]?.addons?.root ? (
          <p className="text-destructive text-xs">
            {form.formState.errors.addonGroups[groupIndex]!.addons!.root!.message}
          </p>
        ) : null}

        <div className="space-y-2">
          {addons.fields.map((addon, addonIndex) => (
            <div
              key={addon.id}
              className="grid items-end gap-2 rounded-xl border p-2.5 sm:grid-cols-[1.4fr_0.7fr_0.7fr_auto_auto]"
            >
              <FormField
                control={form.control}
                name={`addonGroups.${groupIndex}.addons.${addonIndex}.name`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Option</FormLabel>
                    <FormControl>
                      <Input placeholder="Extra cheese" {...f} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`addonGroups.${groupIndex}.addons.${addonIndex}.price`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Price</FormLabel>
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
                name={`addonGroups.${groupIndex}.addons.${addonIndex}.maxQuantity`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Max qty</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={20}
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
                name={`addonGroups.${groupIndex}.addons.${addonIndex}.isActive`}
                render={({ field: f }) => (
                  <FormItem className="flex items-center gap-2 pb-2">
                    <FormControl>
                      <Switch checked={f.value} onCheckedChange={f.onChange} />
                    </FormControl>
                    <FormLabel className="text-xs font-normal">On</FormLabel>
                  </FormItem>
                )}
              />
              <div className="pb-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => addons.remove(addonIndex)}
                  disabled={addons.fields.length === 1}
                  aria-label="Remove option"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            addons.append({ name: "", price: 0, maxQuantity: 1, isActive: true })
          }
        >
          <PlusIcon /> Add option
        </Button>
      </CardContent>
    </Card>
  );
}
