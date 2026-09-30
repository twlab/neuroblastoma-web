/**
 * Track catalogue for the Neuroblastoma Epigenome browser.
 *
 * `manifest.json` is a verbatim listing of every file hosted under
 * https://epigenome.wustl.edu/tychele-lab/ . This module turns each file into
 * a typed TrackDef (id, colour, label, WashU track type, ...) by looking at the
 * folder it lives in and a few stable substrings of the file name. Nothing is
 * pattern-filled: the file names on the host are irregular (see README), so we
 * only ever use URLs that were actually listed.
 *
 * To add or refresh data, update manifest.json (see scripts/check-tracks.mjs).
 */
import manifest from "./manifest.json";

export type Genome = "hg38" | "mm10";
export type AssayKey = "atac" | "rna" | "hic" | "abc";
export type TrackFileType = "bigwig" | "bigbed";

export interface CellLine {
  key: string;
  name: string;
  genome: Genome;
  description: string;
}

export interface AssayInfo {
  key: AssayKey;
  label: string;
  /** Representative colour used for group headers in the UI. */
  color: string;
  description: string;
}

export interface TrackDef {
  /** Stable id (used in the URL hash), e.g. "imr32.atac.pooled.fc" */
  id: string;
  cellLine: string;
  genome: Genome;
  assay: AssayKey;
  /** Row inside the assay group, e.g. "Pooled", "Rep 1", "Loops" */
  group: string;
  /** Short chip label, e.g. "FC", "P-val", "Peaks", "HiCCUPS" */
  label: string;
  /** Longer human description used for tooltips. */
  description: string;
  /** Legend name shown inside the genome browser. */
  name: string;
  type: TrackFileType;
  url: string;
  color: string;
  size: string;
  /** Sort key so selected tracks always appear in a sensible order. */
  order: number;
}

export const GENOMES: Record<
  Genome,
  { label: string; species: string; defaultRegion: string; geneTrack: string }
> = {
  hg38: {
    label: "hg38",
    species: "Human",
    // MYCN locus (chr2:15,940,438-15,947,007 in hg38) with flanking context.
    defaultRegion: "chr2:15800000-16100000",
    geneTrack: "refGene",
  },
  mm10: {
    label: "mm10",
    species: "Mouse",
    // Mycn locus (chr12:12,936,013-12,941,914 in mm10) with flanking context.
    defaultRegion: "chr12:12800000-13100000",
    geneTrack: "refGene",
  },
};

export const GENOME_ORDER: Genome[] = ["hg38", "mm10"];

/**
 * Pairwise genome alignments used for the comparative view, keyed
 * [primary][query]. These are the same alignment files the WashU Epigenome
 * Browser ships in its own hg38 / mm10 "Genome Comparison" annotation lists.
 * Adding a genome to the comparative view = adding an entry here.
 */
export interface AlignmentInfo {
  name: string;
  label: string;
  url: string;
}

export const ALIGNMENTS: Record<Genome, Partial<Record<Genome, AlignmentInfo>>> = {
  hg38: {
    mm10: {
      name: "hg38tomm10",
      label: "Human hg38 – Mouse mm10 alignment",
      url: "https://vizhub.wustl.edu/public/hg38/weaver/hg38_mm10_axt.gz",
    },
  },
  mm10: {
    hg38: {
      name: "mm10tohg38",
      label: "Mouse mm10 – Human hg38 alignment",
      url: "https://vizhub.wustl.edu/public/mm10/weaver/mm10_hg38_axt.gz",
    },
  },
};

/** Genomes that can be shown as query genomes (aligned) under the given primary. */
export function availableQueryGenomes(primary: Genome): Genome[] {
  return GENOME_ORDER.filter((g) => g !== primary && ALIGNMENTS[primary][g] !== undefined);
}

