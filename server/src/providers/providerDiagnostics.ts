import type { ExternalErrorKind } from './types.js';

export interface ProviderTestStatus {ok:boolean;category:ExternalErrorKind|null;status?:number;providerCode?:string|number;message?:string;testedAt:string}
const tests:{ai?:ProviderTestStatus;place?:ProviderTestStatus}={};
export const recordProviderSuccess=(provider:'ai'|'place')=>{tests[provider]={ok:true,category:null,testedAt:new Date().toISOString()}};
export const recordProviderFailure=(provider:'ai'|'place',category:ExternalErrorKind,details:{status?:number;providerCode?:string|number;providerMessage?:string})=>{tests[provider]={ok:false,category,status:details.status,providerCode:details.providerCode,message:details.providerMessage,testedAt:new Date().toISOString()}};
export const getProviderDiagnostics=()=>({ai:tests.ai,place:tests.place});
