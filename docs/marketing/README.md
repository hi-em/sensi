# Sensi marketing cuts

Two masters, same picture:

- `sensi-45s-16x9.mp4` — 43.9 s, **silent**. For posting natively on Reels /
  TikTok, where you add platform audio in-app (best for discovery reach).
- `sensi-45s-16x9-scored.mp4` — same cut with a **bespoke ambient bed** baked
  in. For LinkedIn / YouTube / X, where the file's own audio is all there is.

Both are cut from the week-9 demo clips (`../week09/deliverables/deck/assets/clips/`).

Storyboard: hook card → intro card → full-screen act interstitials between
onboard (moodboard, persona reveal), shape (scoring, edit glow, checkpoint
ripple, topology, galaxy) and the report before/after render (hero) → end card
(team · MaCAD awards 2026 Design Copilots). Brand cards carry the live
six-sense ring, breathing exactly like `SensiAvatar.jsx` on the site
(0.14→0.55 opacity, 3 s loop, 0.5 s cascade per ring).

## Re-cutting

Requires Python (with `pillow`) and ffmpeg (`winget install Gyan.FFmpeg`).

```
python build/gen_cards.py     # regenerate cards + animated ring frames (only if text/design changes)
python build/build_video.py   # re-render the silent video
python build/gen_audio.py     # compose the ambient bed + mux the scored video
```

All cut points live in the `EDL` list at the top of `build/build_video.py`
(`in`/`out` are source seconds, `speed` is the time-lapse factor; card `dur`s
must match gen_cards.py). Change numbers, rerun, done. `build/segs/` and
`build/anim/` are scratch folders of intermediate renders — safe to delete.

## The score

`build/gen_audio.py` synthesises the ambient bed from scratch (numpy/scipy) —
original, so zero licensing risk. It's a LIGHT, weightless, space-like bed (Eno
"An Ending" / Ólafur Arnalds air): a high open-voiced D-major pad + faint
shimmer, no heavy low end and no drum pulse, sitting low in the mix. The six
senses map to an ascending D-major climb (D E F# A B C#): one soft GLASSY
twinkle per sense as it appears (pure harmonic partials — celeste, not a bell),
resolving up to the octave D at the before/after hero reveal. Beat timings are
pulled from `build_video.EDL`, so the music stays locked to the picture even if
you re-cut. Knobs at the top: `BED_PEAK` sets overall level; the `warm` layer
gain is the only low end (drop it for an even airier bed); per-layer envelopes
shape the arc. `build/sensi_bed.wav` is the intermediate render — safe to delete.

Fonts in `build/fonts/` (Inter, JetBrains Mono) are under the SIL Open Font License.
