import {randomUUID} from 'node:crypto';
import {mkdir,readFile,unlink,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {Request} from 'express';

const MAX_PHOTO_BYTES=10*1024*1024;
const MAX_MULTIPART_BYTES=MAX_PHOTO_BYTES+64*1024;
const STORAGE_ROOT=fileURLToPath(new URL('../../.data/visit-proofs/',import.meta.url));
const MIME_EXTENSION={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'} as const;
type SupportedMimeType=keyof typeof MIME_EXTENSION;

export interface ParsedVisitPhoto{
  buffer:Buffer;
  originalName:string;
  mimeType:SupportedMimeType;
  size:number;
}

export interface StoredVisitProof{
  storageKey:string;
  originalName:string;
  mimeType:SupportedMimeType;
  size:number;
}

const supportedMimeType=(value:string):value is SupportedMimeType=>Object.hasOwn(MIME_EXTENSION,value);
const safeOriginalName=(value:string)=>path.basename(value).replace(/[\u0000-\u001f\u007f]/g,'').slice(0,180)||'visit-photo';

function hasExpectedSignature(buffer:Buffer,mimeType:SupportedMimeType){
  if(mimeType==='image/jpeg')return buffer.length>=3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff;
  if(mimeType==='image/png')return buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  return buffer.length>=12&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP';
}

async function readLimitedBody(req:Request){
  const declared=Number(req.headers['content-length']??0);
  if(Number.isFinite(declared)&&declared>MAX_MULTIPART_BYTES)throw new Error('FILE_TOO_LARGE');
  const chunks:Buffer[]=[];let total=0;
  for await(const chunk of req){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);total+=buffer.length;if(total>MAX_MULTIPART_BYTES)throw new Error('FILE_TOO_LARGE');chunks.push(buffer)}
  return Buffer.concat(chunks,total);
}

export async function parseVisitPhoto(req:Request):Promise<ParsedVisitPhoto>{
  const contentType=req.headers['content-type']??'';
  const boundaryMatch=/^multipart\/form-data;\s*boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  const boundary=boundaryMatch?.[1]??boundaryMatch?.[2];
  if(!boundary)throw new Error('INVALID_MULTIPART');
  const body=await readLimitedBody(req),separator=Buffer.from(`--${boundary}`);
  let cursor=0;
  while(cursor<body.length){
    const start=body.indexOf(separator,cursor);if(start<0)break;
    const headerStart=start+separator.length+2,headerEnd=body.indexOf(Buffer.from('\r\n\r\n'),headerStart);if(headerEnd<0)break;
    const headers=body.toString('utf8',headerStart,headerEnd),next=body.indexOf(separator,headerEnd+4);if(next<0)break;
    cursor=next;
    if(!/content-disposition:\s*form-data;[^\r\n]*name="photo"/i.test(headers))continue;
    const filename=/filename="([^"]*)"/i.exec(headers)?.[1]??'visit-photo';
    const mimeType=(/content-type:\s*([^\r\n;]+)/i.exec(headers)?.[1]??'').trim().toLowerCase();
    if(!supportedMimeType(mimeType))throw new Error('INVALID_FILE_TYPE');
    const dataEnd=Math.max(headerEnd+4,next-2),buffer=body.subarray(headerEnd+4,dataEnd);
    if(!buffer.length)throw new Error('FILE_MISSING');
    if(buffer.length>MAX_PHOTO_BYTES)throw new Error('FILE_TOO_LARGE');
    if(!hasExpectedSignature(buffer,mimeType))throw new Error('INVALID_FILE_TYPE');
    return {buffer,originalName:safeOriginalName(filename),mimeType,size:buffer.length};
  }
  throw new Error('FILE_MISSING');
}

function proofPath(storageKey:string){
  const normalized=storageKey.replaceAll('\\','/'),parts=normalized.split('/');
  if(parts.length!==2||!/^([a-f\d]{24})$/i.test(parts[0])||!/^(garden|bearTree)-[a-f\d-]+\.(jpg|png|webp)$/i.test(parts[1]))return undefined;
  const resolved=path.resolve(STORAGE_ROOT,...parts),root=path.resolve(STORAGE_ROOT)+path.sep;
  return resolved.startsWith(root)?resolved:undefined;
}

export async function saveVisitProof(userId:string,mission:'garden'|'bearTree',photo:ParsedVisitPhoto):Promise<StoredVisitProof>{
  if(!/^[a-f\d]{24}$/i.test(userId)||!supportedMimeType(photo.mimeType)||photo.size!==photo.buffer.length||photo.size<1||photo.size>MAX_PHOTO_BYTES||!hasExpectedSignature(photo.buffer,photo.mimeType))throw new Error('INVALID_FILE_TYPE');
  const storageKey=`${userId}/${mission}-${randomUUID()}.${MIME_EXTENSION[photo.mimeType]}`,target=proofPath(storageKey);
  if(!target)throw new Error('INVALID_FILE_TYPE');
  await mkdir(path.dirname(target),{recursive:true});
  await writeFile(target,photo.buffer,{flag:'wx',mode:0o600});
  return {storageKey,originalName:safeOriginalName(photo.originalName),mimeType:photo.mimeType,size:photo.size};
}

export async function readVisitProof(storageKey:string){const target=proofPath(storageKey);if(!target)return null;return readFile(target).catch(()=>null)}
export async function removeVisitProof(storageKey:string){const target=proofPath(storageKey);if(!target)return;await unlink(target).catch(error=>{if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error})}
