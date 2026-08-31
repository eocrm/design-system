// Empty interface to start — components add their keys as they migrate.
// Each leaf is either a string (static), a function (parameterized), or a
// readonly string array (months / weekdays).
//
// As components migrate, they extend this interface with their own namespace,
// e.g. `alert: { dismiss: string }`. Both en.ts and ru.ts must then populate
// the new keys.
export interface Messages {
  alert: {
    /** aria-label on the Alert's dismiss (×) button. */
    dismiss: string;
  };
  appLayout: {
    /** aria-label on the overlay sidebar dialog (mobile drawer). It has no
     * Drawer.Header, so without this the dialog would be unnamed. */
    sidebar: string;
  };
  confirmationPopover: {
    /**
     * Announced from a polite live region while an async confirm is in flight.
     *
     * The pending state used to reach a screen reader not at all: no
     * `aria-busy`, no region, and the spinner explicitly `aria-hidden`. The
     * user activated Confirm and got silence until the popover closed (#497).
     */
    pending: string;
    /** Label on the secondary "Cancel" button inside the confirmation popover. */
    cancel: string;
    /** Label on the primary "Confirm" button inside the confirmation popover. */
    confirm: string;
  };
  image: {
    /** Visible text + aria-label fallback shown when an image fails to load. */
    loadError: string;
    /** Label on the retry button in the broken-image placeholder. */
    retry: string;
  };
  lightbox: {
    /** Default aria-label for the gallery dialog. */
    label: string;
    /** aria-label on the previous-image chevron. */
    previous: string;
    /** aria-label on the next-image chevron. */
    next: string;
    /** aria-label on the close (×) button. */
    close: string;
    /** aria-label on the download action for a PDF/document item. */
    download: string;
    /** Stage message when a document's source can't be safely previewed. */
    previewUnavailable: string;
  };
  passwordInput: {
    /** aria-label on the show-password toggle when the password is hidden. */
    show: string;
    /** aria-label on the hide-password toggle when the password is visible. */
    hide: string;
    /** Live-region copy announced when caps-lock is detected. */
    capsLockOn: string;
    /** Live-region copy announced when a non-ASCII keystroke is detected. */
    wrongLayoutOn: string;
  };
  passwordStrengthMeter: {
    /** Label rendered when the strength score is "weak". */
    weak: string;
    /** Label rendered when the strength score is "fair". */
    fair: string;
    /** Label rendered when the strength score is "strong". */
    strong: string;
    /** Label rendered when the strength score is "very strong". */
    veryStrong: string;
  };
  switch: {
    /**
     * Announced from a polite live region while `loading` is true. Same
     * reasoning as `statusMenu.busy` — the switch keeps its name and the
     * change is announced instead.
     */
    busy: string;
  };
  progress: {
    /**
     * `aria-valuetext` for an INDETERMINATE `Progress` / `CircularProgress`
     * when the consumer passes no `aria-label`.
     *
     * An indeterminate bar has no `aria-valuenow` — its meaning lives entirely
     * in `aria-valuetext`, so this string is the only thing a screen reader
     * has to go on. It was hardcoded English in both components, which meant a
     * Russian consumer heard "Loading…" (#503). Note this is a value
     * description, not the accessible name: the name is whatever `aria-label`
     * the consumer passes, and may be absent.
     */
    indeterminate: string;
  };
  slider: {
    /** Accessible-name suffix for the first thumb in a range slider. */
    minimum: string;
    /** Accessible-name suffix for the second thumb in a range slider. */
    maximum: string;
  };
  calendar: {
    /** Label on the "Today" jump button in the header. */
    today: string;
    /** Empty-state copy for agenda view when the visible window has no events. */
    agendaEmpty: string;
    /** Time-gutter copy for all-day / multi-day events in agenda view. */
    allDay: string;
    /** 12 long month names, January–December (indexed by `Date#getMonth()`). */
    months: readonly [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    /**
     * 7 short weekday names in Mon–Sun order (indexed 0=Mon ... 6=Sun for the
     * library's internal helpers; consumers typically don't read this directly).
     */
    weekdaysShort: readonly [string, string, string, string, string, string, string];
    /** aria-label on the prev chevron when month view is active. */
    previousMonth: string;
    /** aria-label on the next chevron when month view is active. */
    nextMonth: string;
    /** aria-label on the prev chevron when week view is active. */
    previousWeek: string;
    /** aria-label on the next chevron when week view is active. */
    nextWeek: string;
    /** aria-label on the prev chevron when day view is active. */
    previousDay: string;
    /** aria-label on the next chevron when day view is active. */
    nextDay: string;
    /** aria-label on the prev chevron when agenda view is active. */
    previousAgenda: string;
    /** aria-label on the next chevron when agenda view is active. */
    nextAgenda: string;
    /** Function leaf — `aria-label` template for the "+N more events" overflow chip. */
    moreEvents: (params: { count: number }) => string;
    /** VISIBLE overflow chip text, distinct from `moreEvents`, which names it for AT. */
    moreEventsShort: (params: { count: number }) => string;
    /** Segmented-control label for the month view. */
    viewMonth: string;
    /** Segmented-control label for the week view. */
    viewWeek: string;
    /** Segmented-control label for the day view. */
    viewDay: string;
    /** Segmented-control label for the agenda view. */
    viewAgenda: string;
    /** Column header for the resource-day-view lane holding events with no matching resource. */
    unassigned: string;
    /** Keyboard drag instructions, referenced by every draggable event block. */
    dragInstructions: string;
    /**
     * Live-region text while a drag proposes a new slot, and when a move is
     * accepted. `time` is the whole proposed slot, already formatted as a
     * range (e.g. "9:00 AM – 10:00 AM"), not a single instant.
     */
    dragMovedTo: (params: { event: string; time: string }) => string;
    /** Live-region text while a resize proposes a new end, and when one is accepted. */
    dragEndsAt: (params: { event: string; time: string }) => string;
    /** Live-region text when a placement is refused, by `canDropEvent` or by the drop handler. */
    dragRefused: (params: { event: string }) => string;
    /** Live-region text when a gesture is already against the edge of what the bounds allow. */
    dragAtEdge: (params: { event: string }) => string;
    /** Live-region text when a gesture ended exactly where it started, unrefused. */
    dragUnchanged: (params: { event: string }) => string;
    /** Live-region text when a gesture was abandoned (pointer cancelled, window blurred). */
    dragCancelled: (params: { event: string }) => string;
  };
  datePicker: {
    /** Visible label / aria-label for the "Today" jump button. */
    today: string;
    /** aria-label for the ✕ clear button shown when a value is set. */
    clear: string;
    /** aria-label for the calendar-toggle button on the right of the input. */
    openCalendar: string;
    /** aria-label for the previous-month chevron in the popover header. */
    previousMonth: string;
    /** aria-label for the next-month chevron in the popover header. */
    nextMonth: string;
    /** aria-label for the range-start input (DateRangePicker dual-input). */
    rangeStart: string;
    /** aria-label for the range-end input (DateRangePicker dual-input). */
    rangeEnd: string;
    /** Visible label / aria-label for the time input rendered in `granularity="minute"` mode. */
    timeLabel: string;
    /** aria-label for the hours listbox column inside the `<TimeField>` popover. */
    timeHoursLabel: string;
    /** aria-label for the minutes listbox column inside the `<TimeField>` popover. */
    timeMinutesLabel: string;
    /** aria-label for the `<TimeField>` chevron toggle (opens the hour/minute lists). */
    timeOpenList: string;
    /** Visible label on the "Now" quick-pick button in the `<TimeField>` popover footer. */
    timeNow: string;
    /** aria-label for the AM/PM listbox column (12-hour cycle only). */
    timePeriodLabel: string;
    /** Row label for AM in the `<TimeField>` 12-hour period column. */
    timePeriodAm: string;
    /** Row label for PM in the `<TimeField>` 12-hour period column. */
    timePeriodPm: string;
    /** Placeholder for the `<TimeField>` text input in 24-hour cycle (e.g. `HH:mm`). */
    timePlaceholder24: string;
    /** Placeholder for the `<TimeField>` text input in 12-hour cycle (e.g. `h:mm AM/PM`). */
    timePlaceholder12: string;
  };
  dateRangePicker: {
    /** Visible label / aria-label for the start-time input in `granularity="minute"` mode. */
    startTimeLabel: string;
    /** Visible label / aria-label for the end-time input in `granularity="minute"` mode. */
    endTimeLabel: string;
  };
  dataTable: {
    /** aria-label for the select-all checkbox in the header. */
    selectAll: string;
    /** aria-label for a row's selection checkbox. */
    selectRow: (params: { row: string }) => string;
    /** aria-label for a row's expansion toggle. */
    expandRow: (params: { row: string }) => string;
    /** aria-label for a column header's drag-to-reorder grip. */
    dragReorder: (params: { name: string }) => string;
    /** Same control on a column with no label of its own — never speaks `column.id`. */
    dragReorderUnnamed: string;
    /** Accessible label for the row-expansion toggle column header. */
    rowExpansion: string;
    /** Accessible label for the pinned-rows section / tbody. */
    pinnedRows: string;
    /** Default empty-state copy when no rows are rendered. */
    empty: string;
    /**
     * Announced from a polite live region while `loading` is true. `aria-busy`
     * on the table is not enough on its own — no mainstream screen reader
     * speaks `busy` on a non-live element, so the table would go from silent
     * to populated with nothing said.
     *
     * Gated on the SKELETON's visibility, not the raw `loading` prop: a table
     * configured `skeletonDelay={300}` has decided a 200ms load is not worth
     * showing anything for, and announcing it would be louder than the UI.
     * Background refetches over already-rendered rows stay silent for the same
     * reason — nothing visually changes, so nothing is announced.
     */
    loading: string;
    /**
     * Announced when the skeleton resolves. Without it the table goes from
     * "Loading rows…" to populated with nothing said — the same half-finished
     * shape `loading` exists to fix. Carries no row count on purpose: a count
     * needs three plural forms in ru for a number the user can read off the
     * table itself.
     */
    loaded: string;
    /**
     * Accessible name for a column's resize handle, interpolated with the
     * column label. The handle used to reuse the column header verbatim, which
     * did two wrong things at once: a keyboard user tabbing to it heard
     * "Name, separator" with no hint that it resizes, and — because the handle
     * is a NAMED DESCENDANT of the columnheader — the header's own name
     * computed as "Name Name".
     */
    resizeColumn: (params: { name: string }) => string;
    /** Same control on a column with no label of its own — never speaks `column.id`. */
    resizeColumnUnnamed: string;
    /** Accessible name for a column header whose author gave it no label. */
    unlabelledColumn: string;
    /**
     * Announced when a load resolves to nothing. Distinct from `empty`, which
     * is the VISIBLE empty-state copy: reusing that string put the same text
     * on screen and in the live region, so a name query for the empty state
     * matched twice. Announcing "Rows loaded" over an empty table was the bug
     * this replaces.
     */
    loadedEmpty: string;
  };
  /**
   * Screen-reader copy for every dnd-kit drag surface in the library — Kanban,
   * Sortable, SortableGroup, DataTable column reorder and the RichTextEditor
   * block gutter. Passed to `<DndContext accessibility={…}>` so dnd-kit's
   * hard-coded English defaults never reach a live region.
   *
   * `item` and `container` are human labels the component resolves at the call
   * site (a card's text, a column header, a list's `aria-label`); `index` and
   * `total` are 1-based slot positions. Nothing here bakes in data.
   */
  drag: {
    /** Visually-hidden keyboard instructions, announced when a draggable takes focus. */
    instructions: string;
    /** Fallback name for a `Sortable.Handle` the consumer gave no `aria-label`. */
    handleLabel: string;
    /** Announced when a drag starts. */
    pickedUp: (params: { item: string }) => string;
    /** Announced when the drop slot changes, in a single-list component (Sortable, DataTable). */
    movedOver: (params: { item: string; index: number; total: number }) => string;
    /** Announced when the drop slot changes, in a multi-list component (Kanban, SortableGroup). */
    movedOverIn: (params: {
      item: string;
      index: number;
      total: number;
      container: string;
    }) => string;
    /** Announced while the drag is over no drop target at all. */
    movedOutside: (params: { item: string }) => string;
    /** Announced on a committed drop in a single-list component. */
    dropped: (params: { item: string; index: number; total: number }) => string;
    /** Announced on a committed drop into a named list. */
    droppedIn: (params: {
      item: string;
      index: number;
      total: number;
      container: string;
    }) => string;
    /** Announced when a release resolves to no slot, so nothing moved. */
    droppedNowhere: (params: { item: string }) => string;
    /**
     * Announced on a committed drop by a surface that has no numbered slots to
     * report — the RichTextEditor block gutter drags against the document flow,
     * not a list of droppables.
     */
    moved: (params: { item: string }) => string;
    /**
     * Announced on Escape, and on a release the component itself rejects — a
     * Kanban card let go outside the board is a cancel, not a drop.
     */
    cancelled: (params: { item: string }) => string;
    /** Stand-in for `item` when the component has no human label for what is being dragged. */
    unnamed: string;
    /** Stand-in for `container` when a list has no accessible name; `index` is 1-based. */
    unnamedContainer: (params: { index: number; total: number }) => string;
  };
  dashboardCanvas: {
    /** aria-label for the canvas root region. */
    canvas: string;
    /** aria-label on a section's collapse toggle when expanded (click collapses it); interpolates the section title. */
    sectionCollapse: (params: { title: string }) => string;
    /** aria-label on a section's collapse toggle when collapsed (click expands it); interpolates the section title. */
    sectionExpand: (params: { title: string }) => string;
    /** aria-roledescription for item cells in edit mode. */
    itemRole: string;
    /** Visually-hidden keyboard instructions referenced by aria-describedby (edit mode). */
    instructions: string;
    /** Instructions variant for readOnly canvases — collapse toggles are the only interaction. */
    instructionsReadOnly: string;
    /** Live announcement when an item is picked up for a keyboard move. */
    pickedUp: string;
    /** Live announcement after a picked item steps one cell (1-based column/row); `container` names the section while moving inside one. */
    movedTo: (params: { x: number; y: number; container?: string }) => string;
    /** Live announcement when a picked item is dropped. */
    dropped: string;
    /** Live announcement when a keyboard move is cancelled. */
    cancelled: string;
    /** Live announcement after a Shift+arrow resize (the engine-clamped size, in grid units). */
    resized: (params: { w: number; h: number }) => string;
    /** Live announcement after a section band moves (1-based position). */
    sectionMoved: (params: { title: string; position?: number }) => string;
    /** Live announcement when a picked item crosses into a section. */
    enteredSection: (params: { title: string }) => string;
    /** Live announcement when a picked item crosses into the top-level grid. */
    enteredTopLevel: string;
    /** Hint inside an empty section body while a move (drag or keyboard pick) is in flight. */
    dropHint: string;
  };
  avatar: {
    /**
     * Presence status, folded into the avatar's accessible name (#506).
     * Colour alone carried this before, which WCAG 1.4.1 does not allow —
     * and OKLab separation, which the token gate measures, is blind to
     * colour-vision deficiency.
     */
    presence: {
      online: string;
      busy: string;
      away: string;
      offline: string;
    };
  };
  avatarGroup: {
    /** aria-label on the overflow chip: how many avatars are not shown. */
    overflow: (params: { count: number }) => string;
  };
  optionsPicker: {
    /** aria-label for a group's expand/collapse toggle. */
    toggleGroup: (params: { label: string }) => string;
    /** Placeholder and aria-label for the filter (search) input. */
    filter: string;
    /** Label for the apply button. */
    apply: string;
    /** Label for the cancel button. */
    cancel: string;
    /** Copy shown when the filter query has no matches. */
    noMatches: string;
  };
  emojiPicker: {
    /** Placeholder + aria-label for the emoji search input. */
    search: string;
    /** Accessible label for the emoji listbox surface. */
    label: string;
    /** Section header for the recently-used emoji (the `recent` prop). */
    recent: string;
    /** Copy shown when the search query matches no emoji. */
    noResults: string;
    /** Localized section headers, keyed by `EmojiCategoryId`. */
    category: {
      /** Smileys & emotion section. */
      smileys: string;
      /** Hand-gesture section. */
      gestures: string;
      /** People & body section. */
      people: string;
      /** Animals & nature section. */
      animals: string;
      /** Food & drink section. */
      food: string;
      /** Activities & events section. */
      activities: string;
      /** Travel & places section. */
      travel: string;
      /** Objects section. */
      objects: string;
      /** Symbols section. */
      symbols: string;
      /** Flags section. */
      flags: string;
    };
  };
  pagination: {
    /** Visible label on the previous-page button. */
    previous: string;
    /** Visible label on the next-page button. */
    next: string;
    /** aria-label on the previous-page button. */
    previousAriaLabel: string;
    /** aria-label on the next-page button. */
    nextAriaLabel: string;
    /** aria-label on the wrapping `<nav>` element. */
    ariaLabel: string;
    /** Function leaf — aria-label template for a non-current page button. */
    pageAriaLabel: (params: { page: number }) => string;
    /** Function leaf — aria-label template for the current-page button. */
    currentPageAriaLabel: (params: { page: number }) => string;
  };
  select: {
    /** Visible text of the create-new row in a creatable Select. */
    createOption: (params: { label: string }) => string;
    /** aria-label on a multi-select chip's remove control. */
    removeChip: (params: { label: string }) => string;
    /** aria-label on the clear-selection (×) button inside Select. */
    clear: string;
    /** Placeholder for the search input in searchable Selects. */
    search: string;
    /** Copy shown when the Select listbox has no options matching the filter. */
    noOptions: string;
    /** Row text while an async `loadOptions` request is in flight. */
    loading: string;
    /** Row text when `loadOptions` rejects. */
    loadFailed: string;
    /** Retry control inside the error row. */
    retry: string;
    /** Empty-state copy when a search query matched nothing. */
    noResultsFor: (params: { query: string }) => string;
    /**
     * Announced from ONE live region the Select root owns, replacing the
     * per-row `aria-live` the three state rows used to carry.
     *
     * Those rows put `aria-live` on `<li role="presentation">`, and the region
     * mounted together with its text — which most screen readers do not
     * announce. That is the defect, and it stands on its own.
     *
     * A previous version of this note added that ARIA's presentational-role
     * conflict resolution would discard the `presentation` and expose the rows
     * as list items, an `aria-required-children` deviation. Spec-wise that is
     * arguable and axe-core flags it statically, but a reviewer measured
     * Chromium and it does NOT happen inside a `role="listbox"`: every such
     * `<li>` is exposed as role=none and ignored, with `aria-live`, with
     * `aria-label`, even with `tabindex`. Conflict resolution does fire in a
     * plain `<ul>`. Stated precisely rather than dropped, because the wrong
     * version was cited in four other files. The error row took a third route
     * with `role="alert"` on an `<li>` (#495).
     */
    statusLoading: string;
    /** Accessible name for a multi-select trigger, listing what is currently selected. */
    selectedPrefix: (params: { labels: string }) => string;
    /** Accessible name for a chips trigger with nothing selected yet. */
    openSelect: string;
  };
  phoneInput: {
    /** aria-label for the country picker Select. */
    countryLabel: string;
    /** Search placeholder inside the country picker. */
    countrySearch: string;
    /** aria-label for the national-number Input. */
    numberLabel: string;
    /** Placeholder in the national-number Input. */
    numberPlaceholder: string;
  };
  colorPicker: {
    /**
     * `aria-valuetext` for the saturation/brightness square, announced on
     * every keyboard adjustment of a `role="application"` element — so it was
     * arguably the most-spoken untranslated string in the library (#492).
     */
    saturationBrightnessValue: (params: { s: number; v: number }) => string;
    /** aria-label for the SV (saturation × brightness) square. */
    saturationBrightness: string;
    /** aria-label for the hue slider. */
    hue: string;
    /** aria-label for the hex value input. */
    hexValue: string;
    /** aria-label for the preset color swatch row. */
    presetColors: string;
    /** aria-label fallback for the default ColorPicker trigger button. */
    triggerLabel: string;
    /**
     * Function leaf — complete accessible-name template for the default ColorPicker
     * trigger. `label` is the resolved trigger purpose and `value` is the normalized
     * uppercase HEX value currently selected.
     */
    triggerAccessibleLabel: (params: { label: string; value: string }) => string;
  };
  iconPicker: {
    /** Default accessible purpose for the IconPicker trigger. */
    triggerLabel: string;
  };
  drawer: {
    /** aria-label for the Drawer header's close button. */
    close: string;
  };
  fileUpload: {
    /** aria-label/title on the success Check icon in FileUpload's item list. */
    done: string;
    /** Fallback aria-label on the dropzone when `dropzoneLabel` is a ReactNode. */
    upload: string;
    /** Visible drag-hint copy inside the dropzone. */
    dragHint: string;
    /** Function leaf — aria-label template for the per-row uploading `<Progress>`. */
    uploadingAriaLabel: (params: { name: string }) => string;
    /**
     * Batch progress, announced from ONE region the FileUpload root owns.
     *
     * Per-row regions were the obvious shape and the wrong one: twelve files
     * resolving inside two seconds is twelve announcements. Counts are
     * formatted as `n / total` rather than "n files" so neither locale needs
     * plural agreement (#502).
     */
    batchUploading: (params: { done: number; total: number }) => string;
    /** Batch outcome, announced once the last transfer settles. */
    batchSettled: (params: { done: number; total: number; failed: number }) => string;
    /**
     * Remove-control name for a row that FAILED. The failure was plain text in
     * a non-focusable `<li>`, and the row's only focusable control was named
     * "Remove {file}" — so a user tabbing there later learned nothing about it.
     */
    removeFailedAriaLabel: (params: { name: string }) => string;
    /** Function leaf — aria-label template for the per-row remove (×) button. */
    removeAriaLabel: (params: { name: string }) => string;
  };
  flowCanvas: {
    /** aria-label for the canvas region when the consumer supplies none. */
    canvasLabel: string;
    /** Visually-hidden keyboard instructions referenced by aria-describedby. */
    instructions: string;
    /**
     * Instructions variant for readOnly canvases — navigation, open, and zoom
     * only; the editing cheat-sheet would contradict actual behavior.
     */
    instructionsReadOnly: string;
    /** aria-roledescription for node elements. */
    nodeRole: string;
    /** aria-roledescription for edge elements. */
    edgeRole: string;
    /** aria-label for the zoom-in control. */
    zoomIn: string;
    /** aria-label for the zoom-out control. */
    zoomOut: string;
    /** aria-label for the zoom-to-fit control. */
    zoomToFit: string;
    /** aria-label for an edge: "From X to Y". */
    edgeLabel: (params: { from: string; to: string }) => string;
    /** Live announcement when node focus moves. */
    nodeFocused: (params: { label: string; index: number; total: number }) => string;
    /** Live announcement when edge focus moves (E cycling). */
    edgeFocused: (params: { from: string; to: string; index: number; total: number }) => string;
    /** Live announcement when keyboard connect mode starts. */
    connectStart: (params: { label: string }) => string;
    /** Live announcement when the connect target changes. */
    connectTarget: (params: { label: string }) => string;
    /** Live announcement when an arrow press finds no valid target while connecting. */
    connectNoTarget: string;
    /** Live announcement when a connection is requested. */
    connectDone: (params: { from: string; to: string }) => string;
    /** Live announcement when connect mode is cancelled. */
    connectCancelled: string;
    /** Live announcement when keyboard rewire of the SOURCE endpoint starts (`Shift+R`). */
    rewireStartSource: string;
    /** Live announcement when keyboard rewire of the TARGET endpoint starts (`R`). */
    rewireStartTarget: string;
    /** Live announcement when an edge endpoint is rewired to a new node. */
    rewireDone: (params: { from: string; to: string }) => string;
    /** Live announcement after a node is moved (drag or keyboard nudge). */
    nodeMoved: (params: { label: string }) => string;
    /** Live announcement when the selection is cleared. */
    selectionCleared: string;
    /** Live announcement when the focused node/edge left the graph and focus returned to the canvas. */
    focusReturned: string;
    /** Live announcement after zooming. */
    zoomLevel: (params: { percent: number }) => string;
    /** aria-label for the maximize (enter-fullscreen) toggle. */
    enterFullscreen: string;
    /** aria-label for the restore (exit-fullscreen) toggle. */
    exitFullscreen: string;
    /** aria-label for the consumer controls toolbar (top-left slot). */
    controlsLabel: string;
    /** Live announcement when the canvas is maximized. */
    maximized: string;
    /** Live announcement when the canvas is restored from maximize. */
    restored: string;
  };
  imageCrop: {
    /** Shown in place of the image when it fails to load. */
    loadError: string;
    /** aria-label for the zoom slider. */
    zoom: string;
  };
  kanban: {
    /** aria-label for the Kanban scroll container (the board itself). */
    board: string;
    /**
     * Stand-in name for a column in drag announcements when the consumer gave
     * `<Kanban.Column>` no `aria-label`; `index` is 1-based in board order.
     */
    unnamedColumn: (params: { index: number; total: number }) => string;
  };
  modal: {
    /** aria-label for the Modal header's close button. */
    close: string;
  };
  toast: {
    /** aria-label for an individual toast's dismiss button. */
    dismiss: string;
    /** aria-label for the toast region (ToastViewport). */
    notifications: string;
  };
  breadcrumb: {
    /** aria-label fallback for the `<nav>` wrapping a Breadcrumb. */
    ariaLabel: string;
  };
  filterChip: {
    /** aria-label fallback for the per-chip dismiss (×) button. */
    dismiss: string;
  };
  entityChip: {
    /**
     * State word rendered visually hidden inside an `unavailable` `EntityChip`,
     * so the state reaches assistive tech instead of being carried by the muted
     * colour alone. It joins a LINKED chip's accessible name
     * ("Appointment (unavailable)"); a target-less chip is `role=generic`,
     * which has no accessible name, so there it is read as chip content.
     * Include the surrounding punctuation — other locales may want different
     * marks than English's parentheses.
     */
    unavailable: string;
    /**
     * Visually-hidden state word for a `loading` `EntityChip`. `aria-busy` is a
     * global ARIA state, so unlike `aria-disabled` it is valid on the chip's
     * role-less span and browsers do expose it — but no mainstream screen
     * reader reliably conveys `busy` on a non-live element, and the ellipsis is
     * `aria-hidden`. The label reached the user; the STATE did not. Include the
     * surrounding punctuation.
     *
     * Note this makes a loading chip's accessible name CHANGE when it resolves.
     * That is the cost of announcing a transient state at all; the alternative
     * is a consumer-owned `aria-live` region, which the chip cannot provide.
     */
    loading: string;
  };
  statusMenu: {
    /** aria-label prefix on the trigger, interpolated with the current status name. */
    changeStatus: string;
    /**
     * Announced from a polite live region while a status change is in flight.
     * The trigger's `aria-busy` is inert to screen readers, and the name is
     * deliberately NOT mutated here: the user is focused on the control they
     * just activated, so this is a change to announce, not a property of the
     * thing they arrived at.
     */
    busy: string;
  };
  pageHeader: {
    /** aria-label fallback for `<PageHeader.BackButton>`. */
    back: string;
  };
  rail: {
    /** aria-label on the CollapseToggle button when the rail is collapsed (pressing it expands). */
    expand: string;
    /** aria-label on the CollapseToggle button when the rail is expanded (pressing it collapses). */
    collapse: string;
    /** Default aria-label on the rail's wrapping `<nav>` landmark. */
    navigation: string;
    /**
     * aria-label prefix on a linkable `<Rail.Group>`'s chevron button while the
     * group is closed. Interpolated with the group's own label at the call site
     * (`Expand Deals`).
     */
    expandGroup: string;
    /**
     * aria-label prefix on a linkable `<Rail.Group>`'s chevron button while the
     * group is open. Interpolated with the group's own label at the call site
     * (`Collapse Deals`).
     */
    collapseGroup: string;
  };
  topBar: {
    /** Default aria-label on the wrapping `<header>` landmark. */
    label: string;
    /** Default aria-label on the `<TopBar.Search>` input when neither `aria-label` nor `placeholder` is set. */
    search: string;
  };
  field: {
    /** Marker appended to a Field's label when the field is optional. */
    optional: string;
  };
  liquidEditor: {
    /** Toolbar button label that opens the variable-insert menu. */
    insertVariable: string;
    /** Empty-state copy when there are no variables to insert / suggest. */
    noVariables: string;
    /** Label for the preview pane + its show/hide toggle. */
    preview: string;
    /** Copy shown in the preview pane while the consumer is rendering. */
    previewRendering: string;
    /** Copy shown in the preview pane when rendering failed. */
    previewError: string;
    /** Function leaf — footer warning naming an unknown variable. */
    unknownVariable: (params: { name: string }) => string;
    /** Default aria-label on the editor textarea when none is supplied. */
    editorLabel: string;
    /** aria-label on the autocomplete suggestion listbox. */
    suggestions: string;
    /** Muted tag marking a collection (array) variable in menus. */
    collectionTag: string;
  };
  richTextEditor: {
    /** Default aria-label for the editable region when none is supplied. */
    editorLabel: string;
    /** aria-label on the formatting toolbar (`role="toolbar"`). */
    toolbar: string;
    /** aria-label on the block-type dropdown trigger. */
    blockType: string;
    /** Block-type menu item + trigger label for a normal paragraph. */
    paragraph: string;
    /** Block-type menu item + trigger label for a level-1 heading. */
    heading1: string;
    /** Block-type menu item + trigger label for a level-2 heading. */
    heading2: string;
    /** Block-type menu item + trigger label for a level-3 heading. */
    heading3: string;
    /** Block-type menu item + trigger label for a blockquote. */
    blockquote: string;
    /** Block-type menu item + trigger label for a code block. */
    codeBlock: string;
    /** Block-type trigger label when the selection spans mixed block types. */
    mixed: string;
    /** aria-label on the bold mark toggle button. */
    bold: string;
    /** aria-label on the italic mark toggle button. */
    italic: string;
    /** aria-label on the underline mark toggle button. */
    underline: string;
    /** aria-label on the strikethrough mark toggle button. */
    strike: string;
    /** aria-label on the bullet-list toggle button. */
    bulletList: string;
    /** aria-label on the numbered-list toggle button. */
    orderedList: string;
    /** aria-label on the toolbar Link button. */
    link: string;
    /** Emoji-insert toolbar button. */
    emoji: string;
    /** Label (aria) for the URL field in the link bubble. */
    linkUrl: string;
    /** Placeholder for the URL field in the link bubble. */
    linkUrlPlaceholder: string;
    /** Apply button in the link bubble. */
    linkApply: string;
    /** Remove-link button in the link bubble (shown when editing a link). */
    linkRemove: string;
    /** Accessible name for the link bubble's form group. */
    linkEditorLabel: string;
    /** aria-label on the toolbar Undo button. */
    undo: string;
    /** aria-label on the toolbar Redo button. */
    redo: string;
    /** Accessible name for the mentions autocomplete listbox. */
    mentionsLabel: string;
    /** Empty-state row when no mention candidates match. */
    mentionsEmpty: string;
    /** aria-label on the block "insert below" (＋) gutter button. */
    blockInsert: string;
    /** aria-label on the block actions (⠿) gutter handle. */
    blockActions: string;
    /** "Turn into" submenu label in the block menu. */
    blockTurnInto: string;
    /** "Duplicate" item in the block menu. */
    blockDuplicate: string;
    /** "Move up" item in the block menu. */
    blockMoveUp: string;
    /** "Move down" item in the block menu. */
    blockMoveDown: string;
    /** "Delete" item in the block menu. */
    blockDelete: string;
    /** aria-label on the toolbar upload button. */
    upload: string;
    /** Spinner aria-label while a file uploads. */
    uploadingFile: string;
    /** Error-state label when an upload fails. */
    uploadFailed: string;
    /** Retry action on a failed upload. */
    uploadRetry: string;
    /** Remove action on a failed upload. */
    uploadRemove: string;
    /** "Configure" block-menu item label + config-popover aria-label. */
    attachmentConfigure: string;
    /** Alt-text field label. */
    attachmentAlt: string;
    /** Alignment group label. */
    attachmentAlign: string;
    /** Align-left button aria-label. */
    attachmentAlignLeft: string;
    /** Align-center button aria-label. */
    attachmentAlignCenter: string;
    /** Align-right button aria-label. */
    attachmentAlignRight: string;
    /** Width slider label. */
    attachmentWidth: string;
    /** Reset-width button. */
    attachmentWidthReset: string;
    /** Image resize-handle tooltip. */
    attachmentResize: string;
    /** Replace-file button. */
    attachmentReplace: string;
    /** Open-in-new-tab link. */
    attachmentOpen: string;
    /** Download-file link. */
    attachmentDownload: string;
    /** aria-label on the Text-color toolbar button / block submenu + the text-color menu's group label. */
    textColor: string;
    /** aria-label on the Highlight toolbar button / block submenu + the highlight menu's group label. */
    highlight: string;
    /** aria-label on the Default/clear color badge (resets to the default color). */
    colorClear: string;
    /** aria-label on the gray default color badge. */
    colorGray: string;
    /** aria-label on the red palette color badge. */
    colorRed: string;
    /** aria-label on the coral palette color badge. */
    colorCoral: string;
    /** aria-label on the orange palette color badge. */
    colorOrange: string;
    /** aria-label on the amber palette color badge. */
    colorAmber: string;
    /** aria-label on the gold palette color badge. */
    colorGold: string;
    /** aria-label on the yellow palette color badge. */
    colorYellow: string;
    /** aria-label on the olive palette color badge. */
    colorOlive: string;
    /** aria-label on the lime palette color badge. */
    colorLime: string;
    /** aria-label on the green palette color badge. */
    colorGreen: string;
    /** aria-label on the emerald palette color badge. */
    colorEmerald: string;
    /** aria-label on the mint palette color badge. */
    colorMint: string;
    /** aria-label on the teal palette color badge. */
    colorTeal: string;
    /** aria-label on the cyan palette color badge. */
    colorCyan: string;
    /** aria-label on the sky palette color badge. */
    colorSky: string;
    /** aria-label on the blue palette color badge. */
    colorBlue: string;
    /** aria-label on the navy palette color badge. */
    colorNavy: string;
    /** aria-label on the indigo palette color badge. */
    colorIndigo: string;
    /** aria-label on the violet palette color badge. */
    colorViolet: string;
    /** aria-label on the lavender palette color badge. */
    colorLavender: string;
    /** aria-label on the purple palette color badge. */
    colorPurple: string;
    /** aria-label on the plum palette color badge. */
    colorPlum: string;
    /** aria-label on the fuchsia palette color badge. */
    colorFuchsia: string;
    /** aria-label on the magenta palette color badge. */
    colorMagenta: string;
    /** aria-label on the pink palette color badge. */
    colorPink: string;
    /** aria-label on the rose palette color badge. */
    colorRose: string;
    /** aria-label on the brown palette color badge. */
    colorBrown: string;
    /** aria-label on the taupe palette color badge. */
    colorTaupe: string;
    /** aria-label on the slate palette color badge. */
    colorSlate: string;
    /** aria-label on the stone palette color badge. */
    colorStone: string;
    /** aria-label on the charcoal palette color badge. */
    colorCharcoal: string;
  };
}

/** Supported locale codes. v1 ships English and Russian. */
export type Locale = 'en' | 'ru';

/**
 * Recursive deep-partial. Preserves function leaves untouched (a partial
 * override of a function leaf would be meaningless) and treats arrays as
 * atomic (the consumer either replaces the whole array or leaves the default).
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends readonly unknown[]
      ? T[K]
      : T[K] extends object
        ? DeepPartial<T[K]>
        : T[K];
};

type Leaf = string | ((...args: never[]) => string) | readonly string[];

/**
 * All valid dotted message keys derived from the `Messages` interface.
 *
 * While `Messages` is empty this resolves to `never` — `t()` accepts no keys
 * until components start populating the interface. Each new namespace
 * automatically widens the `MessageKey` union with no extra plumbing.
 */
export type MessageKey<T = Messages> = T extends Leaf
  ? ''
  : {
      [K in keyof T & string]: T[K] extends Leaf ? K : `${K}.${MessageKey<T[K]>}`;
    }[keyof T & string];
