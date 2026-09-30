import { memo, useCallback, useRef } from "react";
import { GenomeHub, type SessionData, type StoreConfig } from "wuepgg";
import "wuepgg/style.css";
import type { BrowserTrack, Genome } from "../data/tracks";
import { regionToString } from "../urlState";

interface BrowserPaneProps {
  /** Primary genome: the coordinate system of the view. */
  genome: Genome;
  /** Region to (re)initialise the browser with. Only changes when the track set changes. */
  region: string;
  /** Complete, ordered track list (base tracks, data tracks, genomealign + query tracks). Reference must be stable between renders. */
  tracks: BrowserTrack[];
  /** Fired whenever the user navigates inside the browser (region is in primary-genome coordinates). */
  onRegionChange: (genome: Genome, region: string) => void;
}

/**
 * One store per primary genome. Persistence is disabled on purpose: this app
 * owns the state (track selection + region live in React state and the URL
 * hash), so the embedded browser should simply mirror the props it is given
 * rather than restoring a stale session from localStorage.
 */
const STORE_CONFIGS: Record<Genome, StoreConfig> = {
  hg38: { storeId: "neuroblastoma-hg38", enablePersistence: false },
  mm10: { storeId: "neuroblastoma-mm10", enablePersistence: false },
};

function BrowserPaneImpl({ genome, region, tracks, onRegionChange }: BrowserPaneProps) {
  // Keep the callback identity stable so it never counts as a "prop update".
  // (Assigned during render, so a freshly remounted instance always reports
  // under the correct genome, even if it fires before any effects run.)
  const latest = useRef({ genome, onRegionChange });
  latest.current = { genome, onRegionChange };

  const handleSession = useCallback((session: SessionData | null) => {
    if (!session) return;
    const r = regionToString(session.userViewRegion);
    if (r) latest.current.onRegionChange(latest.current.genome, r);
  }, []);

  return (
    <GenomeHub
      key={genome}
      storeConfig={STORE_CONFIGS[genome]}
      viewRegion={region}
      genomeName={genome}
      tracks={tracks}
      showGenomeNavigator={true}
      showNavBar={true}
      showToolBar={true}
      darkMode={false}
      onSessionUpdate={handleSession}
    />
  );
}

export const BrowserPane = memo(BrowserPaneImpl);
