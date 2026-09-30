import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserPane } from "./components/BrowserPane";
import { GenomeToggle } from "./components/GenomeToggle";
import { TrackPicker, type Selection } from "./components/TrackPicker";
import { ViewSummary } from "./components/ViewSummary";
import {
  availableQueryGenomes,
  buildBrowserTracks,
  GENOMES,
  GENOME_ORDER,
  TRACK_BY_ID,
  tracksForGenome,
  type Genome,
  type TrackDef,
} from "./data/tracks";
import manifest from "./data/manifest.json";
import { parseHash, writeHash } from "./urlState";

type RegionState = Record<Genome, string>;

function emptySelection(): Record<Genome, Set<string>> {
  const sel = {} as Record<Genome, Set<string>>;
  for (const g of GENOME_ORDER) sel[g] = new Set();
  return sel;
}

/** Sets are never mutated in place, so one shared empty selection is safe. */
const EMPTY_SELECTION: Selection = emptySelection();

function selectionFromIds(ids: readonly string[]): Selection {
  const sel = emptySelection();
  for (const id of ids) {
    const g = TRACK_BY_ID.get(id)?.genome;
    if (g) sel[g].add(id);
  }
  return sel;
}

function readInitialState() {
  const url = parseHash(window.location.hash);
  const primary: Genome = url.genome ?? "hg38";
  // A link with tracks restores that exact view; otherwise start with defaults only.
  const applied = url.trackIds ? selectionFromIds(url.trackIds) : EMPTY_SELECTION;
  const region = {} as RegionState;
  for (const g of GENOME_ORDER) region[g] = GENOMES[g].defaultRegion;
  if (url.region) region[primary] = url.region;
  return { primary, applied, region };
}

const INITIAL = readInitialState();
const HASH_DEBOUNCE_MS = 400;