export const CELL_LINES: CellLine[] = [
  { key: "IMR-32", name: "IMR-32", genome: "hg38", description: "Human neuroblastoma" },
  { key: "SK-N-SH", name: "SK-N-SH", genome: "hg38", description: "Human neuroblastoma" },
  { key: "SH-SY5Y", name: "SH-SY5Y", genome: "hg38", description: "Human neuroblastoma (SK-N-SH subclone)" },
  { key: "HEK-293", name: "HEK-293", genome: "hg38", description: "Human embryonic kidney" },
  { key: "Neuro-2a", name: "Neuro-2a", genome: "mm10", description: "Mouse neuroblastoma" },
  { key: "HT-22", name: "HT-22", genome: "mm10", description: "Mouse hippocampal neuronal" },
];

export const ASSAYS: Record<AssayKey, AssayInfo> = {
  atac: {
    key: "atac",
    label: "ATAC-seq",
    color: "#2563eb",
    description: "Chromatin accessibility: fold-change and P-value signal plus narrowPeak calls (3 replicates + pooled)",
  },
  rna: {
    key: "rna",
    label: "RNA-seq",
    color: "#16a34a",
    description: "RNA-seq coverage signal, three replicates",
  },
  hic: {
    key: "hic",
    label: "Hi-C loops",
    color: "#db2777",
    description: "Chromatin loops called from Hi-C with HiCCUPS, DELTA and Mustache",
  },
  abc: {
    key: "abc",
    label: "ABC",
    color: "#7c3aed",
    description: "Activity-by-Contact enhancer–promoter interactions",
  },
};

export const ASSAY_ORDER: AssayKey[] = ["atac", "rna", "hic", "abc"];

/** Colour palette per track flavour (blue = ATAC, green = RNA, pink = Hi-C, purple = ABC). */
const COLORS = {
  atacFc: "#2563eb",
  atacPval: "#60a5fa",
  atacPeaks: "#1e3a8a",
  rna: ["#15803d", "#16a34a", "#22c55e"],
  hicHiccups: "#db2777",
  hicDelta: "#ec4899",
  hicMustache: "#f472b6",
  abc: "#7c3aed",
} as const;

const HIC_CALLERS: Record<string, { label: string; color: string; order: number; description: string }> = {
  hic: { label: "HiCCUPS", color: COLORS.hicHiccups, order: 0, description: "Loops called by HiCCUPS (Juicer merged_loops)" },
  delta: { label: "DELTA", color: COLORS.hicDelta, order: 1, description: "Localized loops called by DELTA" },
  mustache: { label: "Mustache", color: COLORS.hicMustache, order: 2, description: "Loops called by Mustache" },
};

const CELL_INDEX = new Map(CELL_LINES.map((c, i) => [c.key, i] as const));
const ASSAY_INDEX: Record<AssayKey, number> = { atac: 0, rna: 1, hic: 2, abc: 3 };

