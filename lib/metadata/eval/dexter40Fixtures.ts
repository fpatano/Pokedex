import type { TcgdexCard } from '@/lib/metadata/adapter/tcgdexMapper';

export const dexterFixtureCards: TcgdexCard[] = [
  { id: 'sv3-27', name: 'Charizard', category: 'Pokemon', types: ['Fire'], hp: 180, attacks: [{ name: 'Burning Darkness', damage: 180, effect: 'Big fire hit' }] },
  { id: 'swsh4-25', name: 'Charmander', category: 'Pokemon', types: ['Fire'], hp: 70, attacks: [{ name: 'Scratch', damage: 10 }] },
  { id: 'base-4', name: 'Blastoise', category: 'Pokemon', types: ['Water'], hp: 100, attacks: [{ name: 'Hydro Pump', damage: 60 }] },
  { id: 'sv2-52', name: 'Pikachu', category: 'Pokemon', types: ['Lightning'], hp: 60, attacks: [{ name: 'Thunder Jolt', damage: 30 }] },
  { id: 'sv2-53', name: 'Raichu', category: 'Pokemon', types: ['Lightning'], hp: 120, attacks: [{ name: 'Thunderbolt', damage: 140 }] },
  { id: 'sv1-10', name: 'Bulbasaur', category: 'Pokemon', types: ['Grass'], hp: 70, attacks: [{ name: 'Vine Whip', damage: 20 }] },
  { id: 'sv1-11', name: 'Ivysaur', category: 'Pokemon', types: ['Grass'], hp: 90, attacks: [{ name: 'Razor Leaf', damage: 60 }] },
  { id: 'sv1-12', name: 'Venusaur', category: 'Pokemon', types: ['Grass'], hp: 150, attacks: [{ name: 'Solar Beam', damage: 160 }] },
  { id: 'tr-1', name: 'Professor Research', category: 'Trainer', hp: undefined, attacks: [] },
  { id: 'en-1', name: 'Double Turbo Energy', category: 'Energy', hp: undefined, attacks: [] },
];

export type DexterQueryFixture = {
  id: string;
  query: string;
  expectAny: Array<{ field: 'name' | 'type' | 'supertype' | 'minDamage'; value: string | number }>;
};

const q = (id: number, query: string, expectAny: DexterQueryFixture['expectAny']): DexterQueryFixture => ({ id: `Q${id.toString().padStart(2, '0')}`, query, expectAny });

export const dexter40Queries: DexterQueryFixture[] = [
  q(1, 'charizard', [{ field: 'name', value: 'charizard' }]),
  q(2, 'charmander', [{ field: 'name', value: 'charmander' }]),
  q(3, 'blastoise', [{ field: 'name', value: 'blastoise' }]),
  q(4, 'pikachu', [{ field: 'name', value: 'pikachu' }]),
  q(5, 'raichu', [{ field: 'name', value: 'raichu' }]),
  q(6, 'bulbasaur', [{ field: 'name', value: 'bulbasaur' }]),
  q(7, 'ivysaur', [{ field: 'name', value: 'ivysaur' }]),
  q(8, 'venusaur', [{ field: 'name', value: 'venusaur' }]),
  q(9, 'fire pokemon', [{ field: 'type', value: 'fire' }]),
  q(10, 'water pokemon', [{ field: 'type', value: 'water' }]),
  q(11, 'lightning pokemon', [{ field: 'type', value: 'lightning' }]),
  q(12, 'grass pokemon', [{ field: 'type', value: 'grass' }]),
  q(13, 'trainer cards', [{ field: 'supertype', value: 'trainer' }]),
  q(14, 'energy cards', [{ field: 'supertype', value: 'energy' }]),
  q(15, 'high damage fire', [{ field: 'type', value: 'fire' }, { field: 'minDamage', value: 100 }]),
  q(16, 'high damage lightning', [{ field: 'type', value: 'lightning' }, { field: 'minDamage', value: 100 }]),
  q(17, 'high damage grass', [{ field: 'type', value: 'grass' }, { field: 'minDamage', value: 100 }]),
  q(18, 'pokemon with 60 damage', [{ field: 'minDamage', value: 60 }]),
  q(19, 'pokemon with 140 damage', [{ field: 'minDamage', value: 140 }]),
  q(20, 'pokemon with 160 damage', [{ field: 'minDamage', value: 160 }]),
  q(21, 'pokemon with 180 damage', [{ field: 'minDamage', value: 180 }]),
  q(22, 'fire attacker', [{ field: 'type', value: 'fire' }]),
  q(23, 'water attacker', [{ field: 'type', value: 'water' }]),
  q(24, 'lightning attacker', [{ field: 'type', value: 'lightning' }]),
  q(25, 'grass attacker', [{ field: 'type', value: 'grass' }]),
  q(26, 'find char', [{ field: 'name', value: 'char' }]),
  q(27, 'find blast', [{ field: 'name', value: 'blast' }]),
  q(28, 'find pika', [{ field: 'name', value: 'pika' }]),
  q(29, 'find venus', [{ field: 'name', value: 'venus' }]),
  q(30, 'pokemon', [{ field: 'supertype', value: 'pokemon' }]),
  q(31, 'electric', [{ field: 'type', value: 'lightning' }]),
  q(32, 'green pokemon', [{ field: 'type', value: 'grass' }]),
  q(33, 'red pokemon', [{ field: 'type', value: 'fire' }]),
  q(34, 'blue pokemon', [{ field: 'type', value: 'water' }]),
  q(35, 'strongest lightning move', [{ field: 'type', value: 'lightning' }, { field: 'minDamage', value: 120 }]),
  q(36, 'strongest grass move', [{ field: 'type', value: 'grass' }, { field: 'minDamage', value: 150 }]),
  q(37, 'strongest fire move', [{ field: 'type', value: 'fire' }, { field: 'minDamage', value: 150 }]),
  q(38, 'support trainer', [{ field: 'supertype', value: 'trainer' }]),
  q(39, 'special energy', [{ field: 'supertype', value: 'energy' }]),
  q(40, 'starter pokemon', [{ field: 'name', value: 'saur' }, { field: 'name', value: 'char' }, { field: 'name', value: 'pika' }]),
];