export default function App() {
  // Primary genome = coordinate system of the browser. Applies immediately.
  const [primary, setPrimary] = useState<Genome>(INITIAL.primary);
  // Check marks in the picker (both genomes). Nothing renders until applied.
  const [draft, setDraft] = useState<Selection>(INITIAL.applied);
  // What the browser is actually rendering.
  const [applied, setApplied] = useState<Selection>(INITIAL.applied);
  // Region (in primary-genome coordinates) the browser is (re)initialised with.
  // Only updated when the view is rebuilt, never on every pan/zoom.
  const [region, setRegion] = useState<RegionState>(INITIAL.region);
  const [activeTab, setActiveTab] = useState<Genome>(INITIAL.primary);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  // Latest region reported by the browser, per primary genome.
  const liveRegion = useRef<RegionState>({ ...INITIAL.region });

  /* ---------------------------- derived state ---------------------------- */

  const rendered = useMemo(() => {
    const m = new Map<Genome, TrackDef[]>();
    for (const g of GENOME_ORDER) m.set(g, tracksForGenome(g).filter((t) => applied[g].has(t.id)));
    return m;
  }, [applied]);

  // The other genome becomes the query genome as soon as any of its tracks are rendered.
  const queries = useMemo(
    () => availableQueryGenomes(primary).filter((q) => (rendered.get(q)?.length ?? 0) > 0),
    [primary, rendered],
  );

  const browserTracks = useMemo(
    () => buildBrowserTracks(primary, queries, (g) => rendered.get(g) ?? []),
    [primary, queries, rendered],
  );

  const pending = useMemo(() => {
    let add = 0;
    let remove = 0;
    for (const g of GENOME_ORDER) {
      for (const id of draft[g]) if (!applied[g].has(id)) add++;
      for (const id of applied[g]) if (!draft[g].has(id)) remove++;
    }
    return { add, remove };
  }, [draft, applied]);
  const isPending = pending.add + pending.remove > 0;

  const draftCount = GENOME_ORDER.reduce((n, g) => n + draft[g].size, 0);
  const renderedCount = GENOME_ORDER.reduce((n, g) => n + (rendered.get(g)?.length ?? 0), 0);

  /* ------------------------------- URL hash ------------------------------ */

  const appliedIds = useMemo(
    () => [primary, ...GENOME_ORDER.filter((g) => g !== primary)].flatMap((g) => (rendered.get(g) ?? []).map((t) => t.id)),
    [primary, rendered],
  );

  const latest = useRef({ primary, appliedIds });
  latest.current = { primary, appliedIds };
  const hashTimer = useRef<number | undefined>(undefined);

  const flushHash = useCallback(() => {
    window.clearTimeout(hashTimer.current);
    hashTimer.current = undefined;
    const { primary: g, appliedIds: ids } = latest.current;
    try {
      writeHash({ genome: g, trackIds: ids, region: liveRegion.current[g] });
    } catch {
      // Safari rate-limits history.replaceState; a missed update is harmless.
    }
  }, []);

  const scheduleHash = useCallback(() => {
    window.clearTimeout(hashTimer.current);
    hashTimer.current = window.setTimeout(flushHash, HASH_DEBOUNCE_MS);
  }, [flushHash]);

  useEffect(() => {
    flushHash();
  }, [primary, appliedIds, flushHash]);

  // Support pasting a link into the same tab / back-forward between hashes.
  useEffect(() => {
    const onHashChange = () => {
      const url = parseHash(window.location.hash);
      const g = url.genome ?? latest.current.primary;
      if (url.genome) {
        setPrimary(url.genome);
        setActiveTab(url.genome);
      }
      if (url.trackIds) {
        const sel = selectionFromIds(url.trackIds);
        setApplied(sel);
        setDraft(sel);
      }
      if (url.region) {
        const r = url.region;
        liveRegion.current[g] = r;
        setRegion((prev) => ({ ...prev, [g]: r }));
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  /* -------------------------------- actions ------------------------------ */

  const handleRegionChange = useCallback(
    (g: Genome, r: string) => {
      liveRegion.current[g] = r;
      scheduleHash();
    },
    [scheduleHash],
  );

  /** Carry the user's current position over to the next browser initialisation. */
  const commitLiveRegion = useCallback(() => {
    setRegion((prev) => {
      const live = liveRegion.current[primary];
      return prev[primary] === live ? prev : { ...prev, [primary]: live };
    });
  }, [primary]);

  // --- draft (check marks) -------------------------------------------------

  const setManyDraft = useCallback((ids: string[], on: boolean) => {
    setDraft((prev) => {
      const next: Partial<Record<Genome, Set<string>>> = {};
      for (const id of ids) {
        const g = TRACK_BY_ID.get(id)?.genome;
        if (!g) continue;
        const set = (next[g] ??= new Set(prev[g]));
        if (on) set.add(id);
        else set.delete(id);
      }
      return Object.keys(next).length ? { ...prev, ...next } : prev;
    });
  }, []);

  const toggleDraft = useCallback(
    (id: string) => {
      const g = TRACK_BY_ID.get(id)?.genome;
      if (!g) return;
      setDraft((prev) => {
        const next = new Set(prev[g]);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { ...prev, [g]: next };
      });
    },
    [],
  );

  const clearDraft = () => setDraft(EMPTY_SELECTION);

  // --- applying -------------------------------------------------------------

  /** Render the current check marks: the only way data tracks reach the browser. */
  const updateBrowser = () => {
    if (!isPending) return;
    commitLiveRegion();
    setApplied(draft);
  };

  const discardChanges = () => setDraft(applied);

  /** Immediate: re-initialise the browser on the new genome with its default tracks only. */
  const changePrimary = (g: Genome) => {
    if (g === primary) return;
    commitLiveRegion();
    setPrimary(g);
    setApplied(EMPTY_SELECTION);
    setActiveTab(g);
  };

  const copyLink = async () => {
    flushHash();
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link:", window.location.href);
    }
  };

  /* --------------------------------- view -------------------------------- */

  return (
    <div className={"app" + (sidebarOpen ? "" : " collapsed")}>
      <aside className="sidebar" aria-label="Track selection">
        <div className="sidebar-top">
          <div className="brand">
            <div>
              <h1>Neuroblastoma Epigenome</h1>
              <p className="tagline">
                ATAC-seq, RNA-seq, Hi-C loops and ABC interactions across six cell lines.
              </p>
            </div>
            <button
              type="button"
              className="icon-btn"
              title="Hide panel"
              aria-label="Hide track panel"
              onClick={() => setSidebarOpen(false)}
            >
              ‹
            </button>
          </div>

          <GenomeToggle value={primary} onChange={changePrimary} />

          <div className="status">
            <span>
              <strong>{draftCount}</strong> checked · <strong>{renderedCount}</strong> rendered
            </span>
            <span className="spacer" />
            <button type="button" className="link-btn" onClick={clearDraft} disabled={!draftCount}>
              Uncheck all
            </button>
            <button type="button" className="link-btn" onClick={copyLink} title="Link to the rendered view">
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>

        <div className="sidebar-scroll">
          <TrackPicker
            primary={primary}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            draft={draft}
            onToggle={toggleDraft}
            onSetMany={setManyDraft}
          />
        </div>

        <div className={"action-bar" + (isPending ? " pending" : "")}>
          <button type="button" className="primary-btn" onClick={updateBrowser} disabled={!isPending}>
            Update browser
            {isPending && (
              <span className="btn-count">
                {pending.add > 0 && `+${pending.add}`}
                {pending.add > 0 && pending.remove > 0 && " "}
                {pending.remove > 0 && `−${pending.remove}`}
              </span>
            )}
          </button>
          <button type="button" className="link-btn" onClick={discardChanges} disabled={!isPending}>
            Discard
          </button>
          <span className="action-hint">{isPending ? "Unapplied changes" : "Browser is up to date"}</span>
        </div>

        <footer className="about">
          <p>
            Track files are hosted at{" "}
            <a href={manifest.root} target="_blank" rel="noreferrer">
              epigenome.wustl.edu/tychele-lab
            </a>
            . Human cell lines (HEK-293, IMR-32, SK-N-SH, SH-SY5Y) are on hg38; mouse cell lines (HT-22,
            Neuro-2a) are on mm10. Visualization by the{" "}
            <a href="https://epigenomegateway.wustl.edu/" target="_blank" rel="noreferrer">
              WashU Epigenome Browser
            </a>
            .
          </p>
        </footer>
      </aside>

      <main className="browser">
        {!sidebarOpen && (
          <button
            type="button"
            className="show-panel"
            onClick={() => setSidebarOpen(true)}
            aria-label="Show track panel"
          >
            › Tracks
          </button>
        )}
        <ViewSummary
          primary={primary}
          queries={queries}
          rendered={rendered}
          pending={pending}
          onUpdate={updateBrowser}
          onDiscard={discardChanges}
        />
        <div className="browser-host">
          <BrowserPane
            genome={primary}
            region={region[primary]}
            tracks={browserTracks}
            onRegionChange={handleRegionChange}
          />
        </div>
      </main>
    </div>
  );
}
