import { GENOMES, GENOME_ORDER, type Genome } from "../data/tracks";

interface GenomeToggleProps {
  value: Genome;
  onChange: (genome: Genome) => void;
}

/**
 * Primary genome selector. Switching applies immediately: the browser is
 * re-initialised on the chosen genome with its default tracks (ruler + genes).
 * The other genome's data can still be picked on its tab and is then rendered
 * as the query genome through a genome alignment track.
 */
export function GenomeToggle({ value, onChange }: GenomeToggleProps) {
  return (
    <div className="control-row">
      <span className="control-label">Primary genome</span>
      <div className="genome-toggle" role="group" aria-label="Primary genome">
        {GENOME_ORDER.map((g) => {
          const info = GENOMES[g];
          const active = g === value;
          return (
            <button
              key={g}
              type="button"
              className={"genome-btn" + (active ? " active" : "")}
              aria-pressed={active}
              onClick={() => onChange(g)}
            >
              <span className="genome-species">{info.species}</span>
              <span className="genome-assembly">{info.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
