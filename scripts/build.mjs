import {access,cp,mkdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const source=new URL('../public/',import.meta.url);
await access(new URL('reciclaje-lima.webp',source));
for(const name of ['app.js','domain.js','store.js','config.js']){
  const checked=spawnSync(process.execPath,['--check',fileURLToPath(new URL(name,source))],{stdio:'inherit'});
  if(checked.status!==0)process.exit(1);
}
const output=new URL('../dist/',import.meta.url);
await mkdir(output,{recursive:true});
await cp(source,output,{recursive:true});
if(!(await readFile(new URL('index.html',output),'utf8')).includes('<main>'))throw new Error('Falta contenido principal.');
console.log('Build estático validado: dist/');
