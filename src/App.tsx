import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Heart, Shield, Sword, Zap, ChevronRight, Skull, 
  User, Eye, Flame, Move, Hexagon, Store, 
  Play, Settings, Volume2, Maximize, Download, Upload, 
  HelpCircle, Backpack, X, Sparkles, Ghost, Trash2,
  Crosshair, Crown, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Hand,
  Save, RotateCcw, MousePointer2, Monitor, Snowflake, Activity,
  Droplet, Layers, BookOpen, Anchor
} from 'lucide-react';

// --- Constants & Config ---
const MAP_WIDTH = 40;
const MAP_HEIGHT = 25;
const TILE_SIZE = 24;
const VISIBILITY_RADIUS = 7;
const MAX_INVENTORY = 25;

// --- Visual Styles ---
const RARITIES = {
  common: { color: 'text-slate-400', border: 'border-slate-600', bg: 'bg-slate-800/50', shadow: '' },
  uncommon: { color: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-900/40', shadow: 'shadow-[0_0_10px_rgba(52,211,153,0.1)]' },
  rare: { color: 'text-cyan-400', border: 'border-cyan-500', bg: 'bg-cyan-900/40', shadow: 'shadow-[0_0_10px_rgba(34,211,238,0.2)]' },
  epic: { color: 'text-violet-400', border: 'border-violet-500', bg: 'bg-violet-900/40', shadow: 'shadow-[0_0_15px_rgba(167,139,250,0.3)]' },
  legendary: { color: 'text-amber-400', border: 'border-amber-500', bg: 'bg-amber-900/40', shadow: 'shadow-[0_0_20px_rgba(251,191,36,0.4)]' },
};

const COSMETICS = {
  default: { id: 'default', name: 'Wanderer', color: 'text-white', icon: <User size={20}/>, cost: 0, desc: 'The humble beginning.' },
  red_phantom: { id: 'red_phantom', name: 'Crimson Ghost', color: 'text-red-500', icon: <Ghost size={20}/>, cost: 150, desc: 'A vengeful spirit.' },
  golden_king: { id: 'golden_king', name: 'Golden King', color: 'text-yellow-400', icon: <Crown size={20}/>, cost: 500, desc: 'Regal attire.' },
  neon_runner: { id: 'neon_runner', name: 'Neon Runner', color: 'text-pink-400', icon: <Zap size={20}/>, cost: 300, desc: 'Unstable energy.' },
  void_walker: { id: 'void_walker', name: 'Void Walker', color: 'text-purple-400', icon: <Skull size={20}/>, cost: 1000, desc: 'Part of the abyss.' },
};

// --- Audio Engine ---
class AudioEngine {
  ctx: AudioContext | null = null;
  nextNoteTime: number = 0;
  musicVolume: number = 0.3;
  sfxVolume: number = 0.4;
  isPlaying: boolean = false;
  
  scale = [220, 261.63, 293.66, 329.63, 392.00, 440]; 

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.startMusicLoop();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolumes(music: number, sfx: number) {
    this.musicVolume = music;
    this.sfxVolume = sfx;
  }

  playTone(freq: number, type: OscillatorType, duration: number, volMultiplier: number = 1) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(this.sfxVolume * volMultiplier, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playNoise(duration: number) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.sfxVolume * 0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    noise.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
  }

  sfxHit() { this.playNoise(0.1); this.playTone(100, 'sawtooth', 0.1); }
  sfxStep() { this.playNoise(0.05); }
  sfxMagic() { this.playTone(440, 'sine', 0.3); this.playTone(880, 'sine', 0.3, 0.5); }
  sfxUI() { this.playTone(800, 'square', 0.05, 0.2); }
  sfxLevelUp() { 
    this.playTone(440, 'triangle', 0.5); 
    setTimeout(() => this.playTone(554, 'triangle', 0.5), 100);
    setTimeout(() => this.playTone(659, 'triangle', 0.8), 200);
  }
  sfxTrash() { this.playNoise(0.2); this.playTone(60, 'sawtooth', 0.2); }
  sfxEquip() { this.playTone(600, 'sine', 0.1); }

  startMusicLoop() {
    if (!this.ctx) return;
    const scheduler = () => {
        if (!this.ctx) return;
        while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
            this.playMusicNote(this.nextNoteTime);
            this.nextNoteTime += 0.4; // Tempo
        }
        if (this.isPlaying) requestAnimationFrame(scheduler);
    };
    this.nextNoteTime = this.ctx.currentTime;
    this.isPlaying = true;
    scheduler();
  }

  playMusicNote(time: number) {
    if (!this.ctx || this.musicVolume <= 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    const note = this.scale[Math.floor(Math.random() * this.scale.length)] / (Math.random() > 0.7 ? 2 : 1);
    
    osc.frequency.setValueAtTime(note, time);
    osc.type = 'triangle';
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(this.musicVolume * 0.2, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(time);
    osc.stop(time + 2);
  }
}

const audio = new AudioEngine();

// --- Types ---
type Position = { x: number; y: number };
type EntityType = 'player' | 'enemy' | 'item' | 'stairs' | 'dummy';
type Rarity = keyof typeof RARITIES;
type ClassType = 'Warrior' | 'Rogue' | 'Mage';
type EnemyBehavior = 'aggressive' | 'ranged' | 'healer' | 'passive';

interface StatusEffect {
  type: 'burn' | 'freeze' | 'stun';
  duration: number;
  value?: number;
}

interface Spell {
  id: string;
  name: string;
  manaCost: number;
  type: 'projectile' | 'self' | 'aoe' | 'chain';
  dmg?: number;
  heal?: number;
  range?: number;
  effect?: { type: 'burn' | 'freeze' | 'stun', duration: number, value?: number };
  icon: React.ReactNode;
  description: string;
}

interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'accessory' | 'consumable';
  rarity: Rarity;
  itemPower: number;
  stats: {
    dmg?: number;
    def?: number;
    hp?: number;
    crit?: number;
    mana?: number;
    int?: number;
    str?: number;
    dex?: number;
    con?: number;
  };
  description: string;
}

interface Entity {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  name: string;
  hp: number;
  maxHp: number;
  stats: { str: number; dex: number; con: number; int: number; };
  level: number;
  xpReward?: number;
  symbol: string; 
  color: string;
  behavior: EnemyBehavior;
  effects: StatusEffect[];
}

interface SkillNode {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  cost: number;
  parent?: string;
  effect?: (player: any) => any;
  unlockText?: string;
  icon: React.ReactNode;
  statText: string;
}

// --- Data ---
const SPELLS: Record<string, Spell> = {
  fireball: { id: 'fireball', name: 'Fireball', manaCost: 8, type: 'projectile', dmg: 10, range: 6, effect: {type: 'burn', duration: 3, value: 3}, icon: <Flame size={16}/>, description: 'Deals damage and burns the target.' },
  heal: { id: 'heal', name: 'Minor Heal', manaCost: 10, type: 'self', heal: 15, icon: <Heart size={16}/>, description: 'Restores Health.' },
  nova: { id: 'nova', name: 'Frost Nova', manaCost: 15, type: 'aoe', dmg: 5, range: 2, effect: {type: 'freeze', duration: 2}, icon: <Snowflake size={16}/>, description: 'Freezes nearby enemies.' },
  blink: { id: 'blink', name: 'Void Step', manaCost: 5, type: 'projectile', range: 4, icon: <Move size={16}/>, description: 'Teleport to target location.' },
  chain: { id: 'chain', name: 'Chain Lightning', manaCost: 12, type: 'chain', dmg: 12, range: 5, effect: {type: 'stun', duration: 1}, icon: <Zap size={16}/>, description: 'Arcs between enemies, stunning them.' },
  drain: { id: 'drain', name: 'Life Drain', manaCost: 15, type: 'projectile', dmg: 10, heal: 10, range: 4, icon: <Ghost size={16}/>, description: 'Steals health from enemy.' },
  meteor: { id: 'meteor', name: 'Meteor Swarm', manaCost: 40, type: 'aoe', dmg: 40, range: 5, effect: {type: 'burn', duration: 5, value: 5}, icon: <Move size={16} className="rotate-45"/>, description: 'Call down a star from the heavens.' },
  shield: { id: 'shield', name: 'Arcane Barrier', manaCost: 20, type: 'self', heal: 30, icon: <Shield size={16}/>, description: 'Grants temporary health/shield.' },
  berserk: { id: 'berserk', name: 'Blood Rage', manaCost: 0, type: 'self', heal: 0, icon: <Droplet size={16}/>, description: 'Sacrifice HP for temporary power (Passive trigger).' },
};

const CLASSES: Record<ClassType, { desc: string, stats: any, startItems: string[], startSpells: string[] }> = {
  Warrior: { desc: 'A stalwart champion of steel. Starts with Sword.', stats: { str: 6, dex: 3, con: 6, int: 1, hp: 25, mana: 10 }, startItems: ['weapon_sword', 'armor_heavy'], startSpells: [] },
  Rogue: { desc: 'A shadow in the night. Starts with Dagger.', stats: { str: 4, dex: 7, con: 4, int: 2, hp: 18, mana: 15 }, startItems: ['weapon_dagger', 'armor_light'], startSpells: ['blink'] },
  Mage: { desc: 'A scholar of the arcane. Starts with Staff.', stats: { str: 2, dex: 3, con: 3, int: 7, hp: 15, mana: 30 }, startItems: ['weapon_staff', 'armor_robe'], startSpells: ['fireball'] }
};

const SKILL_TREE: SkillNode[] = [
  // Root
  { id: 'root', name: 'Awakening', description: 'Your potential begins to manifest.', x: 50, y: 90, cost: 0, effect: (p) => ({ ...p, maxHp: p.maxHp + 5, hp: p.hp + 5 }), icon: <User size={20}/>, statText: "+5 Max HP" },
  
  // Left Branch (Warrior/Tank)
  { id: 'str_1', name: 'Might', description: 'Raw physical power.', x: 20, y: 80, cost: 1, parent: 'root', effect: (p) => ({ ...p, stats: { ...p.stats, str: p.stats.str + 2 } }), icon: <Sword size={20}/>, statText: "+2 STR" },
  { id: 'con_1', name: 'Iron Skin', description: 'Toughen your resolve.', x: 20, y: 65, cost: 1, parent: 'str_1', effect: (p) => ({ ...p, stats: { ...p.stats, con: p.stats.con + 2, maxHp: p.maxHp + 10 } }), icon: <Shield size={20}/>, statText: "+2 CON, +10 HP" },
  { id: 'spell_shield', name: 'Barrier', description: 'Protective Ward.', x: 20, y: 50, cost: 3, parent: 'con_1', effect: (p) => ({ ...p, spells: [...p.spells, SPELLS.shield] }), icon: <Shield size={20}/>, statText: "Unlock: Arcane Barrier" },
  { id: 'passive_vamp', name: 'Vampirism', description: 'Heal 5 HP when killing an enemy.', x: 20, y: 35, cost: 4, parent: 'spell_shield', icon: <Droplet size={20}/>, statText: "Feat: Life on Kill" },

  // Center Branch (Rogue/Speed)
  { id: 'dex_1', name: 'Agility', description: 'Speed and precision.', x: 50, y: 75, cost: 1, parent: 'root', effect: (p) => ({ ...p, stats: { ...p.stats, dex: p.stats.dex + 2 } }), icon: <Zap size={20}/>, statText: "+2 DEX" },
  { id: 'crit_1', name: 'Precision', description: 'Strike weak points.', x: 50, y: 60, cost: 2, parent: 'dex_1', effect: (p) => ({ ...p, stats: { ...p.stats, dex: p.stats.dex + 1, crit: (p.stats.crit || 0) + 5 } }), icon: <Crosshair size={20}/>, statText: "+5% Crit" },
  { id: 'spell_blink', name: 'Void Step', description: 'Walk through shadows.', x: 50, y: 45, cost: 3, parent: 'crit_1', effect: (p) => ({ ...p, spells: [...p.spells, SPELLS.blink] }), icon: <Move size={20}/>, statText: "Unlock: Void Step" },
  { id: 'spell_meteor', name: 'Apocalypse', description: 'Call down the stars.', x: 50, y: 20, cost: 8, parent: 'spell_blink', effect: (p) => ({ ...p, spells: [...p.spells, SPELLS.meteor], maxMana: p.maxMana + 50 }), icon: <Skull size={32}/>, statText: "Unlock: Meteor Swarm" },

  // Right Branch (Mage/Intellect)
  { id: 'int_1', name: 'Intellect', description: 'Arcane understanding.', x: 80, y: 80, cost: 1, parent: 'root', effect: (p) => ({ ...p, stats: { ...p.stats, int: p.stats.int + 2 }, maxMana: p.maxMana + 10 }), icon: <Eye size={20}/>, statText: "+2 INT, +10 Mana" },
  { id: 'spell_heal', name: 'Divine Light', description: 'Learn to heal.', x: 80, y: 65, cost: 2, parent: 'int_1', effect: (p) => ({ ...p, spells: [...p.spells, SPELLS.heal] }), icon: <Heart size={20}/>, statText: "Unlock: Heal" },
  { id: 'spell_chain', name: 'Stormcaller', description: 'Harness lightning.', x: 80, y: 50, cost: 3, parent: 'spell_heal', effect: (p) => ({ ...p, spells: [...p.spells, SPELLS.chain] }), icon: <Zap size={20}/>, statText: "Unlock: Chain Lightning" },
  { id: 'passive_mana', name: 'Soul Siphon', description: 'Restore 3 Mana when killing an enemy.', x: 80, y: 35, cost: 4, parent: 'spell_chain', icon: <Ghost size={20}/>, statText: "Feat: Mana on Kill" },
];

const TUTORIAL_STEPS = [
    { id: 'intro', lore: "You awaken in the Null Void. The silence is deafening.", instruction: "Use WASD or Arrows to move.", check: 'move', highlight: null },
    { id: 'pickup', lore: "A glimmer of lost hope lies on the ground.", instruction: "Walk over the item and press E to pick it up.", check: 'pickup', highlight: null },
    { id: 'open_inv', lore: "Your pockets are heavy, but your hands are empty.", instruction: "Press I to open your Inventory.", check: 'open_inv', highlight: 'inventory_btn' },
    { id: 'equip', lore: "To survive the encroaching darkness, one must be prepared.", instruction: "Drag the item to a Slot to equip it.", check: 'equip', highlight: 'equip_slot' },
    { id: 'dummy', lore: "A mindless husk blocks the path. It feels no pain.", instruction: "Walk into the Dummy to attack.", check: 'attack', highlight: null },
    { id: 'levelup', lore: "The violence stirs something within you. You feel stronger.", instruction: "You gained a Skill Point! Press K to open Skills.", check: 'open_skills', highlight: 'skills_btn' },
    { id: 'skill', lore: "Channel the void into a weapon.", instruction: "Click a node to learn a new Spell.", check: 'learn_skill', highlight: 'skill_node' },
    { id: 'spell', lore: "A corrupted spirit manifests. Steel alone may not suffice.", instruction: "Press 1 (or 2) to cast your new spell on the Enemy.", check: 'cast_spell', highlight: 'spell_bar' },
    { id: 'exit', lore: "The path is clear. The true descent begins.", instruction: "Enter the Stairs to begin your journey.", check: 'exit', highlight: null }
];

// --- Helpers ---
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const uuid = () => Math.random().toString(36).substr(2, 9);

const getEntityIcon = (symbol: string) => {
    if (symbol === 'boss') return <Skull size={32} />;
    if (symbol === 'enemy') return <Ghost size={16} />;
    if (symbol === 'archer') return <Crosshair size={16} />;
    if (symbol === 'healer') return <Activity size={16} />;
    if (symbol === 'dummy') return <User size={20} />;
    if (symbol === 'stairs') return <ChevronRight />;
    return <Ghost size={16} />;
}

// Check Line of Sight (Simple Raycast)
const hasLineOfSight = (x1: number, y1: number, x2: number, y2: number, map: number[][]) => {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = (x1 < x2) ? 1 : -1;
    const sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy;

    let x = x1;
    let y = y1;

    while (true) {
        if (x === x2 && y === y2) return true;
        // If wall, block sight
        if (map[y][x] === 0 && (x !== x1 || y !== y1)) return false; 

        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
};

// --- Item Generation ---
const ITEM_PREFIXES = [
  { name: 'Sharp', stat: 'str', val: 2 },
  { name: 'Heavy', stat: 'con', val: 2 },
  { name: 'Arcane', stat: 'int', val: 2 },
  { name: 'Swift', stat: 'dex', val: 2 },
  { name: 'Jagged', stat: 'crit', val: 5 },
];
const ITEM_SUFFIXES = [
  { name: 'of the Bear', stat: 'str', val: 3 },
  { name: 'of the Owl', stat: 'int', val: 3 },
  { name: 'of the Tiger', stat: 'dex', val: 3 },
  { name: 'of the Whale', stat: 'hp', val: 20 },
  { name: 'of the Void', stat: 'mana', val: 20 },
];

const generateItem = (level: number, forceType?: string): Item => {
  const types: Item['type'][] = ['weapon', 'armor', 'accessory', 'consumable'];
  const type = forceType ? (forceType as any) : (Math.random() > 0.3 ? 'consumable' : types[Math.floor(Math.random() * 3)]);
  
  let rarity: Rarity = 'common';
  const roll = Math.random();
  if (roll > 0.98) rarity = 'legendary';
  else if (roll > 0.9) rarity = 'epic';
  else if (roll > 0.75) rarity = 'rare';
  else if (roll > 0.5) rarity = 'uncommon';

  const basePower = level * 2 + 2; 
  let multiplier = 1;
  switch (rarity) {
      case 'common': multiplier = 1.0; break;
      case 'uncommon': multiplier = 1.3; break;
      case 'rare': multiplier = 1.6; break;
      case 'epic': multiplier = 2.0; break;
      case 'legendary': multiplier = 2.5; break;
  }
  
  const power = Math.floor(basePower * multiplier);
  let item: Item = { id: uuid(), name: 'Unknown', type, rarity, itemPower: power, stats: {}, description: '' };
  
  if (type === 'consumable') {
      const heal = Math.floor(15 + level * 5 * multiplier);
      item.name = 'Health Potion';
      item.stats = { hp: heal }; 
      item.description = `Restores ${heal} Health.`;
      item.itemPower = heal;
  } else {
      let nameBase = type === 'weapon' ? 'Sword' : type === 'armor' ? 'Tunic' : 'Ring';
      if (type === 'weapon') item.stats = { dmg: power };
      else if (type === 'armor') item.stats = { def: power, hp: power * 2 };
      else if (type === 'accessory') item.stats = { int: Math.floor(power/2), mana: power * 3, crit: Math.floor(power/3) };

      if (rarity !== 'common') {
          const prefix = ITEM_PREFIXES[rand(0, ITEM_PREFIXES.length-1)];
          item.name = `${prefix.name} ${nameBase}`;
          item.stats[prefix.stat as keyof typeof item.stats] = (item.stats[prefix.stat as keyof typeof item.stats] || 0) + prefix.val * Math.ceil(level/2);
          
          if (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') {
            const suffix = ITEM_SUFFIXES[rand(0, ITEM_SUFFIXES.length-1)];
            item.name += ` ${suffix.name}`;
            item.stats[suffix.stat as keyof typeof item.stats] = (item.stats[suffix.stat as keyof typeof item.stats] || 0) + suffix.val * Math.ceil(level/2);
          }
      } else {
          item.name = `Old ${nameBase}`;
      }
      
      item.description = `Lvl ${level} Item. Power: ${power}`;
  }
  return item;
};

// --- Main Component ---
export default function Roguelite() {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'TUTORIAL' | 'INVENTORY' | 'SKILLS' | 'SHOP' | 'SETTINGS' | 'GAMEOVER' | 'VICTORY'>('MENU');
  const [lastGameState, setLastGameState] = useState<'MENU' | 'PLAYING' | 'TUTORIAL'>('MENU');
  
  const [dungeonLevel, setDungeonLevel] = useState(1);
  const [logs, setLogs] = useState<string[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<{id: string, x: number, y: number, text: string, color: string}[]>([]);
  const [particles, setParticles] = useState<{id: string, x: number, y: number, color: string}[]>([]);
  const [screenShake, setScreenShake] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [gameMode, setGameMode] = useState<'NORMAL' | 'GAUNTLET'>('NORMAL');
  
  const [tutorialStep, setTutorialStep] = useState(0);
  const [selectedClass, setSelectedClass] = useState<ClassType>('Warrior');
  const [castMode, setCastMode] = useState<string | null>(null);
  const [hoverItem, setHoverItem] = useState<{item: any, x: number, y: number} | null>(null);
  const [shopTab, setShopTab] = useState<'upgrades' | 'cosmetics'>('upgrades');
  const [dragSource, setDragSource] = useState<{ type: 'inventory' | 'equipment', index?: number, slot?: string } | null>(null);

  const [saveData, setSaveData] = useState({
      voidEssence: 0,
      highScores: { kills: 0, maxFloor: 0 },
      upgrades: { startHp: 0, startStr: 0, startInt: 0, startDex: 0 },
      settings: { musicVolume: 0.3, sfxVolume: 0.4, uiScale: 1 },
      unlockedCosmetics: ['default'],
      selectedCosmetic: 'default'
  });

  const [runStats, setRunStats] = useState({ kills: 0, damageDealt: 0, maxFloor: 0 });
  const [map, setMap] = useState<number[][]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [itemsOnGround, setItemsOnGround] = useState<{id: string, x: number, y: number, item: Item}[]>([]);
  
  const [tilesVisible, setTilesVisible] = useState<boolean[][]>([]);
  const [tilesExplored, setTilesExplored] = useState<boolean[][]>([]);

  const [player, setPlayer] = useState({
    x: 1, y: 1, hp: 20, maxHp: 20, mana: 10, maxMana: 10, xp: 0, level: 1, skillPoints: 0, xpMultiplier: 1,
    class: 'Warrior' as ClassType, stats: { str: 5, dex: 3, con: 5, int: 2 },
    inventory: Array(MAX_INVENTORY).fill(null) as (Item | null)[], 
    equipment: { weapon: null as Item | null, armor: null as Item | null, accessory: null as Item | null },
    spells: [] as Spell[], unlockedSkills: ['root'] as string[], cosmetic: 'default'
  });

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 50));
  };

  const showFloatingText = (x: number, y: number, text: string, color: string) => {
    const id = uuid();
    setFloatingTexts(prev => [...prev, { id, x, y, text, color }]);
    setTimeout(() => {
        setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 800);
  };

  const spawnParticles = (x: number, y: number, color: string, count: number = 5) => {
      const newParts = Array(count).fill(0).map(() => ({
          id: uuid(), x: x + (Math.random() - 0.5), y: y + (Math.random() - 0.5), color
      }));
      setParticles(prev => [...prev, ...newParts]);
      setTimeout(() => {
          setParticles(prev => prev.filter(p => !newParts.find(np => np.id === p.id)));
      }, 500);
  };

  const effectiveStats = useMemo(() => {
      const base = { ...player.stats };
      let bonusMaxHp = 0, bonusMaxMana = 0, bonusCrit = 0, bonusDef = 0, bonusDmg = 0;

      Object.values(player.equipment).forEach(item => {
          if (item) {
              if (item.stats.str) base.str += item.stats.str;
              if (item.stats.dex) base.dex += item.stats.dex;
              if (item.stats.con) base.con += item.stats.con;
              if (item.stats.int) base.int += item.stats.int;
              if (item.stats.hp) bonusMaxHp += item.stats.hp;
              if (item.stats.mana) bonusMaxMana += item.stats.mana;
              if (item.stats.crit) bonusCrit += item.stats.crit;
              if (item.stats.def) bonusDef += item.stats.def;
              if (item.stats.dmg) bonusDmg += item.stats.dmg;
          }
      });

      const effectiveMaxHp = player.maxHp + bonusMaxHp;
      const effectiveMaxMana = player.maxMana + bonusMaxMana;
      const effectiveCrit = 5 + Math.floor(base.dex / 2) + bonusCrit; 
      const manaRegen = 1 + Math.floor(base.int / 3);

      return { ...base, maxHp: effectiveMaxHp, maxMana: effectiveMaxMana, crit: effectiveCrit, def: bonusDef, weaponDmg: bonusDmg, manaRegen };
  }, [player.stats, player.equipment, player.maxHp, player.maxMana]);

  useEffect(() => {
      if (player.hp > effectiveStats.maxHp) setPlayer(p => ({ ...p, hp: effectiveStats.maxHp }));
      if (player.mana > effectiveStats.maxMana) setPlayer(p => ({ ...p, mana: effectiveStats.maxMana }));
  }, [effectiveStats.maxHp, effectiveStats.maxMana]);

  // --- Tutorial Failsafe Check ---
  // If the user managed to equip the item without triggering the drag drop (e.g. double click),
  // this ensures the tutorial still advances.
  useEffect(() => {
      if (gameState === 'TUTORIAL' && TUTORIAL_STEPS[tutorialStep]?.check === 'equip') {
          if (player.equipment.weapon !== null) {
              advanceTutorial('equip');
          }
      }
  }, [gameState, tutorialStep, player.equipment]);

  useEffect(() => {
    const saved = localStorage.getItem('void_roguelite_data_v5');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            setSaveData(prev => ({
                ...prev, ...parsed,
                upgrades: { ...prev.upgrades, ...parsed.upgrades },
                settings: { ...prev.settings, ...parsed.settings }
            }));
            audio.setVolumes(parsed.settings?.musicVolume ?? 0.3, parsed.settings?.sfxVolume ?? 0.4);
        } catch(e) { console.error("Failed to parse save data"); }
    }
    setIsDataLoaded(true);
  }, []);

  useEffect(() => {
    if (!isDataLoaded) return;
    localStorage.setItem('void_roguelite_data_v5', JSON.stringify(saveData));
    audio.setVolumes(saveData.settings.musicVolume, saveData.settings.sfxVolume);
  }, [saveData, isDataLoaded]);

  const saveRun = () => {
      if (gameState !== 'PLAYING') return;
      const data = { player, map, entities, itemsOnGround, tilesVisible, tilesExplored, dungeonLevel, runStats, logs, gameMode };
      localStorage.setItem('void_roguelite_run_v5', JSON.stringify(data));
      addLog("Game Saved.");
      audio.sfxUI();
  };

  const loadRun = () => {
      const run = localStorage.getItem('void_roguelite_run_v5');
      if (run) {
          try {
              const data = JSON.parse(run);
              setPlayer(data.player);
              setMap(data.map);
              setEntities(data.entities);
              setItemsOnGround(data.itemsOnGround);
              setTilesVisible(data.tilesVisible);
              setTilesExplored(data.tilesExplored || data.tilesVisible);
              setDungeonLevel(data.dungeonLevel);
              setRunStats(data.runStats);
              setLogs(data.logs);
              setGameMode(data.gameMode || 'NORMAL');
              setGameState('PLAYING');
              addLog("Run resumed.");
              audio.init();
          } catch(e) { alert("Failed to load run."); }
      } else { alert("No saved run found."); }
  };

  const openMenu = (menu: typeof gameState) => {
      if (['MENU', 'PLAYING', 'TUTORIAL'].includes(gameState)) setLastGameState(gameState as any);
      setGameState(menu);
      
      if (gameState === 'TUTORIAL') {
          if (menu === 'INVENTORY' && TUTORIAL_STEPS[tutorialStep]?.check === 'open_inv') advanceTutorial('open_inv');
          if (menu === 'SKILLS' && TUTORIAL_STEPS[tutorialStep]?.check === 'open_skills') advanceTutorial('open_skills');
      }
  };

  const closeMenu = () => {
      setGameState(lastGameState);
      setHoverItem(null);
  };

  const initGame = (mode: 'PLAYING' | 'TUTORIAL' | 'GAUNTLET') => {
    audio.init();
    const cls = CLASSES[selectedClass];
    const startInv = Array(MAX_INVENTORY).fill(null);
    
    if(mode !== 'TUTORIAL') {
        cls.startItems.forEach((id, idx) => {
            if(idx < MAX_INVENTORY) startInv[idx] = generateItem(1, id.split('_')[0]);
        });
    }

    setPlayer({
        x: 1, y: 1, 
        hp: cls.stats.hp + saveData.upgrades.startHp, maxHp: cls.stats.hp + saveData.upgrades.startHp,
        mana: cls.stats.mana, maxMana: cls.stats.mana,
        xp: 0, level: 1, skillPoints: 0, xpMultiplier: 1, class: selectedClass,
        stats: { 
            str: cls.stats.str + saveData.upgrades.startStr, 
            dex: cls.stats.dex + saveData.upgrades.startDex, 
            con: cls.stats.con, 
            int: cls.stats.int + saveData.upgrades.startInt
        },
        inventory: startInv, 
        equipment: { weapon: null, armor: null, accessory: null },
        spells: mode === 'TUTORIAL' ? [] : cls.startSpells.map(id => SPELLS[id]),
        unlockedSkills: ['root'],
        cosmetic: saveData.selectedCosmetic
    });
    setLogs([]);
    setEntities([]);
    setItemsOnGround([]);
    setRunStats({ kills: 0, damageDealt: 0, maxFloor: 0 });
    
    setTilesVisible(Array(MAP_HEIGHT).fill(false).map(() => Array(MAP_WIDTH).fill(false)));
    setTilesExplored(Array(MAP_HEIGHT).fill(false).map(() => Array(MAP_WIDTH).fill(false)));

    if (mode === 'TUTORIAL') {
        setGameMode('NORMAL');
        generateTutorialLevel();
        setTutorialStep(0);
        setDungeonLevel(0);
        setGameState('TUTORIAL');
    } else {
        setGameMode(mode === 'GAUNTLET' ? 'GAUNTLET' : 'NORMAL');
        setDungeonLevel(1);
        generateLevel(1, mode === 'GAUNTLET');
        setGameState('PLAYING');
    }
  };

  const triggerScreenShake = () => {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 200);
  };

  const generateTutorialLevel = () => {
      const newMap = Array(MAP_HEIGHT).fill(0).map(() => Array(MAP_WIDTH).fill(0));
      for(let x=2; x<38; x++) for(let y=10; y<14; y++) newMap[y][x] = 1;
      
      setMap(newMap);
      setPlayer(p => ({ ...p, x: 4, y: 12 })); 
      
      setItemsOnGround([{ id: 'tut_wep', x: 12, y: 12, item: { id: 'w1', name: 'Broken Blade', itemPower: 5, type: 'weapon', rarity: 'common', stats: { dmg: 5 }, description: 'Old but sharp.' } }]);
      
      setEntities([
          { id: 'dummy', type: 'dummy', x: 20, y: 12, name: 'Training Dummy', hp: 30, maxHp: 30, stats: { str:0, dex:0, con:0, int:0 }, level: 1, symbol: 'dummy', color: 'text-yellow-500', behavior: 'passive', effects: [] },
          { id: 'tut_enemy', type: 'enemy', x: 30, y: 12, name: 'Void Wisp', hp: 15, maxHp: 15, stats: { str:0, dex:0, con:0, int:0 }, level: 1, symbol: 'enemy', color: 'text-red-400', behavior: 'passive', effects: [] },
          { id: 'stairs', type: 'stairs', x: 36, y: 12, name: 'Exit', hp: 1, maxHp: 1, stats: { str:0, dex:0, con:0, int:0 }, level: 1, symbol: 'stairs', color: 'text-white', behavior: 'passive', effects: [] }
      ]);
      
      const fullVis = Array(MAP_HEIGHT).fill(true).map(() => Array(MAP_WIDTH).fill(true));
      setTilesVisible(fullVis); 
      setTilesExplored(fullVis); 
      addLog("Welcome to the Void.");
  };

  const generateLevel = (level: number, isGauntlet: boolean = false) => {
    let newMap = Array(MAP_HEIGHT).fill(0).map(() => Array(MAP_WIDTH).fill(0));
    const rooms: {x: number, y: number, w: number, h: number}[] = [];
    
    for (let i = 0; i < 20; i++) {
      const w = rand(4, 8), h = rand(4, 8);
      const x = rand(1, MAP_WIDTH - w - 1), y = rand(1, MAP_HEIGHT - h - 1);
      if (!rooms.some(r => x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y)) {
        rooms.push({ x, y, w, h });
        for (let ry = y; ry < y + h; ry++) for (let rx = x; rx < x + w; rx++) newMap[ry][rx] = 1;
        if (rooms.length > 1) {
          const p = rooms[rooms.length - 2];
          const cx = Math.floor(p.x + p.w/2), cy = Math.floor(p.y + p.h/2);
          const ncx = Math.floor(x + w/2), ncy = Math.floor(y + h/2);
          if (Math.random() > 0.5) {
             for (let xx = Math.min(cx, ncx); xx <= Math.max(cx, ncx); xx++) newMap[cy][xx] = 1;
             for (let yy = Math.min(cy, ncy); yy <= Math.max(cy, ncy); yy++) newMap[yy][ncx] = 1;
          } else {
             for (let yy = Math.min(cy, ncy); yy <= Math.max(cy, ncy); yy++) newMap[yy][cx] = 1;
             for (let xx = Math.min(cx, ncx); xx <= Math.max(cx, ncx); xx++) newMap[ncy][xx] = 1;
          }
        }
      }
    }

    const newEntities: Entity[] = [];
    const newItems: {id: string, x: number, y: number, item: Item}[] = [];
    
    const isFinal = gameMode === 'NORMAL' ? level === 10 : level === 50;
    const effectiveLevel = isGauntlet ? level * 1.5 : level;
    
    rooms.forEach((r, idx) => {
      if (idx === 0) {
          setPlayer(p => ({ ...p, x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) }));
          setTilesVisible(Array(MAP_HEIGHT).fill(false).map(() => Array(MAP_WIDTH).fill(false)));
          setTilesExplored(Array(MAP_HEIGHT).fill(false).map(() => Array(MAP_WIDTH).fill(false)));
      }
      else {
        const spawnChance = isGauntlet ? 0.6 : 0.4;
        
        if (Math.random() > (1 - spawnChance) || (isFinal && idx === rooms.length - 1)) {
           const roll = Math.random();
           let type: EnemyBehavior = 'aggressive';
           let symbol = 'enemy';
           let hp = Math.floor(15 + effectiveLevel * 3);
           let name = 'Goblin';
           let color = 'text-red-300';

           if (roll > 0.8) { type = 'ranged'; symbol = 'archer'; name = 'Void Archer'; hp -= 5; color = 'text-yellow-400'; }
           else if (roll > 0.9) { type = 'healer'; symbol = 'healer'; name = 'Void Priest'; hp += 5; color = 'text-green-400'; }

           const isBoss = (idx === rooms.length - 1 && level % 5 === 0) || isFinal;
           if (isBoss) {
               name = isFinal ? "Void Overlord" : "Void Warden";
               hp = isFinal ? 400 : 80 + level * 10;
               if (isGauntlet) hp *= 1.5;
               symbol = 'boss';
               color = 'text-red-600';
               type = 'aggressive';
           }

           newEntities.push({
             id: uuid(), type: 'enemy', x: Math.floor(r.x + rand(1, r.w - 2)), y: Math.floor(r.y + rand(1, r.h - 2)), 
             name, hp, maxHp: hp,
             stats: { str: 2 + (isBoss?5:0), dex: 1, con: 2, int: 0 }, xpReward: isBoss ? 200 : 10 + Math.floor(effectiveLevel),
             symbol, color, behavior: type, effects: []
           });
        }
        if (Math.random() > 0.7 && !isFinal) {
            newItems.push({ id: uuid(), x: Math.floor(r.x + rand(1, r.w - 2)), y: Math.floor(r.y + rand(1, r.h - 2)), item: generateItem(level) });
        }
      }
    });

    if (!isFinal) newEntities.push({
        id: 'stairs', type: 'stairs', x: Math.floor(rooms[rooms.length-1].x + rooms[rooms.length-1].w / 2), y: Math.floor(rooms[rooms.length-1].y + rooms[rooms.length-1].h / 2),
        name: 'Stairs Down', hp: 1, maxHp: 1, stats: {str:0,dex:0,con:0,int:0}, level:0, symbol: 'stairs', color: 'text-yellow-400', behavior: 'passive', effects: []
    });

    setMap(newMap); setEntities(newEntities); setItemsOnGround(newItems); setDungeonLevel(level);
    
    const startX = Math.floor(rooms[0].x + rooms[0].w / 2);
    const startY = Math.floor(rooms[0].y + rooms[0].h / 2);
    updateVisibility(startX, startY);
    
    if (level > 0) addLog(isFinal ? "FINAL FLOOR: DEFEAT THE OVERLORD" : `Entered Floor ${level} (${gameMode})`);
  };

  const updateVisibility = (px: number, py: number) => {
    const newVis = Array(MAP_HEIGHT).fill(false).map(() => Array(MAP_WIDTH).fill(false));
    const radius = VISIBILITY_RADIUS + (effectiveStats.int || 0) / 3; 
    
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (Math.sqrt((px - x)**2 + (py - y)**2) < radius) {
                newVis[y][x] = true;
            }
        }
    }
    setTilesVisible(newVis);

    setTilesExplored(prev => {
        const next = prev.map(row => [...row]);
        for(let y=0; y<MAP_HEIGHT; y++) {
            for(let x=0; x<MAP_WIDTH; x++) {
                if (newVis[y][x]) next[y][x] = true;
            }
        }
        return next;
    });
  };

  const advanceTutorial = (action: string) => {
      if (gameState !== 'TUTORIAL') return;
      if (TUTORIAL_STEPS[tutorialStep]?.check === action) {
          audio.sfxUI();
          setTutorialStep(s => s + 1);
          const next = TUTORIAL_STEPS[tutorialStep + 1];
          if (next && next.id === 'levelup') {
              setPlayer(p => ({ ...p, skillPoints: p.skillPoints + 1 }));
              addLog("System: You gained a Skill Point.");
          }
      }
  };

  const handleMove = (dx: number, dy: number) => {
    if (gameState !== 'PLAYING' && gameState !== 'TUTORIAL') return;
    if (castMode) { handleDirectionalCast(dx, dy); return; }

    const nx = player.x + dx, ny = player.y + dy;
    if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT || map[ny][nx] === 0) {
        audio.playNoise(0.05);
        return;
    }

    const target = entities.find(e => e.x === nx && e.y === ny);
    if (target) {
        if (target.type === 'enemy' || target.type === 'dummy') {
            attackEntity(target);
            advanceTutorial('attack');
        } else if (target.type === 'stairs') {
            if (gameState === 'TUTORIAL') {
                if (TUTORIAL_STEPS[tutorialStep]?.check === 'exit') {
                    audio.sfxLevelUp();
                    setGameState('MENU');
                } else {
                    addLog("Tutorial not complete.");
                }
            } else {
                audio.sfxStep();
                setPlayer(p => ({...p, x: nx, y: ny}));
                generateLevel(dungeonLevel + 1, gameMode === 'GAUNTLET');
            }
        }
        processTurn();
        return;
    }

    audio.sfxStep();
    setPlayer(p => ({ ...p, x: nx, y: ny }));
    updateVisibility(nx, ny);
    advanceTutorial('move');
    
    const itemOnFloor = itemsOnGround.find(i => i.x === nx && i.y === ny);
    if (itemOnFloor) {
        addLog(`You see ${itemOnFloor.item.name}. Press E to pick up.`);
    }
    
    processTurn();
  };

  const castSpell = (spell: Spell) => {
    if (player.mana < spell.manaCost) { addLog("Not enough mana!"); return; }
    if (spell.type === 'projectile') { addLog(`Aim ${spell.name} (Arrows/WASD).`); setCastMode(spell.id); }
    else if (spell.type === 'chain') {
        const targets: Entity[] = [];
        const enemies = entities.filter(e => e.type === 'enemy' || e.type === 'dummy');
        let current = { x: player.x, y: player.y };
        for(let i=0; i<3; i++) {
            let closest: Entity | null = null;
            let minDist = 999;
            enemies.forEach(e => {
                if(targets.includes(e)) return;
                const d = Math.sqrt((e.x - current.x)**2 + (e.y - current.y)**2);
                if(d < 5 && d < minDist) { minDist = d; closest = e; }
            });
            if(closest) {
                targets.push(closest);
                current = { x: (closest as Entity).x, y: (closest as Entity).y };
            } else break;
        }
        
        if (targets.length > 0) {
            audio.sfxMagic();
            setPlayer(p => ({ ...p, mana: p.mana - spell.manaCost }));
            targets.forEach(t => {
                dealDamage(t, (spell.dmg || 0) + effectiveStats.int, false, 'magical');
                if(spell.effect) applyStatusEffect(t, spell.effect);
                spawnParticles(t.x, t.y, 'yellow', 10);
            });
            advanceTutorial('cast_spell');
            processTurn();
        } else {
            addLog("No targets nearby.");
        }
    }
    else {
        audio.sfxMagic();
        setPlayer(p => ({ ...p, mana: p.mana - spell.manaCost }));
        if (spell.heal) {
            setPlayer(p => ({ ...p, hp: Math.min(effectiveStats.maxHp, p.hp + (spell.heal || 0)) }));
            spawnParticles(player.x, player.y, 'green', 10);
            addLog(`Healed for ${spell.heal}`);
        } else if (spell.type === 'aoe') {
            entities.forEach(e => {
                const dist = Math.sqrt((e.x - player.x)**2 + (e.y - player.y)**2);
                if ((e.type === 'enemy' || e.type === 'dummy') && dist <= (spell.range || 2)) {
                    dealDamage(e, (spell.dmg || 0) + effectiveStats.int, false, 'magical');
                    if(spell.effect) applyStatusEffect(e, spell.effect);
                }
            });
            spawnParticles(player.x, player.y, spell.id === 'meteor' ? 'orange' : 'cyan', 20);
        }
        advanceTutorial('cast_spell');
        processTurn();
    }
  };

  const handleDirectionalCast = (dx: number, dy: number) => {
    const spell = player.spells.find(s => s.id === castMode);
    setCastMode(null);
    if (!spell || player.mana < spell.manaCost) return;

    audio.sfxMagic();
    setPlayer(p => ({ ...p, mana: p.mana - spell.manaCost }));

    if (spell.id === 'blink') {
        let tx = player.x, ty = player.y;
        for (let i = 1; i <= (spell.range || 4); i++) {
            const nx = player.x + dx * i, ny = player.y + dy * i;
            if (nx >= 0 && nx < MAP_WIDTH && map[ny][nx] !== 0) { tx = nx; ty = ny; } else break;
        }
        spawnParticles(player.x, player.y, 'purple', 5);
        setPlayer(p => ({ ...p, x: tx, y: ty }));
        spawnParticles(tx, ty, 'purple', 5);
        updateVisibility(tx, ty);
    } else {
        let hit = false;
        for (let i = 1; i <= (spell.range || 5); i++) {
            const nx = player.x + dx * i, ny = player.y + dy * i;
            const target = entities.find(e => e.x === nx && e.y === ny);
            if (target && (target.type === 'enemy' || target.type === 'dummy')) {
                dealDamage(target, (spell.dmg || 0) + effectiveStats.int, false, 'magical');
                if (spell.effect) applyStatusEffect(target, spell.effect);
                if (spell.id === 'drain' && spell.heal) {
                    setPlayer(p => ({ ...p, hp: Math.min(effectiveStats.maxHp, p.hp + spell.heal!) }));
                    spawnParticles(player.x, player.y, 'red', 5);
                }
                spawnParticles(nx, ny, 'orange', 10);
                hit = true;
                break;
            }
            if (map[ny][nx] === 0) break;
        }
        if(!hit) addLog("Spell missed.");
    }
    advanceTutorial('cast_spell');
    processTurn();
  };

  const applyStatusEffect = (target: Entity, effect: {type: string, duration: number, value?: number}) => {
      setEntities(prev => prev.map(e => {
          if(e.id !== target.id) return e;
          return { ...e, effects: [...e.effects, { type: effect.type as any, duration: effect.duration, value: effect.value }] };
      }));
      addLog(`${target.name} is ${effect.type}ed!`);
  };

  const dealDamage = (target: Entity, amount: number, isWeapon: boolean, type: 'physical' | 'magical' | 'true') => {
    let dmg = amount;
    let isCrit = false;
    
    if (isWeapon) {
        const base = Math.max(1, effectiveStats.str + effectiveStats.weaponDmg + rand(-1, 2));
        isCrit = Math.random() * 100 < effectiveStats.crit;
        dmg = isCrit ? Math.floor(base * 1.5) : base;
    }
    
    if (target.type === 'dummy') {
        audio.sfxHit();
        showFloatingText(target.x, target.y, `${dmg}`, 'text-yellow-400');
        spawnParticles(target.x, target.y, 'white', 5);
        if (gameState === 'TUTORIAL' && target.hp - dmg <= 0) { 
             setEntities(prev => prev.filter(e => e.id !== target.id));
             advanceTutorial('attack');
        } else if (target.type === 'dummy') {
             setEntities(prev => prev.map(e => e.id === target.id ? {...e, hp: Math.max(0, e.hp - dmg)} : e));
        }
        return;
    }

    setRunStats(s => ({ ...s, damageDealt: s.damageDealt + dmg }));
    audio.sfxHit();
    if(type === 'physical') triggerScreenShake();
    spawnParticles(target.x, target.y, 'red', 8);

    setEntities(prev => {
        const next = prev.map(e => e.id === target.id ? { ...e, hp: e.hp - dmg } : e);
        const dead = next.find(e => e.id === target.id && e.hp <= 0);
        if (dead) {
            setRunStats(s => ({ ...s, kills: s.kills + 1 }));
            if (dead.name.includes("Warden") || dead.name.includes("Overlord")) {
                const ess = dead.name.includes("Overlord") ? 50 : 10;
                setSaveData(s => ({ ...s, voidEssence: s.voidEssence + ess }));
                addLog(`+${ess} Void Essence`);
            }
            if (dead.name === "Void Overlord") setGameState('VICTORY');
            
            if (player.unlockedSkills.includes('passive_vamp')) {
                setPlayer(p => ({ ...p, hp: Math.min(effectiveStats.maxHp, p.hp + 5) }));
                showFloatingText(player.x, player.y, "+5 HP", 'text-green-400');
            }
            if (player.unlockedSkills.includes('passive_mana')) {
                setPlayer(p => ({ ...p, mana: Math.min(effectiveStats.maxMana, p.mana + 3) }));
                showFloatingText(player.x, player.y, "+3 MP", 'text-blue-400');
            }

            if (Math.random() > 0.7) setItemsOnGround(i => [...i, { id: uuid(), x: target.x, y: target.y, item: generateItem(dungeonLevel) }]);
            gainXp(dead.xpReward || 0);
            return next.filter(e => e.id !== target.id);
        }
        return next;
    });
    
    showFloatingText(target.x, target.y, dmg.toString(), isCrit ? 'text-yellow-400 font-bold text-lg' : type === 'magical' ? 'text-blue-300' : 'text-white');
  };
  
  const attackEntity = (t: Entity) => dealDamage(t, 0, true, 'physical');

  const processTurn = () => {
    const manaRegen = effectiveStats.manaRegen;
    setPlayer(p => ({ ...p, mana: Math.min(effectiveStats.maxMana, p.mana + manaRegen) }));

    setEntities(prev => {
        return prev.map(e => {
            let skipTurn = false;
            const newEffects = e.effects.map(eff => {
                if (eff.type === 'burn') {
                    e.hp -= eff.value || 1;
                    showFloatingText(e.x, e.y, `${eff.value}`, 'text-orange-500');
                } else if (eff.type === 'freeze' || eff.type === 'stun') {
                    skipTurn = true;
                }
                return { ...eff, duration: eff.duration - 1 };
            }).filter(eff => eff.duration > 0);
            
            if (e.hp <= 0) { gainXp(e.xpReward || 5); return null; }
            if (skipTurn || e.type === 'dummy' || e.type === 'stairs') return { ...e, effects: newEffects };

            const dist = Math.sqrt((player.x - e.x)**2 + (player.y - e.y)**2);
            
            if (e.behavior === 'healer') {
                const friend = prev.find(f => f.id !== e.id && f.type === 'enemy' && f.hp < f.maxHp && Math.sqrt((f.x-e.x)**2 + (f.y-e.y)**2) < 4);
                if (friend) {
                    showFloatingText(e.x, e.y, "Heal!", "text-green-300");
                    spawnParticles(e.x, e.y, 'green', 5);
                    return { ...e, effects: newEffects };
                }
            }

            if (e.behavior === 'ranged' && dist < 6 && dist > 1) {
                const hasSight = hasLineOfSight(e.x, e.y, player.x, player.y, map);
                if (hasSight && Math.random() > 0.5) { 
                    showFloatingText(e.x, e.y, "Shoot!", "text-yellow-300");
                    const dmg = Math.max(1, e.stats.str - effectiveStats.def);
                    setPlayer(p => {
                        const nhp = p.hp - dmg;
                        if (nhp <= 0) setTimeout(() => setGameState('GAMEOVER'), 100);
                        return { ...p, hp: nhp };
                    });
                    showFloatingText(player.x, player.y, `-${dmg}`, 'text-red-500');
                    return { ...e, effects: newEffects };
                }
            }

            if (dist <= 1.5) {
                const dmg = Math.max(1, e.stats.str - effectiveStats.def + rand(-1,1));
                setPlayer(p => {
                    const nhp = p.hp - dmg;
                    if (nhp <= 0) setTimeout(() => setGameState('GAMEOVER'), 100);
                    return { ...p, hp: nhp };
                });
                audio.sfxHit();
                triggerScreenShake();
                showFloatingText(player.x, player.y, `-${dmg}`, 'text-red-500');
            } else if (dist < 8) {
                 const dx = Math.sign(player.x - e.x), dy = Math.sign(player.y - e.y);
                 let nx = e.x + dx, ny = e.y + dy;
                 if (map[ny][nx] !== 0 && !prev.some(en => en.x === nx && en.y === ny)) {
                     return { ...e, x: nx, y: ny, effects: newEffects };
                 } else if (map[e.y][nx] !== 0 && !prev.some(en => en.x === nx && en.y === e.y)) {
                     return { ...e, x: nx, effects: newEffects };
                 } else if (map[ny][e.x] !== 0 && !prev.some(en => en.x === e.x && en.y === ny)) {
                     return { ...e, y: ny, effects: newEffects };
                 }
            }
            return { ...e, effects: newEffects };
        }).filter(Boolean) as Entity[];
    });
  };

  const gainXp = (amount: number) => {
    const finalXp = Math.floor(amount * player.xpMultiplier);
    setPlayer(p => {
        let { xp, level, skillPoints, maxHp, hp } = p;
        xp += finalXp;
        if (xp >= level * 50) {
            xp -= level * 50; level++; skillPoints++; maxHp += 5; hp = maxHp;
            audio.sfxLevelUp();
            addLog("Level Up!");
            showFloatingText(p.x, p.y, "LEVEL UP!", "text-yellow-400 font-bold");
        }
        return { ...p, xp, level, skillPoints, maxHp, hp };
    });
  };

  const handleDragStart = (e: React.DragEvent, type: 'inventory' | 'equipment', index?: number, slot?: string) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('source', JSON.stringify({ type, index, slot }));
      setDragSource({ type, index, slot });
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); 
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetType: 'inventory' | 'equipment' | 'trash', targetIndex?: number, targetSlot?: string) => {
      e.preventDefault();
      const source = JSON.parse(e.dataTransfer.getData('source'));
      
      let item: Item | null = null;
      if (source.type === 'inventory') item = player.inventory[source.index];
      else if (source.type === 'equipment') item = player.equipment[source.slot as keyof typeof player.equipment];

      if (!item) return;

      if (targetType === 'trash') {
          if (confirm(`Destroy ${item.name}?`)) {
              audio.sfxTrash();
              if (source.type === 'inventory') {
                  const newInv = [...player.inventory];
                  newInv[source.index] = null;
                  setPlayer(p => ({ ...p, inventory: newInv }));
              }
              else setPlayer(p => ({ ...p, equipment: { ...p.equipment, [source.slot!]: null } }));
          }
      } else if (targetType === 'inventory') {
          const newInv = [...player.inventory];
          if (source.type === 'inventory') newInv[source.index] = null;
          else setPlayer(p => ({ ...p, equipment: { ...p.equipment, [source.slot!]: null } }));

          if (targetIndex !== undefined) {
              const targetItem = newInv[targetIndex];
              newInv[targetIndex] = item;
              if (targetItem) {
                  if (source.type === 'inventory') newInv[source.index] = targetItem;
                  else if (source.type === 'equipment') {
                      if(targetItem.type === source.slot) {
                          setPlayer(p => ({ ...p, equipment: { ...p.equipment, [source.slot!]: targetItem } }));
                      } else {
                          const empty = newInv.findIndex(x => x === null);
                          if(empty >= 0) newInv[empty] = targetItem;
                          else addLog("No space for swapped item!");
                      }
                  }
              }
              setPlayer(p => ({ ...p, inventory: newInv }));
              audio.sfxEquip();
          }
      } else if (targetType === 'equipment') {
          if (targetSlot === item.type) {
              const currentEquipped = player.equipment[targetSlot as keyof typeof player.equipment];
              let newInv = [...player.inventory];
              if(source.type === 'inventory') newInv[source.index] = null;
              
              setPlayer(p => ({
                  ...p,
                  equipment: { ...p.equipment, [targetSlot!]: item! },
                  inventory: newInv
              }));
              
              if (currentEquipped) {
                  setPlayer(p => {
                      const finalInv = [...p.inventory];
                      if(source.type === 'inventory') finalInv[source.index] = currentEquipped;
                      else {
                          const empty = finalInv.findIndex(x => x === null);
                          if(empty >= 0) finalInv[empty] = currentEquipped;
                      }
                      return { ...p, inventory: finalInv };
                  });
              }
              audio.sfxEquip();
              advanceTutorial('equip');
          } else addLog("Wrong Slot!");
      }
      setDragSource(null);
  };

  const handlePickup = useCallback(() => {
    const idx = itemsOnGround.findIndex(i => i.x === player.x && i.y === player.y);
    if (idx >= 0) {
        const emptySlot = player.inventory.findIndex(item => item === null);
        if (emptySlot !== -1) {
            audio.sfxEquip();
            const pickedItem = itemsOnGround[idx].item;
            const newInv = [...player.inventory];
            newInv[emptySlot] = pickedItem;
            setPlayer(p => ({ ...p, inventory: newInv }));
            setItemsOnGround(l => l.filter((_, i) => i !== idx));
            addLog(`Picked up ${pickedItem.name}.`);
            advanceTutorial('pickup');
        } else addLog("Inventory Full");
    } else {
        addLog("Nothing to pick up.");
    }
  }, [player.x, player.y, itemsOnGround, player.inventory, gameState]);

  const handleDirectAction = (item: Item, index: number) => {
      audio.sfxUI();
      if (item.type === 'consumable') {
          setPlayer(p => {
              const newInv = [...p.inventory];
              newInv[index] = null;
              return {
                  ...p,
                  hp: Math.min(effectiveStats.maxHp, p.hp + (item.stats.hp || 0)),
                  inventory: newInv
              };
          });
      } else {
          const slot = item.type;
          setPlayer(p => {
              const currentEq = p.equipment[slot as keyof typeof p.equipment];
              const newInv = [...p.inventory];
              newInv[index] = currentEq || null;
              return {
                  ...p,
                  equipment: { ...p.equipment, [slot]: item },
                  inventory: newInv
              };
          });
          advanceTutorial('equip');
      }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (gameState === 'PLAYING' || gameState === 'TUTORIAL') {
        if (['w','arrowup'].includes(k)) handleMove(0, -1);
        else if (['s','arrowdown'].includes(k)) handleMove(0, 1);
        else if (['a','arrowleft'].includes(k)) handleMove(-1, 0);
        else if (['d','arrowright'].includes(k)) handleMove(1, 0);
        else if (k === 'g' || k === 'e') {
            handlePickup();
        }
        else if (k === 'i') openMenu('INVENTORY');
        else if (k === 'k') openMenu('SKILLS');
        else if (['1','2','3','4'].includes(k)) {
            const i = parseInt(k)-1;
            if (player.spells[i]) castSpell(player.spells[i]);
        }
        else if (k === 'escape') {
            if (castMode) { setCastMode(null); addLog("Cancelled."); }
            else openMenu('SETTINGS');
        }
    } else if (['INVENTORY','SKILLS','SETTINGS', 'SHOP'].includes(gameState) && k === 'escape') {
        closeMenu();
    }
  }, [gameState, player, map, entities, itemsOnGround, castMode, lastGameState, handlePickup]);

  useEffect(() => { window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, [handleKeyDown]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
      if (hoverItem) {
          setHoverItem(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
      }
  }, [hoverItem]);

  // --- Render Components ---

  const Tooltip = ({ item, x, y }: { item: Item, x: number, y: number }) => {
      const equipped = player.equipment[item.type as keyof typeof player.equipment];
      return (
          <div className="fixed z-[100] w-56 bg-slate-950 border border-slate-500 p-3 rounded shadow-2xl pointer-events-none" style={{ left: x + 10, top: y + 10 }}>
              <div className={`font-bold text-xs ${RARITIES[item.rarity].color}`}>{item.name}</div>
              <div className="text-[10px] text-yellow-500 font-bold mb-1">Power: {item.itemPower || 'N/A'}</div>
              <div className="text-[10px] text-slate-400 italic">{item.description}</div>
              <div className="text-[10px] text-slate-300 mt-2 grid grid-cols-2 gap-1">
                  {Object.entries(item.stats).map(([k,v]) => <div key={k} className="uppercase text-slate-400">{k}: <span className="text-white">+{v}</span></div>)}
              </div>
              
              {/* Item Comparison */}
              {equipped && item.type !== 'consumable' && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                      <div className="text-[9px] text-slate-500 uppercase mb-1">Comparison</div>
                      {Object.keys({...item.stats, ...equipped.stats}).map(stat => {
                          const val = (item.stats[stat as keyof typeof item.stats] || 0);
                          const eqVal = (equipped.stats[stat as keyof typeof equipped.stats] || 0);
                          const diff = val - eqVal;
                          if (diff === 0) return null;
                          return (
                              <div key={stat} className="flex justify-between text-[10px]">
                                  <span className="uppercase text-slate-400">{stat}</span>
                                  <span className={diff > 0 ? 'text-green-400' : 'text-red-400'}>
                                      {diff > 0 ? '+' : ''}{diff}
                                  </span>
                              </div>
                          );
                      })}
                  </div>
              )}

              <div className="text-[9px] text-slate-500 mt-2 border-t border-slate-800 pt-1">
                  {item.type === 'consumable' ? 'Click to Consume' : 'Click to Equip'} <br/> Drag to Move/Trash
              </div>
          </div>
      );
  };

  const renderMap = () => (
      <div className={`relative overflow-hidden bg-black border-4 border-slate-700 rounded-lg shadow-2xl ${screenShake ? 'animate-shake' : ''}`}
           style={{ width: 20 * TILE_SIZE, height: 15 * TILE_SIZE }}>
          {map.length > 0 && (() => {
              const viewW = 20, viewH = 15;
              const offX = Math.max(0, Math.min(MAP_WIDTH - viewW, player.x - Math.floor(viewW/2)));
              const offY = Math.max(0, Math.min(MAP_HEIGHT - viewH, player.y - Math.floor(viewH/2)));
              const els = [];
              for(let y=offY; y<Math.min(MAP_HEIGHT, offY+viewH); y++) {
                  for(let x=offX; x<Math.min(MAP_WIDTH, offX+viewW); x++) {
                      if (!tilesExplored[y] || !tilesExplored[y][x]) continue;
                      
                      const isVisible = tilesVisible[y] && tilesVisible[y][x];
                      const floor = map[y][x]===1;
                      
                      if (!isVisible) {
                          els.push(
                              <div key={`${x}-${y}`} className={`absolute flex items-center justify-center ${floor?'bg-slate-800':'bg-slate-800'} border border-slate-800/30 transition-all duration-200 opacity-20 grayscale`}
                                   style={{width: TILE_SIZE, height: TILE_SIZE, left: (x-offX)*TILE_SIZE, top: (y-offY)*TILE_SIZE}}>
                              </div>
                          );
                          continue;
                      }

                      const ent = entities.find(e => e.x===x && e.y===y);
                      const itm = itemsOnGround.find(i => i.x===x && i.y===y);
                      let content = null;
                      if (player.x===x && player.y===y) {
                          const cos = COSMETICS[player.cosmetic as keyof typeof COSMETICS] || COSMETICS.default;
                          content = <div className={`${cos.color} animate-pulse`}>{cos.icon}</div>;
                      }
                      else if (ent) {
                        content = (
                          <div className={`relative ${ent.color} transition-all duration-300`}>
                            {getEntityIcon(ent.symbol)}
                            {ent.effects.length > 0 && (
                                <div className="absolute -top-2 -right-2 flex text-[8px]">
                                    {ent.effects.map((e,i) => <span key={i}>{e.type === 'burn' ? '🔥' : e.type === 'freeze' ? '❄️' : '⚡'}</span>)}
                                </div>
                            )}
                          </div>
                        );
                      }
                      else if (itm) content = <div className={RARITIES[itm.item.rarity].color}><Sparkles size={16}/></div>;
                      
                      els.push(
                          <div key={`${x}-${y}`} className={`absolute flex items-center justify-center ${floor?'bg-slate-800':'bg-slate-700'} border border-slate-800/30 transition-all duration-200`}
                               style={{width: TILE_SIZE, height: TILE_SIZE, left: (x-offX)*TILE_SIZE, top: (y-offY)*TILE_SIZE}}>
                               {content}
                          </div>
                      );
                  }
              }
              return els;
          })()}
          
          {particles.map(p => {
              const offX = Math.max(0, Math.min(MAP_WIDTH - 20, player.x - 10));
              const offY = Math.max(0, Math.min(MAP_HEIGHT - 15, player.y - 7.5));
              if (p.x < offX || p.x > offX+20 || p.y < offY || p.y > offY+15) return null;
              return <div key={p.id} className="absolute w-1 h-1 rounded-full animate-ping" style={{ backgroundColor: p.color, left: (p.x-offX)*TILE_SIZE + 10, top: (p.y-offY)*TILE_SIZE + 10 }} />;
          })}

          {floatingTexts.map(ft => {
              const offX = Math.max(0, Math.min(MAP_WIDTH - 20, player.x - 10));
              const offY = Math.max(0, Math.min(MAP_HEIGHT - 15, player.y - 7.5));
               if (ft.x < offX || ft.x > offX+20 || ft.y < offY || ft.y > offY+15) return null;
              return <div key={ft.id} className={`absolute z-20 font-bold text-[10px] pointer-events-none animate-bounce-short ${ft.color}`}
                          style={{ left: (ft.x-offX)*TILE_SIZE+4, top: (ft.y-offY)*TILE_SIZE-10 }}>{ft.text}</div>
          })}
          
          {gameState === 'TUTORIAL' && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-96 bg-slate-900/95 border border-purple-500/50 p-4 rounded-xl text-slate-200 shadow-2xl z-30 animate-fade-in backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                      <div className="p-3 bg-purple-900/30 rounded-full border border-purple-500/30 text-purple-300">
                          <BookOpen size={24}/>
                      </div>
                      <div>
                          <h4 className="font-bold text-purple-300 text-sm uppercase tracking-wider mb-1">Void Guide</h4>
                          <p className="text-xs text-slate-400 italic mb-2">"{TUTORIAL_STEPS[tutorialStep]?.lore}"</p>
                          <p className="text-sm font-bold text-white bg-slate-800/50 p-2 rounded border border-slate-700">
                              <span className="text-yellow-400 mr-2">Task:</span>
                              {TUTORIAL_STEPS[tutorialStep]?.instruction}
                          </p>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col items-center justify-center p-4 overflow-hidden" onMouseMove={handleMouseMove}>
      <style>{`
        @keyframes bounce-short { 0%, 100% { transform: translateY(0); opacity: 0; } 50% { transform: translateY(-10px); opacity: 1; } }
        .animate-bounce-short { animation: bounce-short 0.8s ease-out forwards; }
        @keyframes shake { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(-2px, 2px); } 75% { transform: translate(2px, -2px); } }
        .animate-shake { animation: shake 0.2s ease-in-out; }
      `}</style>

      {hoverItem && <Tooltip item={hoverItem.item} x={hoverItem.x} y={hoverItem.y} />}

      {gameState === 'MENU' && (
          <div className="text-center space-y-6 max-w-2xl w-full animate-fade-in">
            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-slate-900 filter drop-shadow-lg mb-8">
                SHADOWS<br/>OF THE VOID
            </h1>
            <div className="grid grid-cols-3 gap-4 mb-8">
                {(Object.keys(CLASSES) as ClassType[]).map(c => (
                    <div key={c} onClick={() => { audio.sfxUI(); setSelectedClass(c); }}
                         className={`p-4 rounded border-2 cursor-pointer transition-all ${selectedClass === c ? 'bg-indigo-900/50 border-indigo-400 transform scale-105' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>
                        <div className="font-bold text-xl mb-2">{c}</div>
                        <p className="text-xs text-slate-400 h-10">{CLASSES[c].desc}</p>
                    </div>
                ))}
            </div>
            <div className="flex flex-col gap-3 max-w-md mx-auto">
                <button onClick={() => initGame('PLAYING')} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow-lg text-xl font-bold flex items-center justify-center gap-2"><Play size={24}/> Enter the Void</button>
                <button onClick={() => initGame('GAUNTLET')} className="px-8 py-4 bg-red-800 hover:bg-red-700 text-white rounded shadow-lg text-xl font-bold flex items-center justify-center gap-2 border border-red-500"><Skull size={24}/> Gauntlet Run</button>
                <button onClick={() => { if(localStorage.getItem('void_roguelite_run_v5')) loadRun(); else alert("No saved run."); }} className="px-8 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded shadow border border-slate-600 flex items-center justify-center gap-2"><RotateCcw size={18}/> Resume Run</button>
                <button onClick={() => initGame('TUTORIAL')} className="px-8 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded shadow border border-slate-600 flex items-center justify-center gap-2"><HelpCircle size={18}/> Tutorial</button>
                <div className="flex gap-2">
                    <button onClick={() => openMenu('SHOP')} className="flex-1 px-4 py-2 bg-purple-900 hover:bg-purple-800 text-purple-100 rounded border border-purple-700 flex items-center justify-center gap-2"><Store size={18}/> Shop</button>
                    <button onClick={() => openMenu('SETTINGS')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600"><Settings size={18}/></button>
                </div>
            </div>
          </div>
      )}

      {(gameState === 'PLAYING' || gameState === 'TUTORIAL') && (
          <div className="flex flex-col gap-4 w-full max-w-4xl transition-transform origin-center" style={{ transform: `scale(${saveData.settings.uiScale})` }}>
              {/* HUD */}
              <div className="flex justify-between items-end bg-slate-900 p-4 rounded-lg border border-slate-800 shadow-md">
                    <div className="flex flex-col gap-2 w-full max-w-md">
                        <div className="flex items-center gap-3">
                            <span className="text-red-400 font-bold text-xs w-6">HP</span>
                            <div className="flex-1 h-3 bg-slate-800 rounded-full relative overflow-hidden">
                                <div className="h-full bg-red-600 transition-all duration-300" style={{width: `${(player.hp/effectiveStats.maxHp)*100}%`}}></div>
                                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white shadow">{player.hp}/{effectiveStats.maxHp}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-blue-400 font-bold text-xs w-6">MP</span>
                            <div className="flex-1 h-3 bg-slate-800 rounded-full relative overflow-hidden">
                                <div className="h-full bg-blue-600 transition-all duration-300" style={{width: `${(player.mana/effectiveStats.maxMana)*100}%`}}></div>
                                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white shadow">{Math.floor(player.mana)}/{effectiveStats.maxMana} <span className="text-[7px] ml-1 text-blue-200">(+{effectiveStats.manaRegen})</span></span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {[0,1,2,3].map(i => (
                           <div key={i} 
                                onClick={() => player.spells[i] && castSpell(player.spells[i])}
                                className={`w-10 h-10 border rounded flex items-center justify-center relative cursor-pointer active:scale-95 transition-transform ${player.spells[i]?'bg-slate-800 border-slate-600':'bg-slate-900 border-slate-800'} ${castMode===player.spells[i]?.id?'border-green-400':''} ${TUTORIAL_STEPS[tutorialStep]?.highlight === 'spell_bar' ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}>
                               {player.spells[i] && <div className="text-blue-200">{player.spells[i].icon}</div>}
                               <span className="absolute top-0 left-1 text-[8px] text-slate-500">{i+1}</span>
                           </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => openMenu('INVENTORY')} className={`p-2 bg-slate-800 rounded border border-slate-600 hover:bg-slate-700 ${TUTORIAL_STEPS[tutorialStep]?.highlight === 'inventory_btn' ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}><Backpack size={18}/></button>
                        <button onClick={() => openMenu('SKILLS')} className={`p-2 bg-slate-800 rounded border border-slate-600 hover:bg-slate-700 ${TUTORIAL_STEPS[tutorialStep]?.highlight === 'skills_btn' ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}><Zap size={18}/></button>
                        <button onClick={() => openMenu('SETTINGS')} className="p-2 bg-slate-800 rounded border border-slate-600 hover:bg-slate-700"><Settings size={18}/></button>
                    </div>
              </div>

              {/* Main Game Area */}
              <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 flex justify-center bg-black rounded border border-slate-800 p-1">{renderMap()}</div>
                  
                  {/* Log Panel (Desktop) & Mobile Controls */}
                  <div className="flex flex-col gap-4 w-full lg:w-64">
                      {/* Log Panel */}
                      <div className="bg-slate-900 p-4 rounded border border-slate-800 h-[200px] lg:h-[360px] flex flex-col">
                          <h3 className="text-xs uppercase font-bold text-slate-500 mb-2">Log</h3>
                          <div className="flex-1 overflow-y-auto font-mono text-[11px] text-slate-400 space-y-1">
                              {logs.map((l, i) => <div key={i} className="border-b border-slate-800 pb-1">{i===0?'> ':''}{l}</div>)}
                          </div>
                      </div>

                      {/* Mobile Controls */}
                      <div className="lg:hidden grid grid-cols-3 gap-2 p-4 bg-slate-900 rounded border border-slate-800 justify-items-center">
                          <div className="w-12 h-12"></div>
                          <button onClick={() => handleMove(0, -1)} className="w-14 h-14 bg-slate-800 rounded-full border border-slate-600 flex items-center justify-center active:bg-slate-700 active:scale-95 shadow-lg"><ArrowUp size={24}/></button>
                          <div className="w-12 h-12"></div>
                          
                          <button onClick={() => handleMove(-1, 0)} className="w-14 h-14 bg-slate-800 rounded-full border border-slate-600 flex items-center justify-center active:bg-slate-700 active:scale-95 shadow-lg"><ArrowLeft size={24}/></button>
                          <button onClick={handlePickup} className="w-14 h-14 bg-indigo-600 rounded-full border border-indigo-400 flex items-center justify-center active:bg-indigo-500 active:scale-95 shadow-lg text-white"><Hand size={24}/></button>
                          <button onClick={() => handleMove(1, 0)} className="w-14 h-14 bg-slate-800 rounded-full border border-slate-600 flex items-center justify-center active:bg-slate-700 active:scale-95 shadow-lg"><ArrowRight size={24}/></button>
                          
                          <div className="w-12 h-12"></div>
                          <button onClick={() => handleMove(0, 1)} className="w-14 h-14 bg-slate-800 rounded-full border border-slate-600 flex items-center justify-center active:bg-slate-700 active:scale-95 shadow-lg"><ArrowDown size={24}/></button>
                          <div className="w-12 h-12"></div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {(gameState === 'SETTINGS' || gameState === 'SHOP' || gameState === 'INVENTORY' || gameState === 'SKILLS') && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={closeMenu}>
              <div className="bg-slate-900 p-8 rounded-lg border border-slate-600 max-w-lg w-full max-h-[80vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
                  <button onClick={closeMenu} className="absolute top-4 right-4 p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
                      <X size={24}/>
                  </button>

                  {gameState === 'SETTINGS' && (
                      <div className="space-y-6">
                          <h2 className="text-2xl font-bold flex items-center gap-2"><Settings/> Settings</h2>
                          <div className="space-y-4">
                              <div>
                                  <label className="flex items-center gap-2 mb-1"><Volume2 size={16}/> Music Volume</label>
                                  <input type="range" min="0" max="1" step="0.01" value={saveData.settings.musicVolume} 
                                         onChange={e => {
                                             const v = parseFloat(e.target.value);
                                             setSaveData(s => ({...s, settings: {...s.settings, musicVolume: v}}));
                                             audio.setVolumes(v, saveData.settings.sfxVolume);
                                         }} className="w-full accent-indigo-500"/>
                              </div>
                              <div>
                                  <label className="flex items-center gap-2 mb-1"><Volume2 size={16}/> SFX Volume</label>
                                  <input type="range" min="0" max="1" step="0.01" value={saveData.settings.sfxVolume} 
                                         onChange={e => {
                                             const v = parseFloat(e.target.value);
                                             setSaveData(s => ({...s, settings: {...s.settings, sfxVolume: v}}));
                                             audio.setVolumes(saveData.settings.musicVolume, v);
                                             audio.sfxUI();
                                         }} className="w-full accent-indigo-500"/>
                              </div>
                              <div>
                                  <label className="flex items-center gap-2 mb-1"><Monitor size={16}/> UI Scale ({saveData.settings.uiScale}x)</label>
                                  <input type="range" min="0.5" max="1.5" step="0.1" value={saveData.settings.uiScale} 
                                         onChange={e => {
                                             const v = parseFloat(e.target.value);
                                             setSaveData(s => ({...s, settings: {...s.settings, uiScale: v}}));
                                         }} className="w-full accent-indigo-500"/>
                              </div>
                              <button onClick={saveRun} className="w-full py-2 bg-green-900 hover:bg-green-800 rounded flex items-center justify-center gap-2"><Save size={16}/> Save Run Progress</button>
                          </div>
                          
                          <div className="pt-6 border-t border-slate-700 space-y-3">
                              <h3 className="font-bold text-slate-400 text-sm uppercase">Data Management</h3>
                              <div className="flex gap-2">
                                  <button onClick={() => { if(confirm("Wipe all data?")) { localStorage.clear(); window.location.reload(); } }} className="w-full py-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded flex items-center justify-center gap-2 text-sm"><Trash2 size={16}/> Wipe All Data</button>
                              </div>
                          </div>
                      </div>
                  )}
                  {gameState === 'SHOP' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold flex items-center gap-2 text-purple-400"><Store/> Void Shop</h2>
                                <div className="bg-purple-900/20 px-3 py-1 rounded-full border border-purple-500/50 flex items-center gap-2 text-purple-200 font-bold"><Hexagon size={16}/> {saveData.voidEssence}</div>
                            </div>
                            
                            {/* Shop Tabs */}
                            <div className="flex gap-2 mb-4">
                                <button onClick={() => setShopTab('upgrades')} className={`flex-1 py-2 rounded font-bold transition-all ${shopTab==='upgrades'?'bg-purple-600 text-white':'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Upgrades</button>
                                <button onClick={() => setShopTab('cosmetics')} className={`flex-1 py-2 rounded font-bold transition-all ${shopTab==='cosmetics'?'bg-indigo-600 text-white':'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Cosmetics</button>
                            </div>

                            {/* Upgrades List */}
                            {shopTab === 'upgrades' && (
                                <div className="space-y-2">
                                    {[
                                         {id:'startHp',n:'Void Heart',c:50, desc:'+Start HP'},
                                         {id:'startStr',n:'Void Strength',c:100, desc:'+Start STR'},
                                         {id:'startInt',n:'Void Mind',c:100, desc:'+Start INT'},
                                         {id:'startDex',n:'Void Agility',c:100, desc:'+Start DEX'}
                                      ].map((u:any) => {
                                         const level = saveData.upgrades[u.id as keyof typeof saveData.upgrades];
                                         const cost = u.c + level * 50;
                                         return (
                                             <div key={u.id} className="flex justify-between items-center p-3 bg-slate-800 rounded border border-slate-700 hover:border-purple-500/50 transition-colors">
                                                 <div>
                                                     <div className="font-bold">{u.n} <span className="text-xs text-yellow-500">Lvl {level}</span></div>
                                                     <div className="text-xs text-slate-400">{u.desc}</div>
                                                 </div>
                                                 <button onClick={() => {
                                                     if (saveData.voidEssence >= cost) {
                                                         audio.sfxUI();
                                                         setSaveData(s => ({ ...s, voidEssence: s.voidEssence-cost, upgrades: {...s.upgrades, [u.id]: s.upgrades[u.id as keyof typeof saveData.upgrades]+1} }));
                                                     }
                                                 }} className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={saveData.voidEssence < cost}>
                                                     {cost} VE
                                                 </button>
                                             </div>
                                         )
                                      })}
                                </div>
                            )}

                            {/* Cosmetics List */}
                            {shopTab === 'cosmetics' && (
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(COSMETICS).map(([key, cos]) => {
                                        const isUnlocked = saveData.unlockedCosmetics.includes(key);
                                        const isSelected = saveData.selectedCosmetic === key;
                                        
                                        return (
                                            <div key={key} className={`p-3 bg-slate-800 rounded border ${isSelected ? 'border-green-500 ring-1 ring-green-500' : 'border-slate-700'} hover:border-indigo-500/50 transition-all`}>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`p-2 rounded bg-slate-900 ${cos.color}`}>{cos.icon}</div>
                                                    <div>
                                                        <div className="font-bold text-sm">{cos.name}</div>
                                                        <div className="text-[10px] text-slate-400">{cos.desc}</div>
                                                    </div>
                                                </div>
                                                
                                                {isUnlocked ? (
                                                    <button onClick={() => {
                                                        audio.sfxUI();
                                                        setSaveData(s => ({ ...s, selectedCosmetic: key }));
                                                    }} className={`w-full py-1 rounded text-xs font-bold ${isSelected ? 'bg-green-600/20 text-green-400 cursor-default' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
                                                        {isSelected ? <span className="flex items-center justify-center gap-1"><Shield size={12}/> Equipped</span> : 'Equip'}
                                                    </button>
                                                ) : (
                                                    <button onClick={() => {
                                                        if(saveData.voidEssence >= cos.cost) {
                                                            audio.sfxLevelUp(); 
                                                            setSaveData(s => ({ ...s, voidEssence: s.voidEssence - cos.cost, unlockedCosmetics: [...s.unlockedCosmetics, key] }));
                                                        }
                                                    }} disabled={saveData.voidEssence < cos.cost} className="w-full py-1 rounded text-xs font-bold bg-slate-700 hover:bg-slate-600 text-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed">
                                                        Unlock ({cos.cost} VE)
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                  )}
                  {gameState === 'INVENTORY' && (
                      <div>
                          <div className="flex justify-between items-center mb-4">
                              <h2 className="text-2xl font-bold flex items-center gap-2"><Backpack/> Inventory</h2>
                              <div className="text-xs text-slate-400 flex items-center gap-2">
                                  <MousePointer2 size={12}/> Drag items to move or equip
                              </div>
                          </div>
                          
                          {/* Equipment Slots */}
                          <div className="flex gap-4 mb-6 justify-center bg-slate-800/50 p-4 rounded">
                              {['weapon', 'armor', 'accessory'].map(type => {
                                  const eqItem = player.equipment[type as keyof typeof player.equipment];
                                  const isTutorialTarget = gameState === 'TUTORIAL' && TUTORIAL_STEPS[tutorialStep]?.highlight === 'equip_slot';
                                  
                                  return (
                                      <div key={type} 
                                           className="flex flex-col items-center group relative"
                                           onDragOver={handleDragOver}
                                           onDrop={(e) => handleDrop(e, 'equipment', undefined, type)}>
                                          <div draggable={!!eqItem}
                                               onDragStart={(e) => handleDragStart(e, 'equipment', undefined, type)}
                                               className={`w-12 h-12 border-2 rounded flex items-center justify-center cursor-pointer transition-all hover:border-white ${isTutorialTarget ? 'border-yellow-400 animate-pulse bg-yellow-900/20' : 'border-slate-700 bg-slate-900 text-slate-600'}`}>
                                              {eqItem ? (type === 'weapon' ? <Sword size={24} className={RARITIES[eqItem.rarity].color}/> : type === 'armor' ? <Shield size={24} className={RARITIES[eqItem.rarity].color}/> : <Sparkles size={24} className={RARITIES[eqItem.rarity].color}/>) : <span className="text-[10px] uppercase font-bold">{type.substring(0,3)}</span>}
                                          </div>
                                          {eqItem && (
                                              <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 bg-slate-900 border border-slate-600 p-2 rounded z-50 pointer-events-none shadow-xl">
                                                  <div className={`font-bold text-sm ${RARITIES[eqItem.rarity].color}`}>{eqItem.name}</div>
                                                  <div className="text-[10px] text-slate-400 italic">{eqItem.description}</div>
                                                  <div className="text-[10px] text-slate-300 mt-1">
                                                      {Object.entries(eqItem.stats).map(([k,v]) => <div key={k}>{k.toUpperCase()}: +{v}</div>)}
                                                  </div>
                                                  <div className="text-[10px] text-red-400 mt-1">Drag to Unequip</div>
                                              </div>
                                          )}
                                      </div>
                                  );
                              })}
                          </div>

                          {/* Inventory Grid */}
                          <div className="grid grid-cols-5 gap-2 relative mb-4">
                              {player.inventory.map((item, i) => (
                                  <div key={i} 
                                       draggable={!!item}
                                       onDragStart={(e) => handleDragStart(e, 'inventory', i)}
                                       onDragOver={handleDragOver}
                                       onDrop={(e) => handleDrop(e, 'inventory', i)}
                                       className={`relative p-2 border-2 aspect-square flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-800 ${item ? RARITIES[item.rarity].border : 'border-slate-800 bg-slate-900/50'} ${item ? RARITIES[item.rarity].bg : ''} ${item ? RARITIES[item.rarity].shadow : ''}`}
                                       onMouseEnter={(e) => item && setHoverItem({item, x: e.clientX, y: e.clientY})}
                                       onMouseLeave={() => setHoverItem(null)}
                                       onClick={() => item && handleDirectAction(item, i)}>
                                      {item && (
                                          <div className={RARITIES[item.rarity].color}>
                                              {item.type==='consumable'?<Heart size={20}/>: item.type==='weapon'?<Sword size={20}/>: item.type==='armor'?<Shield size={20}/>:<Sparkles size={20}/>}
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>

                          {/* Trash Drop Zone */}
                          <div 
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, 'trash')}
                              className="h-16 border-2 border-dashed border-red-900/50 bg-red-900/20 rounded flex items-center justify-center text-red-400 hover:bg-red-900/40 hover:border-red-500 transition-all">
                              <Trash2 size={24} className="mr-2"/> Drag items here to Trash
                          </div>
                      </div>
                  )}
                  {gameState === 'SKILLS' && (
                      <div className="h-[400px] flex flex-col">
                          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 text-yellow-400"><Zap/> Skill Tree</h2>
                          <div className="flex justify-between bg-slate-800 p-2 rounded mb-4 text-sm">
                              <span>Points Available: <span className="text-yellow-400 font-bold text-lg">{player.skillPoints}</span></span>
                              <span>Level: {player.level}</span>
                          </div>
                          
                          <div className="flex-1 relative bg-slate-950 border border-slate-700 rounded overflow-hidden">
                              {/* Connections */}
                              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                  {SKILL_TREE.map(node => {
                                      if(!node.parent) return null;
                                      const parent = SKILL_TREE.find(n => n.id === node.parent);
                                      if(!parent) return null;
                                      return (
                                          <line key={`${parent.id}-${node.id}`} 
                                                x1={`${parent.x}%`} y1={`${parent.y}%`} x2={`${node.x}%`} y2={`${node.y}%`} 
                                                stroke={player.unlockedSkills.includes(node.id) ? '#fbbf24' : '#475569'} strokeWidth="2" />
                                      );
                                  })}
                              </svg>

                              {/* Nodes */}
                              {SKILL_TREE.map(node => {
                                  const unlocked = player.unlockedSkills.includes(node.id);
                                  const buyable = !unlocked && (node.parent ? player.unlockedSkills.includes(node.parent) : true) && player.skillPoints >= node.cost;
                                  
                                  return (
                                      <div key={node.id} 
                                           className={`absolute w-12 h-12 -ml-6 -mt-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all z-10
                                           ${unlocked ? 'bg-yellow-900/80 border-yellow-400 text-yellow-100' : buyable ? 'bg-slate-800 border-green-500 text-green-100 hover:scale-110 animate-pulse' : 'bg-slate-900 border-slate-700 text-slate-600 grayscale'}`}
                                           style={{ left: `${node.x}%`, top: `${node.y}%` }}
                                           onClick={() => {
                                               if(buyable) {
                                                   audio.sfxLevelUp();
                                                   setPlayer(p => {
                                                       const next = node.effect ? node.effect(p) : p;
                                                       return { ...next, skillPoints: p.skillPoints - node.cost, unlockedSkills: [...p.unlockedSkills, node.id] };
                                                   });
                                                   if (gameState === 'TUTORIAL' && TUTORIAL_STEPS[tutorialStep]?.check === 'learn_skill') {
                                                       advanceTutorial('learn_skill');
                                                   }
                                               }
                                           }}
                                           onMouseEnter={(e) => setHoverItem({item: {...node, description: node.description, stats: {}, rarity: 'common'} as any, x: e.clientX, y: e.clientY})} 
                                           onMouseLeave={() => setHoverItem(null)}>
                                          {node.icon}
                                      </div>
                                  );
                              })}
                          </div>
                          
                          {/* Stats Panel */}
                          <div className="grid grid-cols-4 gap-2 mt-4 bg-slate-800 p-3 rounded text-xs font-mono">
                              <div className="text-red-400 flex flex-col items-center">
                                  <span className="uppercase text-slate-500 text-[10px]">STR</span>
                                  <span className={effectiveStats.str > player.stats.str ? "text-green-400 font-bold" : ""}>{effectiveStats.str}</span>
                              </div>
                              <div className="text-green-400 flex flex-col items-center">
                                  <span className="uppercase text-slate-500 text-[10px]">DEX</span>
                                  <span className={effectiveStats.dex > player.stats.dex ? "text-green-400 font-bold" : ""}>{effectiveStats.dex}</span>
                              </div>
                              <div className="text-blue-400 flex flex-col items-center">
                                  <span className="uppercase text-slate-500 text-[10px]">INT</span>
                                  <span className={effectiveStats.int > player.stats.int ? "text-green-400 font-bold" : ""}>{effectiveStats.int}</span>
                              </div>
                              <div className="text-yellow-400 flex flex-col items-center">
                                  <span className="uppercase text-slate-500 text-[10px]">CON</span>
                                  <span className={effectiveStats.con > player.stats.con ? "text-green-400 font-bold" : ""}>{effectiveStats.con}</span>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {(gameState === 'GAMEOVER' || gameState === 'VICTORY') && (
          <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center animate-fade-in text-center p-8">
               <h2 className={`text-6xl font-bold mb-4 ${gameState==='VICTORY'?'text-yellow-400':'text-red-500'}`}>{gameState}</h2>
               <div className="text-slate-400 mb-8 space-y-1">
                   <p>Level: {player.level}</p>
                   <p>Kills: {runStats.kills}</p>
               </div>
               <button onClick={() => setGameState('MENU')} className="px-8 py-3 bg-white text-slate-900 font-bold rounded">Return to Menu</button>
          </div>
      )}
    </div>
  );
}