# ✨ Procedural Star Chasers

> *Where gravity becomes art, and competition becomes poetry.*

## 🌌 Concept

In the infinite expanse of a procedurally-generated cosmos, three sentient vessels navigate a universe of perpetual motion. Each ship—Red, Green, Blue—possesses its own personality, aspirations, and philosophy. They chase celestial bodies, compete for dominance, form unlikely alliances, and contemplate the meaning of existence in an ever-shifting starfield.

**Procedural Star Chasers** is not just a game about collecting stars. It's a meditation on autonomy, emergence, and the delicate balance between individual ambition and collective survival. Watch as AI-driven ships develop their own strategies, engage in philosophical radio chatter, and respond dynamically to the cosmos around them.

### Artistic Vision

Like **Monument Valley**, this experience embraces:
- **Impossible Geometries** - The playfield bends and shifts, creating unexpected orbital patterns
- **Minimal Aesthetic** - A dark cosmos punctuated by purposeful visual elements
- **Ambient Soundscape** - Music and effects that evolve with the gameplay state
- **Narrative Through Mechanics** - The ships' personalities emerge through their actions and voices, not exposition
- **Meditative Gameplay** - Whether you're orchestrating chaos or observing serene orbits, there's always something to contemplate

---

## 🎮 Features

### Dynamic AI Behavior
- **3 Unique Personas**: Each ship has distinct priorities, risk profiles, and philosophies
- **Personality-Driven Decision Making**: Ships adapt their strategies based on game state
- **Emergent Stories**: Watch interactions unfold organically through gameplay

### Procedural Generation
- **Infinite Cosmos**: No two sessions are identical
- **Dynamic Celestial Events**: Meteor showers, gravitational anomalies, and stellar phenomena
- **Adaptive Difficulty**: The universe responds to player interaction

### Rich Audio Experience
- **Context-Aware Music**: The soundtrack shifts between competitive, cooperative, and celebratory modes
- **AI Radio Chatter**: Ships communicate through personality-driven dialogue reflecting game context
- **Dynamic Sound Design**: Engine hum, orbit ambience, and effects that react to ship state

### Progressive Web App
- **Offline Capable**: Play anywhere, anytime
- **Native-Like Experience**: Fullscreen immersion on mobile and desktop
- **Responsive Design**: Seamlessly adapts across devices

---

## 🛠️ Technology Stack

### Frontend Framework
- **Angular 20** - Modern component-driven architecture with signals and change detection optimization
- **TypeScript 5.8** - Type-safe game logic and component composition
- **Tailwind CSS** - Utility-first styling for responsive UI

### Build & Runtime
- **Angular CLI & Vite** - Lightning-fast development server and optimized production builds
- **RxJS 7.8** - Reactive programming for event handling and state management
- **Browser APIs**:
  - **Web Audio API** - High-performance audio playback with dynamic control
  - **Canvas 2D** - Real-time graphics rendering for game viewport
  - **Screen Wake Lock** - Prevents device sleep during gameplay

### Architecture Decisions

#### Why Angular?
- **Component-Driven**: Clean separation of concerns (game logic, UI, services)
- **Dependency Injection**: Easy service composition for audio, constellation, and ship management
- **Signals API**: Fine-grained reactivity without ngZone complexity
- **Strong Typing**: Catch errors at compile-time, not runtime

#### Why Canvas Over WebGL?
- **Simplicity**: Elegant 2D rendering for the visual aesthetic
- **Performance**: Sufficient for our procedurally-rendered cosmos
- **Immediate Mode**: Direct control over visual state synchronization

#### Audio Strategy
- **Preload "auto"**: Ensures audio files load before playback attempts
- **Broken Sound Detection**: Gracefully handles corrupted or unsupported audio formats
- **Retry Logic**: Recovers from autoplay policy restrictions
- **Volume Interpolation**: Smooth transitions between dynamic audio states

### Project Structure

```
procedural-star-chasers/
├── src/
│   ├── components/
│   │   ├── star-chasers/          # Main game component (2400+ lines)
│   │   ├── particle-clock/        # Time display component
│   │   └── constellation-formation/ # Constellation mode UI
│   ├── services/
│   │   ├── audio.service.ts        # Audio playback & management
│   │   ├── constellation.service.ts # Constellation logic
│   │   ├── radio-chatter.service.ts # AI dialogue system
│   │   └── screen-wake-lock.service.ts # Device sleep prevention
│   ├── models/
│   │   ├── ship.ts                # Ship entity definition
│   │   ├── ship-personas.ts       # Personality profiles
│   │   ├── vector2d.ts            # Vector math utilities
│   │   └── radio-chatter.ts       # Radio context types
│   ├── data/
│   │   └── radio-chatter/         # Dialogue data (Red, Green, Blue)
│   └── assets/
│       ├── sounds/                # 20+ audio effects
│       └── ico/                   # PWA icons & favicons
├── angular.json                   # Angular CLI configuration
├── manifest.json                  # PWA manifest
├── index.html                     # Entry point with PWA meta tags
└── tsconfig.json                  # TypeScript configuration
```

