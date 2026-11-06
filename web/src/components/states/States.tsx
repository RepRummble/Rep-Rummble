import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, CloudOff, Inbox, Lock, RefreshCw, SearchX, TriangleAlert, WifiOff, type LucideIcon } from 'lucide-react';
import '../../styles/states.css';

/** A shimmering placeholder block, so a page shows the shape of what is coming instead of a spinner. */
export function Skeleton({ w = '100%', h = 14, r = 8, style }: { w?: number | string; h?: number | string; r?: number; style?: CSSProperties }) {
  return <span className="st-skel" style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />;
}

type SkeletonKind = 'kpis' | 'cards' | 'table' | 'form' | 'list';

/** Placeholder layouts that match the pages they stand in for. */
export function SkeletonPage({ kind = 'cards', label = 'Loading' }: { kind?: SkeletonKind; label?: string }) {
  return (
    <div className="st-skel-page" role="status" aria-live="polite" aria-busy="true">
      <span className="st-sr">{label}…</span>
      {(kind === 'kpis' || kind === 'cards') && (
        <div className="st-skel-kpis">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="st-skel-card"><Skeleton w="48%" h={12} /><Skeleton w="62%" h={30} r={10} style={{ margin: '12px 0 10px' }} /><Skeleton w="80%" h={11} /></div>
          ))}
        </div>
      )}
      {kind === 'cards' && (
        <div className="st-skel-split">
          <div className="st-skel-card"><Skeleton w="36%" h={16} /><div className="st-skel-bars">{[40, 64, 52, 82, 58, 90, 70].map((h, i) => <Skeleton key={i} w="100%" h={`${h}%`} r={8} />)}</div></div>
          <div className="st-skel-card"><Skeleton w="42%" h={16} />{[0, 1, 2, 3].map((i) => <div key={i} className="st-skel-row"><Skeleton w={36} h={36} r={12} /><div style={{ flex: 1 }}><Skeleton w="70%" h={12} /><Skeleton w="40%" h={10} style={{ marginTop: 8 }} /></div></div>)}</div>
        </div>
      )}
      {kind === 'table' && (
        <div className="st-skel-card">
          <Skeleton w="30%" h={16} style={{ marginBottom: 18 }} />
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="st-skel-row"><Skeleton w={34} h={34} r={999} /><Skeleton w="22%" h={12} /><Skeleton w="16%" h={12} /><Skeleton w="20%" h={12} style={{ marginLeft: 'auto' }} /></div>)}
        </div>
      )}
      {kind === 'list' && [0, 1, 2].map((i) => <div key={i} className="st-skel-card" style={{ marginBottom: 14 }}><Skeleton w="40%" h={16} /><Skeleton w="90%" h={11} style={{ margin: '12px 0 8px' }} /><Skeleton w="64%" h={11} /></div>)}
      {kind === 'form' && (
        <div className="st-skel-card">{[0, 1, 2].map((i) => <div key={i} style={{ marginBottom: 18 }}><Skeleton w="26%" h={12} style={{ marginBottom: 8 }} /><Skeleton w="100%" h={44} r={12} /></div>)}</div>
      )}
    </div>
  );
}

interface Action { label: string; to?: string; onClick?: () => void }
const ActionButton = ({ a, primary = true }: { a: Action; primary?: boolean }) =>
  a.to ? <Link className={`rr-btn ${primary ? 'rr-btn-primary' : 'rr-btn-outline'}`} to={a.to}>{a.label}</Link>
       : <button type="button" className={`rr-btn ${primary ? 'rr-btn-primary' : 'rr-btn-outline'}`} onClick={a.onClick}>{a.label}</button>;

function Shell({ icon: Icon, tone, title, children, actions }: { icon: LucideIcon; tone: 'brand' | 'warn' | 'danger' | 'info'; title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className={`st-state is-${tone}`} role={tone === 'danger' || tone === 'warn' ? 'alert' : 'status'}>
      <span className="st-icon"><Icon size={26} /></span>
      <h2>{title}</h2>
      <p>{children}</p>
      {actions && <div className="st-actions">{actions}</div>}
    </div>
  );
}

