"use client";

import { useEffect, useState } from "react";

// The landscape at the bottom of every page: hills, trees moving in the wind,
// grass, birds, and a deer walking across. Decorative only.

const TREES = [
  { x: 110, y: 150, scale: 1.15, dur: 5.5, delay: 0, tone: "a" },
  { x: 250, y: 162, scale: 0.8, dur: 4.6, delay: -1.2, tone: "b" },
  { x: 470, y: 146, scale: 1.3, dur: 6.2, delay: -2.5, tone: "c" },
  { x: 690, y: 160, scale: 0.9, dur: 5, delay: -0.6, tone: "a" },
  { x: 930, y: 148, scale: 1.2, dur: 5.8, delay: -3.1, tone: "b" },
  { x: 1120, y: 158, scale: 0.85, dur: 4.4, delay: -1.8, tone: "c" },
  { x: 1310, y: 150, scale: 1.25, dur: 6, delay: -0.3, tone: "a" }
];

const TREE_TONES = {
  a: ["#5f7a52", "#7d9566", "#9db07f"],
  b: ["#6c8450", "#8fa468", "#aebd85"],
  c: ["#4f6b4a", "#6f8a5e", "#93a878"]
};

const GRASS = Array.from({ length: 48 }, (_, index) => ({
  x: 10 + index * 30 + ((index * 37) % 17),
  height: 12 + ((index * 53) % 14),
  delay: -((index * 0.37) % 3)
}));

function Tree({ tree }) {
  const [dark, mid, light] = TREE_TONES[tree.tone];
  return (
    <g transform={`translate(${tree.x} ${tree.y}) scale(${tree.scale})`}>
      {/* the whole tree leans with the wind from its base */}
      <g className="nature-sway" style={{ animationDuration: `${tree.dur}s`, animationDelay: `${tree.delay}s` }}>
        <path d="M-4 0c1-18 1-34 0-52h8c-1 18-1 34 0 52Z" fill="#6b4a36" />
        <path d="M0-30c-6-6-12-8-18-8M0-38c6-5 11-7 17-7" stroke="#6b4a36" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* the crown moves a little more than the trunk */}
        <g className="nature-sway-crown" style={{ animationDuration: `${tree.dur * 0.7}s`, animationDelay: `${tree.delay}s` }}>
          <circle cx="-20" cy="-52" r="20" fill={dark} />
          <circle cx="20" cy="-56" r="22" fill={dark} />
          <circle cx="0" cy="-72" r="26" fill={mid} />
          <circle cx="-12" cy="-58" r="16" fill={mid} />
          <circle cx="10" cy="-80" r="14" fill={light} />
          <circle cx="-14" cy="-76" r="10" fill={light} />
        </g>
      </g>
    </g>
  );
}

function Deer() {
  const leg = (x, delay, shade) => (
    <g className="nature-leg" style={{ animationDelay: `${delay}s` }}>
      <path d={`M${x} 46h5l-1 30h-3Z`} fill={shade} />
      <rect x={x + 0.5} y="75" width="4" height="3" rx="1" fill="#3b2a20" />
    </g>
  );

  return (
    <div className="nature-walker">
      <svg className="nature-walker-bob" width="120" height="92" viewBox="0 0 120 92">
        {/* far-side legs first so they sit behind the body */}
        {leg(40, -0.45, "#6a4630")}
        {leg(76, 0, "#6a4630")}
        <path d="M30 34c2-8 14-10 30-10s26 2 30 10c3 7 0 16-8 18-12 3-36 3-46 0-8-2-9-11-6-18Z" fill="#8a5d3f" />
        <path d="M38 50c12 3 34 3 44 0-6 5-36 5-44 0Z" fill="#e9d9c3" />
        <path d="M82 30c2-8 5-14 10-20l8 4c-4 7-5 14-6 22Z" fill="#8a5d3f" />
        <path d="M90 10c2-5 9-7 15-5 4 2 7 5 8 8-3 3-9 4-14 3-5-1-8-3-9-6Z" fill="#8a5d3f" />
        <circle cx="111" cy="12" r="1.6" fill="#2b1d16" />
        <circle cx="104" cy="8.5" r="1.2" fill="#2b1d16" />
        <path d="M94 6c-3-3-6-4-9-3 1 3 4 5 8 5Z" fill="#6a4630" />
        <path d="M97 5c0-5-2-9-6-12M95-1c-3-1-5-1-7 0M99 5c2-5 5-8 9-9M102-1c2-1 4-1 6 0" stroke="#5a3d2b" strokeWidth="1.6" fill="none" strokeLinecap="round" transform="translate(0 4)" />
        <path d="M30 34c-4-2-6 0-6 3 2 2 5 1 6-3Z" fill="#e9d9c3" />
        {leg(46, 0, "#8a5d3f")}
        {leg(82, -0.45, "#8a5d3f")}
      </svg>
    </div>
  );
}

