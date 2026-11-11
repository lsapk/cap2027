import type {Snapshot} from './types';
const https=(s:unknown)=>{try{return typeof s==='string'&&new URL(s).protocol==='https:';}catch{return false;}};
const validDate=(s:unknown,now:string)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}/.test(s)&&Number.isFinite(new Date(s).getTime())&&s.slice(0,10)<=now.slice(0,10);
export function validateSnapshot(value:unknown,now=new Date().toISOString()):Snapshot{
 const data=value as Snapshot;
 if(!data||!Array.isArray(data.candidates)||!Array.isArray(data.proposals)||!Array.isArray(data.votes)||!validDate(data.updatedAt,now))throw Error('Le format ou la date du relevé nécessite une vérification.');
 const ids=new Set(data.candidates.map(c=>c.id));
 if(ids.size!==data.candidates.length||data.candidates.some(c=>!c.id||!c.name||!https(c.source)))throw Error('Une identité candidate ou sa source est incohérente.');
 let ambiguous=0;
 const votes=data.votes.filter(v=>validDate(v.date,now)&&https(v.url)&&['assemblee-nationale.fr','senat.fr','europarl.europa.eu'].some(h=>new URL(v.url).hostname===h||new URL(v.url).hostname.endsWith('.'+h))).map(v=>({...v,positions:Object.fromEntries(Object.entries(v.positions).filter(([id,pos])=>{const ok=ids.has(id)&&['pour','contre','abstention','non_votant'].includes(pos);if(!ok)ambiguous++;return ok;}))})).filter(v=>Object.keys(v.positions).length);
 const proposals=data.proposals.filter(p=>p.title&&p.text&&validDate(p.date,now)&&p.candidateIds.length&&p.candidateIds.every(id=>ids.has(id))&&p.sources.some(s=>https(s.url)));
 const warnings=[...data.warnings];
 if(ambiguous)warnings.push('Les mentions d’absence non recoupées ont été écartées de l’affichage ; aucune présence ou absence n’en est déduite.');
 if(proposals.length!==data.proposals.length)warnings.push('Des propositions dont la date, l’attribution ou la source était incohérente ont été écartées de l’affichage.');
 if(votes.length!==data.votes.length)warnings.push('Les scrutins sans position exploitable, avec une date incohérente ou sans lien officiel ont été écartés.');
 return {...data,votes,proposals,warnings:[...new Set(warnings)]};
}
