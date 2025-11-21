// Game constants for star-chasers game

export const GAME_CONSTANTS = {
  // Event timings
  EVENT_CHECK_INTERVAL: 5000,
  EVENT_TRIGGER_CHANCE: 0.25,
  STAR_CAPTURE_CHOKE_TIME: 2000,
  
  // Ship tail and movement
  TAIL_LENGTH: 20,
  SPEED_INCREMENT_PER_STAR: 0.1,
  MAX_SPEED_BONUS: 2.0,
  
  // Mouse orbit
  MOUSE_ORBIT_RADIUS: 60,
  
  // Ship chatter delays (in milliseconds)
  SHIP_CHATTER_DELAY_RANGE: [9000, 16000] as [number, number],
  
  // Mobile/Touch
  LONG_PRESS_DURATION: 500, // 500ms
  CONTEXT_MENU_WIDTH: 208, // matches w-52 (4px * 52)
  CONTEXT_MENU_HEIGHT: 260,
  
  // Target star
  TARGET_STAR_RADIUS: 15,
  
  // Asteroid sizes
  ASTEROID_RADIUS: {
    large: 40,
    medium: 20,
    small: 10,
  } as const,
  
  // Collision detection
  PROJECTILE_RADIUS: 5, // Effective collision radius for bullets
  COLLISION_EPSILON: 0.5, // Floating point tolerance
  ASTEROID_RADIUS_MULTIPLIER: { // Effective collision radius scaling
    large: 1.0,
    medium: 1.0,
    small: 1.4, // Increase small asteroid collision radius by 40% for better hit detection
  } as const,
  
  // Asteroid tracking
  ASTEROID_TRACKING_STRENGTH: 0.002,
  ASTEROID_MAX_SPEED: {
    large: 1.5,
    medium: 2.0,
    small: 2.5,
  } as const,
  
  // Asteroid shape generation
  ASTEROID_SHAPE_SEGMENTS_MIN: 10,
  ASTEROID_SHAPE_SEGMENTS_RANGE: 5,
  ASTEROID_SHAPE_DIST_MIN: 0.8,
  ASTEROID_SHAPE_DIST_RANGE: 0.4,
  
  // Projectiles
  PROJECTILE_SPEED: 8,
  PROJECTILE_SHIP_VELOCITY_FACTOR: 0.5,
  PROJECTILE_LIFE: 100,
  
  // Red personality (Hothead)
  RED_LAUNCH_SPEED_MULTIPLIER: 1.2,
  RED_AFTERBURNER_DURATION: 60, // frames
  
  // Wormhole
  WORMHOLE_FADE_DURATION: 500,
  WORMHOLE_LIFETIME: 10000,
  WORMHOLE_RADIUS_MIN: 30,
  WORMHOLE_RADIUS_MAX: 50,
  WORMHOLE_TELEPORT_COOLDOWN_FRAMES: 180, // frames (3 seconds at 60fps)
  
  // Particles
  STAR_EXPLOSION_PARTICLE_COUNT: 60,
  BLINK_EXPLOSION_PARTICLE_COUNT: 30,
  
  // Ship states
  SHIP_PARALYZE_DURATION: 5000, // 5 seconds
  
  // Celebration
  CELEBRATION_BOOST_SPEED: 2.0,
  CELEBRATION_DURATION: 60, // frames
  
  // Background stars
  DEFAULT_BACKGROUND_STAR_COUNT: 200,
};