/** "HEK-293" -> "hek293", "Neuro-2a" -> "neuro2a" */
function slug(cellLine: string): string {
  return cellLine.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function fileTypeFor(path: string): TrackFileType {
  const lower = path.toLowerCase();
  if (lower.endsWith(".bw") || lower.endsWith(".bigwig")) return "bigwig";
  if (lower.endsWith(".bb") || lower.endsWith(".bigbed")) return "bigbed";
  throw new Error(`Unrecognised track file extension: ${path}`);
}

interface ManifestEntry {
  cellLine: string;
  path: string;
  size: string;
}

/** Builds a TrackDef from a manifest entry. Returns null for files we do not know how to display. */
export function trackFromManifestEntry(entry: ManifestEntry): TrackDef | null {
  const cell = CELL_LINES.find((c) => c.key === entry.cellLine);
  if (!cell) return null;

  const parts = entry.path.split("/");
  const folder = parts[1];
  const fileName = parts[parts.length - 1];
  const url = manifest.root + entry.path;
  const type = fileTypeFor(fileName);
  const cellIdx = CELL_INDEX.get(cell.key) ?? 0;
  const s = slug(cell.key);

  // order = cell line, then assay, then position inside the assay
  const mkOrder = (assay: AssayKey, within: number) =>
    cellIdx * 1000 + ASSAY_INDEX[assay] * 100 + within;

  switch (folder) {
    case "atac_seq": {
      const rep = parts[2]; // pooled | rep1 | rep2 | rep3
      const repIdx = rep === "pooled" ? 0 : Number(rep.replace("rep", ""));
      const group = rep === "pooled" ? "Pooled" : `Rep ${repIdx}`;
      const groupLegend = rep === "pooled" ? "pooled" : rep;
      let kind: "fc" | "pval" | "peaks";
      if (fileName.includes(".fc.signal")) kind = "fc";
      else if (fileName.includes(".pval.signal")) kind = "pval";
      else if (/narrowpeak/i.test(fileName)) kind = "peaks";
      else return null;

      const meta = {
        fc: { label: "FC", legend: "FC", color: COLORS.atacFc, within: 0, description: "Fold-change over control signal (bigWig)" },
        pval: { label: "P-val", legend: "P-val", color: COLORS.atacPval, within: 1, description: "-log10 P-value signal (bigWig)" },
        peaks: { label: "Peaks", legend: "peaks", color: COLORS.atacPeaks, within: 2, description: "narrowPeak calls (bigBed)" },
      }[kind];

      return {
        id: `${s}.atac.${rep}.${kind}`,
        cellLine: cell.key,
        genome: cell.genome,
        assay: "atac",
        group,
        label: meta.label,
        description: `${cell.name} ATAC-seq ${group.toLowerCase()} – ${meta.description}`,
        name: `${cell.name} ATAC ${meta.legend} ${groupLegend}`,
        type,
        url,
        color: meta.color,
        size: entry.size,
        order: mkOrder("atac", repIdx * 3 + meta.within),
      };
    }

    case "rna_seq": {
      const m = /^rep(\d)/i.exec(fileName);
      if (!m) return null;
      const repIdx = Number(m[1]);
      return {
        id: `${s}.rna.rep${repIdx}`,
        cellLine: cell.key,
        genome: cell.genome,
        assay: "rna",
        group: "Signal",
        label: `Rep ${repIdx}`,
        description: `${cell.name} RNA-seq replicate ${repIdx} coverage (bigWig)`,
        name: `${cell.name} RNA-seq rep${repIdx}`,
        type,
        url,
        color: COLORS.rna[(repIdx - 1) % COLORS.rna.length],
        size: entry.size,
        order: mkOrder("rna", repIdx),
      };
    }

    case "hic":
    case "delta":
    case "mustache": {
      const caller = HIC_CALLERS[folder];
      return {
        id: `${s}.hic.${folder === "hic" ? "hiccups" : folder}`,
        cellLine: cell.key,
        genome: cell.genome,
        assay: "hic",
        group: "Loops",
        label: caller.label,
        description: `${cell.name} Hi-C – ${caller.description} (bigBed)`,
        name: `${cell.name} Hi-C loops ${caller.label}`,
        type,
        url,
        color: caller.color,
        size: entry.size,
        order: mkOrder("hic", caller.order),
      };
    }

    case "abc": {
      return {
        id: `${s}.abc`,
        cellLine: cell.key,
        genome: cell.genome,
        assay: "abc",
        group: "Interactions",
        label: "ABC interactions",
        description: `${cell.name} Activity-by-Contact enhancer–promoter interactions (bigBed)`,
        name: `${cell.name} ABC interactions`,
        type,
        url,
        color: COLORS.abc,
        size: entry.size,
        order: mkOrder("abc", 0),
      };
    }

    default:
      return null;
  }
}

function buildCatalogue(): TrackDef[] {
  const tracks: TrackDef[] = [];
  const seen = new Set<string>();
  for (const entry of manifest.files as ManifestEntry[]) {
    const t = trackFromManifestEntry(entry);
    if (!t) {
      console.warn(`[tracks] skipping unrecognised file: ${entry.path}`);
      continue;
    }
    if (seen.has(t.id)) {
      console.warn(`[tracks] duplicate track id ${t.id} for ${entry.path}`);
      continue;
    }
    seen.add(t.id);
    tracks.push(t);
  }
  tracks.sort((a, b) => a.order - b.order);
  return tracks;
}

export const TRACKS: TrackDef[] = buildCatalogue();
export const TRACK_BY_ID: ReadonlyMap<string, TrackDef> = new Map(TRACKS.map((t) => [t.id, t]));

export function tracksForGenome(genome: Genome): TrackDef[] {
  return TRACKS.filter((t) => t.genome === genome);
}

export function cellLinesForGenome(genome: Genome): CellLine[] {
  return CELL_LINES.filter((c) => c.genome === genome);
}

/* ------------------------------------------------------------------ */
/* Conversion to WashU Epigenome Browser (wuepgg) track configuration  */
/* ------------------------------------------------------------------ */

export interface BrowserTrack {
  type: string;
  name: string;
  label?: string;
  url?: string;
  genome?: string;
  /** genomealign tracks only: the genome being aligned to the primary. */
  querygenome?: string;
  showOnHubLoad?: boolean;
  metadata?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

/**
 * Converts a catalogue entry to a browser track. When `asQuery` is set, the
 * track belongs to a query genome in the comparative view: the browser needs
 * `metadata.genome` to know the data is in that genome's coordinates and must
 * be drawn through the genomealign track.
 */
export function toBrowserTrack(t: TrackDef, asQuery = false): BrowserTrack {
  const metadata: Record<string, unknown> = {
    cell: t.cellLine,
    assay: ASSAYS[t.assay].label,
    group: t.group,
  };
  if (asQuery) metadata.genome = t.genome;
  return {
    type: t.type,
    name: t.name,
    url: t.url,
    showOnHubLoad: true,
    metadata,
    options: {
      color: t.color,
      label: asQuery ? `${t.name} (${t.genome})` : t.name,
    },
  };
}

/** Tracks that are always shown for the primary genome: a ruler and a gene annotation track. */
export function baseTracks(genome: Genome): BrowserTrack[] {
  return [
    { type: "ruler", name: "Ruler" },
    {
      type: "geneAnnotation",
      name: GENOMES[genome].geneTrack,
      genome,
      options: { maxRows: 6 },
    },
  ];
}

/** The genomealign track that attaches `query` to `primary`, or null if no alignment is configured. */
export function alignmentTrack(primary: Genome, query: Genome): BrowserTrack | null {
  const aln = ALIGNMENTS[primary][query];
  if (!aln) return null;
  return {
    type: "genomealign",
    name: aln.name,
    label: aln.label,
    querygenome: query,
    url: aln.url,
    showOnHubLoad: true,
  };
}

/** Gene annotation for a query genome, tagged so it is drawn in aligned coordinates. */
export function queryBaseTracks(query: Genome): BrowserTrack[] {
  return [
    {
      type: "geneAnnotation",
      name: GENOMES[query].geneTrack,
      genome: query,
      metadata: { genome: query },
      options: { maxRows: 6, label: `${GENOMES[query].geneTrack} (${query})` },
    },
  ];
}

/**
 * Assembles the full track list for the browser, following the layout used by
 * the WashU comparative browser: primary genome tracks first, then for each
 * query genome its alignment track, gene annotation and data tracks.
 *
 * @param primary   genome passed to GenomeHub as `genomeName`
 * @param queries   query genomes to attach (ignored if no alignment exists)
 * @param selected  selected data tracks per genome (already sorted)
 */
export function buildBrowserTracks(
  primary: Genome,
  queries: readonly Genome[],
  selected: (genome: Genome) => readonly TrackDef[],
): BrowserTrack[] {
  const out: BrowserTrack[] = [...baseTracks(primary), ...selected(primary).map((t) => toBrowserTrack(t))];
  for (const q of queries) {
    const aln = alignmentTrack(primary, q);
    if (!aln) continue;
    out.push(aln, ...queryBaseTracks(q), ...selected(q).map((t) => toBrowserTrack(t, true)));
  }
  return out;
}
