
import { TreeType } from './types';

export const COLORS = {
  HEALTHY: '#4ade80',
  WILTING: '#3f3f46',
  DEAD: '#18181b',
  BACKGROUND: '#020502',
  ACCENT: '#22c55e',
  PREMIUM: '#fbbf24'
};

export const TREE_CONFIGS = {
  [TreeType.OAK]: { color: '#166534', trunk: '#5d4037', description: 'Sturdy and timeless forest green.' },
  [TreeType.CHERRY_BLOSSOM]: { color: '#ffb7c5', trunk: '#6d4c41', description: 'Fleeting beauty in pink.' },
  [TreeType.PINE]: { color: '#3f6212', trunk: '#4e342e', description: 'Evergreen focus.' },
  [TreeType.BAMBOO]: { color: '#22c55e', trunk: '#064e3b', description: 'Rapid and resilient growth.' },
  [TreeType.CACTUS]: { color: '#a3e635', trunk: '#14532d', description: 'Survivalist endurance.' },
  [TreeType.MAPLE]: { color: '#ef4444', trunk: '#4e342e', description: 'Vibrant change.' },
  [TreeType.BAOBAB]: { color: '#f59e0b', trunk: '#8d6e63', description: 'The tree of life.' },
  [TreeType.CEDAR]: { color: '#115e59', trunk: '#5d2e2e', description: 'Ancient strength with a warm bark.' },
  [TreeType.WILLOW]: { color: '#84cc16', trunk: '#4e342e', description: 'Fluid and graceful weeping branches.' },
  [TreeType.SEQUOIA]: { color: '#14532d', trunk: '#8d4422', description: 'Titan of the grove with massive trunk.' },
  [TreeType.BONSAI]: { color: '#22c55e', trunk: '#4e342e', description: 'Disciplined beauty.' }
};

export const QUOTES = [
  "Silence is the soil where deep focus grows.",
  "Nature does not hurry, yet everything is accomplished.",
  "Deep roots weather the harshest winters.",
  "The taller the Sequoia, the quieter the forest floor.",
  "Be like the willow: fluid in action, rooted in purpose.",
  "Every great grove began with a single, silent seed.",
  "Growth is a quiet revolution happening in the marrow of the wood.",
  "Patience is the water that turns stone into moss.",
  "Listen to the wind through the needles; it knows the way home.",
  "The canopy is only as strong as the heartwood is deep.",
  "In the quiet of the grove, time becomes secondary to being."
];

export const MUSIC_TRACKS = [
  { id: 'none', name: 'Silence', url: '' },
  { id: 'zen', name: 'Ambient Resonance', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'nature', name: 'Forest Whispers', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' }
];
