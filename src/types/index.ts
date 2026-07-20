export type RegionId = 'station' | 'market' | 'culture';
export type PartKind = 'hair' | 'face' | 'top' | 'bottom';
export interface CharacterParts { hair: string; face: string; top: string; bottom: string }
export interface UserProfile { nickname: string; mbti: string; interests: string[]; character: CharacterParts }
export interface SocialUser extends UserProfile { id: string; status: string }
export interface Place { id: string; name: string; category: '카페'|'음식점'|'전통시장'|'산책'|'문화공간'|'스터디'; tags: string[]; region: RegionId; description: string; groupFriendly: boolean }
export interface GameEvents { userSelected: SocialUser; npcSelected: true; regionChanged: RegionId }
