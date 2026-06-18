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
