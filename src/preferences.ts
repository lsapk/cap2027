import {useEffect,useRef,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import type {Preferences} from './types';
import {db} from './api';
export const defaultPrefs:Preferences={favorites:[],themes:[],alerts:{candidature:true,programme:true,vote:true,parrainage:true},last_seen:new Date().toISOString(),sync_consent:false,consent_at:null};
export function usePreferences(user:User|null,notify:(s:string)=>void){
 const [prefs,setPrefs]=useState<Preferences>(defaultPrefs);const [prefReady,setPrefReady]=useState(false);const previousVisit=useRef(new Date().toISOString());
 const key='cap27-prefs-v1-'+(user?.id||'guest');
 const local=(next:Preferences)=>{try{localStorage.setItem(key,JSON.stringify(next));}catch{}};
 useEffect(()=>{let alive=true;setPrefReady(false);let p={...defaultPrefs};try{p={...p,...JSON.parse(localStorage.getItem(key)||'{}')};}catch{}previousVisit.current=p.last_seen;p={...p,last_seen:new Date().toISOString()};setPrefs(p);local(p);
  if(!user){setPrefReady(true);return()=>{alive=false;};}
  void db.from('cap27_preferences').select('favorites,themes,alerts,last_seen,sync_consent,consent_at').eq('user_id',user.id).maybeSingle().then(({data,error})=>{if(!alive)return;if(error){notify('Vos favoris restent sur cet appareil : la synchronisation est indisponible.');setPrefReady(false);return;}if(data?.sync_consent){previousVisit.current=data.last_seen;const next={...defaultPrefs,...data,last_seen:new Date().toISOString()};setPrefs(next);local(next);void db.from('cap27_preferences').upsert({...next,user_id:user.id,updated_at:new Date().toISOString()}).then(({error})=>{if(error)notify('La dernière visite n’a pas pu être synchronisée.');});}else if(data?.favorites?.length&&!p.favorites.length){const next={...p,favorites:data.favorites,sync_consent:false};setPrefs(next);local(next);}setPrefReady(true);});return()=>{alive=false;};
 },[user?.id]);
 function updatePrefs(next:Preferences){setPrefs(next);local(next);if(user&&prefReady&&next.sync_consent)void db.from('cap27_preferences').upsert({...next,user_id:user.id,updated_at:new Date().toISOString()}).then(({error})=>{if(error)notify('Favoris enregistrés sur cet appareil. La synchronisation a échoué.');});}
 async function consent(enabled:boolean){if(!user)throw Error('Connectez-vous avant d’activer la synchronisation.');const next={...prefs,sync_consent:enabled,consent_at:enabled?new Date().toISOString():null};if(enabled){const {error}=await db.from('cap27_preferences').upsert({...next,user_id:user.id,updated_at:new Date().toISOString()});if(error)throw Error('Votre choix n’a pas pu être enregistré.');}else{const {error}=await db.from('cap27_preferences').delete().eq('user_id',user.id);if(error)throw Error('Le retrait des préférences du serveur a échoué. Réessayez.');}setPrefs(next);local(next);}
 async function erase(){if(user){const {error}=await db.from('cap27_preferences').delete().eq('user_id',user.id);if(error)throw Error('L’effacement sur le serveur a échoué. Réessayez.');}try{localStorage.removeItem(key);localStorage.removeItem('cap27-ai-consent-v1-'+(user?.id||'guest'));}catch{}setPrefs({...defaultPrefs,last_seen:new Date().toISOString()});}
 return {prefs,prefReady,setPrefs,updatePrefs,consent,erase,previousVisit};
}
