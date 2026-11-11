import { createClient } from '@supabase/supabase-js';
import {config} from './config';
import type {Snapshot} from './types';
import {validateSnapshot} from './quality';
export const db=createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'cap2027-auth'}});
export async function invoke(body:Record<string,unknown>){const {data,error}=await db.functions.invoke('cap27-api',{body});if(error){let message='Le service est momentanément indisponible.';try{message=(await error.context?.json())?.error||message;}catch{}throw new Error(message);}if(data?.error)throw new Error(data.error);return data;}
export async function loadRemote():Promise<Snapshot|null>{const {data,error}=await db.from('cap27_snapshot').select('payload').eq('id',1).maybeSingle();if(error)throw error;return data?.payload?validateSnapshot(data.payload):null;}
export const date=(value:string|null|undefined,withTime=false)=>{if(!value)return 'Date non renseignée';const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric',...(withTime?{hour:'2-digit',minute:'2-digit'}:{})});};
export const normalized=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const hostname=(s:string)=>{try{return new URL(s).hostname.replace(/^www\./,'');}catch{return 'Source';}};
export const external=(s:string)=>{try{return new URL(s).protocol==='https:'?s:undefined;}catch{return undefined;}};
