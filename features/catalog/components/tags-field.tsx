"use client";

import { useMemo, useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { TagOption } from "../types";
import { cn } from "@/lib/utils";

/**
 * TagsField — chip editor with type-ahead suggestions from the restaurant's
 * existing tags; unknown terms become new tags on save (server get-or-create).
 */
export function TagsField({
  value,
  onChange,
  suggestions,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: TagOption[];
}) {
  const [draft, setDraft] = useState("");

  const matches = useMemo(() => {
    const term = draft.trim().toLowerCase();
    if (!term) return [];
    return suggestions
      .filter((s) => s.name.toLowerCase().includes(term))
      .filter((s) => !value.some((v) => v.toLowerCase() === s.name.toLowerCase()))
      .slice(0, 6);
  }, [draft, suggestions, value]);

  function add(name: string) {
    const clean = name.trim();
    if (!clean || value.some((v) => v.toLowerCase() === clean.toLowerCase())) return;
    onChange([...value, clean]);
    setDraft("");
  }

  function remove(name: string) {
    onChange(value.filter((v) => v !== name));
  }

  const isNew =
    draft.trim().length > 0 &&
    matches.length === 0 &&
    !value.some((v) => v.toLowerCase() === draft.trim().toLowerCase());

  return (
    <div className="space-y-2">
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 py-1 pr-1 pl-2.5">
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="hover:bg-foreground/10 rounded-full p-0.5"
              aria-label={`Remove ${tag}`}
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add(draft);
            } else if (event.key === "Backspace" && !draft && value.length) {
              remove(value[value.length - 1]!);
            }
          }}
          placeholder={value.length ? "" : "Type and press Enter — e.g. Bestseller"}
          className="h-8 min-w-40 flex-1 border-0 bg-transparent! shadow-none focus-visible:ring-0"
        />
      </div>

      {matches.length > 0 || isNew ? (
        <div className="flex flex-wrap gap-1.5">
          {matches.map((match) => (
            <button
              key={match.id}
              type="button"
              onClick={() => add(match.name)}
              className={cn(
                "border-muted-foreground/25 hover:border-primary/60 hover:bg-primary/[0.06] rounded-full border px-2.5 py-1 text-xs transition-colors",
              )}
            >
              {match.name}
            </button>
          ))}
          {isNew ? (
            <button
              type="button"
              onClick={() => add(draft)}
              className="border-primary/40 bg-primary/[0.06] text-primary inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors"
            >
              <PlusIcon className="size-3" /> Create “{draft.trim()}”
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
