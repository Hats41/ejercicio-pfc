import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
const excluded=new Set(['.git','.vercel','node_modules','dist']);
const signatures=[
  ['clave privada',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['secreto Supabase',/sb_secret_[A-Za-z0-9_-]{16,}/],
  ['token GitHub',/(?:ghp_|github_pat_)[a-zA-Z0-9_]{25,}/],
  ['clave AWS',/AKIA[A-Z0-9]{16}/],
];
async function scan(dir){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(excluded.has(entry.name))continue;
    const path=join(dir,entry.name);
    if(entry.isDirectory()){await scan(path);continue;}
    if(entry.name.startsWith('.env')&&entry.name!=='.env.example')throw new Error('Archivo de entorno local detectado.');
    if(!/\.(?:js|mjs|json|sql|yml|yaml|md|html|css)$/.test(entry.name))continue;
    const content=await readFile(path,'utf8');
    for(const [label,regex] of signatures)if(regex.test(content))throw new Error(`${label} detectado en ${path}`);
    if(path.startsWith('public')&&entry.name.endsWith('.js')&&/\.innerHTML\s*=|\beval\s*\(|\bnew Function\s*\(/.test(content))throw new Error(`Operación insegura en ${path}`);
  }
}
await scan('.');
console.log('Escaneo de firmas de secretos y usos riesgosos de JavaScript: sin hallazgos.');
