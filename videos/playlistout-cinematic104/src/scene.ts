/**
 * Playlist Out — A Playlist's Journey (104s, 30 fps)
 * All movement is deterministic and derived from frame number.
 * A 120-BPM original soundtrack uses beats at frames 0, 15, 30...
 * Layout is defined on a strict 1920x1080 artboard. Content safe area:
 * x=180..1760, y=175..845. Titles <= 690px, illustration <= 840px.
 * Source-informed product illustration, NOT a live UI capture or real API result.
 */
export const FPS=30, WIDTH=1920, HEIGHT=1080, DURATION=3120;
export const BPM=120;
const P={paper:'#F8F3E8',paper2:'#FFFCF5',ink:'#283238',muted:'#677477',line:'#E6DDCF',yellow:'#FFE08C',sun:'#F6B841',note:'#FFF4B9',pink:'#F9DDE6',mint:'#D7F3E7',blue:'#DDF1F7',coral:'#EF8B7B',teal:'#3A9A8B',white:'#FFFFFF',dim:'#ADB4AE',black:'#263135'};
const FONT="'Noto Sans CJK SC','Noto Sans SC','Microsoft YaHei',sans-serif";
const MONO="'DejaVu Sans Mono','Noto Sans Mono CJK SC',monospace";
const n=(x:number)=>Math.round(x*100)/100;
const cl=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const ease=(v:number)=>{const t=cl(v);return t*t*(3-2*t)};
const back=(v:number)=>{const t=cl(v)-1;return 1+2.05*t*t*t+1.05*t*t};
const tw=(s:number,a:number,b:number,mode='ease')=>mode==='back'?back((s-a)/(b-a)):ease((s-a)/(b-a));
const X=(t:string)=>t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const rect=(x:number,y:number,w:number,h:number,fill:string,rx=0,stroke='',sw=0)=>`<rect x="${n(x)}" y="${n(y)}" width="${n(Math.max(0,w))}" height="${n(Math.max(0,h))}" rx="${rx}" fill="${fill}" ${stroke?`stroke="${stroke}" stroke-width="${sw}"`:''}/>`;
const circle=(x:number,y:number,r:number,fill:string,stroke='',sw=0)=>`<circle cx="${n(x)}" cy="${n(y)}" r="${n(Math.max(.01,r))}" fill="${fill}" ${stroke?`stroke="${stroke}" stroke-width="${sw}"`:''}/>`;
const text=(x:number,y:number,t:string,size=40,color=P.ink,weight=700,extra='')=>`<text x="${n(x)}" y="${n(y)}" fill="${color}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" ${extra}>${X(t)}</text>`;
const mono=(x:number,y:number,t:string,size=22,color=P.muted,weight=600,extra='')=>`<text x="${n(x)}" y="${n(y)}" fill="${color}" font-family="${/[\u3400-\u9fff]/.test(t)?FONT:MONO}" font-size="${size}" font-weight="${weight}" ${extra}>${X(t)}</text>`;
const line=(x:number,y:number,xx:number,yy:number,color=P.ink,w=3)=>`<path d="M${n(x)} ${n(y)} L${n(xx)} ${n(yy)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
const group=(content:string,x=0,y=0,rot=0,scale=1,alpha=1)=>`<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${n(scale)})" opacity="${n(cl(alpha))}">${content}</g>`;
const shadow=(x:number,y:number,w:number,h:number,r=18)=>rect(x+9,y+11,w,h,P.ink,r);
const paper=(x:number,y:number,w:number,h:number,fill=P.paper2,r=22)=>shadow(x,y,w,h,r)+rect(x,y,w,h,fill,r,P.ink,4);
const note=(x:number,y:number,scale=1,col=P.ink)=>group('<path d="M19 46V8L50 0V39" fill="none" stroke="'+col+'" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>'+circle(11,49,12,col)+circle(42,42,12,col),x,y,-8,scale);
const star=(x:number,y:number,sz=15,col=P.sun)=>`<path d="M${n(x)} ${n(y-sz)} Q${n(x+sz*.2)} ${n(y-sz*.2)} ${n(x+sz)} ${n(y)} Q${n(x+sz*.2)} ${n(y+sz*.2)} ${n(x)} ${n(y+sz)} Q${n(x-sz*.2)} ${n(y+sz*.2)} ${n(x-sz)} ${n(y)} Q${n(x-sz*.2)} ${n(y-sz*.2)} ${n(x)} ${n(y-sz)}Z" fill="${col}"/>`;
const tape=(x:number,y:number,w=132,color=P.pink,rot=-8)=>group(rect(-w/2,-17,w,34,color,3),x,y,rot,1,.85);
const capsule=(x:number,y:number,w:number,t:string,bg=P.note,fg=P.ink,fs=24)=>rect(x+4,y+5,w,49,P.ink,11)+rect(x,y,w,49,bg,11,P.ink,2)+text(x+w/2,y+33,t,fs,fg,750,'text-anchor="middle"');
const button=(x:number,y:number,w:number,label:string,filled=true)=>rect(x,y,w,58,filled?P.ink:P.paper2,11,P.ink,3)+text(x+w/2,y+38,label,24,filled?P.white:P.ink,750,'text-anchor="middle"');
function notebook(s:number){
 let q=rect(0,0,1920,1080,P.paper);
 for(let y=122;y<=1075;y+=52)q+=line(0,y,1920,y,P.line,1.7);
 q+=line(137,0,137,1080,P.coral,2.4);
 for(let y=102;y<1050;y+=165)q+=circle(81,y,17,'#D9CEBE')+circle(77,y-2,11,P.paper2);
 // Top and bottom are stable across all 104 seconds; they anchor every animation.
 q+=rect(175,43,51,51,P.yellow,13,P.ink,2.5)+note(183,54,.48);
 q+=mono(244,79,'PLAYLIST OUT  /  MUSIC JOURNAL',23,P.ink,780);
 q+=mono(1627,77,'MUSIC IS YOURS',18,P.ink,710);
 q+=rect(176,1000,1557,8,'#E8DCCC',5)+rect(176,1000,1557*cl(s/104),8,P.sun,5);
 q+=mono(177,979,'PASTE  •  PARSE  •  EXPORT  •  GO',18,P.muted,580);

 q+=star(1814,181,16,P.sun)+star(160,844,13,P.coral);
 return q;
}
function sidebar(overline:string,lines:string[],sub:string,s:number,tag?:string){
 const x=206;let q='';
 const ep=tw(s,-.15,.7,'back');
 q+=group(mono(x,245,overline,23,P.teal,780),22*(1-ep),-12*(1-ep),0,1,ep);
 lines.forEach((t,i)=>{
   const p=tw(s,i*.35+.08,i*.35+1.03,'back');
   const float=2.1*Math.sin((s-1.4)*1.05+i*1.5);
   q+=group(text(x,372+i*106+float,t,65,P.ink,900),-44*(1-p),14*(1-p),0,1,p);
 });
 const sy=372+lines.length*106;
 q+=rect(x,sy-35,160*tw(s,1.0,1.9),8,P.sun,4);
 const words=sub.split('|');words.forEach((w,i)=>{
   const p=tw(s,1.12+i*.22,1.88+i*.22);
   q+=group(text(x,sy+35+i*44,w,26,P.muted,550),0,10*(1-p),0,1,p);
 });
 if(tag){const p=tw(s,1.9,2.6,'back');q+=group(capsule(x,sy+55+words.length*44,Math.min(530,110+tag.length*28),tag,P.note,P.ink,23),0,18*(1-p),-3*p,1,p);}
 // The marker stroke is drawn while the card passes, not a permanently static divider.
 const progress=tw(s,3.5,6.5);
 q+=`<path d="M204 ${n(sy+85+words.length*44)} Q 470 ${n(sy+70+words.length*44)} 800 ${n(sy+84+words.length*44)}" fill="none" stroke="${P.sun}" stroke-width="4" stroke-linecap="round" stroke-dasharray="10 17" stroke-dashoffset="${n(-progress*80)}" opacity="${n(.2+.34*progress)}"/>`;
 return q;
}
function songCard(x:number,y:number,scale=1,angle=-4,compact=false){
 const w=compact?350:490,h=compact?365:536;
 let q=paper(0,0,w,h,P.paper2,19)+rect(0,0,w,80,P.yellow,18)+rect(0,61,w,19,P.yellow);
 q+=tape(105,2,103,P.pink,-11)+tape(w-108,4,98,P.mint,6);
 q+=note(26,22,.48)+text(86,53,'我的音乐歌单',compact?24:31,P.ink,800);
 q+=mono(32,117,'PLAYLIST / SAMPLE',compact?14:16);
 q+=rect(31,145,compact?105:135,compact?105:135,P.ink,12);
 q+=`<path d="M40 240 Q80 154 157 205 L157 264 L40 264Z" fill="${P.sun}"/>`;
 q+=`<path d="M43 230 Q99 172 158 206" stroke="${P.mint}" stroke-width="7" fill="none"/>`;
 q+=text(compact?156:184,193,'循环播放',compact?24:30,P.ink,800);
 q+=mono(compact?155:183,231,'MY PLAYLIST',compact?13:17);
 q+=line(30,compact?274:300,w-29,compact?274:300,P.line,2);
 const labels=['深夜散步','午后阳光','旧日回声','下一首歌'];
 for(let i=0;i<4;i++){
  const yy=(compact?299:329)+i*(compact?16:48);
  if(compact){q+=circle(45,yy,5,i%2?P.teal:P.sun)+line(64,yy,w-35,yy,P.line,6);}else{
   q+=circle(48,yy,15,[P.mint,P.pink,P.blue,P.note][i]);q+=mono(48,yy+5,String(i+1).padStart(2,'0'),12,P.ink,700,'text-anchor="middle"');
   q+=text(82,yy+8,labels[i],21,P.ink,650)+line(337,yy+2,447,yy+2,P.line,6);
  }
 }
 return group(q,x,y,angle,scale);
}
const providers:[string,string][]=[['QQ 音乐',P.mint],['网易云',P.pink],['酷狗音乐',P.blue],['酷我音乐',P.note],['汽水音乐',P.mint],['咪咕音乐',P.pink]];
function badgeGrid(s:number,baseX=1000,baseY=320){
 let q='';for(let i=0;i<6;i++){
  const x=baseX+(i%2)*350,y=baseY+Math.floor(i/2)*124;
  const yy=-36*(1-tw(s,i*.31,.55+i*.31,'back'))+5*Math.sin(s*2+i);
  q+=group(capsule(0,0,294,providers[i][0],providers[i][1],P.ink,27),x,y+yy,(i%2?2:-2),1,tw(s,i*.22,.5+i*.22));
 }return q;
}
function browserFrame(){
 let q=paper(0,0,820,590,P.white,22);
 q+=rect(0,0,820,66,P.yellow,20)+rect(0,44,820,22,P.yellow);
 q+=circle(29,32,9,P.coral)+circle(57,32,9,P.sun)+circle(84,32,9,P.teal);
 q+=rect(128,13,538,38,P.white,19,P.ink,1.7)+mono(152,39,'playlistout.lengxiqwq.com',18,P.muted,500);
 q+=rect(31,89,45,45,P.yellow,12,P.ink,2)+note(37,98,.38);
 q+=text(89,119,'Playlist Out',28,P.ink,850)+mono(661,117,'中 / EN',18,P.ink,650);
 return q;
}
function browserInput(s:number){
 let q=browserFrame();q+=text(410,184,'你的歌单，应该自由流动',34,P.ink,820,'text-anchor="middle"');
 q+=rect(65,221,691,238,P.note,18,P.ink,2.5)+tape(163,220,108,P.pink,-8)+tape(653,221,96,P.blue,8);
 q+=text(94,276,'粘贴歌单链接',27,P.ink,800);
 q+=rect(92,299,456,59,P.white,8,P.ink,2);
 const url='https://music.163.com/playlist?id=...';
 const typed=url.slice(0,Math.floor(tw(s,1.6,4.25)*url.length));
 q+=mono(107,337,typed,19,P.ink,560);
 if((s*3|0)%2===0&&s<4.5)q+=line(111+typed.length*11.4,308,111+typed.length*11.4,345,P.sun,3);
 q+=button(568,299,160,'解析歌单',true);
 const stamps=['QQ 音乐','网易云','酷狗','酷我','汽水','咪咕'];
 stamps.forEach((k,i)=>q+=rect(91+i*105,380,94,38,[P.mint,P.pink,P.blue,P.note,P.mint,P.pink][i],10,P.ink,1.8)+text(138+i*105,405,k,17,P.ink,630,'text-anchor="middle"'));
 q+=mono(65,524,'实际 UI 布局参考产品代码 · 输入数据为演示',17,P.muted,500);
 return q;
}
function browserResult(s:number){
 let q=browserFrame();q+=text(70,183,'解析结果',33,P.ink,830)+capsule(618,139,138,'示例数据',P.blue,P.ink,19);
 q+=rect(63,207,695,294,P.paper2,14,P.ink,2);
 const names=['深夜散步','午后阳光','旧日回声','下一首歌'];
 q+=rect(64,208,692,57,P.yellow,12)+text(93,246,'#',20,P.ink,760)+text(155,246,'歌曲名',20,P.ink,760)+text(560,246,'歌手',20,P.ink,760);
 for(let i=0;i<4;i++){
  const p=tw(s,.55+i*.27,1.1+i*.27,'back');const yy=279+i*51;
  q+=group(circle(100,yy+6,14,[P.mint,P.blue,P.pink,P.note][i])+text(155,yy+13,names[i],21,P.ink,700)+text(557,yy+13,'示例歌手',19,P.muted,500)+line(84,yy+31,735,yy+31,P.line,1),0,6*(1-p),0,1,p);
 }
 q+=button(68,513,153,'Excel',true)+button(237,513,138,'JSON',false)+button(389,513,139,'CSV',false)+button(543,513,199,'更多格式 →',false);
 return q;
}
function fileIcon(x:number,y:number,label:string,color:string,angle=0,s=1,w=190,h=239){
 let q=rect(10,12,w,h,P.ink,13)+rect(0,0,w,h,P.white,13,P.ink,3)+`<path d="M${w-58} 0 L${w} 58 L${w-58} 58Z" fill="${P.note}" stroke="${P.ink}" stroke-width="3"/>`;
 q+=rect(23,80,w-46,77,color,11)+text(w/2,133,label,label.length>5?25:36,P.ink,850,'text-anchor="middle"');
 for(let i=0;i<3;i++)q+=line(25,180+i*17,w-35-i*14,180+i*17,P.line,5);
 return group(q,x,y,angle,s);
}
function terminal(x:number,y:number){
 let q=rect(11,12,797,514,P.ink,18)+rect(0,0,797,514,'#263135',18,P.ink,3);
 q+=rect(0,0,797,64,'#F3CE81',18)+rect(0,45,797,19,'#F3CE81');
 q+=circle(35,34,9,P.coral)+circle(64,34,9,P.sun)+circle(93,34,9,P.teal);
 q+=mono(126,43,'playlistout · terminal',21,P.ink,700);
 q+=mono(35,122,'$ npm install -g playlistout',25,P.mint,650);
 q+=mono(35,183,'$ playlistout',25,P.white,650);
 q+=mono(35,240,'> 选择平台或粘贴歌单链接',25,P.yellow,620);
 q+=mono(35,302,'$ playlistout "<url>" -f xlsx,csv',23,P.mint,620);
 q+=mono(35,374,'# 交互 / 非交互模式',23,'#BCC2BC',600);
 q+=mono(35,434,'# CLI 演示命令，并非执行结果',21,'#BCC2BC',550);
 return group(q,x,y);
}
function stampText(s:number,x:number,y:number,t:string,col=P.teal){
 const p=tw(s,.5,1.3,'back');return group(capsule(0,0,310,t,col===P.teal?P.mint:P.note,P.ink,26),x,y,-3*p,.9+.1*p,p);
}
// 13 eight-second chapters (some transitions occur inside the chapter, always on the beat).
const chapters=[
 ['THE PROBLEM','收藏的音乐','不该被困住','一张歌单，为什么不能自由旅行？'],
 ['MEET PLAYLIST OUT','贴上链接','带走歌单','六大主流音乐平台，一条自由出口'],
 ['COPY → PASTE','复制歌单链接','粘贴到网页','不需要额外安装应用'],
 ['PARSE → EXPORT','看看歌曲','选个格式','解析、预览，然后在本地导出'],
 ['YOUR FORMAT','不止表格','六种导出方式','Excel · JSON · CSV · TXT · M3U8 · Markdown'],
 ['DATA THAT MOVES','表格好整理','数据好流转','保留歌单信息与曲目顺序'],
 ['BATCH MODE','你的收藏','一次打包','公开的用户歌单，可批量导出'],
 ['PLAYER / MUSICFREE','接着听歌','MusicFree 插件','已提供真实可安装的插件'],
 ['PLAYER / LX MUSIC','给洛雪音乐','准备专用文件','导出专用 JSON，再在播放器中导入'],
 ['PLAYER / LISTEN 1','给 Listen 1','准备恢复文件','专用 JSON，走软件现有恢复流程'],
 ['THIRD-PARTY / HANDOFF','去其他平台','也有交接入口','导出 CSV / M3U8，按目标工具要求使用'],
 ['FOR DEVELOPERS','终端党','也能轻松用','Windows / macOS / Linux CLI'],
 ['OPEN SOURCE / FINALE','你的歌单','由你做主','Public API · 开源 MIT · 欢迎贡献'],
] as const;
const demos=[
 '画面为歌单旅行概念动画',
 '支持平台能力以仓库 README 为准',
 '模拟输入演示 / 不发起真实 API 请求',
 '模拟结果示意 / 非真实解析记录',
 'Markdown 为 Web 端导出格式',
 '歌单字段为演示值 / 结构遵循文档',
 '批量需要公开用户歌单，酷狗完整模式需要登录',
 '真实插件安装后由 MusicFree 内操作',
 '已实现文件格式 / 非洛雪原生内置接入',
 '已实现文件格式 / 非 Listen 1 原生内置接入',
 '第三方兼容与操作步骤以目标工具为准',
 '命令示例，非终端执行结果',
 '软件开源，不包含受版权保护的音频',
] as const;
function safeCaption(t:string){return group(rect(0,0,810,44,P.paper2,10,P.line,2)+mono(16,29,t,16,P.muted,560),936,868);}
function sectionArtwork(i:number,local:number){
 let q='';const a=cl(local/8);const bob=7*Math.sin(local*Math.PI*.8);
 switch(i){
 case 0:{
  q+=songCard(1130-100*tw(local,0,2.2),254+bob,1.06,-8+5*a);
  // Six platform labels are anchored to safe illustration zone: no orbit may enter title area.
  const tags=['QQ 音乐','网易云','酷狗','酷我','汽水','咪咕'];
  const places=[[854,185],[1636,187],[854,430],[1636,432],[854,680],[1636,680]];
  for(let k=0;k<6;k++){const p=tw(local,.2+k*.33,1.3+k*.33,'back');
   q+=group(capsule(0,0,145,tags[k],[P.mint,P.pink,P.blue,P.note,P.mint,P.pink][k],P.ink,20),places[k][0],places[k][1]-24*(1-p),k%2?3:-3,1,p);}
  if(local>4)q+=group(`<path d="M1050 755 Q1320 830 1660 760" fill="none" stroke="${P.coral}" stroke-width="7" stroke-dasharray="12 17"/>`,0,0,0,1,tw(local,4,6));
  break;}
 case 1:{
  q+=paper(995,241,760,560,P.paper2,22)+text(1033,309,'已支持的音乐平台',34,P.ink,820);
  q+=badgeGrid(local,1036,354);
  q+=group(songCard(0,0,.33,5,true),1615,182,0,1,tw(local,1.8,3));
  q+=stampText(local,1125,778,'6 个主流音乐平台',P.teal);break;}
 case 2:{
  const sc=.94+Math.sin(local*.5)*.012;
  q+=group(browserInput(local),956,236+bob/2,-1.3,sc);
  q+=group(`<path d="M0 0 Q78 -53 186 6" stroke="${P.sun}" stroke-width="10" stroke-linecap="round" fill="none"/>`,990,850,0,1,tw(local,2,3.1));break;}
 case 3:{
  q+=group(browserResult(local),958,231+bob/2,.4,.97);
  const p=tw(local,4.9,6.1,'back');q+=group(fileIcon(0,0,'XLSX',P.mint,-4,.44),782,695,0,1,p);break;}
 case 4:{
  const labels:[string,string][]=[['XLSX',P.mint],['JSON',P.blue],['CSV',P.pink],['TXT',P.note],['M3U8',P.mint],['MD',P.blue]];
  labels.forEach((item,k)=>{const p=tw(local,k*.27,.95+k*.27,'back');q+=group(fileIcon(0,0,item[0],item[1],k%2?3:-3,.94),1030+(k%3)*242,198+Math.floor(k/3)*291+7*Math.sin(local*2+k),0,1,p);});
  q+=mono(1050,843,'XLSX     JSON     CSV     TXT     M3U8     MARKDOWN',18,P.muted,600);break;}
 case 5:{
  const left=tw(local,.1,1.2,'back'),right=tw(local,2.8,3.9,'back');
  q+=group(paper(0,0,380,565,P.paper2,21)+rect(33,29,314,67,P.mint,12)+text(190,75,'Excel / XLSX',31,P.ink,800,'text-anchor="middle"')+
     text(43,143,'#    歌曲名      歌手',19,P.ink,750)+[0,1,2,3,4,5].map(k=>rect(35,162+k*51,307,46,k%2?P.white:'#EAF8F1',6)+mono(47,193+k*51,String(k+1).padStart(2,'0'),18,P.ink,550)+text(108,193+k*51,['循环播放','午后微风','夜晚散步','旧唱片','我的夏天','下一首歌'][k],20,P.ink,640)).join(''),986,245,0,1,left);
  q+=group(paper(0,0,380,565,P.paper2,21)+rect(33,29,314,67,P.blue,12)+text(190,75,'JSON',33,P.ink,820,'text-anchor="middle"')+
   mono(32,160,'{',26,P.ink,700)+mono(48,202,'"name": "示例歌单",',18,P.ink,550)+mono(48,244,'"tracks": [',18,P.ink,550)+mono(58,286,'{ "title": "..." },',17,P.teal,580)+mono(58,327,'{ "artists": "..." }',17,P.teal,580)+mono(48,368,'],',19,P.ink,580)+mono(48,407,'"platform": "..."',18,P.ink,550)+mono(32,448,'}',26,P.ink,700),1400,245,0,1,right);
  break;}
 case 6:{
  q+=paper(980,241,780,568,P.paper2,22)+text(1032,311,'用户公开歌单合集',32,P.ink,800);
  for(let k=0;k<5;k++){
   const p=tw(local,.3+k*.26,1.4+k*.26,'back'), compress=tw(local,4.6,6.7);
   const x=1034+compress*(k%2?198:95),y=354+k*70-compress*(k*58)+Math.sin(local*2+k)*2;
   const w=665-compress*470;
   q+=group(rect(0,0,w,56,[P.mint,P.pink,P.blue,P.note,P.mint][k],10,P.ink,2.2)+text(23,38,['深夜随身听','日落前的路','通勤音乐集','假日播放列表','循环的旋律'][k],25,P.ink,720)+mono(w-22,35,'♪',19,P.ink,700,'text-anchor="end"'),x,y,0,1,p*(1-tw(local,4.65,5.4)));
  }
  const pp=tw(local,5.6,7.2,'back');
  q+=group(rect(7,7,220,151,P.ink,12)+rect(0,0,220,151,P.yellow,12,P.ink,3)+text(110,67,'ZIP',51,P.ink,900,'text-anchor="middle"')+text(110,112,'合集导出',24,P.ink,750,'text-anchor="middle"'),1478,588,-4,1,pp);
  break;}
 case 7:{
  q+=paper(972,246,798,550,P.paper2)+capsule(1007,287,219,'已上线插件',P.mint,P.ink,25);
  q+=text(1036,422,'MusicFree',74,P.ink,890);
  q+=rect(1039,462,677,76,P.note,13,P.ink,2);
  q+=mono(1065,511,'插件设置  →  从网络安装插件',23,P.ink,660);
  q+=rect(1039,572,677,80,P.white,12,P.ink,2);
  q+=mono(1064,619,'Playlist Out 插件链接',23,P.muted,580);
  q+=button(1038,693,335,'粘贴歌单链接',true)+button(1396,693,323,'导入 JSON',false);
  q+=group(star(1708,322,22,P.sun),0,0,0,1,1);
  // Beat-synced focus circles move through the real three-step plugin process.
  const targets=[[1030,457,689,88],[1030,569,689,87],[1031,685,350,75]];
  targets.forEach((b,k)=>{const p=tw(local,1.3+k*2,1.75+k*2)*(1-tw(local,2.75+k*2,3.25+k*2));
    q+=group(rect(b[0],b[1],b[2],b[3],'none',12,P.sun,6),0,0,0,1,p);
  });
  break;}
 case 8:{
  q+=paper(985,249,773,548,P.paper2)+text(1033,315,'洛雪音乐  LX Music',39,P.ink,850);
  q+=capsule(1034,358,249,'专用 JSON 已实现',P.mint,P.ink,22);
  q+=fileIcon(1064,465,'LX JSON',P.note,6,.73);
  q+=line(1268,585,1450,585,P.sun,10)+`<path d="M1432 568 L1461 585 L1432 602" fill="none" stroke="${P.sun}" stroke-width="9" stroke-linecap="round"/>`;
  q+=rect(1483,493,223,180,P.blue,13,P.ink,3)+text(1594,552,'我的列表',25,P.ink,770,'text-anchor="middle"')+text(1594,603,'导入列表',25,P.ink,770,'text-anchor="middle"');
  q+=text(1045,751,'在洛雪客户端选择下载的 JSON 文件',22,P.muted,560);
  const step=tw(local,2.2,5.4);q+=circle(1277+step*156,585,7+4*Math.sin(step*Math.PI),P.sun);
  q+=group(star(1594,705,16,P.sun),0,0,0,1,tw(local,5.2,5.8));
  break;}
 case 9:{
  q+=paper(985,249,773,548,P.paper2)+text(1033,315,'Listen 1',46,P.ink,850);
  q+=capsule(1034,358,260,'专用 JSON 已实现',P.mint,P.ink,22);
  q+=fileIcon(1064,465,'L1 JSON',P.blue,-4,.73);
  q+=line(1268,585,1450,585,P.sun,10)+`<path d="M1432 568 L1461 585 L1432 602" fill="none" stroke="${P.sun}" stroke-width="9" stroke-linecap="round"/>`;
  q+=rect(1483,493,223,180,P.pink,13,P.ink,3)+text(1594,550,'备份与恢复',23,P.ink,770,'text-anchor="middle"')+text(1594,603,'本地文件恢复',21,P.ink,770,'text-anchor="middle"');
  q+=text(1045,751,'使用 Listen 1 现有恢复功能导入文件',22,P.muted,560);
  const step=tw(local,2.2,5.4);q+=circle(1277+step*156,585,7+4*Math.sin(step*Math.PI),P.sun);
  q+=group(star(1594,705,16,P.sun),0,0,0,1,tw(local,5.2,5.8));
  break;}
 case 10:{
  q+=paper(976,245,789,558,P.paper2)+text(1010,317,'通用格式 · 第三方工具',32,P.ink,830);
  q+=fileIcon(1029,428,'CSV',P.mint,-4,.68)+fileIcon(1214,448,'M3U8',P.blue,5,.68);
  q+=line(1394,578,1499,578,P.sun,10)+`<path d="M1476 560 L1507 578 L1476 598" stroke="${P.sun}" stroke-width="9" fill="none"/>`;
  q+=rect(1527,432,210,241,P.pink,15,P.ink,3)+text(1632,502,'Soundiiz',30,P.ink,780,'text-anchor="middle"')+text(1632,552,'等迁移工具',22,P.ink,690,'text-anchor="middle"')+mono(1632,610,'手动交接',19,P.muted,640,'text-anchor="middle"');
  q+=text(1011,754,'不承诺第三方自动导入或曲目匹配结果',21,P.muted,580);
  const step=tw(local,3.0,6.2);q+=circle(1406+step*80,578,6,P.sun);
  break;}
 case 11:{
  q+=terminal(965,241);
  // Command is visually typed, rather than showing an invented success log.
  const cmd='$ playlistout "<url>" -f xlsx,csv';
  q+=rect(996,515,715,48,'#263135');
  q+=mono(1000,543,cmd.slice(0,Math.floor(cmd.length*tw(local,1.5,4.4))),23,P.mint,650);
  if(local<4.5&&Math.floor(local*4)%2===0)q+=rect(1000+cmd.length*14.2*tw(local,1.5,4.4),521,3,27,P.yellow);
  q+=group(capsule(0,0,210,'Windows',P.blue,P.ink,22),1043,780,0,1,tw(local,.2,1.25,'back'));
  q+=group(capsule(0,0,202,'macOS',P.pink,P.ink,22),1280,780,0,1,tw(local,1.8,2.8,'back'));
  q+=group(capsule(0,0,188,'Linux',P.mint,P.ink,22),1506,780,0,1,tw(local,3.4,4.4,'back'));
  break;}
 case 12:{
  if(local<4.8){
   q+=paper(992,246,760,550,P.paper2)+capsule(1037,286,200,'Public API',P.mint,P.ink,23);
   q+=mono(1037,401,'GET /api/v1/resolve',33,P.ink,700);
   q+=rect(1035,433,678,87,P.yellow,12,P.ink,2);
   q+=mono(1053,486,'q=<playlist-url>',29,P.ink,660);
   q+=text(1047,609,'无需申请 Token',29,P.ink,760);
   q+=text(1047,663,'统一数据格式 · API 频率限制适用',22,P.muted,550);
   q+=capsule(1039,720,160,'MIT 开源',P.note,P.ink,23);
  }else{
   const p=tw(local,4.55,5.55,'back');
   q+=group(paper(0,0,781,560,P.paper2)+rect(35,38,134,134,P.yellow,31,P.ink,3)+note(66,70,1.35)+text(203,124,'Playlist Out',66,P.ink,920)+text(48,274,'把你的歌单带走',48,P.ink,850)+rect(46,316,670,5,P.sun,4)+mono(48,382,'playlistout.lengxiqwq.com',30,P.ink,720)+mono(48,442,'github.com/LengxiQwQ/playlistout',23,P.muted,620)+capsule(46,475,174,'MIT · 开源',P.mint,P.ink,21),984,244,0,1,p);
  }break;}
 }
 return q;
}
function focusAmount(i:number,s:number){
 return [2,3,5,6,7,8,9,10,11].includes(i)?
 tw(s,1.9,2.85)*(1-tw(s,4.75,5.7)):0;
}
function section(i:number,s:number){
 const start=i*8,local=s-start;
 const [,line1,line2,sub]=chapters[i];
 // Each scene has a fixed, measured left headline and right illustration region.
 let q=group(sidebar(chapters[i][0], [line1,line2],sub,local,i===0?'一张歌单的旅行':undefined),0,0,0,1,1-focusAmount(i,local));
 if(i===1){
   const b=tw(local,2.1,3.4,'back');
   q+=group(rect(0,0,495,111,P.yellow,18,P.ink,3)+note(25,30,.58)+text(103,78,'Playlist Out',51,P.ink,900),207,710,-3,1,b);
 }
 q+=sectionArtwork(i,local);
 return q;
}
/** Cinematic motion layer: a continuous 13-station world instead of 13 slides.
 * Camera continuously tracks one physical yellow playlist ticket between destinations.
 * Across each 8s boundary, both scenes exist in the SAME world coordinates.
 * This avoids cut-to-new-heading / wipe-to-new-page editing.
 */
