// Leaves carried by the wind and a few butterflies, drifting over every page.
// Purely decorative: it never receives clicks and is hidden from screen readers.

const LEAF_TONES = ["#7d8f5f", "#9aa873", "#b98a5a", "#a65f44", "#6b7f5a"];

// left = where the leaf enters (vw), size in px, dur in seconds, delay negative so
// leaves are already in the air when the page opens.
const LEAVES = [
  { left: -6, size: 18, dur: 19, delay: -2, tone: 0 },
  { left: 8, size: 14, dur: 24, delay: -11, tone: 2 },
  { left: 22, size: 20, dur: 17, delay: -7, tone: 1 },
  { left: 35, size: 13, dur: 26, delay: -19, tone: 3 },
  { left: 48, size: 17, dur: 21, delay: -4, tone: 4 },
  { left: 60, size: 15, dur: 23, delay: -15, tone: 1 },
  { left: 72, size: 19, dur: 18, delay: -9, tone: 2 },
  { left: -12, size: 16, dur: 22, delay: -13, tone: 0 },
  { left: 85, size: 14, dur: 25, delay: -21, tone: 3 }
];

const BUTTERFLIES = [
  { top: 22, left: 6, size: 30, path: "a", dur: 38, delay: 0, wing: "#d98e4a", spot: "#7a3f22" },
  { top: 58, left: 78, size: 24, path: "b", dur: 46, delay: -12, wing: "#e8c15a", spot: "#8a6a1f" },
  { top: 76, left: 30, size: 22, path: "c", dur: 52, delay: -25, wing: "#8fb3c9", spot: "#3f6072" }
];

function Leaf({ leaf }) {
  return (
    <span
      className="nature-leaf"
      style={{
        left: `${leaf.left}vw`,
        animationDuration: `${leaf.dur}s`,
        animationDelay: `${leaf.delay}s`
      }}
    >
      <svg
        className="nature-leaf-spin"
        style={{ animationDuration: `${leaf.dur / 4}s` }}
        width={leaf.size}
        height={leaf.size}
        viewBox="0 0 24 24"
      >
        <path d="M3 21C3 10 10 3 21 3c0 11-7 18-18 18Z" fill={LEAF_TONES[leaf.tone]} />
        <path d="M4.5 19.5 16 8" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1" fill="none" />
      </svg>
    </span>
  );
}

function Butterfly({ butterfly }) {
  return (
    <span
      className={`nature-butterfly nature-flight-${butterfly.path}`}
      style={{
        top: `${butterfly.top}vh`,
        left: `${butterfly.left}vw`,
        animationDuration: `${butterfly.dur}s`,
        animationDelay: `${butterfly.delay}s`
      }}
    >
      {/* viewBox is centred on the body so the wings fold towards it */}
      <svg width={butterfly.size} height={butterfly.size} viewBox="-20 -18 40 36">
        <g className="nature-wing">
          <path d="M0-2C-6-16-19-16-18-6c1 7 10 7 18 4Z" fill={butterfly.wing} />
          <path d="M0 1c-8 0-15 4-13 10 2 5 10 2 13-6Z" fill={butterfly.wing} opacity=".85" />
          <circle cx="-11" cy="-8" r="2.2" fill={butterfly.spot} />
        </g>
        <g className="nature-wing">
          <path d="M0-2C6-16 19-16 18-6c-1 7-10 7-18 4Z" fill={butterfly.wing} />
          <path d="M0 1c8 0 15 4 13 10-2 5-10 2-13-6Z" fill={butterfly.wing} opacity=".85" />
          <circle cx="11" cy="-8" r="2.2" fill={butterfly.spot} />
        </g>
        <path d="M0-7v14" stroke="#2b2420" strokeWidth="2" strokeLinecap="round" />
        <path d="M0-7c-1-4-3-6-5-7M0-7c1-4 3-6 5-7" stroke="#2b2420" strokeWidth=".8" fill="none" />
      </svg>
    </span>
  );
}

export default function NatureAir() {
  return (
    <div className="nature-air" aria-hidden="true">
      {LEAVES.map((leaf, index) => (
        <Leaf key={index} leaf={leaf} />
      ))}
      {BUTTERFLIES.map((butterfly, index) => (
        <Butterfly key={index} butterfly={butterfly} />
      ))}
    </div>
  );
}
