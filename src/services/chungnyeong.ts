import type { ChungnyeongChatResponse } from '../../shared/chungnyeong';
import { API_BASE_URL } from '../config/api';

type ApiErrorBody={error?:{message?:string};message?:string};

async function readApiJson<T>(response:Response):Promise<T>{
  const text=await response.text();
  let body:ApiErrorBody|T;
  try{body=JSON.parse(text) as ApiErrorBody|T}
  catch{
    const looksLikeHtml=/^\s*</.test(text);
    throw new Error(looksLikeHtml
      ?'충녕이 API 주소가 웹 화면 주소로 연결되어 있어요. 서버의 /api 경로를 확인해 주세요.'
      :'충녕이 서버가 올바른 응답을 보내지 않았어요.');
  }
  if(!response.ok){
    const error=body as ApiErrorBody;
    throw new Error(error.error?.message??error.message??`충녕이 요청을 처리하지 못했어요. (${response.status})`);
  }
  return body as T;
}

export async function chatWithChungnyeong(message: string): Promise<ChungnyeongChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chungnyeong/chat`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  return readApiJson<ChungnyeongChatResponse>(response);
}

export async function sendChungnyeongProfileRequest(recruitmentId: string, message: string) {
  const response = await fetch(`${API_BASE_URL}/chungnyeong/profile-requests`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recruitmentId, message }),
  });
  const body=await readApiJson<{request:unknown}>(response);
  return body.request;
}