---

## 🎯 Game Mechanics

### Ship Personalities

**Red** - The Aggressive Competitor
- *Philosophy*: "Speed is everything. The void waits for no one."
- *Style*: Reckless acceleration, competitive radio chatter
- *Strength*: High maneuverability, quick reaction times

**Green** - The Harmonious Collaborator
- *Philosophy*: "Together we are stronger. Unity defeats entropy."
- *Style*: Supportive actions, encouraging dialogue
- *Strength*: Cooperative assists, stabilizing influence

**Blue** - The Analytical Observer
- *Philosophy*: "Precision. Data. The universe is a calculation."
- *Style*: Calculated movements, philosophical musings
- *Strength*: Optimal trajectory planning, predictive behavior

### Game Modes

**Normal Mode** - The ships compete for stars in an ever-present cosmic stage.

**Asteroid Event** - A meteor shower forces the ships into cooperation. Will they unite or fragment under pressure?

**Constellation Mode** - Order the ships to form patterns and achieve specific formations.

---

## 🔊 Audio System

The audio landscape is carefully orchestrated:

### Background Music
- **Normal Mode**: Ambient "Deep Space" theme (ambient, contemplative)
- **Hunting Mode**: Intense competitive track (rare, activated during high-speed pursuit)
- **Cooperative Mode**: Heroic, inspiring theme (triggered during asteroid events)
- **Victory Mode**: Triumphant fanfare (celebratory)

### Dynamic Sound Design
- **Engine Hum**: Changes volume and pitch based on ship velocity
- **Orbit Ambience**: Subtly shifts frequency during orbital mechanics
- **Radio Chatter**: Context-aware ship dialogue reflecting game state

### Effect Categories
- **One-Shots**: Immediate feedback (star capture, launch, impacts)
- **Sound Pools**: Multiple instances for overlapping effects (explosions, laser fire)
- **Loops**: Continuous soundscapes with dynamic modulation

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Development
```bash
npm install
npm run dev          # Start dev server on localhost:3000
```

### Production Build
```bash
npm run build        # Optimized production bundle
npm run preview      # Test production build locally
```

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

---

## 🎨 Visual Design

### Color Palette
- **Background**: Deep space black (`#0a0e27`)
- **Ships**: Red, Green, Blue (distinct, readable on dark background)
- **Stars**: Bright, pulsing white/cyan
- **Particles**: Color-matched to originating ships
- **UI**: Minimal, semi-transparent overlays

### Animation Philosophy
- **Smooth Easing**: Quadratic/cubic easing for natural motion
- **Persistent Trails**: Ship tails fade gradually for visual continuity
- **Particle Effects**: Celebrate moments (captures, explosions) with purposeful particles
- **Canvas Rendering**: 60 FPS target with efficient redraw optimization

---

## 📱 PWA Features

Procedural Star Chasers is fully installable as a Progressive Web App:

- **Offline Support**: Core game logic persists without network connection
- **Fullscreen Immersion**: Native app-like experience with no browser chrome
- **Home Screen Icon**: Seamless installation on mobile devices
- **Responsive Layout**: Adapts from mobile portrait to desktop landscape
- **Dark Theme**: Optimized for dark mode devices and OLED screens

**Installation:**
1. Visit the deployed app URL
2. Look for "Add to Home Screen" (iOS) or install prompt (Android)
3. Launch as a standalone app

---

## 🎭 AI & Procedural Systems

### Ship Behavior Tree
Each ship evaluates:
- **Proximity** to other ships and stars
- **Energy** levels and ability cooldowns
- **Game State** (hunting, cooperating, defending)
- **Personality** traits affecting decision weights

### Radio Chatter System
Ships communicate contextually with 7 categories:
- `proximity` - Near misses and close encounters
- `star_capture` - Successful collection
- `meteor_event` - Defensive coordination
- `paralyzed` - Distress calls
- `rescue` - Assistance and relief
- `launch` - Acceleration and propulsion
- `philosophical` - Existential musings (rare, <10min intervals)

### Procedural Generation
- **Star Spawning**: Distributed across canvas with variance in brightness
- **Asteroid Patterns**: Wave generation with increasing complexity
- **Event Timing**: Random but weighted distribution of game events
- **Field Generation**: Background stars recreated each session with seed-based variation

---

## 🔮 Future Roadmap

- [ ] Multiplayer Support (WebSocket-based real-time competition)
- [ ] Advanced Formations (Configurable constellation patterns)
- [ ] Mobile Touch Controls (Optimized for mobile gameplay)
- [ ] Sound Design Overhaul (Professional audio assets)
- [ ] Level Editor (Custom game scenarios)
- [ ] Accessibility Features (Screen reader support, colorblind modes)

---

## 🤝 Contributing

This project is actively developed. Contributions, bug reports, and feature suggestions are welcome!

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👨‍💻 Author

Created by **Bolivar Alencastro**

*A meditation on autonomy, competition, and the cosmos.*

---

> **"In the vast expanse of space, three ships discover that even in isolation, they're never truly alone."**
