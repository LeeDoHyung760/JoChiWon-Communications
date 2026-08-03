const normalizeApiBaseUrl=(configured:string|undefined)=>{
  const value=(configured?.trim()||'/api').replace(/\/$/,'');
  if(value==='/api'||/\/api$/i.test(value))return value;
  try{
    const url=new URL(value,window.location.origin);
    if(url.pathname===''||url.pathname==='/')return `${value}/api`;
  }catch{/* Keep custom relative API prefixes unchanged. */}
  return value;
};

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001').replace(/\/$/, '');
