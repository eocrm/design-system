import { pointFromDom, pointToDom } from './selection';

// Build: <div root><p data-block-id="a">He<strong>ll</strong>o</p><p data-block-id="b"><br></p></div>
function buildRoot(): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = '<p data-block-id="a">He<strong>ll</strong>o</p><p data-block-id="b"><br></p>';
  document.body.appendChild(root);
  return root;
}

describe('selection mapping', () => {
  it('pointFromDom: a text node + offset → {blockId, offset} summing prior text', () => {
    const root = buildRoot();
    const strongText = root.querySelector('strong')!.firstChild!; // "ll"
    expect(pointFromDom(root, strongText, 1)).toEqual({ blockId: 'a', offset: 3 }); // "He" + 1 into "ll"
    const firstText = root.querySelector('[data-block-id="a"]')!.firstChild!; // "He"
    expect(pointFromDom(root, firstText, 2)).toEqual({ blockId: 'a', offset: 2 });
    root.remove();
  });

  it('pointFromDom: empty block (block element, 0) → offset 0', () => {
    const root = buildRoot();
    const emptyBlock = root.querySelector('[data-block-id="b"]')!;
    expect(pointFromDom(root, emptyBlock, 0)).toEqual({ blockId: 'b', offset: 0 });
    root.remove();
  });

  it('pointFromDom: element-node boundaries (child-index offsets) map correctly', () => {
    // block "a" = "He" + <strong>"ll"</strong> + "o". Browsers produce element
    // anchors (e.g. caret at an inline edge), not only text-node anchors.
    const root = buildRoot();
    const p = root.querySelector('[data-block-id="a"]') as HTMLElement;
    expect(pointFromDom(root, p, 1)).toEqual({ blockId: 'a', offset: 2 }); // before <strong>
    expect(pointFromDom(root, p, 2)).toEqual({ blockId: 'a', offset: 4 }); // before "o"
    const strong = root.querySelector('strong') as HTMLElement;
    expect(pointFromDom(root, strong, 0)).toEqual({ blockId: 'a', offset: 2 }); // start of "ll"
    expect(pointFromDom(root, strong, 1)).toEqual({ blockId: 'a', offset: 4 }); // end of "ll"
    root.remove();
  });

  it('pointToDom: {blockId, offset} → the text node + local offset', () => {
    const root = buildRoot();
    const r = pointToDom(root, { blockId: 'a', offset: 3 })!;
    expect(r.node.textContent).toBe('ll');
    expect(r.offset).toBe(1);
    root.remove();
  });

  it('pointToDom round-trips with pointFromDom', () => {
    const root = buildRoot();
    const dom = pointToDom(root, { blockId: 'a', offset: 4 })!; // after "Hell"
    expect(pointFromDom(root, dom.node, dom.offset)).toEqual({ blockId: 'a', offset: 4 });
    root.remove();
  });

  it('pointFromDom returns null outside any block', () => {
    const root = buildRoot();
    const outside = document.createElement('span');
    document.body.appendChild(outside);
    expect(pointFromDom(root, outside, 0)).toBeNull();
    outside.remove();
    root.remove();
  });
});

// An atomic [data-rich-link] widget renders DISPLAY text ("#1 Task", 7 chars) but
// represents `data-len` MODEL chars (13, e.g. the URL "https://a/t/1"). The
// caret can only sit BEFORE or AFTER it (contenteditable=false), never inside.
//   <p data-block-id="b1">hi <span data-rich-link data-len="13" …>#1 Task</span> end</p>
//   model: "hi " (3) + widget (13) + " end" (4) = 20 model chars total.
function buildWidgetRoot(): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML =
    '<p data-block-id="b1">hi <span data-rich-link data-len="13" contenteditable="false">#1 Task</span> end</p>';
  document.body.appendChild(root);
  return root;
}

