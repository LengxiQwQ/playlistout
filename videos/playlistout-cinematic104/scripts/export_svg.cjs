const fs=require('fs'),path=require('path');
const {renderScene,DURATION}=require('../.build/scene.js');
const dir=path.resolve(__dirname,'../.frames-svg');fs.mkdirSync(dir,{recursive:true});
for(let f=0;f<DURATION;f++){
 fs.writeFileSync(path.join(dir,`${String(f).padStart(4,'0')}.svg`),renderScene(f));
 if(f%600===0)console.log('SVG',f,'/',DURATION);
}
console.log('Exported',DURATION,'deterministic vector frames');
