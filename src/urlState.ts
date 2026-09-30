/**
 * Shareable URL state. The primary genome, the *applied* tracks (what the
 * browser is rendering) and the current view region are mirrored into the URL
 * hash, e.g.
 *
 *   #g=hg38&t=imr32.atac.pooled.fc,neuro2a.rna.rep1&r=chr2:15800000-16100000
 *
 * Track ids encode their genome via the cell line, so ids of both genomes can
 * share one list; tracks of the non-primary genome are rendered as the query
 * genome through the genome alignment. Only the hash is used so the app works
 * from any static host (GitHub Pages) without server-side routing.
 */
import { GENOMES, TRACK_BY_ID, type Genome } from "./data/tracks";

export interface UrlState {
  genome: Genome;
  trackIds: string[];
  region: string | null;
}

const REGION_RE = /^[A-Za-z0-9_.]+:\d+-\d+$/;

export function isGenome(value: unknown): value is Genome {
  return typeof value === "string" && value in GENOMES;
}

/** Normalises "chr2:15,800,000-16,100,000" -> "chr2:15800000-16100000"; returns null if invalid. */
export function normaliseRegion(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/,/g, "").replace(/\s+/g, "");
  return REGION_RE.test(cleaned) ? cleaned : null;
}

export function parseHash(hash: string): Partial<UrlState> {
  const out: Partial<UrlState> = {};
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return out;
  const params = new URLSearchParams(raw);

  const g = params.get("g");
  if (isGenome(g)) out.genome = g;

  const t = params.get("t");
  if (t !== null) {
    const ids: string[] = [];
    for (const part of t.split(",")) {
      const id = part.trim();
      if (id && TRACK_BY_ID.has(id) && !ids.includes(id)) ids.push(id);
    }
    out.trackIds = ids;
  }

  const r = normaliseRegion(params.get("r"));
  if (r) out.region = r;

  return out;
}

export function buildHash(state: UrlState): string {
  const params = new URLSearchParams();
  params.set("g", state.genome);
  // Always present (even empty) so a cleared selection round-trips as cleared.
  params.set("t", state.trackIds.join(","));
  if (state.region) params.set("r", state.region);
  // Keep commas/colons readable in the address bar.
  return "#" + params.toString().replace(/%2C/gi, ",").replace(/%3A/gi, ":");
}

export function writeHash(state: UrlState): void {
  if (typeof window === "undefined") return;
  const next = buildHash(state);
  if (window.location.hash === next) return;
  window.history.replaceState(null, "", next);
}

/**
 * The browser reports the current view region through onSessionUpdate. The
 * exact shape is not part of the documented API, so accept the plausible
 * forms and give up (return null) on anything else.
 */
export function regionToString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return normaliseRegion(value);
  if (Array.isArray(value)) return value.length ? regionToString(value[0]) : null;
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if ("genomeCoordinate" in v) return regionToString(v.genomeCoordinate);
    const chr = v.chr ?? v.chrom ?? v.chromosome ?? v.name;
    const start = v.start;
    const end = v.end;
    if (typeof chr === "string" && typeof start === "number" && typeof end === "number") {
      return normaliseRegion(`${chr}:${Math.round(start)}-${Math.round(end)}`);
    }
    if (typeof v.toString === "function") {
      const s = String(value);
      if (s !== "[object Object]") return normaliseRegion(s);
    }
  }
  return null;
}
