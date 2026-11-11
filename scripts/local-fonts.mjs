import fs from 'node:fs/promises';
const url='https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;550;600;650;700&family=Libre+Caslon+Display&display=swap';
const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'}});
if(!response.ok)throw Error('Police indisponible');
let css=await response.text();
const urls=[...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m=>m[1]))];
await fs.mkdir('public/fonts',{recursive:true});
for(let i=0;i<urls.length;i++){const r=await fetch(urls[i]);if(!r.ok)throw Error('Téléchargement police échoué');const extension=urls[i].includes('.woff2')?'woff2':urls[i].includes('.woff')?'woff':'ttf';const name='font-'+i+'.'+extension;await fs.writeFile('public/fonts/'+name,new Uint8Array(await r.arrayBuffer()));css=css.replaceAll(urls[i],'/fonts/'+name);}
await fs.writeFile('public/fonts/fonts.css',css);
let style=await fs.readFile('src/style.css','utf8');style=style.replace(/^@import url\([^\n]+\);\r?\n/,"@import url('/fonts/fonts.css');\n");await fs.writeFile('src/style.css',style);
for(const name of ['dmsans','librecaslondisplay']){const r=await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/'+name+'/OFL.txt');if(r.ok)await fs.writeFile('public/fonts/'+name+'-OFL.txt',await r.text());}
console.log(JSON.stringify({localFontFiles:urls.length}));
