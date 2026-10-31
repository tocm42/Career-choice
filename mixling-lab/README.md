# Mixling Lab

A creature-mixing game for children. Open `index.html` in any browser; there is nothing to install.

## Playing on a TV

The screen is a fixed 16:9 layout that scales to fit, so it mirrors cleanly over AirPlay or a cable. It works by touch or with a keyboard/remote: arrow keys move, Enter (OK) picks or mixes, M mixes, Q opens the quest board, B goes back.

## 3D creatures

Every creature is a real-time 3D model built from parts (body, head, ears, eyes, mouth, wings, legs, tail and extras) and rendered in the browser with Three.js, so every possible mix gets a proper 3D picture. Tiles use rendered snapshots; the preview and reveal screens show a live turntable. If WebGL is unavailable the game falls back to drawn creatures.

Files: `index.html` (game), `creature3d.js` (3D builder and renderer), `vendor/` (Three.js, MIT licence).

## How to play

1. Tap a creature to put it in the **Top half** pod (gives the head and wings).
2. Tap another for the **Bottom half** pod (gives the body, legs and tail).
3. Press **MIX!** and meet your new Mixling.
4. Mix Mixlings together to make Super, Mega and Ultra Mixlings.

## What's inside

- **12 starting creatures** across 6 habitats: Sky, Forest, Mountains, Sea, Desert and Ice (Desert and Ice unlock through quests).
- **Over 130 first-generation Mixlings**, and endless more by mixing mixes. About 1 in 7 is secretly **Sparkly**.
- **9 secret Legends** found through riddles, two of which need a two-step recipe.
- **Side quests** that earn stars, which can be spent on clues.
- Progress is saved in the browser.
