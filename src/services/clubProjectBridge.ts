export interface ClubProjectContext{clubId:string;clubName:string;icon:string;interests:string[];memberNames:string[];recentActivity:string}
const KEY='sejong-club-project-context-v1';
export function saveClubProjectContext(context:ClubProjectContext){localStorage.setItem(KEY,JSON.stringify(context))}
export function loadClubProjectContext():ClubProjectContext|null{try{const value=JSON.parse(localStorage.getItem(KEY)??'null') as ClubProjectContext|null;return value&&typeof value.clubId==='string'&&typeof value.clubName==='string'&&Array.isArray(value.interests)&&Array.isArray(value.memberNames)?value:null}catch{return null}}
export function clearClubProjectContext(){localStorage.removeItem(KEY)}
