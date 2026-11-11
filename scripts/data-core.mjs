export const FEEDS = {
 candidates:'https://hemicycle-france.fr/data/export/candidatures-presidentielle-2027.csv',
 proposals:'https://prometheus-euro.eu/donnees/swipe/propositions.json',
 votes:'https://2027etmoi.fr/data/votes.json',
 speeches:'https://2027etmoi.fr/data/prises-de-parole.json',
 register:'https://raw.githubusercontent.com/2027etmoi/2027etmoi/main/data/candidats.json',
};
export const slug = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const safeUrl = s => {try {const u=new URL(s);return u.protocol==='https:' ? u.href : '';} catch {return '';}};
export function csv(text,delimiter=',') {
 const rows=[]; let row=[],cell='',quote=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++;}else quote=!quote;}else if(c===delimiter&&!quote){row.push(cell);cell='';}else if(c==='\n'&&!quote){row.push(cell.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
 if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}
 if(quote) throw new Error('CSV tronqué');const headers=rows.shift()?.map(h=>h.replace(/^\uFEFF/,''))||[];
 return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]||''])));
}
export async function download(url, format='json') {
 const r=await fetch(url,{headers:{'User-Agent':'Cap2027/1.0 (civic open-data reader)'},signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw new Error(`${new URL(url).hostname} : HTTP ${r.status}`);
 const text=await r.text(); if(text.length>12000000)throw new Error('Source trop volumineuse');return format==='json'?JSON.parse(text):text;
}
const sourceInfo=[
 {id:'candidates',name:'Hémicycle',kind:'Compilation indépendante',url:'https://www.data.gouv.fr/datasets/candidats-a-lelection-presidentielle-2027-liste-partis-et-sources',license:'Licence Ouverte 2.0'},
 {id:'proposals',name:'PromethEUs / Swipe 2027',kind:'Compilation indépendante',url:'https://www.data.gouv.fr/datasets/swipe-2027-propositions-des-candidats-et-verification-des-chiffres',license:'Licence Ouverte 2.0'},
 {id:'votes',name:'2027etmoi — votes parlementaires',kind:'Compilation des données parlementaires',url:'https://2027etmoi.fr/data/votes.json',license:'Licence Ouverte 2.0'},
 {id:'speeches',name:'2027etmoi — prises de parole',kind:'Compilation de déclarations publiques',url:'https://2027etmoi.fr/data/prises-de-parole.json',license:'Licence Ouverte 2.0'},
];
const aliases={'marine-le-pen':'lepen','jean-luc-melenchon':'melenchon','nicolas-dupont-aignan':'dupontaignan'};
export function normalize(raw, previous=null, now=new Date().toISOString()){
 const list=csv(raw.candidates);if(list.length<5||!list.every(c=>c.nom&&c.statut&&safeUrl(c.source)))throw new Error('Registre candidats invalide');
 const candidates=list.filter(c=>!/pressentie/i.test(c.statut)).map(c=>({id:slug(c.nom),name:c.nom,party:c.parti,family:c.famille_politique,status:/sous réserve/i.test(c.statut)?'Sous réserve':'Déclarée',announcement:c.date_annonce,source:safeUrl(c.source),updatedAt:c.mis_a_jour,bio:previous?.candidates?.find(p=>p.name===c.nom)?.bio||null,statusSources:[{publisher:'Hémicycle',status:c.statut,url:safeUrl(c.source),date:c.mis_a_jour}]}));
 const families={gauche:'Gauche et écologistes',centre:'Centre et majorité sortante',droite:'Droite',extreme_droite:'Extrême droite',autres:'Autres candidatures'};
 for(const entry of raw.register?.candidats||[]){
  const id=slug(entry.nom);const existing=candidates.find(c=>c.id===id);const original=list.find(c=>slug(c.nom)===id);
  const alt={publisher:'2027etmoi',status:entry.statut_detail||entry.statut,url:safeUrl(entry.source?.url),date:entry.verifie_le||entry.source?.date};
  if(existing){existing.externalId=entry.id;existing.links=entry.liens;existing.statusSources.push(alt);if((entry.statut==='declare')!==(existing.status==='Déclarée'))existing.statusConflict=true;}
  else if(entry.statut==='declare'&&safeUrl(entry.source?.url)&&/^[a-z0-9-]+$/.test(entry.id)){candidates.push({id,name:entry.nom,party:entry.parti,family:families[entry.bloc]||'Autres candidatures',status:original?'À vérifier':'Déclarée',announcement:entry.statut_detail,source:safeUrl(entry.source.url),updatedAt:entry.verifie_le||raw.register.mise_a_jour,bio:previous?.candidates?.find(p=>p.id===id)?.bio||null,externalId:entry.id,links:entry.liens,statusConflict:!!original,statusSources:original?[{publisher:'Hémicycle',status:original.statut,url:safeUrl(original.source),date:original.mis_a_jour},alt]:[alt]});}
 }
 candidates.sort((a,b)=>a.name.localeCompare(b.name,'fr'));
 const matchName=(name)=>candidates.find(c=>slug(c.name)===slug(name)||slug(c.name).endsWith('-'+slug(name)));
 const proposals=(raw.proposals?.propositions||[]).map(p=>({id:String(p.id),title:p.titre,text:p.proposition,theme:p.theme,candidateIds:(p.candidats_liste||String(p.candidats||'').split('|')).map(n=>matchName(n)?.id).filter(Boolean),date:p.date_mise_a_jour||raw.proposals.date_mise_a_jour,period:p.periode_source,type:p.type_source,context:p.note_contexte,limits:p.limites_connues,sources:(p.sources_detail||p.sources_liste?.map(url=>({url}))||[]).map(s=>({url:safeUrl(s.url),date:s.date||null,type:s.type||null})).filter(s=>s.url),publisher:'PromethEUs',publisherUrl:safeUrl(p.url_page),verification:'Attribution par une source indépendante ; consulter les pièces citées.'})).filter(p=>p.id&&p.title&&p.candidateIds.length&&p.sources.length);
 const keyFor=c=>aliases[c.id]||slug(c.name.split(' ').at(-1)).replaceAll('-','');
 const keyMatch=(c,key)=>{const s=slug(key).replaceAll('-','');return s===keyFor(c)||s===slug(c.name).replaceAll('-','');};
 const votes=(raw.votes?.scrutins||[]).filter(v=>safeUrl(v.url)&&/^https:\/\/([^/]+\.)?(assemblee-nationale\.fr|senat\.fr|europarl\.europa\.eu)\//.test(v.url)).map(v=>({id:v.id,date:v.date,title:v.titre,chamber:v.chambre,result:v.resultat,url:v.url,positions:Object.fromEntries(Object.entries(v.votes||{}).map(([key,pos])=>[candidates.find(c=>keyMatch(c,key))?.id,pos]).filter(([id])=>id))})).filter(v=>Object.keys(v.positions).length).sort((a,b)=>b.date.localeCompare(a.date));
 const mandates=Object.fromEntries(candidates.map(c=>[c.id,Object.entries(raw.votes?.mandats||{}).filter(([key])=>keyMatch(c,key)).flatMap(([,m])=>m).filter((m,i,a)=>a.findIndex(x=>x.detail===m.detail&&x.fin===m.fin)===i)]));
 const sources=[...sourceInfo,{id:'register',name:'2027etmoi — registre complémentaire',kind:'Compilation indépendante',url:'https://github.com/2027etmoi/2027etmoi/blob/main/data/candidats.json',license:'Licence Ouverte 2.0'}].map(s=>({...s,feed:FEEDS[s.id],checkedAt:now,publishedAt:s.id==='candidates'?list.map(c=>c.mis_a_jour).sort().at(-1):s.id==='proposals'?raw.proposals?.date_mise_a_jour:raw[s.id]?.mise_a_jour||null,status:raw.errors?.[s.id]?'error':'ok',error:raw.errors?.[s.id]||null}));
 const events=[];
 for(const c of candidates){const old=previous?.candidates?.find(p=>p.id===c.id);if(!previous||!old||old.status!==c.status||old.party!==c.party)events.push({id:`candidate:${c.id}:${c.updatedAt}`,candidateIds:[c.id],kind:'candidature',title:`${c.name} · ${c.status.toLowerCase()}`,text:c.announcement,date:c.updatedAt,url:c.source});}
 const oldP=new Map((previous?.proposals||[]).map(p=>[p.id,p]));
 for(const p of proposals){const old=oldP.get(p.id);if(!previous||!old||old.text!==p.text)events.push({id:`proposal:${p.id}:${p.date}`,candidateIds:p.candidateIds,kind:'programme',title:p.title,text:p.text,date:p.date,url:p.publisherUrl});}
 const oldV=new Set((previous?.votes||[]).map(v=>v.id));for(const v of votes){if(!previous||!oldV.has(v.id))events.push({id:`vote:${v.id}`,candidateIds:Object.keys(v.positions),kind:'vote',title:v.title,text:v.chamber,date:v.date,url:v.url});}
 for(const speech of raw.speeches?.prises_de_parole||[]){const c=candidates.find(c=>keyMatch(c,speech.id)||c.externalId===speech.id);if(!c||!safeUrl(speech.url))continue;events.push({id:`speech:${speech.id}:${speech.date}:${slug(speech.titre)}`,candidateIds:[c.id],kind:'programme',title:speech.titre,text:(speech.declare||[]).join(' '),date:speech.date,url:safeUrl(speech.url),detectedAt:previous?.events?.find(e=>e.id===`speech:${speech.id}:${speech.date}:${slug(speech.titre)}`)?.detectedAt||now});}
 const merged=new Map([...(previous?.events||[]),...events.map(e=>({...e,detectedAt:now}))].map(e=>[e.id,{...e,detectedAt:e.detectedAt||previous?.updatedAt||now}]));
 return {version:1,updatedAt:now,candidates,proposals,votes,mandates,sources,events:[...merged.values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,1000),endorsements:previous?.endorsements||{available:false,publishedAt:null,checkedAt:now,source:'https://www.conseil-constitutionnel.fr/election-presidentielle-2027',message:'Aucun jeu officiel de parrainages validés pour 2027 identifié dans la collecte. Les promesses de soutien ne sont pas des parrainages validés.',history:[],departments:[]},warnings:['Les candidatures ne constituent pas la liste officielle du Conseil constitutionnel.','Les propositions peuvent provenir de déclarations ou de programmes antérieurs : la période figure sur chaque mesure.','Les scrutins constituent une sélection ; aucun taux de présence global ne peut en être déduit.',...(raw.votes?.a_verifier||[]).slice(0,3)]};
}
export async function collect(previous=null){
 const raw={errors:{}};
 await Promise.all(Object.entries(FEEDS).map(async([k,url])=>{try{raw[k]=await download(url,k==='candidates'?'text':'json');}catch(e){raw.errors[k]=e.message;}}));
 if(raw.errors.candidates)throw new Error(raw.errors.candidates);
 if(raw.errors.proposals||raw.errors.votes)throw new Error('Import interrompu : une source essentielle est indisponible. Le dernier relevé reste conservé.');
 const next=normalize(raw,previous);
 await transparency(next,previous);
 await biographies(next,previous);
 return next;
}
export async function biographies(next,previous=null){
 for(let i=0;i<next.candidates.length;i+=4)await Promise.all(next.candidates.slice(i,i+4).map(async c=>{
  const prior=previous?.candidates?.find(p=>p.id===c.id);
  if(prior?.bio?.photoCredit&&Date.now()-new Date(prior.bio.checkedAt).getTime()<12*3600000){c.bio=prior.bio;c.timeline=prior.timeline;c.professional=prior.professional;return;}
  if(!c.externalId||!/^[a-z0-9-]+$/.test(c.externalId))return;
  try{const b=await download('https://raw.githubusercontent.com/2027etmoi/2027etmoi/main/data/biographies/'+c.externalId+'.json');if(b.id!==c.externalId||!b.presentation?.texte)return;
   c.bio={text:b.presentation.texte,description:b.presentation.texte,image:safeUrl(b.photo?.url)||c.bio?.image||null,url:safeUrl(b.presentation.sources?.[0]?.url)||'',birth:b.naissance?.date||null,wikidata:prior?.bio?.wikidata||null,license:'Biographie : 2027etmoi, Licence Ouverte 2.0. Photo : '+(b.photo?.auteur||'auteur indiqué sur la page source')+' · '+(b.photo?.licence||'voir la licence sur la page source'),photoCredit:{author:b.photo?.auteur||'',license:b.photo?.licence||'',url:safeUrl(b.photo?.page)},checkedAt:next.updatedAt};c.timeline=b.parcours_politique||[];c.professional=b.parcours_professionnel||[];
  }catch{if(prior){c.bio=prior.bio;c.timeline=prior.timeline;c.professional=prior.professional;}}
 }));
}
export async function transparency(next,previous=null){
 const url='https://www.hatvp.fr/livraison/opendata/liste.csv';
 const previousSource=previous?.sources?.find(s=>s.id==='hatvp');
 try{
  if(previousSource?.status==='ok'&&Date.now()-new Date(previousSource.checkedAt).getTime()<12*3600000){for(const c of next.candidates)c.transparency=previous.candidates.find(p=>p.id===c.id)?.transparency||[];next.sources.push(previousSource);return;}
  const rows=csv(await download(url,'text'),';');if(!rows.length||!('nom' in rows[0]))throw Error('Schéma HATVP non reconnu');
  const labels={di:'Déclaration d’intérêts',dim:'Déclaration d’intérêts modificative',dia:'Déclaration d’intérêts et d’activités',diam:'Déclaration d’intérêts et d’activités modificative',dsp:'Déclaration de situation patrimoniale',dspm:'Déclaration de situation patrimoniale modificative',dspfm:'Déclaration de situation patrimoniale de fin de mandat'};
  for(const c of next.candidates)c.transparency=rows.filter(r=>slug(r.prenom+' '+r.nom)===c.id).map(r=>({type:labels[r.type_document]||r.type_document,role:r.qualite,date:r.date_publication||null,depositedAt:r.date_depot||null,status:r.statut_publication,url:r.nom_fichier&&/^[\w.-]+\.pdf$/.test(r.nom_fichier)?'https://www.hatvp.fr/livraison/dossiers/'+r.nom_fichier:null,profile:r.url_dossier?.startsWith('/')?'https://www.hatvp.fr'+r.url_dossier:null})).sort((a,b)=>(b.date||b.depositedAt||'').localeCompare(a.date||a.depositedAt||''));
  next.sources.push({id:'hatvp',name:'Haute Autorité pour la transparence de la vie publique',kind:'Source officielle',url:'https://www.hatvp.fr/open-data/',feed:url,license:'Licence Ouverte Etalab',checkedAt:next.updatedAt,publishedAt:null,status:'ok',error:null});
 }catch(e){for(const c of next.candidates)c.transparency=previous?.candidates?.find(p=>p.id===c.id)?.transparency||[];next.sources.push({id:'hatvp',name:'HATVP',kind:'Source officielle',url:'https://www.hatvp.fr/open-data/',feed:url,license:'Licence Ouverte Etalab',checkedAt:next.updatedAt,publishedAt:previousSource?.publishedAt||null,status:'error',error:e.message});}
}
