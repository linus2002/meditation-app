import * as React from 'react';
import { Badge, Box, Button, Card, Flex, Grid, Heading, Inline, Spinner, Stack, Text, TextInput } from '@sanity/ui';
import { SearchIcon } from '@sanity/icons/Search';
import { ChartUpwardIcon } from '@sanity/icons/ChartUpward';
import { LaunchIcon } from '@sanity/icons/Launch';
import { useClient, type Tool } from 'sanity';

/**
 * Serenity's Analytics tab: the app's usage, read live from PostHog.
 *
 * Every number comes from a HogQL query sent through the Studio's own dev
 * server (see posthogProxy.ts), which adds the PostHog key; the browser never
 * sees it. Only people who agreed to "Share usage" in the app are counted.
 */

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

const ACCENT = '#2f7bf6';
const GREEN = '#3fa66b';
const TRACK = 'rgba(128,128,128,0.14)';

interface Project {
  id: number;
  name: string;
  host: string;
}

type Rows = unknown[][];

async function hogql(query: string): Promise<Rows> {
  const res = await fetch('/posthog-api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = (await res.json().catch(() => ({}))) as { results?: Rows; error?: string };
  if (!res.ok) throw new Error(data.error ?? `PostHog answered ${res.status}`);
  return data.results ?? [];
}

/**
 * Active time, as rows of (person_id, sid, gap seconds).
 *
 * PostHog's own visit length runs until 30 minutes of silence, so an app left
 * open on the desk counts as use. Here each gap between one event and the next
 * in the same visit counts, capped: two minutes on ordinary screens, where a
 * longer silence means nobody is there, and thirty on the screens where people
 * sit still on purpose (the player, yoga, timer, mixes and stories).
 */
function activeGaps(where: string): string {
  return `SELECT person_id, sid,
       if(raw < 0, 0, least(raw, if(match(path, '^/(player|yoga|timer|mix-play|stories)'), 1800, 120))) AS gap
     FROM (
       SELECT person_id, toString(properties.$session_id) AS sid,
         coalesce(toString(properties.$pathname), '') AS path,
         dateDiff('second', timestamp, leadInFrame(timestamp) OVER (
           PARTITION BY properties.$session_id ORDER BY timestamp ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING)) AS raw
       FROM events
       WHERE ${where} AND properties.$session_id IS NOT NULL
     )`;
}

/** Runs one query whenever `deps` change. */
function useQuery(query: string, deps: React.DependencyList) {
  const [state, setState] = React.useState<{ rows: Rows | null; error: string | null }>({
    rows: null,
    error: null,
  });
  React.useEffect(() => {
    let live = true;
    setState({ rows: null, error: null });
    hogql(query).then(
      (rows) => live && setState({ rows, error: null }),
      (error: Error) => live && setState({ rows: null, error: error.message }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

// ---------------------------------------------------------------- formatting

const num = (value: unknown) => Number(value ?? 0) || 0;
const fmt = (value: number) => new Intl.NumberFormat().format(Math.round(value));

function duration(seconds: number): string {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

function when(value: unknown): string {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function pathOf(url: unknown): string {
  try {
    return new URL(String(url)).pathname || '/';
  } catch {
    return String(url ?? '—');
  }
}

function change(current: number, previous: number): { label: string; tone: 'positive' | 'critical' | 'default' } {
  if (!previous) return { label: current ? 'New' : '—', tone: 'default' };
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) return { label: '0%', tone: 'default' };
  return { label: `${pct > 0 ? '+' : ''}${Math.round(pct)}%`, tone: pct > 0 ? 'positive' : 'critical' };
}

// ---------------------------------------------------------------- pieces

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card padding={4} radius={3} shadow={1} style={{ height: '100%' }}>
      <Stack gap={4}>
        <Stack gap={2}>
          <Text size={2} weight="semibold">
            {title}
          </Text>
          {hint ? (
            <Text size={1} muted>
              {hint}
            </Text>
          ) : null}
        </Stack>
        {children}
      </Stack>
    </Card>
  );
}

function Loading() {
  return (
    <Flex align="center" justify="center" padding={4}>
      <Spinner muted />
    </Flex>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <Card padding={3} radius={2} tone="critical">
      <Text size={1}>{message}</Text>
    </Card>
  );
}

function Empty({ children = 'Nothing in this period yet.' }: { children?: React.ReactNode }) {
  return (
    <Box paddingY={3}>
      <Text size={1} muted>
        {children}
      </Text>
    </Box>
  );
}

function Stat({
  label,
  value,
  previous,
  current,
  sub,
}: {
  label: string;
  value: string;
  current?: number;
  previous?: number;
  sub?: string;
}) {
  const delta = current !== undefined && previous !== undefined ? change(current, previous) : null;
  return (
    <Card padding={4} radius={3} shadow={1}>
      <Stack gap={4}>
        <Flex align="center" justify="space-between" gap={2}>
          <Text size={1} muted weight="medium">
            {label}
          </Text>
          {delta ? (
            <Badge tone={delta.tone} fontSize={0}>
              {delta.label}
            </Badge>
          ) : null}
        </Flex>
        <Heading size={4}>{value}</Heading>
        <Text size={1} muted>
          {sub ?? ' '}
        </Text>
      </Stack>
    </Card>
  );
}

/** Whole-number gridlines (0, a middle step when there's room, and the top) for a count axis. */
function countTicks(max: number): number[] {
  if (max <= 4) return Array.from({ length: max + 1 }, (_, i) => i);
  const step = Math.ceil(max / 4);
  const ticks: number[] = [];
  for (let t = 0; t < max; t += step) ticks.push(t);
  ticks.push(max);
  return ticks;
}

const shortDay = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/**
 * Daily counts as paired columns: one per day for people, one for finished
 * meditations. Columns, not a line, because these are separate whole-number
 * days; a line would draw slopes between them that never happened.
 *
 * Drawn at the panel's real width so text stays at its true size instead of
 * being scaled up with the picture.
 */
function DailyChart({ days }: { days: { day: string; users: number; completed: number }[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  const [hover, setHover] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const height = 240;
  const pad = { top: 16, right: 8, bottom: 30, left: 36 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const peak = Math.max(1, ...days.map((d) => Math.max(d.users, d.completed)));
  const ticks = countTicks(peak);
  const top = ticks[ticks.length - 1];
  const slot = days.length ? innerW / days.length : 0;
  const barW = Math.max(2, Math.min(18, (slot - 4) / 2));
  const y = (v: number) => pad.top + innerH - (v / top) * innerH;
  // Room for about one date label per 64px, always including the last day.
  const labelEvery = Math.max(1, Math.ceil(days.length / Math.max(1, Math.floor(innerW / 64))));
  const quiet = days.every((d) => d.users === 0 && d.completed === 0);
  const tip = hover === null ? null : days[hover];

  return (
    <Stack gap={3}>
      <Inline gap={4}>
        <Legend color={ACCENT} label="Active users" />
        <Legend color={GREEN} label="Meditations completed" />
      </Inline>
      <div ref={ref} style={{ position: 'relative', width: '100%' }} onMouseLeave={() => setHover(null)}>
        {width > 0 ? (
          <svg width={width} height={height} role="img" aria-label="Daily activity" style={{ display: 'block' }}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={TRACK} />
                <text x={pad.left - 10} y={y(t) + 4} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.55}>
                  {t}
                </text>
              </g>
            ))}

            {days.map((d, i) => {
              const x0 = pad.left + i * slot;
              const mid = x0 + slot / 2;
              const showLabel = i % labelEvery === 0 || i === days.length - 1;
              // Keep the outermost labels inside the chart instead of half off its edge.
              const anchor = i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle';
              const lx = i === 0 ? x0 + 2 : i === days.length - 1 ? x0 + slot - 2 : mid;
              const tooCloseToLast = i !== days.length - 1 && days.length - 1 - i < labelEvery;
              return (
                <g key={d.day} onMouseEnter={() => setHover(i)}>
                  <rect x={x0} y={pad.top} width={slot} height={innerH} fill={hover === i ? TRACK : 'transparent'} />
                  {d.users > 0 ? (
                    <rect x={mid - barW - 1} y={y(d.users)} width={barW} height={y(0) - y(d.users)} rx={Math.min(3, barW / 2)} fill={ACCENT} />
                  ) : null}
                  {d.completed > 0 ? (
                    <rect x={mid + 1} y={y(d.completed)} width={barW} height={y(0) - y(d.completed)} rx={Math.min(3, barW / 2)} fill={GREEN} />
                  ) : null}
                  {showLabel && !tooCloseToLast ? (
                    <text x={lx} y={height - 8} textAnchor={anchor} fontSize={11} fill="currentColor" opacity={0.55}>
                      {shortDay(d.day)}
                    </text>
                  ) : null}
                </g>
              );
            })}
            <line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke="currentColor" opacity={0.2} />
          </svg>
        ) : (
          <div style={{ height }} />
        )}

        {quiet && width > 0 ? (
          <div style={{ position: 'absolute', inset: `${pad.top}px ${pad.right}px ${pad.bottom}px ${pad.left}px`, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <Text size={1} muted>
              No activity in this period yet.
            </Text>
          </div>
        ) : null}

        {tip && hover !== null ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: Math.min(Math.max(pad.left + hover * slot + slot / 2 - 80, 0), Math.max(0, width - 160)),
              width: 160,
              pointerEvents: 'none',
            }}
          >
            <Card padding={3} radius={2} shadow={2}>
              <Stack gap={2}>
                <Text size={1} weight="semibold">
                  {new Date(`${tip.day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <Text size={1} muted>
                  {tip.users} active {tip.users === 1 ? 'user' : 'users'}
                </Text>
                <Text size={1} muted>
                  {tip.completed} {tip.completed === 1 ? 'meditation' : 'meditations'} completed
                </Text>
              </Stack>
            </Card>
          </div>
        ) : null}
      </div>
    </Stack>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Flex align="center" gap={2}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: color, display: 'inline-block' }} />
      <Text size={1} muted>
        {label}
      </Text>
    </Flex>
  );
}

/** Ranked list with a proportional bar behind each row. */
function BarList({ items, unit }: { items: { label: string; value: number }[]; unit?: string }) {
  if (items.length === 0) return <Empty />;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <Stack gap={3}>
      {items.map((item) => (
        <Stack key={item.label} gap={2}>
          <Flex justify="space-between" gap={3}>
            <Box flex={1} style={{ minWidth: 0 }}>
              <Text size={1} textOverflow="ellipsis">
                {item.label}
              </Text>
            </Box>
            <Text size={1} muted>
              {fmt(item.value)}
              {unit ? ` ${unit}` : ''}
            </Text>
          </Flex>
          <div style={{ height: 6, borderRadius: 999, background: TRACK }}>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                width: `${Math.max(4, (item.value / max) * 100)}%`,
                background: ACCENT,
              }}
            />
          </div>
        </Stack>
      ))}
    </Stack>
  );
}

// ---------------------------------------------------------------- sections

function Overview({ range }: { range: Range }) {
  const cur = `timestamp >= now() - INTERVAL ${range} DAY`;
  const { rows, error } = useQuery(
    `SELECT
       uniqIf(person_id, ${cur}),
       uniqIf(person_id, NOT (${cur})),
       uniqIf(properties.$session_id, ${cur}),
       uniqIf(properties.$session_id, NOT (${cur})),
       countIf(event = 'onboarding_completed' AND ${cur}),
       countIf(event = 'onboarding_completed' AND NOT (${cur})),
       countIf(event = 'session_completed' AND ${cur}),
       countIf(event = 'session_completed' AND NOT (${cur})),
       sumIf(toFloat(properties.seconds), event = 'session_completed' AND ${cur})
     FROM events
     WHERE timestamp >= now() - INTERVAL ${range * 2} DAY`,
    [range],
  );
  const length = useQuery(
    `SELECT sum(gap) / greatest(uniq(sid), 1) FROM (${activeGaps(`timestamp >= now() - INTERVAL ${range} DAY`)})`,
    [range],
  );

  if (error) return <Problem message={error} />;
  const r = rows?.[0]?.map(num);
  const avg = num(length.rows?.[0]?.[0]);
  const vs = `vs. previous ${range} days`;

  return (
    <Grid gridTemplateColumns={[1, 2, 2, 4]} gap={3}>
      <Stat label="Active users" value={r ? fmt(r[0]) : '…'} current={r?.[0]} previous={r?.[1]} sub={vs} />
      <Stat label="New users" value={r ? fmt(r[4]) : '…'} current={r?.[4]} previous={r?.[5]} sub="Finished the welcome tour" />
      <Stat
        label="App visits"
        value={r ? fmt(r[2]) : '…'}
        current={r?.[2]}
        previous={r?.[3]}
        sub={length.rows ? `Average visit ${duration(avg)} active` : ' '}
      />
      <Stat
        label="Meditations completed"
        value={r ? fmt(r[6]) : '…'}
        current={r?.[6]}
        previous={r?.[7]}
        sub={r ? `${fmt(r[8] / 60)} minutes meditated` : ' '}
      />
    </Grid>
  );
}

function Daily({ range }: { range: Range }) {
  const { rows, error } = useQuery(
    `SELECT toDate(timestamp) AS day, uniq(person_id), countIf(event = 'session_completed')
     FROM events
     WHERE timestamp >= now() - INTERVAL ${range} DAY
     GROUP BY day ORDER BY day`,
    [range],
  );

  const days = React.useMemo(() => {
    const byDay = new Map((rows ?? []).map((r) => [String(r[0]).slice(0, 10), r]));
    const out: { day: string; users: number; completed: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = byDay.get(key);
      out.push({ day: key, users: num(row?.[1]), completed: num(row?.[2]) });
    }
    return out;
  }, [rows, range]);

  return (
    <Panel title="Daily activity" hint="People using the app each day, and meditations they finished.">
      {error ? <Problem message={error} /> : rows ? <DailyChart days={days} /> : <Loading />}
    </Panel>
  );
}

function TopSessions({ range, titles }: { range: Range; titles: Map<string, string> }) {
  const { rows, error } = useQuery(
    `SELECT properties.meditation_id AS id, count() AS plays
     FROM events
     WHERE event = 'session_completed' AND timestamp >= now() - INTERVAL ${range} DAY
     GROUP BY id ORDER BY plays DESC LIMIT 8`,
    [range],
  );
  return (
    <Panel title="Most completed meditations" hint="Which sessions people finish most.">
      {error ? (
        <Problem message={error} />
      ) : rows ? (
        <BarList items={rows.map((r) => ({ label: titles.get(String(r[0])) ?? String(r[0]), value: num(r[1]) }))} />
      ) : (
        <Loading />
      )}
    </Panel>
  );
}

const SCREEN_NAMES: Record<string, string> = {
  '/': 'Start screen',
  '/home': 'Home',
  '/meditations': 'Meditations',
  '/sleep': 'Sleep',
  '/yoga': 'Yoga',
  '/kapwa': 'Kapwa',
  '/search': 'Search',
  '/profile': 'Profile',
  '/login': 'Sign in',
  '/welcome': 'Welcome tour',
  '/stories': 'Stories',
  '/mixes': 'Mixes',
  '/calendar': 'Calendar',
  '/timer': 'Timer',
  '/discover': 'Discover',
  '/favorites': 'Saved',
  '/downloads': 'Downloads',
  '/activities': 'Daily activities',
  '/notifications': 'Notifications',
};

function screenName(path: string, titles: Map<string, string>): string {
  const clean = path.replace(/\/$/, '') || '/';
  if (SCREEN_NAMES[clean]) return SCREEN_NAMES[clean];
  const [, section, id] = clean.split('/');
  if (id && titles.has(id)) {
    const label = { player: 'Player', programs: 'Programme', stories: 'Story', yoga: 'Yoga' }[section] ?? section;
    return `${label}: ${titles.get(id)}`;
  }
  return clean;
}

function TopScreens({ range, titles }: { range: Range; titles: Map<string, string> }) {
  const { rows, error } = useQuery(
    `SELECT properties.$pathname AS path, count() AS views
     FROM events
     WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${range} DAY
     GROUP BY path ORDER BY views DESC LIMIT 8`,
    [range],
  );
  return (
    <Panel title="Most visited screens" hint="Where people spend their visits.">
      {error ? (
        <Problem message={error} />
      ) : rows ? (
        <BarList items={rows.map((r) => ({ label: screenName(String(r[0] ?? '/'), titles), value: num(r[1]) }))} unit="views" />
      ) : (
        <Loading />
      )}
    </Panel>
  );
}

function Breakdown({ range, property, title, hint }: { range: Range; property: string; title: string; hint: string }) {
  const { rows, error } = useQuery(
    `SELECT properties.${property} AS key, uniq(person_id) AS people
     FROM events
     WHERE timestamp >= now() - INTERVAL ${range} DAY AND key IS NOT NULL
     GROUP BY key ORDER BY people DESC LIMIT 6`,
    [range],
  );
  return (
    <Panel title={title} hint={hint}>
      {error ? (
        <Problem message={error} />
      ) : rows ? (
        <BarList items={rows.map((r) => ({ label: String(r[0]), value: num(r[1]) }))} unit="people" />
      ) : (
        <Loading />
      )}
    </Panel>
  );
}

function RecentVisits({ range, project }: { range: Range; project: Project | null }) {
  const { rows, error } = useQuery(
    `SELECT s.session_id, s.distinct_id, s.$start_timestamp, coalesce(a.active, 0), s.$pageview_count, s.$entry_current_url
     FROM sessions AS s
     LEFT JOIN (SELECT sid, sum(gap) AS active FROM (${activeGaps(`timestamp >= now() - INTERVAL ${range + 1} DAY`)}) GROUP BY sid) AS a
       ON s.session_id = a.sid
     WHERE s.$start_timestamp >= now() - INTERVAL ${range} DAY
     ORDER BY s.$start_timestamp DESC LIMIT 15`,
    [range],
  );

  const cell = { padding: '10px 12px', borderBottom: `1px solid ${TRACK}`, textAlign: 'left' as const };
  const head = { ...cell, fontWeight: 500, opacity: 0.6, fontSize: 12 };

  return (
    <Panel title="Recent visits" hint="The latest visits to the app. Open one to watch its recording in PostHog.">
      {error ? (
        <Problem message={error} />
      ) : !rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={head}>Started</th>
                <th style={head}>Person</th>
                <th style={head}>First screen</th>
                <th style={head}>Screens</th>
                <th style={head}>Active time</th>
                <th style={head} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r[0])}>
                  <td style={cell}>{when(r[2])}</td>
                  <td style={{ ...cell, fontFamily: 'monospace', opacity: 0.8 }}>{String(r[1]).slice(0, 8)}</td>
                  <td style={cell}>{pathOf(r[5])}</td>
                  <td style={cell}>{fmt(num(r[4]))}</td>
                  <td style={cell}>{duration(num(r[3]))}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>
                    {project ? (
                      <a
                        href={`${project.host}/project/${project.id}/replay/${r[0]}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: ACCENT, textDecoration: 'none', whiteSpace: 'nowrap' }}
                      >
                        Watch ↗
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Setup({ message }: { message?: string }) {
  return (
    <Flex align="center" justify="center" height="fill" padding={5}>
      <Card padding={5} radius={3} shadow={1} style={{ maxWidth: 560 }}>
        <Stack gap={4}>
          <Text size={3} weight="semibold">
            Connect PostHog
          </Text>
          <Text muted>
            In PostHog, open Settings, then Personal API keys, and create a key with &ldquo;Query:
            Read&rdquo;. Add it to studio/.env.local as POSTHOG_PERSONAL_API_KEY, along with the number
            after /project/ in PostHog&rsquo;s address bar as POSTHOG_PROJECT_ID, then restart the Studio.
          </Text>
          {message ? (
            <Card padding={3} radius={2} tone="critical">
              <Text size={1}>{message}</Text>
            </Card>
          ) : null}
        </Stack>
      </Card>
    </Flex>
  );
}

// ---------------------------------------------------------------- users

/** Artwork and kind for every meditation, programme, story and yoga session, by slug. */
interface Art {
  image?: string;
  kind: string;
}
const ArtworkContext = React.createContext<Map<string, Art>>(new Map());

const KIND_LABELS: Record<string, string> = {
  meditation: 'Meditation',
  program: 'Programme',
  story: 'Story',
  yogaSession: 'Yoga',
};

/** A square of the content's own artwork, or a quiet blank when it has none. */
function Thumb({ id, size = 40 }: { id?: string; size?: number }) {
  const art = React.useContext(ArtworkContext).get(id ?? '');
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: size > 48 ? 10 : 8,
    flexShrink: 0,
    objectFit: 'cover',
    background: TRACK,
    display: 'block',
  };
  if (!art?.image) return <span style={style} />;
  return <img src={`${art.image}?w=${size * 2}&h=${size * 2}&fit=crop&auto=format`} alt="" style={style} loading="lazy" />;
}

/** The content id inside an app path, e.g. /player/stress-map gives stress-map. */
function contentIdOf(path: string): string | undefined {
  const [, section, id] = (path || '/').split('/');
  return id && ['player', 'programs', 'stories', 'yoga'].includes(section) ? id : undefined;
}

function ContentTile({ id, title, times, last }: { id: string; title: string; times: number; last: unknown }) {
  const art = React.useContext(ArtworkContext).get(id);
  return (
    <Stack gap={2}>
      <div style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 10, overflow: 'hidden', background: TRACK }}>
        {art?.image ? (
          <img
            src={`${art.image}?w=320&h=320&fit=crop&auto=format`}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : null}
        {art ? (
          <span
            style={{
              position: 'absolute',
              left: 6,
              top: 6,
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 999,
              background: 'rgba(0,0,0,0.55)',
              color: '#fff',
            }}
          >
            {KIND_LABELS[art.kind] ?? art.kind}
          </span>
        ) : null}
      </div>
      <Text size={1} weight="medium" textOverflow="ellipsis">
        {title}
      </Text>
      <Text size={0} muted>
        {times > 1 ? `Opened ${times}×` : 'Opened once'} · {ago(last)}
      </Text>
    </Stack>
  );
}

/** PostHog person ids are UUIDs; anything else never reaches a query. */
const isPersonId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

const SECTION_NAMES: Record<string, string> = {
  '': 'Start screen',
  home: 'Home',
  meditations: 'Meditations library',
  player: 'Meditation player',
  programs: 'Programmes',
  stories: 'Stories',
  yoga: 'Yoga',
  sleep: 'Sleep',
  kapwa: 'Kapwa guide',
  search: 'Search',
  profile: 'Profile',
  login: 'Sign in',
  welcome: 'Welcome tour',
  mixes: 'Mixes',
  'mix-play': 'Mix player',
  calendar: 'Calendar',
  timer: 'Unguided timer',
  reflections: 'Reflections',
  activities: 'Daily activities',
  favorites: 'Saved sessions',
  downloads: 'Downloads',
  discover: 'Discover',
  notifications: 'Notifications',
  assessment: 'Check-in',
  support: 'Support track',
};

function ago(value: unknown): string {
  const date = new Date(String(value));
  const seconds = (Date.now() - date.getTime()) / 1000;
  if (Number.isNaN(seconds)) return '—';
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)} d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function deviceLabel(os: unknown, version: unknown, type: unknown, browser: unknown): { main: string; sub: string } {
  const system = [os, version].filter(Boolean).join(' ') || 'Unknown system';
  return { main: system, sub: [type, browser].filter(Boolean).join(' · ') };
}

/** Plain words for one row of someone's activity. */
function describe(
  event: string,
  path: string,
  meditation: string,
  seconds: number,
  score: number,
  titles: Map<string, string>,
): { icon: string; text: string; content?: string } {
  const title = titles.get(meditation) ?? meditation;
  switch (event) {
    case '$pageview':
      return { icon: '→', text: `Opened ${screenName(path || '/', titles)}`, content: contentIdOf(path) };
    case 'session_recorded':
      return { icon: '▶', text: `Started ${title}${seconds ? ` (${duration(seconds)} so far)` : ''}`, content: meditation };
    case 'session_completed':
      return { icon: '✓', text: `Finished ${title}${seconds ? ` · ${duration(seconds)}` : ''}`, content: meditation };
    case 'meditation_rated':
      return { icon: '★', text: `Rated ${title} ${score} of 5`, content: meditation };
    case 'sleep_logged':
      return { icon: '☾', text: 'Logged their sleep' };
    case 'reflection_saved':
      return { icon: '✎', text: 'Wrote a reflection' };
    case 'assessment_completed':
      return { icon: '◎', text: 'Finished the check-in' };
    case 'onboarding_completed':
      return { icon: '✦', text: 'Finished the welcome tour' };
    case 'signed_in':
      return { icon: '⇥', text: 'Signed in' };
    case 'signed_out':
      return { icon: '⇤', text: 'Signed out' };
    default:
      return { icon: '·', text: event };
  }
}

interface UserRow {
  id: string;
  signedIn: boolean;
  device: { main: string; sub: string };
  place: string;
  firstSeen: unknown;
  lastSeen: unknown;
  visits: number;
  completed: number;
  lastScreen: string;
  lastMeditation: string;
  distinctIds: string[];
}

/** Name and email from the person's Supabase account, looked up by the Studio's server. */
interface Account {
  email: string | null;
  name: string | null;
  createdAt: string | null;
  lastSignIn: string | null;
  provider: string | null;
}

/**
 * Accounts for a set of PostHog distinct ids. A signed-in person's distinct id
 * is their Supabase account id, so the ones that match are real accounts.
 */
function useAccounts(ids: string[]): { accounts: Map<string, Account>; unavailable: boolean } {
  const [state, setState] = React.useState<{ accounts: Map<string, Account>; unavailable: boolean }>({
    accounts: new Map(),
    unavailable: false,
  });
  const key = [...new Set(ids)].sort().join(',');
  React.useEffect(() => {
    if (!key) return;
    let live = true;
    fetch('/posthog-api/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: key.split(',') }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { people?: Record<string, Account> };
        if (!live) return;
        if (!res.ok) return setState({ accounts: new Map(), unavailable: true });
        setState({ accounts: new Map(Object.entries(data.people ?? {})), unavailable: false });
      })
      .catch(() => live && setState({ accounts: new Map(), unavailable: true }));
    return () => {
      live = false;
    };
  }, [key]);
  return state;
}

const accountFor = (accounts: Map<string, Account>, ids: string[]) =>
  ids.map((id) => accounts.get(id)).find(Boolean) ?? null;

function AccountsNotice() {
  return (
    <Card padding={3} radius={2} tone="caution">
      <Text size={1}>
        Names and emails are hidden. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to studio/.env.local and restart
        the Studio to show them.
      </Text>
    </Card>
  );
}

function UsersView({ range, titles, onOpen }: { range: Range; titles: Map<string, string>; onOpen: (id: string) => void }) {
  const [filter, setFilter] = React.useState<'all' | 'signed' | 'guest'>('all');
  const [search, setSearch] = React.useState('');
  const people = useQuery(
    `SELECT person_id,
       countIf(event IN ('$identify', 'signed_in')) > 0,
       argMax(properties.$os, timestamp), argMax(properties.$os_version, timestamp),
       argMax(properties.$device_type, timestamp), argMax(properties.$browser, timestamp),
       argMax(properties.$geoip_city_name, timestamp), argMax(properties.$geoip_country_name, timestamp),
       min(timestamp), max(timestamp), uniq(properties.$session_id),
       countIf(event = 'session_completed'),
       argMaxIf(properties.$pathname, timestamp, event = '$pageview'),
       argMaxIf(properties.meditation_id, timestamp, event IN ('session_recorded', 'session_completed')),
       groupUniqArray(distinct_id)
     FROM events
     WHERE timestamp >= now() - INTERVAL ${range} DAY
     GROUP BY person_id ORDER BY max(timestamp) DESC LIMIT 500`,
    [range],
  );
  const time = useQuery(
    `SELECT person_id, sum(gap) FROM (${activeGaps(`timestamp >= now() - INTERVAL ${range} DAY`)}) GROUP BY person_id`,
    [range],
  );

  const seconds = React.useMemo(() => new Map((time.rows ?? []).map((r) => [String(r[0]), num(r[1])])), [time.rows]);
  const rows: UserRow[] = React.useMemo(
    () =>
      (people.rows ?? []).map((r) => ({
        id: String(r[0]),
        signedIn: Boolean(num(r[1])),
        device: deviceLabel(r[2], r[3], r[4], r[5]),
        place: [r[6], r[7]].filter(Boolean).join(', ') || '—',
        firstSeen: r[8],
        lastSeen: r[9],
        visits: num(r[10]),
        completed: num(r[11]),
        lastScreen: String(r[12] ?? ''),
        lastMeditation: String(r[13] ?? ''),
        distinctIds: Array.isArray(r[14]) ? (r[14] as unknown[]).map(String) : [],
      })),
    [people.rows],
  );
  const { accounts, unavailable } = useAccounts(rows.filter((u) => u.signedIn).flatMap((u) => u.distinctIds));
  const needle = search.trim().toLowerCase();
  const shown = rows.filter((u) => {
    if (filter !== 'all' && (filter === 'signed' ? !u.signedIn : u.signedIn)) return false;
    if (!needle) return true;
    const account = accountFor(accounts, u.distinctIds);
    return [account?.name, account?.email, u.id, u.place, u.device.main]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(needle));
  });

  const cell = { padding: '12px', borderBottom: `1px solid ${TRACK}`, textAlign: 'left' as const, verticalAlign: 'top' as const };
  const head = { ...cell, fontWeight: 500, opacity: 0.6, fontSize: 12, whiteSpace: 'nowrap' as const };
  const small = { fontSize: 12, opacity: 0.6, marginTop: 3 };

  return (
    <Stack gap={4}>
      <Grid gridTemplateColumns={[1, 3]} gap={3}>
        <Stat label="People" value={people.rows ? fmt(rows.length) : '…'} sub={`Used the app in the last ${range} days`} />
        <Stat
          label="Signed in"
          value={people.rows ? fmt(rows.filter((u) => u.signedIn).length) : '…'}
          sub={people.rows ? `${fmt(rows.filter((u) => !u.signedIn).length)} guests` : ' '}
        />
        <Stat
          label="Time in the app"
          value={time.rows ? duration([...seconds.values()].reduce((a, b) => a + b, 0)) : '…'}
          sub="Active use, all people together"
        />
      </Grid>

      <Panel title="People" hint="Everyone who shared usage, most recently active first. Open a person to see everything they did.">
        <Flex gap={1}>
          {(
            [
              ['all', 'Everyone'],
              ['signed', 'Signed in'],
              ['guest', 'Guests'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              text={label}
              fontSize={1}
              padding={2}
              mode={filter === value ? 'default' : 'bleed'}
              tone={filter === value ? 'primary' : 'default'}
              onClick={() => setFilter(value)}
            />
          ))}
          <Box flex={1} />
          <TextInput
            icon={SearchIcon}
            placeholder="Search name, email, place…"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            fontSize={1}
            padding={2}
            style={{ minWidth: 240 }}
          />
        </Flex>
        {unavailable ? <AccountsNotice /> : null}
        {people.error ? (
          <Problem message={people.error} />
        ) : !people.rows ? (
          <Loading />
        ) : shown.length === 0 ? (
          <Empty>No one in this period yet.</Empty>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={head}>Person</th>
                  <th style={head}>Phone / device</th>
                  <th style={head}>Location</th>
                  <th style={head}>Last seen</th>
                  <th style={head}>Visits</th>
                  <th style={head}>Active time</th>
                  <th style={head}>Meditations finished</th>
                  <th style={head}>Last activity</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => onOpen(u.id)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = TRACK)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td style={cell}>
                      {(() => {
                        const account = accountFor(accounts, u.distinctIds);
                        return account ? (
                          <>
                            <div style={{ fontWeight: 600, color: ACCENT }}>{account.name || 'No name given'}</div>
                            <div style={small}>{account.email ?? '—'}</div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontFamily: 'monospace', color: ACCENT }}>{u.id.slice(0, 8)}</div>
                            <div style={small}>{u.signedIn ? 'Signed in' : 'Guest, no account'}</div>
                          </>
                        );
                      })()}
                    </td>
                    <td style={cell}>
                      <div>{u.device.main}</div>
                      <div style={small}>{u.device.sub}</div>
                    </td>
                    <td style={cell}>{u.place}</td>
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                      <div>{ago(u.lastSeen)}</div>
                      <div style={small}>since {new Date(String(u.firstSeen)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                    </td>
                    <td style={cell}>{fmt(u.visits)}</td>
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>{time.rows ? duration(seconds.get(u.id) ?? 0) : '…'}</td>
                    <td style={cell}>{fmt(u.completed)}</td>
                    <td style={cell}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {u.lastMeditation ? <Thumb id={u.lastMeditation} size={36} /> : null}
                        <div>
                          <div>{u.lastMeditation ? titles.get(u.lastMeditation) ?? u.lastMeditation : '—'}</div>
                          <div style={small}>On {screenName(u.lastScreen || '/', titles)}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </Stack>
  );
}

function UserDetail({
  id,
  range,
  titles,
  project,
  onBack,
}: {
  id: string;
  range: Range;
  titles: Map<string, string>;
  project: Project | null;
  onBack: () => void;
}) {
  const safe = isPersonId(id) ? id : '00000000-0000-0000-0000-000000000000';
  const mine = `person_id = '${safe}'`;

  const profile = useQuery(
    `SELECT countIf(event IN ('$identify', 'signed_in')) > 0,
       argMax(properties.$os, timestamp), argMax(properties.$os_version, timestamp),
       argMax(properties.$device_type, timestamp), argMax(properties.$browser, timestamp),
       argMax(properties.$screen_width, timestamp), argMax(properties.$screen_height, timestamp),
       argMax(properties.$geoip_city_name, timestamp), argMax(properties.$geoip_country_name, timestamp),
       min(timestamp), max(timestamp), uniq(properties.$session_id),
       countIf(event = 'session_recorded'), countIf(event = 'session_completed'),
       sumIf(toFloat(properties.seconds), event = 'session_completed'), any(distinct_id),
       groupUniqArray(distinct_id)
     FROM events WHERE ${mine}`,
    [safe],
  );
  const visits = useQuery(
    `SELECT s.session_id, s.$start_timestamp, coalesce(a.active, 0), s.$pageview_count, s.$entry_current_url, s.$end_current_url
     FROM sessions AS s
     LEFT JOIN (SELECT sid, sum(gap) AS active FROM (${activeGaps(mine)}) GROUP BY sid) AS a ON s.session_id = a.sid
     WHERE s.session_id IN (SELECT properties.$session_id FROM events WHERE ${mine})
     ORDER BY s.$start_timestamp DESC LIMIT 50`,
    [safe],
  );
  const features = useQuery(
    `SELECT splitByChar('/', coalesce(properties.$pathname, '/'))[2] AS section, count(), uniq(properties.$session_id)
     FROM events WHERE ${mine} AND event = '$pageview'
     GROUP BY section ORDER BY count() DESC`,
    [safe],
  );
  const meditations = useQuery(
    `SELECT properties.meditation_id AS m, countIf(event = 'session_recorded'), countIf(event = 'session_completed'),
       max(toFloat(properties.seconds)), max(timestamp)
     FROM events WHERE ${mine} AND event IN ('session_recorded', 'session_completed')
     GROUP BY m ORDER BY max(timestamp) DESC`,
    [safe],
  );
  const opened = useQuery(
    `SELECT splitByChar('/', coalesce(properties.$pathname, '/'))[3] AS item, count(), max(timestamp)
     FROM events
     WHERE ${mine} AND event = '$pageview'
       AND splitByChar('/', coalesce(properties.$pathname, '/'))[2] IN ('player', 'programs', 'stories', 'yoga')
       AND item != ''
     GROUP BY item ORDER BY max(timestamp) DESC LIMIT 24`,
    [safe],
  );
  const timeline = useQuery(
    `SELECT timestamp, event, properties.$pathname, properties.meditation_id, properties.seconds, properties.score
     FROM events
     WHERE ${mine} AND timestamp >= now() - INTERVAL ${range} DAY
       AND event NOT IN ('$autocapture', '$web_vitals', '$set', '$pageleave', '$opt_in', '$opt_out', '$identify',
                         '$feature_flag_called', '$rageclick', '$dead_click', '$exception')
     ORDER BY timestamp DESC LIMIT 300`,
    [safe, range],
  );

  const p = profile.rows?.[0];
  const totalSeconds = (visits.rows ?? []).reduce((sum, r) => sum + num(r[2]), 0);
  const device = p ? deviceLabel(p[1], p[2], p[3], p[4]) : null;
  const distinctIds = p && Array.isArray(p[16]) ? (p[16] as unknown[]).map(String) : [];
  const { accounts, unavailable } = useAccounts(distinctIds);
  const account = accountFor(accounts, distinctIds);

  // Collapse runs of the same screen so the timeline reads as steps, not noise.
  const steps = React.useMemo(() => {
    const out: { at: unknown; icon: string; text: string; content?: string; repeat: number }[] = [];
    for (const r of timeline.rows ?? []) {
      const d = describe(String(r[1]), String(r[2] ?? ''), String(r[3] ?? ''), num(r[4]), num(r[5]), titles);
      const last = out[out.length - 1];
      if (last && last.text === d.text) last.repeat += 1;
      else out.push({ at: r[0], ...d, repeat: 1 });
    }
    return out;
  }, [timeline.rows, titles]);

  const byDay = React.useMemo(() => {
    const groups: { day: string; items: typeof steps }[] = [];
    for (const step of steps) {
      const day = new Date(String(step.at)).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
      const group = groups[groups.length - 1];
      if (group && group.day === day) group.items.push(step);
      else groups.push({ day, items: [step] });
    }
    return groups;
  }, [steps]);

  const cell = { padding: '10px 12px', borderBottom: `1px solid ${TRACK}`, textAlign: 'left' as const };
  const head = { ...cell, fontWeight: 500, opacity: 0.6, fontSize: 12 };

  return (
    <Stack gap={4}>
      <Flex align="center" gap={3} wrap="wrap">
        <Button text="← All people" mode="ghost" fontSize={1} padding={3} onClick={onBack} />
        <Stack gap={3}>
          <Text size={3} weight="semibold">
            {account?.name ? account.name : <span style={{ fontFamily: 'monospace' }}>{id.slice(0, 8)}</span>}
          </Text>
          {account?.email ? (
            <Text size={2}>
              <a href={`mailto:${account.email}`} style={{ color: ACCENT, textDecoration: 'none' }}>
                {account.email}
              </a>
            </Text>
          ) : null}
          <Text size={1} muted>
            {account ? 'Account' : p ? (num(p[0]) ? 'Signed-in account' : 'Guest, no account') : '…'}
            {device ? ` · ${device.main}${device.sub ? ` · ${device.sub}` : ''}` : ''}
            {p && (p[7] || p[8]) ? ` · ${[p[7], p[8]].filter(Boolean).join(', ')}` : ''}
          </Text>
          {account ? (
            <Text size={1} muted>
              Joined {account.createdAt ? when(account.createdAt) : '—'}
              {account.lastSignIn ? ` · last signed in ${ago(account.lastSignIn)}` : ''}
              {account.provider ? ` · signs in with ${account.provider === 'email' ? 'email' : account.provider}` : ''}
            </Text>
          ) : null}
        </Stack>
        <Box flex={1} />
        {project && p?.[15] ? (
          <Button
            as="a"
            href={`${project.host}/project/${project.id}/person/${encodeURIComponent(String(p[15]))}`}
            target="_blank"
            rel="noreferrer"
            text="Open in PostHog"
            iconRight={LaunchIcon}
            mode="ghost"
            fontSize={1}
            padding={3}
          />
        ) : null}
      </Flex>

      {profile.error ? <Problem message={profile.error} /> : null}
      {unavailable && p && num(p[0]) ? <AccountsNotice /> : null}

      <Grid gridTemplateColumns={[1, 2, 2, 4]} gap={3}>
        <Stat label="Time in the app" value={visits.rows ? duration(totalSeconds) : '…'} sub="Active use, idle time left out" />
        <Stat
          label="Visits"
          value={p ? fmt(num(p[11])) : '…'}
          sub={p ? `First ${when(p[9])}` : ' '}
        />
        <Stat
          label="Meditations"
          value={p ? `${fmt(num(p[13]))} of ${fmt(num(p[12]))}` : '…'}
          sub={p ? `finished · ${fmt(num(p[14]) / 60)} min meditated` : ' '}
        />
        <Stat label="Last seen" value={p ? ago(p[10]) : '…'} sub={p ? when(p[10]) : ' '} />
      </Grid>

      <Grid gridTemplateColumns={[1, 1, 2]} gap={3}>
        <Panel title="Features used" hint="Screens they opened, by how many times.">
          {features.error ? (
            <Problem message={features.error} />
          ) : features.rows ? (
            <BarList
              items={features.rows.map((r) => ({ label: SECTION_NAMES[String(r[0] ?? '')] ?? String(r[0]), value: num(r[1]) }))}
              unit="views"
            />
          ) : (
            <Loading />
          )}
        </Panel>

        <Panel title="Meditations played" hint="Most recent first.">
          {meditations.error ? (
            <Problem message={meditations.error} />
          ) : !meditations.rows ? (
            <Loading />
          ) : meditations.rows.length === 0 ? (
            <Empty>No meditations played yet.</Empty>
          ) : (
            <Stack gap={3}>
              {meditations.rows.map((r) => (
                <Flex key={String(r[0])} align="center" gap={3}>
                  <Thumb id={String(r[0])} size={44} />
                  <Stack gap={2} flex={1} style={{ minWidth: 0 }}>
                    <Text size={1} weight="medium" textOverflow="ellipsis">
                      {titles.get(String(r[0])) ?? String(r[0])}
                    </Text>
                    <Text size={1} muted>
                      {num(r[2]) ? 'Finished' : 'Started'} · listened {duration(num(r[3]))} · {ago(r[4])}
                    </Text>
                  </Stack>
                </Flex>
              ))}
            </Stack>
          )}
        </Panel>
      </Grid>

      <Panel title="Content they opened" hint="Meditations, programmes, stories and yoga they looked at, most recent first.">
        {opened.error ? (
          <Problem message={opened.error} />
        ) : !opened.rows ? (
          <Loading />
        ) : opened.rows.length === 0 ? (
          <Empty>They haven&rsquo;t opened any content yet.</Empty>
        ) : (
          <Grid gridTemplateColumns={[2, 3, 4, 6]} gap={3}>
            {opened.rows.map((r) => (
              <ContentTile
                key={String(r[0])}
                id={String(r[0])}
                title={titles.get(String(r[0])) ?? String(r[0])}
                times={num(r[1])}
                last={r[2]}
              />
            ))}
          </Grid>
        )}
      </Panel>

      <Panel title="Visits" hint="Each time they opened the app. Watch replays the visit in PostHog.">
        {visits.error ? (
          <Problem message={visits.error} />
        ) : !visits.rows ? (
          <Loading />
        ) : visits.rows.length === 0 ? (
          <Empty />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={head}>Started</th>
                  <th style={head}>Active time</th>
                  <th style={head}>Screens</th>
                  <th style={head}>Came in on</th>
                  <th style={head}>Left from</th>
                  <th style={head} />
                </tr>
              </thead>
              <tbody>
                {visits.rows.map((r) => (
                  <tr key={String(r[0])}>
                    <td style={cell}>{when(r[1])}</td>
                    <td style={cell}>{duration(num(r[2]))}</td>
                    <td style={cell}>{fmt(num(r[3]))}</td>
                    <td style={cell}>{screenName(pathOf(r[4]), titles)}</td>
                    <td style={cell}>{screenName(pathOf(r[5]), titles)}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>
                      {project ? (
                        <a
                          href={`${project.host}/project/${project.id}/replay/${r[0]}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: ACCENT, textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          Watch ↗
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="What they did" hint={`Step by step, newest first, over the last ${range} days.`}>
        {timeline.error ? (
          <Problem message={timeline.error} />
        ) : !timeline.rows ? (
          <Loading />
        ) : byDay.length === 0 ? (
          <Empty />
        ) : (
          <Stack gap={5}>
            {byDay.map((group) => (
              <Stack key={group.day} gap={3}>
                <Text size={1} weight="semibold" muted>
                  {group.day}
                </Text>
                <Stack gap={1}>
                  {group.items.map((step, i) => (
                    <Flex key={i} gap={3} align="center" style={{ padding: '6px 0', borderBottom: `1px solid ${TRACK}` }}>
                      <span style={{ width: 64, flexShrink: 0, fontSize: 12, opacity: 0.6 }}>
                        {new Date(String(step.at)).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span style={{ width: 18, textAlign: 'center', color: ACCENT }}>{step.icon}</span>
                      {step.content ? <Thumb id={step.content} size={32} /> : null}
                      <Box flex={1}>
                        <Text size={1}>
                          {step.text}
                          {step.repeat > 1 ? <span style={{ opacity: 0.5 }}> ×{step.repeat}</span> : null}
                        </Text>
                      </Box>
                    </Flex>
                  ))}
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}
      </Panel>
    </Stack>
  );
}

// ---------------------------------------------------------------- page

function AnalyticsTool() {
  const client = useClient({ apiVersion: '2024-01-01' });
  const [range, setRange] = React.useState<Range>(30);
  const [project, setProject] = React.useState<Project | null>(null);
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'setup' | 'error'>('loading');
  const [problem, setProblem] = React.useState<string>();
  const [titles, setTitles] = React.useState<Map<string, string>>(new Map());
  const [artwork, setArtwork] = React.useState<Map<string, Art>>(new Map());
  const [refresh, setRefresh] = React.useState(0);
  const [view, setView] = React.useState<'overview' | 'users'>('overview');
  const [person, setPerson] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/posthog-api/project')
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as Partial<Project> & { error?: string };
        if (res.status === 503 || res.status === 404) return setStatus('setup');
        if (!res.ok) {
          setProblem(data.error);
          return setStatus('error');
        }
        setProject(data as Project);
        setStatus('ready');
      })
      .catch(() => setStatus('setup'));
  }, []);

  React.useEffect(() => {
    client
      .fetch<{ id: string; title: string; kind: string; image?: string }[]>(
        `*[_type in ["meditation", "program", "story", "yogaSession"] && defined(slug.current) && !(_id in path("drafts.**"))]{
          "id": slug.current, title, "kind": _type, "image": coalesce(cover, image).asset->url
        }`,
      )
      .then((items) => {
        setTitles(new Map(items.map((i) => [i.id, i.title])));
        setArtwork(new Map(items.map((i) => [i.id, { image: i.image, kind: i.kind }])));
      })
      .catch(() => {});
  }, [client]);

  if (status === 'loading') return <Loading />;
  if (status === 'setup') return <Setup />;
  if (status === 'error') return <Setup message={problem ?? 'PostHog refused the key.'} />;

  const key = `${range}-${refresh}`;

  return (
    <ArtworkContext.Provider value={artwork}>
    <Box padding={[3, 4, 5]} style={{ overflowY: 'auto', height: '100%' }}>
      <Stack gap={5} style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Flex align={['flex-start', 'center']} justify="space-between" gap={4} wrap="wrap">
          <Stack gap={3}>
            <Heading size={3}>Analytics</Heading>
            <Text size={1} muted>
              How people use Serenity. Only people who chose &ldquo;Share usage&rdquo; in the app are counted.
            </Text>
          </Stack>
          <Flex gap={2} align="center" wrap="wrap">
            <Card radius={2} padding={1} tone="transparent" border>
              <Flex gap={1}>
                {(
                  [
                    ['overview', 'Overview'],
                    ['users', 'Users'],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    text={label}
                    mode={view === value ? 'default' : 'bleed'}
                    tone={view === value ? 'primary' : 'default'}
                    fontSize={1}
                    padding={2}
                    onClick={() => {
                      setView(value);
                      setPerson(null);
                    }}
                  />
                ))}
              </Flex>
            </Card>
            <Card radius={2} padding={1} tone="transparent" border>
              <Flex gap={1}>
                {RANGES.map((r) => (
                  <Button
                    key={r}
                    text={`${r} days`}
                    mode={range === r ? 'default' : 'bleed'}
                    tone={range === r ? 'primary' : 'default'}
                    fontSize={1}
                    padding={2}
                    onClick={() => setRange(r)}
                  />
                ))}
              </Flex>
            </Card>
            <Button text="Refresh" mode="ghost" fontSize={1} padding={3} onClick={() => setRefresh((n) => n + 1)} />
            {project ? (
              <Button
                as="a"
                href={`${project.host}/project/${project.id}`}
                target="_blank"
                rel="noreferrer"
                text="Open PostHog"
                iconRight={LaunchIcon}
                mode="ghost"
                fontSize={1}
                padding={3}
              />
            ) : null}
          </Flex>
        </Flex>

        {view === 'users' ? (
          <React.Fragment key={key}>
            {person ? (
              <UserDetail id={person} range={range} titles={titles} project={project} onBack={() => setPerson(null)} />
            ) : (
              <UsersView range={range} titles={titles} onOpen={setPerson} />
            )}
          </React.Fragment>
        ) : (
        <React.Fragment key={key}>
          <Overview range={range} />

          <Daily range={range} />

          <Grid gridTemplateColumns={[1, 1, 2]} gap={3}>
            <TopSessions range={range} titles={titles} />
            <TopScreens range={range} titles={titles} />
          </Grid>

          <Grid gridTemplateColumns={[1, 1, 2]} gap={3}>
            <Breakdown range={range} property="$device_type" title="Devices" hint="What people use Serenity on." />
            <Breakdown range={range} property="$geoip_country_name" title="Countries" hint="Where people are, from their connection." />
          </Grid>

          <RecentVisits range={range} project={project} />
        </React.Fragment>
        )}
      </Stack>
    </Box>
    </ArtworkContext.Provider>
  );
}

export const analyticsTool: Tool = {
  name: 'analytics',
  title: 'Analytics',
  icon: ChartUpwardIcon,
  component: AnalyticsTool,
};
