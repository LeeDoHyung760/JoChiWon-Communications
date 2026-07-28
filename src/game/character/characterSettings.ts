export interface CharacterSettings{
  modelForwardOffset:number;visualScale:number;visualOffsetY:number;rotationSpeed:number;
  walkSpeed:number;runSpeed:number;walkAnimationTimeScale:number;runAnimationTimeScale:number;
}
export const defaultCharacterSettings:CharacterSettings={
  modelForwardOffset:0,visualScale:.72,visualOffsetY:-45,rotationSpeed:14,
  walkSpeed:180,runSpeed:280,walkAnimationTimeScale:1,runAnimationTimeScale:1,
};
const saved=import.meta.env.DEV?localStorage.getItem('character-debug-settings-v2'):null;
export const characterSettings:CharacterSettings=saved?{...defaultCharacterSettings,...JSON.parse(saved)}:structuredClone(defaultCharacterSettings);
export const characterDebugEnabled=import.meta.env.DEV&&(import.meta.env.VITE_CHARACTER_DEBUG==='true'||location.pathname==='/dev/character-test');
export function updateCharacterSettings(next:Partial<CharacterSettings>){
  Object.assign(characterSettings,next);localStorage.setItem('character-debug-settings-v2',JSON.stringify(characterSettings));
  window.dispatchEvent(new CustomEvent('character-settings-changed'));
}