describe('selection mapping — atomic [data-rich-link] widget', () => {
  it('pointFromDom: counts the widget as data-len (13), not its 7 display chars', () => {
    const root = buildWidgetRoot();
    const p = root.querySelector('[data-block-id="b1"]') as HTMLElement;
    const lead = p.firstChild as Text; // "hi "
    const trail = p.lastChild as Text; // " end"

    // caret just before the widget → end of "hi " (3 model chars)
    expect(pointFromDom(root, lead, 3)).toEqual({ blockId: 'b1', offset: 3 });
    // element-node boundary: <p> at child index 1 (between "hi " and the widget)
    expect(pointFromDom(root, p, 1)).toEqual({ blockId: 'b1', offset: 3 });

    // caret just after the widget → 3 + 13 = 16 (NOT 3 + 7 = 10)
    expect(pointFromDom(root, trail, 0)).toEqual({ blockId: 'b1', offset: 16 });
    // element-node boundary: <p> at child index 2 (just after the widget)
    expect(pointFromDom(root, p, 2)).toEqual({ blockId: 'b1', offset: 16 });

    // caret at the very end of " end" → 16 + 4 = 20
    expect(pointFromDom(root, trail, 4)).toEqual({ blockId: 'b1', offset: 20 });
    root.remove();
  });

  it('pointToDom: widget-boundary offsets map adjacent to the widget, never inside', () => {
    const root = buildWidgetRoot();
    const p = root.querySelector('[data-block-id="b1"]') as HTMLElement;
    const lead = p.firstChild as Text; // "hi "
    const widget = p.querySelector('[data-rich-link]') as HTMLElement;
    const trail = p.lastChild as Text; // " end"
    const widgetIndex = Array.prototype.indexOf.call(p.childNodes, widget); // 1

    // offset 3 → before the widget. Either end of "hi " text OR <p> at widget index.
    const before = pointToDom(root, { blockId: 'b1', offset: 3 })!;
    if (before.node === lead) {
      expect(before.offset).toBe(3); // end of "hi "
    } else {
      expect(before.node).toBe(p);
      expect(before.offset).toBe(widgetIndex); // before the widget child
    }
    // critically: it does NOT point inside the widget
    expect(widget.contains(before.node)).toBe(false);

    // offset 16 → after the widget: <p> at the index just past the widget,
    // or the start of the trailing text node.
    const after = pointToDom(root, { blockId: 'b1', offset: 16 })!;
    expect(widget.contains(after.node)).toBe(false);
    if (after.node === trail) {
      expect(after.offset).toBe(0); // start of " end"
    } else {
      expect(after.node).toBe(p);
      expect(after.offset).toBe(widgetIndex + 1); // just after the widget child
    }

    // offset 20 → end of the trailing " end" text node
    const end = pointToDom(root, { blockId: 'b1', offset: 20 })!;
    expect(end.node).toBe(trail);
    expect(end.offset).toBe(4);
    root.remove();
  });

  it('pointFromDom/pointToDom round-trip across the widget boundary', () => {
    const root = buildWidgetRoot();
    for (const offset of [0, 3, 16, 18, 20]) {
      const dom = pointToDom(root, { blockId: 'b1', offset })!;
      expect(pointFromDom(root, dom.node, dom.offset)).toEqual({ blockId: 'b1', offset });
    }
    root.remove();
  });
});

// An atomic [data-rich-mention] widget (a `renderMention` substitution) behaves
// identically to a [data-rich-link] widget: it renders DISPLAY text but represents
// `data-len` MODEL chars and the caret can only sit BEFORE or AFTER it.
//   <p data-block-id="b1">hi <span data-rich-mention data-len="6" …>@A</span> end</p>
//   model: "hi " (3) + widget (6, "@Alice") + " end" (4) = 13 model chars total.
function buildMentionWidgetRoot(): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML =
    '<p data-block-id="b1">hi <span data-rich-mention data-len="6" contenteditable="false">@A</span> end</p>';
  document.body.appendChild(root);
  return root;
}

describe('selection mapping — atomic [data-rich-mention] widget', () => {
  it('pointFromDom: counts the widget as data-len (6), not its 2 display chars', () => {
    const root = buildMentionWidgetRoot();
    const p = root.querySelector('[data-block-id="b1"]') as HTMLElement;
    const lead = p.firstChild as Text; // "hi "
    const trail = p.lastChild as Text; // " end"

    // caret just before the widget → end of "hi " (3 model chars)
    expect(pointFromDom(root, lead, 3)).toEqual({ blockId: 'b1', offset: 3 });
    expect(pointFromDom(root, p, 1)).toEqual({ blockId: 'b1', offset: 3 });

    // caret just after the widget → 3 + 6 = 9 (NOT 3 + 2 = 5)
    expect(pointFromDom(root, trail, 0)).toEqual({ blockId: 'b1', offset: 9 });
    expect(pointFromDom(root, p, 2)).toEqual({ blockId: 'b1', offset: 9 });

    // caret at the very end of " end" → 9 + 4 = 13
    expect(pointFromDom(root, trail, 4)).toEqual({ blockId: 'b1', offset: 13 });
    root.remove();
  });

  it('pointToDom: widget-boundary offsets map adjacent to the widget, never inside', () => {
    const root = buildMentionWidgetRoot();
    const p = root.querySelector('[data-block-id="b1"]') as HTMLElement;
    const lead = p.firstChild as Text; // "hi "
    const widget = p.querySelector('[data-rich-mention]') as HTMLElement;
    const trail = p.lastChild as Text; // " end"
    const widgetIndex = Array.prototype.indexOf.call(p.childNodes, widget); // 1

    const before = pointToDom(root, { blockId: 'b1', offset: 3 })!;
    if (before.node === lead) {
      expect(before.offset).toBe(3);
    } else {
      expect(before.node).toBe(p);
      expect(before.offset).toBe(widgetIndex);
    }
    expect(widget.contains(before.node)).toBe(false);

    const after = pointToDom(root, { blockId: 'b1', offset: 9 })!;
    expect(widget.contains(after.node)).toBe(false);
    if (after.node === trail) {
      expect(after.offset).toBe(0);
    } else {
      expect(after.node).toBe(p);
      expect(after.offset).toBe(widgetIndex + 1);
    }

    const end = pointToDom(root, { blockId: 'b1', offset: 13 })!;
    expect(end.node).toBe(trail);
    expect(end.offset).toBe(4);
    root.remove();
  });

  it('pointFromDom/pointToDom round-trip across the widget boundary', () => {
    const root = buildMentionWidgetRoot();
    for (const offset of [0, 3, 9, 11, 13]) {
      const dom = pointToDom(root, { blockId: 'b1', offset })!;
      expect(pointFromDom(root, dom.node, dom.offset)).toEqual({ blockId: 'b1', offset });
    }
    root.remove();
  });
});

