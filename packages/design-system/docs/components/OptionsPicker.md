# `<OptionsPicker>` — filter picker (multi/single, grouped, searchable)

**Use for filter UX, not form fields.** A compound picker that opens a Popover
with a search input and grouped/flat checkbox (multi) or radio (single) options.
Multi mode buffers a draft until Apply; single mode commits per click.

```tsx
<OptionsPicker selected={events} onApply={setEvents}>
  <OptionsPicker.Trigger>
    <Button variant="secondary">
      Events <ChevronDown size={14} />
    </Button>
  </OptionsPicker.Trigger>
  <OptionsPicker.Content
    label="Filter events"
    groups={catalogGroups} // OR `options={flatOptions}` — XOR
  />
</OptionsPicker>
```

`mode="single"` for single-select: `selected: string | null`, `onApply(value | null)`, no Apply/Cancel footer.

Don't use for form selects (use `<Select>`), action menus (use `<DropdownMenu>`),
or single boolean toggles (use `<Checkbox>` or `<Switch>`).
