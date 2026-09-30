import type { CSSProperties } from "react";
import { ALIGNMENTS, GENOMES, type Genome, type TrackDef } from "../data/tracks";

interface ViewSummaryProps {
  primary: Genome;
  /** Query genomes currently attached (those with applied tracks). */
  queries: readonly Genome[];
  /** Applied (rendered) data tracks per genome. */
  rendered: ReadonlyMap<Genome, readonly TrackDef[]>;
  /** Draft differs from what is rendered. */
  pending: { add: number; remove: number };
  onUpdate: () => void;
  onDiscard: () => void;
}

/**
 * Information bar shown above the genome browser: which genome is primary,
 * which is the query, and exactly which data tracks are being rendered.
 */
export function ViewSummary({ primary, queries, rendered, pending, onUpdate, onDiscard }: ViewSummaryProps) {
  const primaryInfo = GENOMES[primary];
  const primaryTracks = rendered.get(primary) ?? [];
  const isPending = pending.add + pending.remove > 0;

  return (
    <section className="view-summary" aria-label="Current browser view">
      <div className="vs-row">
        <span className="role-badge primary">Primary</span>
        <span className="vs-genome">
          {primaryInfo.species} <span className="genome-assembly">{primaryInfo.label}</span>
        </span>
        <span className="vs-base">Ruler · RefSeq genes ({primaryInfo.label})</span>
        <TrackPills tracks={primaryTracks} emptyText="no data tracks" />
      </div>

      {queries.length === 0 ? (
        <div className="vs-row muted">
          <span className="role-badge query">Query</span>
          <span className="vs-genome">none</span>
          <span className="vs-base">
            Check data on the other genome's tab and press <em>Update browser</em> to compare it here through a
            genome alignment.
          </span>
        </div>
      ) : (
        queries.map((q) => {
          const info = GENOMES[q];
          const aln = ALIGNMENTS[primary][q];
          return (
            <div className="vs-row" key={q}>
              <span className="role-badge query">Query</span>
              <span className="vs-genome">
                {info.species} <span className="genome-assembly">{info.label}</span>
              </span>
              <span className="vs-base">
                Aligned to {primaryInfo.label}
                {aln ? ` (${aln.name})` : ""} · RefSeq genes ({info.label})
              </span>
              <TrackPills tracks={rendered.get(q) ?? []} emptyText="no data tracks" />
            </div>
          );
        })
      )}

      {isPending && (
        <div className="vs-pending" role="status">
          <span>
            Selection changed
            {pending.add > 0 && <> · <strong>+{pending.add}</strong> to add</>}
            {pending.remove > 0 && <> · <strong>−{pending.remove}</strong> to remove</>}
            . The browser below still shows the previous selection.
          </span>
          <button type="button" className="primary-btn small" onClick={onUpdate}>
            Update browser
          </button>
          <button type="button" className="link-btn" onClick={onDiscard}>
            Discard changes
          </button>
        </div>
      )}
    </section>
  );
}

function TrackPills({ tracks, emptyText }: { tracks: readonly TrackDef[]; emptyText: string }) {
  if (!tracks.length) return <span className="vs-empty">{emptyText}</span>;
  return (
    <ul className="pills" aria-label="Rendered data tracks">
      {tracks.map((t) => (
        <li key={t.id} className="pill" style={{ "--chip": t.color } as CSSProperties} title={t.description}>
          {t.name}
        </li>
      ))}
    </ul>
  );
}
