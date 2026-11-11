import fs from 'node:fs/promises';
import {collect,download} from './data-core.mjs';
const file=new URL('../public/data.json',import.meta.url);
let previous;try{previous=JSON.parse(await fs.readFile(file,'utf8'));}catch{}
const data=await collect(previous);
// Enrichissement encyclopédique distinct des annonces de campagne. Jamais utilisé pour décider du statut.
for(let i=0;i<data.candidates.length;i+=4){await Promise.all(data.candidates.slice(i,i+4).map(async c=>{
 if(c.bio) return;
 try{const w=await download('https://fr.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(c.name.replaceAll(' ','_')));
 if(w.type==='disambiguation'||!w.extract||w.title!==c.name)return;
 const api=await download('https://fr.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles='+encodeURIComponent(c.name));
 const q=Object.values(api.query.pages)[0]?.pageprops?.wikibase_item;
 let birth=null; if(q){const entity=await download(`https://www.wikidata.org/wiki/Special:EntityData/${q}.json`);birth=entity.entities[q]?.claims?.P569?.[0]?.mainsnak?.datavalue?.value?.time?.slice(1,11)||null;}
 c.bio={text:w.extract,description:w.description||'',image:w.thumbnail?.source||null,url:w.content_urls?.desktop?.page||'',birth,wikidata:q?'https://www.wikidata.org/wiki/'+q:null,license:'Texte : Wikipédia, CC BY-SA 4.0, auteurs et historique sur la page source. Portrait : crédits et licence sur sa page Commons.',checkedAt:data.updatedAt};
 }catch(e){console.log(c.name+': biographie non récupérée ('+e.message+')');}
}));}
await fs.writeFile(file,JSON.stringify(data));
console.log(JSON.stringify({candidates:data.candidates.length,proposals:data.proposals.length,votes:data.votes.length,portraits:data.candidates.filter(c=>c.bio?.image).length,updatedAt:data.updatedAt}));
