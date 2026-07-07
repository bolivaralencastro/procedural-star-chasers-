# Procedural Star Chasers

Canvas-driven space playground built with Angular 20. Three autonomous ships chase stars, react to asteroid waves, exchange radio chatter, and can briefly be handed over to the player for manual control.

![Procedural Star Chasers preview](./src/assets/og/og-image-facebook-&-og-padrão-1200%20x%20630.png)

## What the project is

This is an interactive simulation, not a level-based game. The appeal is in watching behavior emerge:

- ships compete for stars and accelerate as they score
- asteroid events force temporary cooperation
- radio chatter reflects what is happening on screen
- cursor orbit, wormholes, and pilot mode let you interfere with the system

## Current interaction model

### Desktop

- Drag with the cursor to pull ships into orbit, then release to launch them
- Right click to open the in-game context menu
- Click when cursor orbit is disabled to create a wormhole
- Press `P` to control the single orbiting ship manually
- Use arrow keys to steer in pilot mode
- Press `Space` to fire and `R` to reload in pilot mode
- Press `M` to toggle cursor orbit / wormhole mode
- Press `S` to mute or unmute
- Press `F` to toggle fullscreen

### Mobile

- Use the floating action button to open controls
- Tap ships to give them a small speed boost
- Long press on the canvas to open the mobile control menu

## Stack

- Angular 20
- TypeScript
- Canvas 2D
- RxJS
- Tailwind utilities

## Project structure

```text
src/
  components/
    about-dialog/
    particle-clock/
    star-chasers/
  data/
    radio-chatter/
  models/
  services/
```

The game logic is already split across focused managers inside `src/components/star-chasers/`, so it is practical to keep evolving without returning to one giant component.

## Run locally

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:3000`.

## Build

```bash
npm run build
```

Production output is generated in `dist/`.

## What should improve next

- add a deployed homepage URL to the repository
- publish screenshots or a short gameplay GIF in the README
- tighten bundle size and dependency hygiene
- expose game state more clearly in the HUD
- document the simulation systems with less fiction and more implementation detail