function makeRoot(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

describe('void-block selection', () => {
  const HTML =
    '<p data-block-id="p">hi</p><figure data-block-id="v" contenteditable="false"></figure>';
  it('a selection ON the figure maps to {figureId, 0}', () => {
    const r = makeRoot(HTML);
    const fig = r.querySelector('[data-block-id="v"]')!;
    expect(pointFromDom(r, fig, 0)).toEqual({ blockId: 'v', offset: 0 });
  });
  it('a root-level caret at the figure index maps to the void {id,0}', () => {
    const r = makeRoot(HTML);
    // child index 1 is the figure; a caret at root offset 1 sits just before it
    expect(pointFromDom(r, r, 1)).toEqual({ blockId: 'v', offset: 0 });
  });
  it('a root-level caret just AFTER the figure also maps to the void {id,0}', () => {
    const r = makeRoot(HTML);
    // offset 2 == after the figure (figure is the last child, index 1)
    expect(pointFromDom(r, r, 2)).toEqual({ blockId: 'v', offset: 0 });
  });
  it('pointToDom for a void returns a position just before the figure', () => {
    const r = makeRoot(HTML);
    const fig = r.querySelector('[data-block-id="v"]')!;
    const figIndex = Array.prototype.indexOf.call(r.childNodes, fig);
    const dom = pointToDom(r, { blockId: 'v', offset: 0 })!;
    expect(dom.node).toBe(r);
    expect(dom.offset).toBe(figIndex);
  });
  it('still maps a normal text block correctly (no regression)', () => {
    const r = makeRoot(HTML);
    const textNode = r.querySelector('[data-block-id="p"]')!.firstChild!;
    expect(pointFromDom(r, textNode, 1)).toEqual({ blockId: 'p', offset: 1 });
  });
  it('resolves a figure that is the FIRST child at root offset 0', () => {
    const r = makeRoot(
      '<figure data-block-id="v" contenteditable="false"></figure><p data-block-id="p">hi</p>',
    );
    // offset 0 → kids[-1] is undefined; figureBlock must fall back to kids[0]
    expect(pointFromDom(r, r, 0)).toEqual({ blockId: 'v', offset: 0 });
  });
  it('prefers the FOLLOWING figure when a caret sits between two voids', () => {
    const r = makeRoot(
      '<figure data-block-id="v1" contenteditable="false"></figure><figure data-block-id="v2" contenteditable="false"></figure>',
    );
    // root offset 1: kids[1]=v2 (after), kids[0]=v1 (before) → prefer v2
    expect(pointFromDom(r, r, 1)).toEqual({ blockId: 'v2', offset: 0 });
  });
  it('a caret on a figure DESCENDANT ascends to the void {id,0}', () => {
    const r = makeRoot(
      '<figure data-block-id="v" contenteditable="false"><span>img</span></figure>',
    );
    const inner = r.querySelector('span')!;
    expect(pointFromDom(r, inner, 0)).toEqual({ blockId: 'v', offset: 0 });
  });
  it('pointToDom → pointFromDom round-trips a void point', () => {
    const r = makeRoot(HTML);
    const dom = pointToDom(r, { blockId: 'v', offset: 0 })!;
    expect(pointFromDom(r, dom.node, dom.offset)).toEqual({ blockId: 'v', offset: 0 });
  });
});