const ss=(v:number)=>{const x=cl(v);return x*x*x*(x*(x*6-15)+10)};
const CAMERA_DURATION=2.5;
function cameraDistance(sec:number){
  let value=0;
  for(let boundary=1;boundary<=12;boundary++){
    const center=boundary*8;
    value+=WIDTH*ss((sec-(center-CAMERA_DURATION/2))/CAMERA_DURATION);
  }
  return value;
}
function eventBeat(sec:number){const r=((sec*2)%1+1)%1;return Math.exp(-r*12);}
function arrows(x:number,y:number,sec:number,color=P.sun){
 const u=(sec*2)%1;let a='';
 for(let j=0;j<3;j++){
   const xx=x+j*34+18*u,oo=.15+.48*Math.sin(Math.PI*cl(u));
   a+=group(`<path d="M0 -13 L17 0 L0 13" stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,xx,y,0,1,oo);
 }
 return a;
}
function loopArrow(x:number,y:number,sec:number,scale=1){
 const p=tw(sec,2.3,4.4);
 return group(`<path d="M-60 0 C-55 -60 85 -65 93 -15 C102 27 42 68 -20 36" fill="none" stroke="${P.sun}" stroke-width="8" stroke-linecap="round" stroke-dasharray="14 16" stroke-dashoffset="${n(-p*170)}"/><path d="M-29 19 L-20 41 L4 38" stroke="${P.sun}" stroke-width="8" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`,x,y,0,scale,tw(sec,2,3));
}
function cursor(x:number,y:number,sec:number){
 const sc=1+.12*eventBeat(sec);
 const svg=`<path d="M0 0 L5 45 L16 30 L27 54 L40 48 L29 24 L45 24Z" fill="${P.white}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
 return group(svg,x,y,-7,sc);
}
function sparkleImpact(x:number,y:number,sec:number,start:number,seed:number){
 const t=sec-start;if(t<0||t>1.1)return '';
 const p=cl(t/.8),alpha=Math.max(0,1-t/1.1);let q='';
 const colors=[P.sun,P.coral,P.teal,P.pink,P.blue];
 for(let i=0;i<8;i++){
   const angle=(i*45+seed*19)*Math.PI/180,rad=18+88*ss(p);
   q+=group(star(0,0,5+4*(1-p),colors[(i+seed)%5]),x+rad*Math.cos(angle),y+rad*Math.sin(angle),i*18+p*48,1,alpha);
 }
 return q;
}
function audioMeter(sec:number,x:number,y:number){
 let q=mono(x-8,y-57,'ON THE BEAT',13,P.muted,700);
 for(let i=0;i<12;i++){
  const h=12+18*Math.abs(Math.sin(sec*3.3+i*.91))+eventBeat(sec)*[5,9,19,12,26,15,10,23,13,9,17,4][i];
  q+=rect(x+i*15,y-h,9,h,[P.sun,P.sun,P.teal,P.sun][i%4],4);
 }
 return q;
}
function miniDecoration(index:number,s:number){
 // These are deliberate journal props connected to the moving scene rather than idle stock particles.
 let q='';const seed=index*43;
 q+=tape(910,195,118,index%2?P.blue:P.pink,8*Math.sin(index*.83));
 q+=tape(1795,805,94,index%2?P.mint:P.yellow,-11);
 q+=star(895,315,10+2*Math.sin(s*3),P.sun)+star(1788,765,13,P.coral);

 // A real continuous lower-edge ribbon connects adjacent panoramic story spaces.
 const u=s*2;const dash=n(-u*22);
 q+=`<path d="M140 919 C480 845 670 960 1010 918 S1560 870 1920 920" stroke="${P.sun}" stroke-width="4.4" stroke-linecap="round" stroke-dasharray="11 20" stroke-dashoffset="${dash}" fill="none" opacity=".65"/>`;
 // Small moving annotation ticks imply how the song data flows into each interface.
 q+=group(note(0,0,.33),872+14*Math.sin(s*.65),798+22*Math.cos(s*.65),-13+5*Math.sin(s),1,.66);
 q+=group(star(0,0,10,P.teal),1812,365+20*Math.sin(s*.7),0,1,.65);
 return q;
}
function sceneInteractions(i:number,s:number){
 let q='';const beat=eventBeat(s),shift=7*Math.sin(s*1.65);
 switch(i){
  case 0: {
   // Thread reaches for the physical card, then the last knot releases it.
   const p=tw(s,2,5.5);
   q+=`<path d="M935 574 Q1000 ${n(425-55*p)} ${n(1100+35*p)} ${n(524+22*Math.sin(s))}" stroke="${P.coral}" stroke-width="${n(4+beat)}" stroke-dasharray="16 14" stroke-dashoffset="${n(-s*20)}" fill="none" opacity=".8"/>`;
   q+=group(capsule(0,0,153,'PLAY',P.yellow,P.ink,20),1459,757+shift,-7,1,tw(s,3.3,4.2,'back'));
   q+=sparkleImpact(1588,784,s,4,1);break;
  }
  case 1:{
   q+=loopArrow(1402,687,s,.75)+arrows(1018,780,s,P.coral);
   q+=sparkleImpact(1627,202,s,3.7,2);
   break;
  }
  case 2:{
   const p=tw(s,3.0,5.05),x=1256+370*p,y=555-15*Math.sin(p*Math.PI);
   if(s>3.0)q+=cursor(x,y,s);
   const clickPulse=tw(s,5.1,5.28)*(1-tw(s,5.46,5.82));
   q+=group(circle(1640,558,33+45*tw(s,5.15,5.65),'none',P.sun,5),0,0,0,1,clickPulse);
   q+=sparkleImpact(1640,555,s,5.2,3);
   break;
  }
  case 3:{
   const px=1125+280*tw(s,3.4,5.7),py=772-48*Math.sin(tw(s,3.4,5.7)*Math.PI);
   q+=arrows(px,py,s,P.teal);
   q+=sparkleImpact(1270,760,s,5.8,4);
   break;
  }
  case 4:{
   const k=Math.floor(s/.75)%6,locs=[[1030,198],[1272,198],[1514,198],[1030,489],[1272,489],[1514,489]];
   for(let n=0;n<6;n++){
     if(n!==k)continue;
     const [x,y]=locs[n],f=1+beat*.025;
     q+=group(rect(-11,-11,211,256,'none',21,P.sun,5),x,y,0,f,.55+.4*beat);
     q+=sparkleImpact(x+98,y+112,s,Math.floor(s/.75)*.75,k);
   }break;
  }
  case 5:{
   const sel=(Math.floor(s*2)%6),y=408+sel*51;
   q+=group(rect(0,0,303,45,'none',8,P.sun,4),1024,y,0,1,.5+.4*beat);
   const p=tw(s,2.6,5.4);
   q+=`<path d="M1365 512 C1396 500 1398 610 1436 604" stroke="${P.sun}" stroke-width="6" stroke-dasharray="13 15" stroke-dashoffset="${n(-s*26)}" fill="none" opacity="${n(.2+.7*p)}"/>`;
   break;
  }
  case 6:{
   const k=tw(s,4.6,6.9);q+=arrows(1400,690,s,P.coral);
   q+=sparkleImpact(1590,669,s,6.2,1);
   q+=group(star(0,0,25,P.sun),1740,665-26*k,0,1,k);
   break;
  }
  case 7:{
   // Hands-on plugin pathway, with yellow step markers paced across 3 gestures.
   const dots=[[1026,486],[1026,605],[1030,728]];
   dots.forEach((xy,k)=>{const p=tw(s,.9+k*1.8,1.4+k*1.8);q+=group(circle(0,0,16,P.yellow,P.ink,3)+mono(0,5,String(k+1),15,P.ink,750,'text-anchor="middle"'),xy[0],xy[1],0,1,p);});
   if(s>4.9)q+=cursor(1303+125*tw(s,5.0,6.3),729+12*Math.sin(s*2),s);
   q+=sparkleImpact(1450,738,s,6.3,2);
   break;
  }
  case 8:
  case 9:{
   const p=tw(s,1.95,5.5),x=1220+222*p,y=559-82*Math.sin(Math.PI*p);
   q+=group(rect(-28,-25,92,61,i===8?P.note:P.blue,8,P.ink,2)+text(17,14,'JSON',19,P.ink,850,'text-anchor="middle"'),x,y,10+25*p,.62+.25*Math.sin(Math.PI*p),tw(s,1.95,2.4)*(1-tw(s,5.4,6.2)));
   q+=sparkleImpact(1507,588,s,5.5,3);
   break;
  }
  case 10:{
   const p=tw(s,2.8,5.95),x=1396+90*p,y=580-33*Math.sin(p*Math.PI);
   q+=group(capsule(0,0,85,'CSV',P.mint,P.ink,17),x,y,-5+20*p,.72,tw(s,2.8,3.2)*(1-tw(s,5.9,6.4)));
   q+=sparkleImpact(1512,580,s,6.0,4);
   break;
  }
  case 11:{
   const caret=1+2*beat;
   q+=group(rect(0,0,3,28,P.yellow),1118,535);
   q+=sparkleImpact(1467,758,s,4.4,2);
   break;
  }
  case 12:{
   if(s<4.7){
    for(let k=0;k<4;k++){
      const phase=cl((s-1.2-k*.48)/2.3),x=1120+470*phase;
      q+=group(rect(0,0,50,26,[P.mint,P.note,P.pink,P.blue][k],5,P.ink,2),x,530+36*Math.sin(phase*Math.PI)+k*30,0,1,tw(s,1.2+k*.48,1.5+k*.48)*(1-tw(s,3.9+k*.2,4.7)));
    }
   }else{
    for(let k=0;k<15;k++){
      const phase=(k+.4)/15,alpha=tw(s,4.9+phase*.9,5.8+phase*.9);
      q+=group(star(0,0,6+(k%4)*2,[P.sun,P.mint,P.pink,P.blue][k%4]),1080+k*43,709+(k%3)*37,0,1,alpha*(.4+.3*Math.sin(s*3+k)));
    }
   }
   break;
  }
 }
 return q;
}
function journeySteps(index:number,local:number){
 const phrases=[
  ['COLLECT','UNLOCK','CARRY'],['PLATFORMS','ONE PATH','FREEDOM'],
  ['COPY','PASTE','GO'],['PREVIEW','CHOOSE','EXPORT'],
  ['TABLE','DATA','NOTES'],['SORT','STRUCTURE','REUSE'],
  ['PUBLIC LISTS','PACK','ZIP'],['INSTALL','PASTE','IMPORT'],
  ['EXPORT','JSON FILE','RESTORE'],['EXPORT','JSON FILE','RESTORE'],
  ['CSV / M3U8','HANDOFF','CHECK'],['TERMINAL','COMMAND','EXPORT'],
  ['PUBLIC API','OPEN SOURCE','YOURS']][index];
 let q='';
 const now=Math.min(2,Math.floor(cl(local/7)*3));
 for(let k=0;k<3;k++){
  const xx=206+k*169,yy=800;
  const p=tw(local,k*.7,k*.7+.9,'back');
  const active=k===now;
  const bg=active?P.yellow:P.paper2;
  q+=group(rect(0,0,154,45,bg,10,P.ink,1.6)+mono(77,30,phrases[k],13,active?P.ink:P.muted,760,'text-anchor="middle"'),xx,yy-12*(1-p),0,1,p);
  if(k<2)q+=group(arrows(xx+153,822,local,P.sun),0,0,0,.33,.5);
 }
 return q;
}
function storyboardView(index:number,sec:number){
 const local=sec-index*8,t=Math.max(0,local);
 const p=tw(t,.7,6.6);
 const push=focusAmount(index,t);
 const zoom=1+.028*p+.23*push;
 const dx=-18*p-510*push,dy=-8*p-43*push;
 const art=section(index,t+index*8)+sceneInteractions(index,t);
 const transformed=`<g transform="translate(${n(960+dx)} ${n(540+dy)}) scale(${n(zoom)}) translate(-960 -540)">${art}</g>`;
 // The annotation, die-cut path and legal qualifier remain anchored outside camera push-ins.
 const words=group(journeySteps(index,t),0,0,0,1,1-push);
 const qualifier=group(safeCaption(demos[index]),0,0,0,1,1-push);
 return miniDecoration(index,local)+words+transformed+qualifier;
}
function cameraSway(sec:number){
 let out=0;
 for(let k=1;k<=12;k++){
  const p=(sec-(k*8-CAMERA_DURATION/2))/CAMERA_DURATION;
  if(p>0&&p<1)out=Math.max(out,Math.sin(p*Math.PI));
 }
 return out;
}
function journeyWorld(sec:number){
 const index=Math.min(12,Math.floor(sec/8)),cx=cameraDistance(sec);
 let q='';
 for(let i=Math.max(0,index-1);i<=Math.min(12,index+1);i++){
  const x=i*WIDTH-cx;
  if(x>WIDTH+160||x<-(WIDTH+160))continue;
  q+=group(storyboardView(i,sec),x,0);
  if(i<12){
   // A pen-drawn track crosses the seam, making all storyboard stations ONE canvas.
   const offset=n(-sec*36);
   q+=group(`<path d="M1840 919 Q1920 840 2000 919" stroke="${P.sun}" stroke-width="5" fill="none" stroke-dasharray="14 17" stroke-dashoffset="${offset}"/><path d="M1898 902 L1919 914 L1911 888" stroke="${P.sun}" stroke-width="5" fill="none" stroke-linecap="round"/>`,x,0);
  }
 }
 const sway=cameraSway(sec);
 // Handheld-like dolly: a brief 2.5° camera roll plus 7% push through each doorway.
 const roll=(Math.floor(sec/8)%2?1:-1)*2.5*sway;
 const push=1+.07*sway;
 return `<g transform="translate(960 540) rotate(${n(roll)}) scale(${n(push)}) translate(-960 -540)">${q}</g>`;
}
function playlistPassport(sec:number){
 const cycle=Math.round(sec/8);
 const center=cycle*8,alpha=(sec-(center-CAMERA_DURATION/2))/CAMERA_DURATION;
 const moving=cycle>0&&cycle<=12&&alpha>=0&&alpha<=1;
 const p=cl(alpha),rise=Math.sin(Math.PI*p),pulse=eventBeat(sec);
 const style=cycle%4;
 // Four choreographed camera handoffs prevent a repetitive wipe on every chapter.
 const x=moving?[
   410+560*ss(p)+65*Math.sin(p*Math.PI*2),
   370+740*ss(p),
   520+450*ss(p)+96*Math.sin(p*Math.PI),
   420+600*ss(p)-55*Math.sin(2*p*Math.PI)
 ][style]:430+42*Math.sin(sec*.7);
 const y=moving?[
   916-430*rise,
   916-340*rise-50*p,
   915-500*rise,
   916-280*rise+20*Math.sin(p*Math.PI*2)
 ][style]:917+5*Math.sin(sec*.9);
 const sc=moving?1+[4.2,3.3,4.4,3.6][style]*rise:1+.045*pulse;
 const rot=moving?[-5+280*ss(p),-7+55*ss(p),-8-235*ss(p),-5+375*ss(p)][style]:-5+2.4*Math.sin(sec*.7);
 const shades=[P.pink,P.mint,P.blue,P.note];
 let base=rect(8,10,150,64,P.ink,12)+rect(0,0,150,64,P.yellow,12,P.ink,3);
 const leg=['MUSIC','ONE LINK','PASTE','EXPORT','FILES','DATA','ZIP','PLUGIN','LX JSON','L1 JSON','HANDOFF','CLI','API'];
 base+=rect(82,9,54,45,P.paper2,8,P.ink,1.5)+note(96,20,.34)+mono(15,24,'PLAYLIST',14,P.ink,820)+mono(15,46,leg[Math.min(12,Math.floor(sec/8))],12,P.muted,720);
 base+=tape(32,0,34,shades[cycle%4],-15);
 let q=group(base,x,y,rot,sc);
 if(moving){
  // Inertia streaks and punched paper disks lead the eye through the spatial move.
  for(let k=0;k<7;k++){
   const side=k%2?1:-1;const xx=x-100*side-44*k*Math.cos(rot*Math.PI/180),yy=y+side*(45+k*16)*rise;
   q+=group(circle(0,0,3+(k%3)*3,[P.sun,P.coral,P.teal][k%3]),xx,yy,k*12,1,Math.sin(Math.PI*p)*(.35+.06*k));
  }
  q+=`<path d="M${n(x-92*sc)} ${n(y+30*sc)} Q${n(x-150*sc)} ${n(y-80*rise)} ${n(x-220*sc)} ${n(y+30*sc)}" fill="none" stroke="${P.sun}" stroke-width="${n(4+rise*7)}" stroke-linecap="round" stroke-dasharray="11 19" opacity="${n(rise*.65)}"/>`;
 }
 return q;
}
function journeyHUD(sec:number){
 let q=audioMeter(sec,1440,948);
 // A little rhythmic record groove replaces section numbering and slide-progress dots.
 for(let k=0;k<4;k++){
  const x=820+k*30,y=68-5*Math.sin(sec*2.4+k);
  q+=group(note(0,0,.18),x,y,9*Math.sin(sec*.9+k),1,.25+.16*eventBeat(sec));
 }
 q+=circle(1797,936,7+4*eventBeat(sec),P.sun);
 return q;
}
export function renderScene(frame:number):string{
 const sec=cl(frame,0,DURATION-1)/FPS;
 const content=notebook(sec)+journeyWorld(sec)+playlistPassport(sec)+journeyHUD(sec);
 return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">${content}</svg>`;
}
