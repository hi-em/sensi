// The Sensi mark: Wren's ripple chord at its small optical size (16-48 px). Geometry is
// generated, not hand-drawn: the scoring model's own sense->sense adjustments for the demo
// home (public/demo-home.json), laid out as marks/Chord.jsx lays them out, ribbons that fired
// in 3+ rooms. The same drawing is public/favicon.svg and the portfolio plate. viewBox 0 0 512 512.
export const MARK_ARCS = {
  thermal: "M199.9,68.2 A196,196 0 0,1 312.1,68.2",
  visual: "M414.5,140.7 A196,196 0 0,1 435.1,176.4",
  acoustic: "M451.8,265.5 A196,196 0 0,1 362.1,420.8",
  spatial: "M276.7,450.9 A196,196 0 0,1 235.4,450.9",
  olfactory: "M107.2,383.5 A196,196 0 0,1 71.2,321.2",
  tactile: "M72.9,186 A196,196 0 0,1 103.8,132.5"
};
export const MARK_RIBBONS = [
  { from: "olfactory", lowers: false, d: "M126.9,366.6 A170,170 0 0,1 106.6,337.1 Q256,256 233.6,87.5 A170,170 0 0,1 269.4,86.5 Q256,256 126.9,366.6 Z" },
  { from: "acoustic", lowers: true, d: "M420.3,299.7 A170,170 0 0,1 407.5,333.1 Q256,256 269.4,86.5 A170,170 0 0,1 304.7,93.1 Q256,256 420.3,299.7 Z" },
  { from: "acoustic", lowers: true, d: "M425.8,264.3 A170,170 0 0,1 420.3,299.7 Q256,256 393.5,156 A170,170 0 0,1 411.4,187 Q256,256 425.8,264.3 Z" },
  { from: "acoustic", lowers: true, d: "M376,376.5 A170,170 0 0,1 348.1,398.9 Q256,256 273.9,425.1 A170,170 0 0,1 238.1,425.1 Q256,256 376,376.5 Z" },
  { from: "thermal", lowers: false, d: "M207.3,93.1 A170,170 0 0,1 233.6,87.5 Q256,256 106.6,337.1 A170,170 0 0,1 95.7,312.5 Q256,256 207.3,93.1 Z" },
  { from: "tactile", lowers: false, d: "M97.2,195.3 A170,170 0 0,1 108.8,171 Q256,256 393.5,356 A170,170 0 0,1 376,376.5 Q256,256 97.2,195.3 Z" },
  { from: "acoustic", lowers: false, d: "M407.5,333.1 A170,170 0 0,1 393.5,356 Q256,256 108.8,171 A170,170 0 0,1 124,148.9 Q256,256 407.5,333.1 Z" },
];
