const ACCOUNT_DATA_PREFIXES=[
  'yeogi-',
  'jochiwon-',
  'sejong-lake-',
  'sejong-map-experience-',
  'greenhouse-progress-',
  'bear-travel-style-',
  'bear-wildlife-comparison-',
  'bear-tree-',
  'nature-discovery-visits-',
  'campus-activity-vote:',
  'campus-visited-buildings:',
  'character-debug-settings-',
] as const;

const ACCOUNT_DATA_KEYS=new Set([
  'bear-photo-zone-position',
]);

export function clearAllAccountData(storage:Pick<Storage,'length'|'key'|'removeItem'>){
  const keys=Array.from({length:storage.length},(_,index)=>storage.key(index))
    .filter((key):key is string=>Boolean(key))
    .filter(key=>ACCOUNT_DATA_KEYS.has(key)||ACCOUNT_DATA_PREFIXES.some(prefix=>key.startsWith(prefix)));
  keys.forEach(key=>storage.removeItem(key));
  return keys;
}
