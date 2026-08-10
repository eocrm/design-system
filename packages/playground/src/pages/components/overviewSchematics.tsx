import type { CSSProperties, ReactNode } from 'react';
import styles from './overviewSchematics.module.scss';

// ---------------------------------------------------------------------------
// Vocabulary — the only building blocks schematics are drawn from.
// Blueprint-accent language: tinted shapes sketch structure; exactly ONE
// solid-accent element per schematic marks the component's key affordance.
// ---------------------------------------------------------------------------

type Dim = number | string;

interface ShapeProps {
  /** Width — number = px, string passthrough ('70%'). */
  w?: Dim;
  /** Height — number = px, string passthrough. */
  h?: Dim;
  /** Positional / clip-path / transform tweaks only — never colors. */
  style?: CSSProperties;
  children?: ReactNode;
}

function dim(v: Dim | undefined): string | number | undefined {
  return typeof v === 'number' ? v : v;
}

function shape(className: string) {
  return function Shape({ w, h, style, children }: ShapeProps) {
    return (
      <span
        className={className}
        style={{ width: dim(w), height: dim(h), ...style }}
        aria-hidden="true"
      >
        {children}
      </span>
    );
  };
}

/** Tinted structural fill. */
export const Box = shape(styles.box);
/** Solid accent — THE focal element; exactly one per schematic. */
export const Solid = shape(styles.solid);
/** Plain surface (bg + neutral border) — inputs, cards, rows. */
export const Outline = shape(styles.outline);
/** Elevated surface (surface + shadow) — modals, popovers, menus. */
export const Panel = shape(styles.panel);
/** Dashed accent region — slots, columns, dropzones, layout frames. */
export const Dashed = shape(styles.dashed);

interface FlexProps {
  gap?: number;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Horizontal group. */
export function Row({ gap = 6, style, children }: FlexProps) {
  return (
    <span className={styles.row} style={{ gap, ...style }} aria-hidden="true">
      {children}
    </span>
  );
}

/** Vertical group. */
export function Col({ gap = 6, style, children }: FlexProps) {
  return (
    <span className={styles.col} style={{ gap, ...style }} aria-hidden="true">
      {children}
    </span>
  );
}

/** 5px tinted text line. */
export function Bar({ w = 40, style }: ShapeProps) {
  return <Box w={w} h={5} style={style} />;
}

/** 5px accent text line — counts as the focal element. */
export function SolidBar({ w = 40, style }: ShapeProps) {
  return <Solid w={w} h={5} style={style} />;
}

/** 8px circle; `solid` makes it the accent focal element. */
export function Dot({
  solid = false,
  size = 8,
  style,
}: {
  solid?: boolean;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`${styles.dot} ${solid ? styles.solid : styles.box}`}
      style={{ width: size, height: size, borderRadius: 'var(--radius-full)', ...style }}
      aria-hidden="true"
    />
  );
}

