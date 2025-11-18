export type ShipColor = 'Red' | 'Green' | 'Blue';

export type ShipPersonality =
  | 'explorer'
  | 'aggressive'
  | 'timid'
  | 'loner'
  | 'patroller';

export const PERSONALITIES: ShipPersonality[] = [
  'explorer',
  'aggressive',
  'timid',
  'loner',
  'patroller',
];

export interface ShipPersonaProfile {
  color: ShipColor;
  codename: string;
  traits: string[];
  tone: string;
}

export const SHIP_PERSONAS: Record<ShipColor, ShipPersonaProfile> = {
  Red: {
    color: 'Red',
    codename: 'Faísca',
    traits: ['impulsiva', 'competitiva', 'fala rápido'],
    tone: 'euforia confiante',
  },
  Green: {
    color: 'Green',
    codename: 'Folhagem',
    traits: ['curiosa', 'cuidadosa', 'suporte em equipe'],
    tone: 'entusiasmo gentil',
  },
  Blue: {
    color: 'Blue',
    codename: 'Cobalto',
    traits: ['analítica', 'precisa', 'observadora'],
    tone: 'frieza estratégica',
  },
};
