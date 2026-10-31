/* Decorative source workspace: file selection only; no code execution or file access. */
(() => {
  const files = {
    'security.ts': [
      '// ARASAKA CORPORATION — LOCAL WORKSPACE',
      'import { Terminal } from "@arasaka/local";',
      '',
      'type Session = "standby" | "connected";',
      '',
      'const terminal = new Terminal({',
      '  model: "AR-2077/02",',
      '  operator: "LOCAL_USER",',
      '  display: "secondary",',
      '  networkAccess: false,',
      '});',
      '',
      'async function initialize(): Promise<void> {',
      '  await terminal.connect("local");',
      '  terminal.theme("crimson");',
      '  terminal.workspace.open("security.ts");',
      '}',
      '',
      'const session: Session = "standby";',
      'const policy = Object.freeze({',
      '  containment: "simulated",',
      '  externalCommands: false,',
      '});',
      '',
      'void initialize();'
    ],
    'terminal.json': ['{','  "name": "Arasaka Source",','  "terminal": "AR-2077/02",','  "workspace": "night-city",','  "display": "secondary",','  "appearance": {','    "accent": "crimson",','    "background": "graphite",','    "motion": "subtle"','  },','  "session": {','    "mode": "local",','    "networkAccess": false,','    "externalCommands": false','  }','}'],
    'README.md': ['# ARASAKA / SOURCE','', 'A quiet workspace for the second display.','', '## Local environment','', '- Terminal model: AR-2077/02','- Session: local preview','- Network access: disabled','- External commands: disabled','', '## Workspace','', 'security.ts     Terminal initialization','terminal.json   Local configuration','README.md       Workspace notes','', 'Select a file to change this visual preview.','', 'This workspace is a wallpaper illustration.','No files are opened and no code is executed.']
  };
  const tokenPattern = /("[^"\n]*"|'[^'\n]*'|\/\/.*$|\b(?:import|from|type|const|new|async|function|await|void|false|true|return)\b)/g;
  function tokens(line) {
    const result=[]; let previous=0;
    for(const match of line.matchAll(tokenPattern)) {
      if(match.index>previous) result.push({text:line.slice(previous,match.index),kind:'plain'});
      const text=match[0]; result.push({text,kind:text.startsWith('//')?'comment':/^['"]/.test(text)?'string':'keyword'}); previous=match.index+text.length;
    }
    if(previous<line.length)result.push({text:line.slice(previous),kind:'plain'});
    return result;
  }
  let selected='security.ts';
  function select(name) {
    if(!files[name])return;
    selected=name;
    const content=document.getElementById('source-lines'); content.replaceChildren();
    files[name].forEach((line,index)=>{
      const row=document.createElement('div');row.className='source-line';
      if(index===13&&name==='security.ts')row.classList.add('current-line');
      const number=document.createElement('span');number.className='source-number';number.textContent=String(index+1);
      const code=document.createElement('code');
      tokens(line).forEach(token=>{const span=document.createElement('span');span.className=`syntax-${token.kind}`;span.textContent=token.text;code.append(span);});
      if(index===13&&name==='security.ts'){const cursor=document.createElement('i');cursor.className='source-caret';cursor.setAttribute('aria-hidden','true');code.append(cursor);}
      row.append(number,code);content.append(row);
    });
    document.querySelectorAll('[data-source-file]').forEach(button=>{const active=button.dataset.sourceFile===name;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));});
    document.getElementById('source-breadcrumb').textContent=`src / ${name}`;
    document.getElementById('source-language').textContent=name.endsWith('.ts')?'TypeScript':name.endsWith('.json')?'JSON':'Markdown';
  }
  function init() {
    document.querySelectorAll('[data-source-file]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.sourceFile)));
    document.getElementById('source-tree-toggle').addEventListener('click',event=>{const open=event.currentTarget.getAttribute('aria-expanded')!=='true';event.currentTarget.setAttribute('aria-expanded',String(open));document.getElementById('source-tree').hidden=!open;});
    select(selected);
  }
  function draw(ctx,w,h,settings,accent,clock) {
    const scale=settings.scale/100, sw=Math.min(1080,w*.8), sh=Math.min(780,h-190);
    const x=(w-sw)/2,y=(h-sh)/2, side=w>780?160:0, mono='"SFMono-Regular", Consolas, monospace';
    ctx.save();ctx.translate(w/2,h/2);ctx.scale(scale,scale);ctx.translate(-w/2,-h/2);ctx.fillStyle='#0c0d12';ctx.fillRect(x,y,sw,sh);ctx.strokeStyle='#48232e';ctx.lineWidth=1;ctx.strokeRect(x,y,sw,sh);
    ctx.fillStyle=accent;ctx.font=`9px ${mono}`;ctx.fillText('PROPERTY OF ARASAKA CORPORATION',x,y-19);
    ctx.fillStyle='#69646e';ctx.textAlign='right';ctx.fillText('LOCAL WORKSPACE / 02',x+sw,y-19);ctx.textAlign='left';
    ctx.fillStyle='#131018';ctx.fillRect(x,y,sw,35);ctx.fillStyle=accent;ctx.fillRect(x+side+Object.keys(files).indexOf(selected)*133,y,133,2);
    ctx.font=`10px ${mono}`;Object.keys(files).forEach((name,index)=>{if(index>0&&sw<=600)return;ctx.fillStyle=name===selected?'#bbb1bc':'#5d5664';ctx.fillText(name,x+side+15+index*133,y+22);});
    if(side){ctx.fillStyle='#101015';ctx.fillRect(x,y+35,side,sh-59);ctx.fillStyle='#776b79';ctx.font=`8px ${mono}`;ctx.fillText('EXPLORER',x+17,y+59);ctx.fillStyle='#b2a1b0';ctx.fillText('⌄ ARASAKA / LOCAL',x+17,y+88);ctx.fillStyle='#665568';ctx.fillText('⌄ src',x+28,y+117);ctx.fillStyle=accent;ctx.fillText('security.ts',x+41,y+143);ctx.fillStyle='#786d7b';ctx.fillText('terminal.json',x+41,y+168);ctx.fillText('README.md',x+28,y+197);ctx.strokeStyle='#251b28';ctx.beginPath();ctx.moveTo(x+side,y+35);ctx.lineTo(x+side,y+sh-24);ctx.stroke();}
    const cx=x+side, cw=sw-side, codeY=y+79, lineHeight=Math.min(19,(sh-205)/25), fontSize=w<=600?8.5:11;
    ctx.fillStyle='#635967';ctx.font=`8px ${mono}`;ctx.fillText(`src / ${selected}`,cx+18,y+54);
    const palette={plain:'#aaa3ad',keyword:'#d55f77',string:'#c4a0ad',comment:'#5f5667'};
    files[selected].forEach((line,index)=>{const ly=codeY+index*lineHeight;if(index===13&&selected==='security.ts'){ctx.fillStyle='#b3334b0d';ctx.fillRect(cx,ly-12,cw,18);}ctx.font=`8px ${mono}`;ctx.fillStyle='#443a4b';ctx.textAlign='right';ctx.fillText(String(index+1),cx+31,ly);ctx.textAlign='left';ctx.font=`${fontSize}px ${mono}`;let lx=cx+47;for(const token of tokens(line)){ctx.fillStyle=palette[token.kind];ctx.fillText(token.text,lx,ly);lx+=ctx.measureText(token.text).width;}});
    const ty=y+sh-112;ctx.strokeStyle='#2d202e';ctx.beginPath();ctx.moveTo(cx,ty);ctx.lineTo(x+sw,ty);ctx.stroke();ctx.fillStyle=accent;ctx.font=`8px ${mono}`;ctx.fillText('TERMINAL',cx+18,ty+22);ctx.fillStyle='#736477';ctx.fillText('ARASAKA LOCAL SESSION',cx+18,ty+46);ctx.fillStyle='#b39aa7';ctx.fillText('› workspace initialized',cx+18,ty+65);ctx.fillStyle='#65576c';ctx.fillText(`› standby  ${clock?.value||''}`,cx+18,ty+82);
    ctx.fillStyle='#1b101a';ctx.fillRect(x,y+sh-24,sw,24);ctx.fillStyle='#9e7b8e';ctx.font=`7px ${mono}`;ctx.fillText('main  /  LOCAL SIMULATION',x+14,y+sh-9);ctx.textAlign='right';ctx.fillText('UTF-8    TypeScript    Ln 14, Col 3',x+sw-14,y+sh-9);ctx.restore();
  }
  window.SourceWallpaper={init,select,draw,files};
})();