function Bird({ top, dur, delay, size }) {
  return (
    <div className="nature-bird" style={{ top, animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>
      <svg width={size} height={size / 2} viewBox="-16 -8 32 16">
        <path className="nature-bird-wing" d="M0 2C-5-6-11-6-15-2" stroke="#4b4038" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path className="nature-bird-wing nature-bird-wing-right" d="M0 2C5-6 11-6 15-2" stroke="#4b4038" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function NatureFooter() {
  const [motionOff, setMotionOff] = useState(false);

  // Remember the choice on this device.
  useEffect(() => {
    let saved = false;
    try {
      saved = window.localStorage.getItem("mruda-motion") === "off";
    } catch {
      saved = false;
    }
    setMotionOff(saved);
    document.documentElement.dataset.motion = saved ? "off" : "on";
  }, []);

  function toggleMotion() {
    const next = !motionOff;
    setMotionOff(next);
    document.documentElement.dataset.motion = next ? "off" : "on";
    try {
      window.localStorage.setItem("mruda-motion", next ? "off" : "on");
    } catch {
      // The choice simply lasts until the page is closed.
    }
  }

  return (
    <footer className="nature-footer">
      <div className="nature-scene" aria-hidden="true">
        <Bird top="18px" dur={34} delay={-6} size={26} />
        <Bird top="42px" dur={41} delay={-22} size={20} />

        <svg className="nature-land" viewBox="0 0 1440 220" preserveAspectRatio="xMidYMax slice">
          <path d="M0 150c160-50 320-60 520-30s340 20 520-20 280-30 400 10v110H0Z" fill="#e3e9d6" />
          <path d="M0 172c200-34 380-30 600-12s420 6 840-18v78H0Z" fill="#cdd8ba" />
          {TREES.map((tree, index) => (
            <Tree key={index} tree={tree} />
          ))}
          <path d="M0 190c240-18 480-14 720-6s480 4 720-8v44H0Z" fill="#a9b98f" />
          {GRASS.map((blade, index) => (
            <path
              key={index}
              className="nature-grass"
              style={{ animationDelay: `${blade.delay}s` }}
              d={`M${blade.x} 204q-2-${blade.height / 2} 0-${blade.height}M${blade.x + 5} 204q3-${blade.height / 2} 1-${blade.height - 3}M${blade.x - 5} 204q-3-${blade.height / 2} -1-${blade.height - 4}`}
              stroke="#7c9166"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
            />
          ))}
          <path d="M0 204c360-6 1080-6 1440 0v16H0Z" fill="#93a67a" />
        </svg>

        <Deer />
      </div>

      <div className="nature-footer-bar">
        <span>Mruda Eco Village</span>
        <button type="button" onClick={toggleMotion} aria-pressed={motionOff}>
          {motionOff ? "Turn animation on" : "Turn animation off"}
        </button>
      </div>
    </footer>
  );
}