/** Nothing here yet: say why, then offer one next step. */
export function EmptyState({ icon = Inbox, title, why, action, secondary }: { icon?: LucideIcon; title: string; why: ReactNode; action?: Action; secondary?: Action }) {
  return <Shell icon={icon} tone="brand" title={title} actions={(action || secondary) && <>{action && <ActionButton a={action} />}{secondary && <ActionButton a={secondary} primary={false} />}</>}>{why}</Shell>;
}

/** Something failed: what went wrong, whose side it is, and how to fix it. */
export function ErrorState({ title, detail, fault = 'us', onRetry, retryLabel = 'Try again', action }: { title?: string; detail?: string; fault?: 'us' | 'you' | 'network'; onRetry?: () => void; retryLabel?: string; action?: Action }) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const kind = offline ? 'network' : fault;
  const lead = kind === 'network' ? 'We could not reach the server. Check your connection, then try again.'
    : kind === 'you' ? 'This needs a small change on your side.'
    : 'That was on our side, not yours. Nothing you did caused it.';
  return (
    <Shell
      icon={kind === 'network' ? WifiOff : TriangleAlert}
      tone="danger"
      title={title ?? (kind === 'network' ? 'You seem to be offline' : kind === 'you' ? 'We need one thing from you' : 'Something went wrong')}
      actions={<>{onRetry && <button type="button" className="rr-btn rr-btn-primary" onClick={onRetry}><RefreshCw size={16} /> {retryLabel}</button>}{action && <ActionButton a={action} primary={!onRetry} />}</>}
    >
      {lead}{detail && <> <span className="st-detail">{detail}</span></>}
    </Shell>
  );
}

/** A search found nothing: suggest what to try next. */
export function NoResults({ query, suggestions = [], onPick }: { query: string; suggestions?: string[]; onPick?: (s: string) => void }) {
  return (
    <Shell icon={SearchX} tone="info" title={`No results for “${query}”`} actions={suggestions.length > 0 && <div className="st-chips" role="group" aria-label="Try instead">{suggestions.map((s) => <button key={s} type="button" className="st-chip" onClick={() => onPick?.(s)}>{s}</button>)}</div>}>
      Check the spelling, or try a broader word.
    </Shell>
  );
}

/** Access was refused: explain why we need it and give a way back. */
export function PermissionDenied({ title = 'You do not have access to this page', why, action, secondary }: { title?: string; why: ReactNode; action?: Action; secondary?: Action }) {
  return <Shell icon={Lock} tone="warn" title={title} actions={<>{action && <ActionButton a={action} />}{secondary && <ActionButton a={secondary} primary={false} />}</>}>{why}</Shell>;
}

/** Confirm, reassure, then show what happens next. */
export function SuccessState({ title, detail, next, action }: { title: string; detail?: ReactNode; next?: ReactNode; action?: Action }) {
  return (
    <Shell icon={CheckCircle2} tone="brand" title={title} actions={action && <ActionButton a={action} />}>
      {detail}{next && <><br /><span className="st-next">{next}</span></>}
    </Shell>
  );
}

/** A slim bar at the top of the page when the connection drops, and a short "back online" note after. */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [justBack, setJustBack] = useState(false);
  useEffect(() => {
    let timer = 0;
    const down = () => { window.clearTimeout(timer); setOnline(false); setJustBack(false); };
    const up = () => { setOnline(true); setJustBack(true); timer = window.setTimeout(() => setJustBack(false), 3500); };
    window.addEventListener('offline', down);
    window.addEventListener('online', up);
    return () => { window.removeEventListener('offline', down); window.removeEventListener('online', up); window.clearTimeout(timer); };
  }, []);
  if (online && !justBack) return null;
  return (
    <div className={`st-offline${online ? ' is-back' : ''}`} role="status" aria-live="polite">
      {online ? <><CheckCircle2 size={16} /> Back online.</> : <><CloudOff size={16} /> You are offline. Pages you already opened still work; changes will not save until you reconnect.</>}
    </div>
  );
}

/** Inline form message tied to a field, with how to fix it. */
export function FieldMessage({ id, kind, children }: { id?: string; kind: 'error' | 'ok' | 'hint'; children: ReactNode }) {
  return <small id={id} className={`st-field is-${kind}`} role={kind === 'error' ? 'alert' : undefined}>{children}</small>;
}
