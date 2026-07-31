export type RegionId='station'|'market'|'park'|'college';export type PartKind='hair'|'face'|'top'|'topLayer'|'bottom'|'shoes'|'accessory';
export type CharacterModel='custom'|'chungnyeong'|'girl1'|'boy1'|'cloths'|'women';
export type GarmentStyle='style1'|'style2';
export interface CharacterParts{hair:string;hairStyle?:'hair1'|'hair2'|'both';topStyle?:GarmentStyle;bottomStyle?:GarmentStyle;shoesStyle?:GarmentStyle;outfitStyle?:'outfit1'|'outfit2';face:string;top:string;topLayer?:string;bottom:string;shoes:string;accessory?:string}
export interface UserProfile{nickname:string;mbti:string;interests:string[];usagePurposes:string[];preferredPlaceCategories:string[];recordVisibility?:'public'|'private';chatEnabled?:boolean;character:CharacterParts;model:CharacterModel}
export interface SocialUser extends UserProfile{id:string;status:string}
export interface Place{id:string;name:string;category:'카페'|'음식점'|'전통시장'|'산책'|'문화공간'|'스터디';tags:string[];region:RegionId;description:string;groupFriendly:boolean}
