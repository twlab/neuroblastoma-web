import type { CSSProperties } from "react";
import {
  ASSAYS,
  ASSAY_ORDER,
  cellLinesForGenome,
  GENOMES,
  GENOME_ORDER,
  tracksForGenome,
  type AssayKey,
  type CellLine,
  type Genome,
  type TrackDef,
} from "../data/tracks";

export type Selection = Record<Genome, ReadonlySet<string>>;

interface TrackPickerProps {
  /** Coordinate system of the browser; tracks of any other genome are rendered as query tracks. */
  primary: Genome;
  activeTab: Genome;
  onTabChange: (genome: Genome) => void;
  /** Draft selection (check marks). Nothing is rendered until "Update browser" is pressed. */
  draft: Selection;
  onToggle: (id: string) => void;
  onSetMany: (ids: string[], on: boolean) => void;
}

/**
 * One tab per genome, each listing every track of that genome's cell lines.
 * Both tabs are kept mounted (hidden) so expanded/collapsed panels survive
 * tab switches.
 */
export function TrackPicker({ primary, activeTab, onTabChange, draft, onToggle, onSetMany }: TrackPickerProps) {
  return (
    <div className="picker">
      <div className="tabs" role="tablist" aria-label="Data by genome">
        {GENOME_ORDER.map((g) => {
          const info = GENOMES[g];
          const active = g === activeTab;
          const role = g === primary ? "primary" : "query";
          return (
            <button
              key={g}
              type="button"
              role="tab"
              id={`tab-${g}`}
              aria-selected={active}
              aria-controls={`panel-${g}`}
              className={"tab" + (active ? " active" : "")}
              onClick={() => onTabChange(g)}
            >
              <span className="tab-name">
                {info.species} <span className="genome-assembly">{info.label}</span>
              </span>
              <span className="tab-meta">
                <span className={"role-badge " + role}>{role}</span>
                <span className={"badge" + (draft[g].size ? " badge-on" : "")}>{draft[g].size}</span>
              </span>
            </button>
          );
        })}
      </div>

      {GENOME_ORDER.map((g) => (
        <div
          key={g}
          role="tabpanel"
          id={`panel-${g}`}
          aria-labelledby={`tab-${g}`}
          hidden={g !== activeTab}
          className="tab-panel"
        >
          <GenomePanel
            genome={g}
            role={g === primary ? "primary" : "query"}
            primary={primary}
            selected={draft[g]}
            onToggle={onToggle}
            onSetMany={onSetMany}
          />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */

function GenomePanel({
  genome,
  role,
  primary,
  selected,
  onToggle,
  onSetMany,
}: {
  genome: Genome;
  role: "primary" | "query";
  primary: Genome;
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onSetMany: (ids: string[], on: boolean) => void;
}) {
  const tracks = tracksForGenome(genome);
  const cellLines = cellLinesForGenome(genome);
  const ids = tracks.map((t) => t.id);
  const count = ids.filter((id) => selected.has(id)).length;

  return (
    <section className={"genome-panel " + role}>
      <p className="panel-note">
        {role === "primary" ? (
          <>
            Rendered in <strong>{GENOMES[genome].label}</strong> coordinates (primary genome).
          </>
        ) : (
          <>
            Rendered as <strong>query genome</strong>: aligned to {GENOMES[primary].label} through the{" "}
            {GENOMES[primary].label}–{GENOMES[genome].label} genome alignment.
          </>
        )}
        <span className="panel-count">
          {count} of {ids.length} checked
          {count > 0 && (
            <>
              {" · "}
              <button type="button" className="link-btn" onClick={() => onSetMany(ids, false)}>
                uncheck all
              </button>
            </>
          )}
        </span>
      </p>

      <QuickPicks tracks={tracks} selected={selected} onSetMany={onSetMany} />

      {cellLines.map((cl) => (
        <CellLinePanel
          key={cl.key}
          cellLine={cl}
          tracks={tracks.filter((t) => t.cellLine === cl.key)}
          selected={selected}
          onToggle={onToggle}
          onSetMany={onSetMany}
        />
      ))}
    </section>
  );
}

/* ---------------------------------------------------------------- */

interface QuickPick {
  label: string;
  assay: AssayKey;
  match: (t: TrackDef) => boolean;
}

const QUICK_PICKS: QuickPick[] = [
  { label: "ATAC FC (pooled)", assay: "atac", match: (t) => t.assay === "atac" && t.id.endsWith(".pooled.fc") },
  { label: "ATAC peaks (pooled)", assay: "atac", match: (t) => t.assay === "atac" && t.id.endsWith(".pooled.peaks") },
  { label: "RNA-seq rep 1", assay: "rna", match: (t) => t.assay === "rna" && t.id.endsWith(".rep1") },
  { label: "Hi-C HiCCUPS", assay: "hic", match: (t) => t.assay === "hic" && t.id.endsWith(".hiccups") },
  { label: "ABC", assay: "abc", match: (t) => t.assay === "abc" },
];

function QuickPicks({
  tracks,
  selected,
  onSetMany,
}: {
  tracks: TrackDef[];
  selected: ReadonlySet<string>;
  onSetMany: (ids: string[], on: boolean) => void;
}) {
  return (
    <section className="quick">
      <h2 className="section-title">Check across all cell lines</h2>
      <div className="chips">
        {QUICK_PICKS.map((q) => {
          const ids = tracks.filter(q.match).map((t) => t.id);
          if (!ids.length) return null;
          const allOn = ids.every((id) => selected.has(id));
          const someOn = !allOn && ids.some((id) => selected.has(id));
          return (
            <Chip
              key={q.label}
              label={q.label}
              color={ASSAYS[q.assay].color}
              on={allOn}
              partial={someOn}
              title={`${allOn ? "Uncheck" : "Check"} ${q.label} for ${ids.length === 1 ? "this cell line" : `all ${ids.length} cell lines`}`}
              onClick={() => onSetMany(ids, !allOn)}
            />
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

function CellLinePanel({
  cellLine,
  tracks,
  selected,
  onToggle,
  onSetMany,
}: {
  cellLine: CellLine;
  tracks: TrackDef[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onSetMany: (ids: string[], on: boolean) => void;
}) {
  const ids = tracks.map((t) => t.id);
  const count = ids.filter((id) => selected.has(id)).length;

  return (
    <details className="cell" open>
      <summary className="cell-summary">
        <span className="cell-name">{cellLine.name}</span>
        <span className="cell-desc">{cellLine.description}</span>
        <span className={"badge" + (count ? " badge-on" : "")} aria-label={`${count} checked`}>
          {count}
        </span>
      </summary>
      <div className="cell-body">
        <div className="cell-actions">
          <button type="button" className="link-btn" onClick={() => onSetMany(ids, true)}>
            Check all {ids.length}
          </button>
          <button type="button" className="link-btn" onClick={() => onSetMany(ids, false)} disabled={!count}>
            Uncheck
          </button>
        </div>
        {ASSAY_ORDER.map((assay) => {
          const assayTracks = tracks.filter((t) => t.assay === assay);
          if (!assayTracks.length) return null;
          return (
            <AssayGroup
              key={assay}
              assay={assay}
              tracks={assayTracks}
              selected={selected}
              onToggle={onToggle}
              onSetMany={onSetMany}
            />
          );
        })}
      </div>
    </details>
  );
}

/* ---------------------------------------------------------------- */

function AssayGroup({
  assay,
  tracks,
  selected,
  onToggle,
  onSetMany,
}: {
  assay: AssayKey;
  tracks: TrackDef[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onSetMany: (ids: string[], on: boolean) => void;
}) {
  const info = ASSAYS[assay];
  const ids = tracks.map((t) => t.id);
  const count = ids.filter((id) => selected.has(id)).length;
  const allOn = count === ids.length;

  // Preserve first-seen order of row groups (Pooled, Rep 1, Rep 2, Rep 3 ...)
  const rows: { group: string; tracks: TrackDef[] }[] = [];
  for (const t of tracks) {
    const row = rows.find((r) => r.group === t.group);
    if (row) row.tracks.push(t);
    else rows.push({ group: t.group, tracks: [t] });
  }
  const showRowLabels = rows.length > 1;

  return (
    <div className="assay" style={{ "--assay": info.color } as CSSProperties}>
      <div className="assay-head">
        <span className="assay-dot" aria-hidden="true" />
        <span className="assay-label" title={info.description}>
          {info.label}
        </span>
        <span className="assay-count">
          {count}/{ids.length}
        </span>
        <button
          type="button"
          className="link-btn"
          onClick={() => onSetMany(ids, !allOn)}
          aria-label={`${allOn ? "Uncheck" : "Check all"} ${info.label} tracks`}
        >
          {allOn ? "none" : "all"}
        </button>
      </div>
      {rows.map((row) => (
        <div className="assay-row" key={row.group}>
          {showRowLabels && <span className="row-label">{row.group}</span>}
          <div className="chips">
            {row.tracks.map((t) => (
              <Chip
                key={t.id}
                label={t.label}
                color={t.color}
                on={selected.has(t.id)}
                title={`${t.description} · ${t.size}`}
                onClick={() => onToggle(t.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */

/** A check-mark style toggle. `on` = checked (will be rendered after Update). */
function Chip({
  label,
  color,
  on,
  partial = false,
  title,
  onClick,
}: {
  label: string;
  color: string;
  on: boolean;
  partial?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={partial ? "mixed" : on}
      className={"chip" + (on ? " on" : "") + (partial ? " partial" : "")}
      style={{ "--chip": color } as CSSProperties}
      title={title}
      onClick={onClick}
    >
      <span className="chip-check" aria-hidden="true">
        {on ? "✓" : partial ? "–" : ""}
      </span>
      {label}
    </button>
  );
}
