// Run against a fresh upstream metadata JSON: node scripts/audit-enrichment.cjs /path/images_metadata.json
// Without an argument, use the small checked-in catalogue fixture.
const fs=require('node:fs');
const zlib=require('node:zlib');
const path=require('node:path');
const data=require('../src/data/avatar-enrichment.json');
const images=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2],'utf8')):JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'../tests/fixtures/catalogue.json.gz'))));
function key(image){try{return decodeURIComponent(new URL(image.url||image.src).pathname).split('/images/')[1];}catch{return null;}}
const current=new Set(images.map(key));
const stale=Object.keys(data.entries).filter(k=>!current.has(k));
const categories={};const pending=[];
for(const image of images){
 const k=key(image),entry=data.entries[k];const row=categories[image.folder]||={total:0,identity:0,franchiseOnly:0,descriptiveTags:0,sourceMetadata:0};row.total++;
 if(entry?.character)row.identity++;
 else if(entry?.franchise)row.franchiseOnly++;
 else if(entry?.tags)row.descriptiveTags++;
 else{
  row.sourceMetadata++;
  if(/^(?:scale\(\d+\)|\d+|(?:steam-)?[a-f\d]{30,}|adult-\d+)$|^(?:Netflix|Pop Culture|Playstation|Steam|Xbox)/i.test(image.name))pending.push({name:image.name,folder:image.folder,url:image.url});
 }
}
console.log(JSON.stringify({catalogueImages:images.length,enrichedImages:Object.keys(data.entries).length,categories,staleKeys:stale,unlabelledOpaqueImages:pending},null,2));
if(stale.length)process.exitCode=1;
