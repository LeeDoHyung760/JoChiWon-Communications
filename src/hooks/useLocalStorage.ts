import { useState } from 'react';
export function useLocalStorage<T>(key:string, initial:T){
 const [value,setValueState]=useState<T>(()=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):initial}catch{return initial}});
 const setValue=(next:T)=>{setValueState(next);localStorage.setItem(key,JSON.stringify(next))};
 return [value,setValue] as const;
}
