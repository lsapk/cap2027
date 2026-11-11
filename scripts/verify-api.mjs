import assert from 'node:assert/strict';
import {config} from '../src/config.ts';
const headers={apikey:config.key,Authorization:'Bearer '+config.key,'Content-Type':'application/json'};
const get=async(path,options={})=>{const r=await fetch(config.url+path,{headers,...options});let data;try{data=await r.json();}catch{}return {status:r.status,data};};
const snapshot=await get('/rest/v1/cap27_snapshot?select=payload&id=eq.1');assert.equal(snapshot.status,200);assert.ok(snapshot.data[0].payload.candidates.length>0);
const prefs=await get('/rest/v1/cap27_preferences?select=user_id');assert.ok(prefs.status===200||prefs.status===401);if(prefs.status===200)assert.deepEqual(prefs.data,[]);
const quota=await get('/rest/v1/rpc/cap27_claim_ai',{method:'POST',body:JSON.stringify({uid:'00000000-0000-4000-a000-000000000001'})});assert.ok(quota.status===401||quota.status===403);
const ask=await get('/functions/v1/cap27-api',{method:'POST',body:JSON.stringify({action:'ask',question:'Quelles sources sont utilisées ?'})});assert.equal(ask.status,401);
console.log(JSON.stringify({snapshot:snapshot.status,candidates:snapshot.data[0].payload.candidates.length,anonymousPreferencesHidden:true,quotaRpcDenied:quota.status,assistantRequiresLogin:ask.status}));
