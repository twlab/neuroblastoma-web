/**
 * Minimal type declarations for the `wuepgg` package (WashU Epigenome Browser
 * as a React component). The published package does not ship a .d.ts yet, so
 * this shim documents the props we rely on. Delete this file once the package
 * provides its own types.
 *
 * Reference: https://www.npmjs.com/package/wuepgg
 */
declare module "wuepgg" {
  import type { ComponentType } from "react";

  export interface StoreConfig {
    /** Unique id; state for each id is namespaced separately in localStorage. */
    storeId: string;
    /** Default true. When false the instance resets on every prop update. */
    enablePersistence?: boolean;
  }

  export interface TrackConfig {
    type: string;
    name?: string;
    label?: string;
    url?: string;
    /** Annotation tracks: assembly the annotation belongs to. */
    genome?: string;
    /** genomealign tracks: the query genome aligned to the primary genome. */
    querygenome?: string;
    showOnHubLoad?: boolean;
    /** `metadata.genome` marks a track as being in a query genome's coordinates. */
    metadata?: Record<string, unknown>;
    options?: Record<string, unknown>;
  }

  export interface SessionData {
    title?: string;
    userViewRegion?: unknown;
    tracks?: unknown[];
    [key: string]: unknown;
  }

  export type ViewRegionProp = string | { genomeCoordinate: unknown } | null;

  export interface GenomeHubProps {
    storeConfig: StoreConfig;
    viewRegion: ViewRegionProp;
    genomeName: string;
    tracks: TrackConfig[];
    chromosomes?: unknown;
    showGenomeNavigator?: boolean;
    showNavBar?: boolean;
    showToolBar?: boolean;
    showDisclosure?: boolean;
    width?: number;
    height?: number;
    windowWidth?: number;
    darkMode?: boolean;
    onSessionUpdate?: (data: SessionData | null) => void;
  }

  export const GenomeHub: ComponentType<GenomeHubProps>;

  export interface GenomeViewerProps {
    genomeName: string;
    tracks: TrackConfig[];
    viewRegion?: string;
    windowWidth?: number;
    customGenome?: unknown;
  }
  export const GenomeViewer: ComponentType<GenomeViewerProps>;

  export function useSessionData(): SessionData | null;
}

declare module "wuepgg/style.css";