/** 16px rounded-full tinted chip. */
export function Pill({ w = 40, style }: ShapeProps) {
  return (
    <span
      className={styles.pill}
      style={{ width: dim(w), height: 16, ...style }}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// SCHEMATICS — one drawing per overview card, keyed by the card's `name`.
// Populated per batch; every schematic fits within 230x110.
// ---------------------------------------------------------------------------

export const SCHEMATICS: Record<string, ReactNode> = {
  Accordion: (
    <Col gap={4} style={{ width: 190 }}>
      <Outline
        w="100%"
        h={22}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 6px',
        }}
      >
        <Bar w={70} />
        <Solid w={10} h={6} style={{ clipPath: 'polygon(0 0,100% 0,50% 100%)', borderRadius: 0 }} />
      </Outline>
      <Col gap={4} style={{ padding: '2px 6px' }}>
        <Bar w={130} />
        <Bar w={100} />
      </Col>
      <Outline
        w="100%"
        h={22}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 6px',
        }}
      >
        <Bar w={54} />
        <Box w={8} h={5} style={{ clipPath: 'polygon(0 0,100% 0,50% 100%)', borderRadius: 0 }} />
      </Outline>
      <Outline
        w="100%"
        h={22}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 6px',
        }}
      >
        <Bar w={62} />
        <Box w={8} h={5} style={{ clipPath: 'polygon(0 0,100% 0,50% 100%)', borderRadius: 0 }} />
      </Outline>
    </Col>
  ),
  Alert: (
    <Row>
      <Outline
        w={200}
        h={44}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Solid w={4} h="100%" style={{ position: 'absolute', top: 0, left: 0, borderRadius: 0 }} />
        <Dot size={12} />
        <Col gap={4}>
          <Bar w={90} />
          <Bar w={60} />
        </Col>
      </Outline>
    </Row>
  ),
  Button: (
    <Row gap={8}>
      <Solid w={64} h={26} />
      <Outline
        w={64}
        h={26}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Bar w={30} />
      </Outline>
      <Outline
        w={46}
        h={20}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Bar w={20} />
      </Outline>
    </Row>
  ),
  SocialButton: (
    <Row>
      <Outline
        w={190}
        h={32}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
      >
        <Dot solid size={12} />
        <Bar w={90} />
      </Outline>
    </Row>
  ),
  ButtonGroup: (
    <Row style={{ gap: 0 }}>
      <Solid w={48} h={24} style={{ borderRadius: '6px 0 0 6px' }} />
      <Outline
        w={48}
        h={24}
        style={{ borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Bar w={22} />
      </Outline>
      <Outline
        w={48}
        h={24}
        style={{
          borderRadius: '0 6px 6px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bar w={22} />
      </Outline>
    </Row>
  ),
  'Date pickers': (
    <Col gap={6}>
      <Outline
        w={118}
        h={20}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px' }}
      >
        <Box w={8} h={8} />
        <Bar w={54} />
      </Outline>
      <Panel w={118} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 8 }}>
        <Row gap={4}>
          <Box w={10} h={8} />
          <Box w={10} h={8} />
          <Box w={10} h={8} />
          <Box w={10} h={8} />
          <Box w={10} h={8} />
          <Box w={10} h={8} />
          <Box w={10} h={8} />
        </Row>
        <Row gap={4}>
          <Box w={10} h={8} />
          <Box w={10} h={8} />
          <Solid w={38} h={8} style={{ borderRadius: 999 }} />
          <Box w={10} h={8} />
          <Box w={10} h={8} />
        </Row>
        <Row gap={4}>
          <Box w={10} h={8} />
          <Box w={10} h={8} />
          <Box w={10} h={8} />
          <Box w={10} h={8} />
          <Box w={10} h={8} />
          <Box w={10} h={8} />
          <Box w={10} h={8} />
        </Row>
      </Panel>
    </Col>
  ),
  EmptyState: (
    <Col gap={6} style={{ alignItems: 'center' }}>
      <Box w={24} h={24} style={{ borderRadius: '50%' }} />
      <Bar w={70} />
      <Bar w={110} />
      <Solid w={60} h={18} style={{ marginTop: 2 }} />
    </Col>
  ),
  ErrorState: (
    <Col gap={6} style={{ alignItems: 'center' }}>
      <Dashed w={24} h={24} style={{ borderRadius: '50%' }} />
      <Bar w={84} />
      <Row gap={6}>
        <Solid w={52} h={16} />
        <Outline
          w={52}
          h={16}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Bar w={24} />
        </Outline>
      </Row>
      <Pill w={64} style={{ height: 10 }} />
    </Col>
  ),
  Screen: (
    <Row>
      <Dashed
        w={210}
        h={100}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Col gap={4} style={{ alignItems: 'center' }}>
          <Bar w={64} />
          <Bar w={44} />
          <Solid w={44} h={12} style={{ marginTop: 4 }} />
        </Col>
      </Dashed>
    </Row>
  ),
  FileUpload: (
    <Col gap={6} style={{ width: 190 }}>
      <Dashed
        w="100%"
        h={48}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
        }}
      >
        <Solid
          w={16}
          h={10}
          style={{ clipPath: 'polygon(50% 0,100% 100%,0 100%)', borderRadius: 0 }}
        />
        <Bar w={70} />
      </Dashed>
      <Outline
        w="100%"
        h={24}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px' }}
      >
        <Box w={10} h={12} />
        <Bar w={48} />
        <Outline
          w={48}
          h={8}
          style={{ display: 'flex', marginLeft: 'auto', borderRadius: 999, overflow: 'hidden' }}
        >
          <Box w={26} h="100%" style={{ borderRadius: 0 }} />
        </Outline>
      </Outline>
    </Col>
  ),
  ImageCrop: (
    <Col gap={8} style={{ alignItems: 'center' }}>
      <Box
        w={150}
        h={66}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Dashed w={40} h={40} />
      </Box>
      <Row style={{ gap: 0, alignItems: 'center' }}>
        <Box w={60} h={4} style={{ borderRadius: 0 }} />
        <Dot solid size={10} />
        <Box w={60} h={4} style={{ borderRadius: 0 }} />
      </Row>
    </Col>
  ),
  IconTile: (
    <Row gap={8}>
      <Solid
        w={32}
        h={32}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Outline w={12} h={12} style={{ borderRadius: '50%' }} />
      </Solid>
      <Box
        w={32}
        h={32}
        style={{
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Outline w={12} h={12} style={{ borderRadius: '50%' }} />
      </Box>
      <Box
        w={32}
        h={32}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Outline w={12} h={12} style={{ borderRadius: '50%' }} />
      </Box>
    </Row>
  ),
  Image: (
    <Row>
      <Outline w={150} h={86} style={{ position: 'relative', overflow: 'hidden' }}>
        <Dot solid size={14} style={{ position: 'absolute', top: 12, right: 18 }} />
        <Box
          w={80}
          h={44}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 12,
            clipPath: 'polygon(50% 0,100% 100%,0 100%)',
            borderRadius: 0,
          }}
        />
        <Box
          w={56}
          h={30}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 10,
            clipPath: 'polygon(50% 0,100% 100%,0 100%)',
            borderRadius: 0,
          }}
        />
      </Outline>
    </Row>
  ),
  MediaTile: (
    <Row>
      <Outline w={96} h={92} style={{ position: 'relative', overflow: 'hidden' }}>
        <Box
          w={56}
          h={30}
          style={{
            position: 'absolute',
            bottom: 26,
            left: 20,
            clipPath: 'polygon(50% 0,100% 100%,0 100%)',
            borderRadius: 0,
          }}
        />
        <Row gap={4} style={{ position: 'absolute', top: 7, left: 7 }}>
          <SolidBar w={34} />
          <Bar w={16} />
        </Row>
        <Row
          gap={6}
          style={{
            position: 'absolute',
            bottom: 7,
            left: 0,
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <Dot size={7} />
          <Dot size={7} />
          <Dot size={7} />
        </Row>
      </Outline>
    </Row>
  ),
  Input: (
    <Row>
      <Outline
        w={180}
        h={30}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px' }}
      >
        <Bar w={64} />
        <Solid w={2} h={14} style={{ borderRadius: 0 }} />
      </Outline>
    </Row>
  ),
  LiquidEditor: (
    <Outline w={210} style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 6 }}>
      <Row gap={6} style={{ alignItems: 'center', width: '100%' }}>
        <Bar w={26} />
        <Box w={38} h={10} style={{ marginLeft: 'auto' }} />
      </Row>
      <Row gap={6}>
        <Col gap={5}>
          <Bar w={6} />
          <Bar w={6} />
          <Bar w={6} />
        </Col>
        <Col gap={5}>
          <Row gap={4}>
            <Bar w={28} />
            <SolidBar w={34} />
            <Bar w={18} />
          </Row>
          <Bar w={90} />
          <Row gap={4}>
            <Bar w={44} />
            <Box w={26} h={5} />
          </Row>
        </Col>
      </Row>
      <Dashed w="100%" h={22} style={{ display: 'flex', alignItems: 'center', padding: 6 }}>
        <Bar w={70} />
      </Dashed>
    </Outline>
  ),
  Kbd: (
    <Col gap={8} style={{ alignItems: 'flex-start' }}>
      <Row gap={4} style={{ alignItems: 'center' }}>
        <Solid w={16} h={12} style={{ borderRadius: 3 }} />
        <Box
          w={7}
          h={7}
          style={{
            clipPath:
              'polygon(40% 0,60% 0,60% 40%,100% 40%,100% 60%,60% 60%,60% 100%,40% 100%,40% 60%,0 60%,0 40%,40% 40%)',
          }}
        />
        <Outline w={16} h={12} />
      </Row>
      <Row gap={4} style={{ alignItems: 'center' }}>
        <Outline w={24} h={17} />
        <Box
          w={8}
          h={8}
          style={{
            clipPath:
              'polygon(40% 0,60% 0,60% 40%,100% 40%,100% 60%,60% 60%,60% 100%,40% 100%,40% 60%,0 60%,0 40%,40% 40%)',
          }}
        />
        <Outline w={24} h={17} />
        <Box
          w={8}
          h={8}
          style={{
            clipPath:
              'polygon(40% 0,60% 0,60% 40%,100% 40%,100% 60%,60% 60%,60% 100%,40% 100%,40% 60%,0 60%,0 40%,40% 40%)',
          }}
        />
        <Outline w={30} h={17} />
      </Row>
    </Col>
  ),
  Pagination: (
    <Row gap={6} style={{ alignItems: 'center' }}>
      <Box w={8} h={10} style={{ clipPath: 'polygon(100% 0,100% 100%,0 50%)' }} />
      <Outline w={20} h={20} />
      <Solid w={20} h={20} />
      <Outline w={20} h={20} />
      <Dot size={3} />
      <Dot size={3} />
      <Dot size={3} />
      <Outline w={20} h={20} />
      <Box w={8} h={10} style={{ clipPath: 'polygon(0 0,0 100%,100% 50%)' }} />
    </Row>
  ),
  Palette: (
    <Col gap={4}>
      <Row gap={4}>
        <Box w={16} h={16} />
        <Box w={16} h={16} />
        <Box w={16} h={16} />
        <Box w={16} h={16} />
        <Box w={16} h={16} />
        <Box w={16} h={16} />
        <Box w={16} h={16} />
        <Box w={16} h={16} />
      </Row>
      <Row gap={4}>
        <Box w={16} h={16} />
        <Box w={16} h={16} />
        <Solid w={16} h={16} />
        <Box w={16} h={16} />
        <Box w={16} h={16} />
        <Box w={16} h={16} />
        <Box w={16} h={16} />
        <Box w={16} h={16} />
      </Row>
      <Row gap={4}>
        <Box w={16} h={16} />
        <Box w={16} h={16} />
        <Box w={16} h={16} />
        <Box w={16} h={16} />
        <Box w={16} h={16} />
        <Box w={16} h={16} />
        <Box w={16} h={16} />
        <Box w={16} h={16} />
      </Row>
    </Col>
  ),
  PersonDisplay: (
    <Row gap={8} style={{ alignItems: 'center' }}>
      <Dot solid size={30} />
      <Col gap={5}>
        <Bar w={64} />
        <Bar w={44} />
      </Col>
    </Row>
  ),
  PasswordInput: (
    <Outline
      w={170}
      h={32}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8 }}
    >
      <Row gap={4}>
        <Dot size={5} />
        <Dot size={5} />
        <Dot size={5} />
        <Dot size={5} />
        <Dot size={5} />
      </Row>
      <Outline
        w={24}
        h={16}
        style={{
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Dot solid size={8} />
      </Outline>
    </Outline>
  ),
  PasswordStrengthMeter: (
    <Col gap={6} style={{ alignItems: 'flex-start' }}>
      <Row gap={4}>
        <Solid w={36} h={6} style={{ borderRadius: 999 }} />
        <Box w={36} h={6} style={{ borderRadius: 999 }} />
        <Box w={36} h={6} style={{ borderRadius: 999 }} />
        <Outline w={36} h={6} style={{ borderRadius: 999 }} />
      </Row>
      <Bar w={44} />
    </Col>
  ),
  PhoneInput: (
    <Outline w={190} h={32} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 8 }}>
      <Solid w={20} h={13} style={{ borderRadius: 2 }} />
      <Box w={8} h={5} style={{ clipPath: 'polygon(0 0,100% 0,50% 100%)' }} />
      <Box w={2} h={16} />
      <Bar w={78} />
    </Outline>
  ),
  Progress: (
    <Col gap={8} style={{ alignItems: 'flex-start' }}>
      <Outline w={180} h={10} style={{ borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
        <Solid w="55%" h="100%" />
      </Outline>
      <Outline w={180} h={10} style={{ borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
        <Box w="80%" h="100%" />
      </Outline>
    </Col>
  ),
  Radio: (
    <Col gap={8}>
      <Row gap={6} style={{ alignItems: 'center' }}>
        <Outline
          w={14}
          h={14}
          style={{
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Dot solid size={6} />
        </Outline>
        <Bar w={54} />
      </Row>
      <Row gap={6} style={{ alignItems: 'center' }}>
        <Outline w={14} h={14} style={{ borderRadius: '50%' }} />
        <Bar w={40} />
      </Row>
    </Col>
  ),
  Select: (
    <Col gap={4} style={{ alignItems: 'flex-start' }}>
      <Outline
        w={160}
        h={26}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 7,
        }}
      >
        <Bar w={56} />
        <Box w={8} h={5} style={{ clipPath: 'polygon(0 0,100% 0,50% 100%)' }} />
      </Outline>
      <Panel w={160} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 7 }}>
        <SolidBar w={92} />
        <Bar w={70} />
        <Bar w={82} />
      </Panel>
    </Col>
  ),
  Switch: (
    <Row gap={10} style={{ alignItems: 'center' }}>
      <Solid
        w={38}
        h={20}
        style={{
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: 3,
        }}
      >
        <Outline w={14} h={14} style={{ borderRadius: '50%' }} />
      </Solid>
      <Outline
        w={38}
        h={20}
        style={{ borderRadius: 999, display: 'flex', alignItems: 'center', padding: 3 }}
      >
        <Box w={14} h={14} style={{ borderRadius: '50%' }} />
      </Outline>
    </Row>
  ),
  StatusMenu: (
    <Col gap={5} style={{ alignItems: 'flex-start' }}>
      <Solid
        w={54}
        h={22}
        style={{
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box w={7} h={4} style={{ clipPath: 'polygon(0 0,100% 0,50% 100%)', borderRadius: 0 }} />
      </Solid>
      <Panel
        w={104}
        h={58}
        style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: 7 }}
      >
        <Row gap={5} style={{ alignItems: 'center' }}>
          <Dot size={7} />
          <Bar w={58} />
        </Row>
        <Row gap={5} style={{ alignItems: 'center' }}>
          <Dot size={7} />
          <Bar w={46} />
        </Row>
        <Row gap={5} style={{ alignItems: 'center' }}>
          <Dot size={7} />
          <Bar w={52} />
        </Row>
      </Panel>
    </Col>
  ),
  EntityChip: (
    <Outline
      w={168}
      h={26}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', borderRadius: 6 }}
    >
      <Dot solid size={9} />
      <Bar w={20} style={{ height: 4 }} />
      <Bar w={44} />
      <Dot size={6} />
      <Bar w={30} style={{ height: 4 }} />
    </Outline>
  ),
  Skeleton: (
    <Row gap={8} style={{ alignItems: 'flex-start' }}>
      <Dot size={26} />
      <Col gap={6}>
        <SolidBar w={100} />
        <Bar w={72} />
        <Box w={120} h={34} />
      </Col>
    </Row>
  ),
  Slider: (
    <Col gap={4} style={{ position: 'relative', alignItems: 'flex-start' }}>
      <Panel
        w={22}
        h={13}
        style={{ marginLeft: 65, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Bar w={10} />
      </Panel>
      <Outline w={180} h={6} style={{ borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
        <Box w="42%" h="100%" />
      </Outline>
      <Dot solid size={14} style={{ position: 'absolute', left: 69, top: 13 }} />
      <Row gap={4} style={{ width: '100%', justifyContent: 'space-between' }}>
        <Dot size={4} />
        <Dot size={4} />
        <Dot size={4} />
        <Dot size={4} />
        <Dot size={4} />
      </Row>
    </Col>
  ),
  Kanban: (
    <Row gap={6} style={{ alignItems: 'flex-start' }}>
      <Dashed
        w={64}
        h={92}
        style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 6 }}
      >
        <Bar w={30} />
        <Outline w="100%" h={18} />
        <Outline w="100%" h={18} />
        <Outline w="100%" h={18} />
      </Dashed>
      <Dashed
        w={64}
        h={92}
        style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 6 }}
      >
        <Bar w={24} />
        <Solid w="100%" h={18} style={{ transform: 'rotate(-5deg)' }} />
        <Outline w="100%" h={18} />
      </Dashed>
      <Dashed
        w={64}
        h={92}
        style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 6 }}
      >
        <Bar w={26} />
        <Outline w="100%" h={18} />
      </Dashed>
    </Row>
  ),
  DashboardCanvas: (
    <Col gap={6}>
      <Row gap={6} style={{ alignItems: 'flex-start' }}>
        <Solid w={54} h={40} />
        <Col gap={6}>
          <Box w={40} h={17} />
          <Box w={40} h={17} />
        </Col>
        <Box w={30} h={40} />
      </Row>
      <Dashed
        w={128}
        h={30}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px' }}
      >
        <Box w={22} h={16} />
        <Box w={22} h={16} />
        <Box w={22} h={16} />
      </Dashed>
    </Col>
  ),
  FlowCanvas: (
    <Dashed w={210} h={100} style={{ display: 'block', position: 'relative' }}>
      <Solid w={52} h={22} style={{ position: 'absolute', left: 14, top: 12 }} />
      <Box
        w={88}
        h={2}
        style={{
          position: 'absolute',
          left: 66,
          top: 33,
          transform: 'rotate(30deg)',
          transformOrigin: '0 0',
        }}
      />
      <Outline w={52} h={22} style={{ position: 'absolute', left: 140, top: 64 }} />
      <Col style={{ position: 'absolute', left: 10, bottom: 10, gap: 3 }}>
        <Outline w={12} h={12} />
        <Outline w={12} h={12} />
      </Col>
    </Dashed>
  ),
  Sortable: (
    <Col gap={6}>
      <Outline
        w={190}
        h={22}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 8px' }}
      >
        <Col style={{ gap: 2 }}>
          <Box w={9} h={2} />
          <Box w={9} h={2} />
        </Col>
        <Bar w={92} />
      </Outline>
      <Panel
        w={190}
        h={22}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '0 8px',
          transform: 'translateX(14px) rotate(-2deg)',
        }}
      >
        <Solid
          w={9}
          h={8}
          style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 30%, 0 30%, 0 70%, 100% 70%, 100% 100%, 0 100%)',
          }}
        />
        <Bar w={92} />
      </Panel>
      <Dashed w={190} h={22} />
    </Col>
  ),
  SortableGroup: (
    <Row gap={10} style={{ position: 'relative' }}>
      <Dashed
        w={96}
        h={90}
        style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 6 }}
      >
        <Outline w="100%" h={18} />
        <Outline w="100%" h={18} />
      </Dashed>
      <Dashed
        w={96}
        h={90}
        style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 6 }}
      >
        <Outline w="100%" h={18} />
      </Dashed>
      <Solid
        w={64}
        h={18}
        style={{ position: 'absolute', left: 70, top: 38, transform: 'rotate(-4deg)' }}
      />
    </Row>
  ),
  DataTable: (
    <Outline
      w={214}
      h={88}
      style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: 8 }}
    >
      <Row gap={6}>
        <Box w={10} h={10} />
        <Bar w={38} />
        <Solid w={9} h={6} style={{ clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }} />
        <Bar w={30} style={{ marginLeft: 14 }} />
        <Bar w={34} style={{ marginLeft: 'auto' }} />
      </Row>
      <Box w="100%" h={2} />
      <Row gap={6}>
        <Box w={10} h={10} />
        <Bar w={48} />
        <Bar w={30} style={{ marginLeft: 'auto' }} />
      </Row>
      <Row gap={6}>
        <Box w={10} h={10} />
        <Bar w={40} />
        <Bar w={24} style={{ marginLeft: 'auto' }} />
      </Row>
      <Row gap={6}>
        <Box w={10} h={10} />
        <Bar w={52} />
        <Bar w={28} style={{ marginLeft: 'auto' }} />
      </Row>
    </Outline>
  ),
  DefinitionList: (
    <Col gap={10}>
      <Row gap={10}>
        <Bar w={36} />
        <Bar w={92} />
      </Row>
      <Row gap={10}>
        <Bar w={36} />
        <Row gap={4}>
          <Dot solid size={9} />
          <Bar w={76} />
        </Row>
      </Row>
      <Row gap={10}>
        <Bar w={36} />
        <Bar w={64} />
      </Row>
    </Col>
  ),
  Table: (
    <Outline
      w={210}
      h={82}
      style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 6 }}
    >
      <Solid w="100%" h={12} />
      <Row style={{ padding: '0 6px', height: 12 }}>
        <Bar w={54} />
        <Bar w={26} style={{ marginLeft: 'auto' }} />
      </Row>
      <Box w="100%" h={16} style={{ display: 'flex', alignItems: 'center', padding: '0 6px' }}>
        <Bar w={44} />
        <Bar w={30} style={{ marginLeft: 'auto' }} />
      </Box>
      <Row style={{ padding: '0 6px', height: 12 }}>
        <Bar w={60} />
        <Bar w={22} style={{ marginLeft: 'auto' }} />
      </Row>
    </Outline>
  ),
  Card: (
    <Outline
      w={150}
      h={58}
      style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: 12 }}
    >
      <SolidBar w={64} />
      <Bar w="100%" />
      <Bar w="78%" />
    </Outline>
  ),
  Checkbox: (
    <Col gap={8}>
      <Row gap={8}>
        <Solid w={13} h={13} />
        <Bar w={58} />
      </Row>
      <Row gap={8}>
        <Outline
          w={13}
          h={13}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Box w={7} h={3} />
        </Outline>
        <Bar w={70} />
      </Row>
      <Row gap={8}>
        <Outline w={13} h={13} />
        <Bar w={48} />
      </Row>
    </Col>
  ),
  Field: (
    <Col style={{ gap: 5 }}>
      <Row gap={4}>
        <SolidBar w={38} />
        <Dot size={5} />
      </Row>
      <Outline w={170} h={26} style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
        <Bar w={70} />
      </Outline>
      <Bar w={100} />
    </Col>
  ),
  FormRow: (
    <Dashed w={202} h={50} style={{ display: 'flex', gap: 10, padding: 8 }}>
      <Col style={{ gap: 4 }}>
        <SolidBar w={30} />
        <Outline w={86} h={22} />
      </Col>
      <Col style={{ gap: 4 }}>
        <Bar w={30} />
        <Outline w={86} h={22} />
      </Col>
    </Dashed>
  ),
  FormSection: (
    <Col style={{ gap: 5 }}>
      <SolidBar w={72} />
      <Bar w={118} />
      <Col style={{ gap: 3, marginTop: 5 }}>
        <Bar w={30} />
        <Outline w={180} h={20} />
      </Col>
      <Col style={{ gap: 3 }}>
        <Bar w={42} />
        <Outline w={180} h={20} />
      </Col>
    </Col>
  ),
  ColorPicker: (
    <Panel w={122} h={88} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}>
      <Solid w="100%" h={34} style={{ display: 'block', position: 'relative' }}>
        <Outline
          w={10}
          h={10}
          style={{ position: 'absolute', top: 6, right: 12, borderRadius: '50%' }}
        />
      </Solid>
      <Box w="100%" h={7} style={{ borderRadius: 999 }} />
      <Row gap={4}>
        <Outline w={46} h={14} />
        <Box w={12} h={12} />
        <Box w={12} h={12} />
        <Box w={12} h={12} />
      </Row>
    </Panel>
  ),
  IconPicker: (
    <Panel w={86} h={86} style={{ padding: 10 }}>
      <span style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 28px)', gap: 6 }}>
        <Solid w={28} h={28} />
        <Outline w={28} h={28} />
        <Outline w={28} h={28} />
        <Outline w={28} h={28} />
      </span>
    </Panel>
  ),
  Stack: (
    <Col gap={8}>
      <Solid w={110} h={16} />
      <Box w={110} h={16} />
      <Box w={110} h={16} />
    </Col>
  ),
  Cluster: (
    <Row gap={6} style={{ flexWrap: 'wrap', width: 150 }}>
      <Solid w={58} h={16} />
      <Box w={24} h={16} />
      <Box w={44} h={16} />
      <Box w={70} h={16} />
      <Box w={30} h={16} />
      <Box w={92} h={16} />
    </Row>
  ),
  AppLayout: (
    <Outline
      w={210}
      h={92}
      style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <Solid w="100%" h={13} style={{ borderRadius: 0 }} />
      <Row gap={5} style={{ padding: 5, alignItems: 'flex-start' }}>
        <Box w={38} h={66} />
        <Dashed
          w={152}
          h={66}
          style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: 8 }}
        >
          <Bar w={72} />
          <Bar w={110} />
          <Bar w={90} />
        </Dashed>
      </Row>
    </Outline>
  ),
  Constrain: (
    <Dashed w={200} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}>
      <Solid w={100} h={10} />
      <Bar w={100} />
      <Bar w={72} />
    </Dashed>
  ),
  Indent: (
    <Col gap={6}>
      <Bar w={90} />
      <Bar w={80} style={{ marginLeft: 20 }} />
      <SolidBar w={70} style={{ marginLeft: 40 }} />
    </Col>
  ),
  Code: (
    <Row gap={6}>
      <Bar w={34} />
      <Box h={16} style={{ display: 'flex', alignItems: 'center', padding: '0 6px' }}>
        <SolidBar w={26} />
      </Box>
      <Bar w={30} />
    </Row>
  ),
  Divider: (
    <Col gap={8} style={{ width: 170, alignItems: 'center' }}>
      <Bar w={150} />
      <Bar w={126} />
      <Row
        style={{
          position: 'relative',
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Solid w="100%" h={2} style={{ borderRadius: 0 }} />
        <Pill w={34} style={{ position: 'absolute', height: 10 }} />
      </Row>
      <Bar w={150} />
      <Bar w={110} />
    </Col>
  ),
  Grid: (
    <Col gap={6}>
      <Row gap={6}>
        <Solid w={46} h={26} />
        <Box w={46} h={26} />
        <Box w={46} h={26} />
      </Row>
      <Row gap={6}>
        <Box w={46} h={26} />
        <Box w={46} h={26} />
        <Box w={46} h={26} />
      </Row>
    </Col>
  ),
  Split: (
    <Row gap={8} style={{ alignItems: 'flex-start' }}>
      <Col gap={4}>
        <Solid w={36} h={12} />
        <Box w={36} h={12} />
        <Box w={36} h={12} />
      </Col>
      <Dashed
        w={144}
        h={60}
        style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}
      >
        <Bar w={100} />
        <Bar w={118} />
        <Bar w={84} />
      </Dashed>
    </Row>
  ),
  Sticky: (
    <Outline
      w={200}
      h={84}
      style={{ display: 'flex', gap: 8, padding: 8, alignItems: 'flex-start', overflow: 'hidden' }}
    >
      <Col gap={4}>
        <Box w={116} h={10} />
        <Box w={116} h={10} />
        <Box w={116} h={10} />
        <Box w={116} h={10} />
        <Box w={116} h={10} />
        <Box w={116} h={10} />
        <Box w={116} h={10} />
      </Col>
      <Solid w={58} h={30} />
    </Outline>
  ),
  Masonry: (
    <Row gap={6} style={{ alignItems: 'flex-start' }}>
      <Col gap={6}>
        <Solid w={46} h={34} />
        <Box w={46} h={20} />
      </Col>
      <Col gap={6}>
        <Box w={46} h={18} />
        <Box w={46} h={36} />
      </Col>
      <Col gap={6}>
        <Box w={46} h={26} />
        <Box w={46} h={24} />
      </Col>
    </Row>
  ),
  Avatar: (
    <Row gap={8}>
      <Dot solid size={34} />
      <Outline
        w={34}
        h={34}
        style={{
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bar w={14} />
      </Outline>
      <Box w={34} h={34} style={{ borderRadius: '50%' }} />
    </Row>
  ),
  Badge: (
    <Row gap={6}>
      <Solid w={36} h={16} style={{ borderRadius: 999 }} />
      <Pill w={44} />
      <Pill w={32} />
    </Row>
  ),
  Dot: (
    <Row gap={10}>
      <Row gap={4}>
        <Dot solid size={10} />
        <Bar w={24} />
      </Row>
      <Row gap={4}>
        <Dot size={10} />
        <Bar w={24} />
      </Row>
      <Row gap={4}>
        <Dot size={10} />
        <Bar w={24} />
      </Row>
    </Row>
  ),
  Timeline: (
    <Row gap={8} style={{ alignItems: 'flex-start' }}>
      <Col gap={4} style={{ alignItems: 'center' }}>
        <Dot solid size={10} />
        <Box w={2} h={14} />
        <Dot size={10} />
        <Box w={2} h={14} />
        <Dot size={10} />
      </Col>
      <Col style={{ gap: 23, paddingTop: 2 }}>
        <Bar w={70} />
        <Bar w={56} />
        <Bar w={64} />
      </Col>
    </Row>
  ),
  Thread: (
    <Col gap={6}>
      <Row gap={6}>
        <Dot solid size={12} />
        <Bar w={76} />
      </Row>
      <Row gap={8} style={{ alignItems: 'flex-start' }}>
        <Box w={2} h={30} style={{ marginLeft: 5 }} />
        <Col gap={10}>
          <Row gap={6}>
            <Dot size={10} />
            <Bar w={54} />
          </Row>
          <Row gap={6}>
            <Dot size={10} />
            <Bar w={44} />
          </Row>
        </Col>
      </Row>
    </Col>
  ),
  RichText: (
    <Col gap={6}>
      <Solid w={80} h={9} />
      <Row gap={4}>
        <Bar w={40} />
        <Box w={26} h={7} />
        <Bar w={30} />
      </Row>
      <Row gap={6}>
        <Dot size={5} />
        <Bar w={92} />
      </Row>
      <Row gap={6}>
        <Dot size={5} />
        <Bar w={76} />
      </Row>
    </Col>
  ),
  RichTextEditor: (
    <Outline w={200} style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: 8 }}>
      <Row gap={4}>
        <Box w={14} h={10} />
        <Box w={14} h={10} />
        <Box w={14} h={10} />
        <Box w={2} h={10} />
        <Box w={16} h={10} />
      </Row>
      <Bar w={150} />
      <Row gap={4}>
        <Bar w={104} />
        <Solid w={2} h={12} />
      </Row>
    </Outline>
  ),
  BrandIcon: (
    <Row gap={10}>
      <Dot size={22} />
      <Dot solid size={22} />
      <Outline w={22} h={22} style={{ borderRadius: '50%' }} />
    </Row>
  ),
  Logo: (
    <Row gap={8} style={{ alignItems: 'center' }}>
      <Solid w={30} h={30} style={{ borderRadius: '50%' }} />
      <Box w={72} h={14} style={{ borderRadius: 7 }} />
    </Row>
  ),
  Breadcrumb: (
    <Row gap={8} style={{ alignItems: 'center' }}>
      <Bar w={34} />
      <Box w={6} h={9} style={{ clipPath: 'polygon(0 0,100% 50%,0 100%)' }} />
      <Bar w={34} />
      <Box w={6} h={9} style={{ clipPath: 'polygon(0 0,100% 50%,0 100%)' }} />
      <SolidBar w={42} />
    </Row>
  ),
  Link: (
    <Row gap={6} style={{ alignItems: 'center' }}>
      <Bar w={32} />
      <Col gap={4} style={{ alignItems: 'center' }}>
        <SolidBar w={54} />
        <Box w={54} h={2} />
      </Col>
      <Bar w={28} />
    </Row>
  ),
  LinkCard: (
    <Outline
      w={180}
      h={64}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
      }}
    >
      <Col gap={6}>
        <SolidBar w={72} />
        <Bar w={48} />
      </Col>
      <Box
        w={9}
        h={12}
        style={{
          clipPath: 'polygon(25% 0,100% 50%,25% 100%,0 80%,50% 50%,0 20%)',
          borderRadius: 0,
        }}
      />
    </Outline>
  ),
  Rail: (
    <Row gap={6} style={{ alignItems: 'flex-start' }}>
      <Outline
        w={24}
        h={100}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '8px 0',
        }}
      >
        <Dot size={7} />
        <Dot size={7} />
        <Dot size={7} />
      </Outline>
      <Outline
        w={90}
        h={100}
        style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}
      >
        <Bar w={28} />
        <Row gap={6} style={{ alignItems: 'center' }}>
          <Dot size={7} />
          <Bar w={36} />
        </Row>
        <Solid w={72} h={14} style={{ borderRadius: 4 }} />
        <Row gap={6} style={{ alignItems: 'center' }}>
          <Dot size={7} />
          <Bar w={32} />
        </Row>
      </Outline>
    </Row>
  ),
  TopBar: (
    <Col gap={6}>
      <Outline
        w={214}
        h={34}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
        }}
      >
        <Outline
          w={104}
          h={20}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 6px',
          }}
        >
          <Bar w={42} />
          <Box w={16} h={12} style={{ borderRadius: 3 }} />
        </Outline>
        <Box w={20} h={20} style={{ position: 'relative', borderRadius: 6 }}>
          <Dot solid size={8} style={{ position: 'absolute', top: -2, right: -2 }} />
        </Box>
      </Outline>
      <Dashed w={214} h={50} />
    </Col>
  ),
  Tabs: (
    <Col style={{ position: 'relative', gap: 8, alignItems: 'flex-start' }}>
      <Row gap={10} style={{ alignItems: 'center' }}>
        <Bar w={38} />
        <Row gap={4} style={{ alignItems: 'center' }}>
          <Bar w={34} />
          <Pill w={16} />
        </Row>
        <Bar w={28} />
      </Row>
      <Box w={180} h={2} />
      <Solid w={38} h={4} style={{ position: 'absolute', bottom: -1, left: 0, borderRadius: 2 }} />
    </Col>
  ),
  Text: (
    <Col gap={6} style={{ alignItems: 'flex-start' }}>
      <Bar w={150} />
      <Bar w={142} />
      <Row gap={4} style={{ alignItems: 'center' }}>
        <SolidBar w={76} />
        <Dot size={3} />
        <Dot size={3} />
        <Dot size={3} />
      </Row>
    </Col>
  ),
  Title: (
    <Col gap={8} style={{ alignItems: 'flex-start' }}>
      <Solid w={112} h={12} style={{ borderRadius: 3 }} />
      <Box w={84} h={8} style={{ borderRadius: 2 }} />
      <Bar w={132} />
    </Col>
  ),
  DropdownMenu: (
    <Col gap={4} style={{ alignItems: 'flex-start' }}>
      <Outline
        w={30}
        h={22}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Box w={8} h={5} style={{ clipPath: 'polygon(0 0,100% 0,50% 100%)', borderRadius: 0 }} />
      </Outline>
      <Panel
        w={104}
        h={58}
        style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 7 }}
      >
        <Solid w={90} h={11} style={{ borderRadius: 3 }} />
        <Bar w={70} />
        <Box w="100%" h={1} style={{ borderRadius: 0 }} />
        <Bar w={58} />
      </Panel>
    </Col>
  ),
  Textarea: (
    <Outline
      w={176}
      h={78}
      style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: 9 }}
    >
      <Bar w={132} />
      <Bar w={144} />
      <SolidBar w={70} />
      <Bar w={22} style={{ marginTop: 'auto', alignSelf: 'flex-end' }} />
    </Outline>
  ),
  TimeField: (
    <Row gap={8} style={{ alignItems: 'flex-start' }}>
      <Outline
        w={82}
        h={26}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 7px' }}
      >
        <Outline w={12} h={12} style={{ borderRadius: '50%' }} />
        <Bar w={36} />
      </Outline>
      <Panel w={90} h={62} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 7 }}>
        <Row gap={8}>
          <Col gap={4}>
            <Bar w={30} />
            <Solid w={30} h={10} style={{ borderRadius: 3 }} />
            <Bar w={30} />
          </Col>
          <Col gap={4}>
            <Bar w={30} />
            <Bar w={30} />
            <Bar w={30} />
          </Col>
        </Row>
        <Box w={74} h={1} />
        <Bar w={26} />
      </Panel>
    </Row>
  ),
  Toast: (
    <Dashed w={200} h={92} style={{ position: 'relative' }}>
      <Panel
        w={150}
        h={40}
        style={{
          position: 'absolute',
          right: 8,
          bottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 10px',
        }}
      >
        <Dot solid size={10} />
        <Col gap={4}>
          <Bar w={70} />
          <Bar w={48} />
        </Col>
      </Panel>
    </Dashed>
  ),
  Tooltip: (
    <Col gap={4} style={{ alignItems: 'center' }}>
      <Solid
        w={92}
        h={32}
        style={{ clipPath: 'polygon(0 0,100% 0,100% 72%,58% 72%,50% 100%,42% 72%,0 72%)' }}
      />
      <Outline
        w={64}
        h={22}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Bar w={30} />
      </Outline>
    </Col>
  ),
  Modal: (
    <Box
      w={210}
      h={100}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Panel
        w={140}
        h={78}
        style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}
      >
        <Bar w={54} />
        <Bar w={104} />
        <Bar w={84} />
        <Row gap={4} style={{ marginTop: 'auto', justifyContent: 'flex-end', width: '100%' }}>
          <Outline w={28} h={12} />
          <Solid w={28} h={12} />
        </Row>
      </Panel>
    </Box>
  ),
  Lightbox: (
    <Col gap={6} style={{ alignItems: 'center' }}>
      <Row gap={6} style={{ alignItems: 'center' }}>
        <Box w={10} h={14} style={{ clipPath: 'polygon(100% 0,100% 100%,0 50%)' }} />
        <Box w={118} h={56} />
        <Box w={10} h={14} style={{ clipPath: 'polygon(0 0,100% 50%,0 100%)' }} />
      </Row>
      <Bar w={44} />
      <Row gap={4}>
        <Box w={20} h={14} />
        <Solid w={20} h={14} />
        <Box w={20} h={14} />
        <Box w={20} h={14} />
      </Row>
    </Col>
  ),
  FilterChip: (
    <Outline
      w={148}
      h={30}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 10px',
        borderRadius: 999,
      }}
    >
      <Bar w={28} />
      <Dot size={7} />
      <Bar w={40} />
      <Solid
        w={10}
        h={10}
        style={{
          marginLeft: 'auto',
          clipPath:
            'polygon(20% 0,50% 30%,80% 0,100% 20%,70% 50%,100% 80%,80% 100%,50% 70%,20% 100%,0 80%,30% 50%,0 20%)',
        }}
      />
    </Outline>
  ),
  OptionsPicker: (
    <Row gap={8} style={{ alignItems: 'flex-start' }}>
      <Outline
        w={52}
        h={16}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Bar w={28} />
      </Outline>
      <Panel
        w={118}
        h={100}
        style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 6 }}
      >
        <Outline
          w="100%"
          h={14}
          style={{ display: 'flex', alignItems: 'center', padding: '0 4px' }}
        >
          <Bar w={38} />
        </Outline>
        <Row gap={4} style={{ alignItems: 'center' }}>
          <Box w={8} h={8} />
          <Bar w={48} />
        </Row>
        <Row gap={4} style={{ alignItems: 'center' }}>
          <Box w={8} h={8} />
          <Bar w={36} />
        </Row>
        <Row gap={4} style={{ alignItems: 'center' }}>
          <Outline w={8} h={8} />
          <Bar w={44} />
        </Row>
        <Row gap={4} style={{ marginTop: 'auto', justifyContent: 'flex-end', width: '100%' }}>
          <Outline w={26} h={12} />
          <Solid w={26} h={12} />
        </Row>
      </Panel>
    </Row>
  ),
  EmojiPicker: (
    <Panel w={128} h={92} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}>
      <Outline w="100%" h={14} style={{ display: 'flex', alignItems: 'center', padding: '0 4px' }}>
        <Bar w={36} />
      </Outline>
      <Row gap={6}>
        <Bar w={14} />
        <Bar w={14} />
        <Bar w={14} />
        <Bar w={14} />
      </Row>
      <Row gap={6}>
        <Dot size={10} />
        <Dot size={10} />
        <Dot size={10} />
        <Dot size={10} />
        <Dot size={10} />
        <Dot size={10} />
      </Row>
      <Row gap={6}>
        <Dot size={10} />
        <Dot solid size={10} />
        <Dot size={10} />
        <Dot size={10} />
        <Dot size={10} />
        <Dot size={10} />
      </Row>
      <Row gap={6}>
        <Dot size={10} />
        <Dot size={10} />
        <Dot size={10} />
        <Dot size={10} />
        <Dot size={10} />
        <Dot size={10} />
      </Row>
    </Panel>
  ),
  Page: (
    <Dashed
      w={150}
      h={100}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}
    >
      <Solid w="100%" h={16} />
      <Box w="100%" h={34} />
      <Box w="100%" h={18} />
    </Dashed>
  ),
  PageHeader: (
    <Col gap={8}>
      <Row gap={6} style={{ alignItems: 'center' }}>
        <Box w={8} h={10} style={{ clipPath: 'polygon(100% 0,100% 100%,0 50%)' }} />
        <Bar w={22} />
        <Dot size={4} />
        <Bar w={22} />
        <Dot size={4} />
        <Bar w={28} />
      </Row>
      <Row gap={10} style={{ alignItems: 'center' }}>
        <Dot size={26} />
        <Col gap={4}>
          <Solid w={64} h={8} />
          <Bar w={48} />
          <Row gap={4}>
            <Pill w={24} />
            <Pill w={32} />
          </Row>
        </Col>
        <Row gap={4} style={{ alignSelf: 'flex-start' }}>
          <Outline w={28} h={14} />
          <Outline w={28} h={14} />
        </Row>
      </Row>
    </Col>
  ),
  Drawer: (
    <Outline
      w={200}
      h={100}
      style={{ display: 'flex', justifyContent: 'flex-end', overflow: 'hidden' }}
    >
      <Col gap={6} style={{ padding: 8, marginRight: 'auto' }}>
        <Bar w={54} />
        <Bar w={70} />
        <Bar w={40} />
      </Col>
      <Panel w={84} h="100%" style={{ display: 'flex', gap: 6, padding: 6 }}>
        <Solid w={4} h="100%" />
        <Col gap={6}>
          <Bar w={44} />
          <Bar w={54} />
          <Bar w={34} />
        </Col>
      </Panel>
    </Outline>
  ),
  Popover: (
    <Col gap={6} style={{ alignItems: 'flex-start' }}>
      <Solid w={44} h={16} />
      <Panel
        w={112}
        h={56}
        style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}
      >
        <Bar w={50} />
        <Bar w={80} />
        <Bar w={60} />
      </Panel>
    </Col>
  ),
  Calendar: (
    <Col gap={4} style={{ position: 'relative' }}>
      <Row gap={4}>
        <Bar w={22} />
        <Bar w={22} />
        <Bar w={22} />
        <Bar w={22} />
        <Bar w={22} />
        <Bar w={22} />
        <Bar w={22} />
      </Row>
      <Row gap={4}>
        <Outline w={22} h={24} />
        <Outline w={22} h={24} />
        <Outline w={22} h={24} />
        <Outline w={22} h={24} />
        <Outline w={22} h={24} />
        <Outline w={22} h={24} />
        <Outline w={22} h={24} />
      </Row>
      <Row gap={4}>
        <Outline w={22} h={24} style={{ display: 'flex', alignItems: 'flex-start', padding: 3 }}>
          <Box w={16} h={6} />
        </Outline>
        <Outline w={22} h={24} />
        <Outline
          w={22}
          h={24}
          style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 3 }}
        >
          <Box w={14} h={6} style={{ borderRadius: 3 }} />
        </Outline>
        <Outline w={22} h={24} />
        <Outline w={22} h={24} />
        <Outline w={22} h={24} />
        <Outline w={22} h={24} />
      </Row>
      <Solid w={74} h={6} style={{ position: 'absolute', top: 14, left: 26 }} />
    </Col>
  ),
  CircularProgress: (
    <Box w={44} h={44} style={{ position: 'relative', borderRadius: '50%' }}>
      <Solid
        w={44}
        h={44}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          clipPath: 'polygon(50% 50%,50% 0,100% 0,100% 100%,0 100%,0 50%)',
        }}
      />
      <Outline
        w={30}
        h={30}
        style={{
          position: 'absolute',
          top: 7,
          left: 7,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bar w={12} />
      </Outline>
    </Box>
  ),
  ConfirmationPopover: (
    <Col gap={6} style={{ alignItems: 'flex-start' }}>
      <Outline w={40} h={14} />
      <Panel
        w={124}
        h={60}
        style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}
      >
        <Bar w={52} />
        <Bar w={92} />
        <Row gap={4} style={{ marginTop: 'auto', justifyContent: 'flex-end', width: '100%' }}>
          <Outline w={28} h={12} />
          <Solid w={28} h={12} />
        </Row>
      </Panel>
    </Col>
  ),
};
