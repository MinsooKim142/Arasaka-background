/* Shared, offline scene definitions and still renderer for every edition. */
(() => {
  'use strict';
  const presets = {
    classic: { name: 'Arasaka / Classic', brand: 'ARASAKA', wordmark: 'arasaka', caption: 'CORPORATION', symbol: 'emblem', theme: 'crimson', network: 'ACN002077', label: 'SECURITY LOGIN', region: 'NIGHT CITY', sub: 'アラサカ社', system: 'ARASAKA OS', ghost: '', stamp: '', bg: ['#161016','#0d0d12','#090a0d'], ink: '#e3e1e4', secondary: '#a09ba6', description: 'The original security terminal, just as you left it.' },
    ceramic: { name: 'Arasaka / Ceramic', brand: 'ARASAKA', wordmark: 'arasaka', caption: 'CORPORATION', symbol: 'emblem', theme: 'crimson', network: 'ACN.SHELL.01', label: 'SECURITY LOGIN', region: 'CERAMIC SERIES', sub: 'アラサカ社', system: 'ARASAKA OS', ghost: '01', stamp: 'CERAMIC SHELL\nPERSONAL TERMINAL / 01', bg: ['#f7f6ef','#e8e9e2','#dcded8'], ink: '#2a3238', secondary: '#68757a', description: 'Pearl white, graphite legends, and red signal accents to match your Corsair hardware.' },
    militech: { name: 'Militech / Field Ops', brand: 'MILITECH', wordmark: 'MILITECH', caption: 'ARMAMENTS', symbol: 'emblem-militech', theme: 'gold', network: 'MT.FIELD.2077', label: 'TACTICAL ACCESS', region: 'FIELD OPERATIONS', sub: 'DEFENSE SYSTEMS', system: 'MILITECH FIELD OS', ghost: 'MILITECH', stamp: 'RESTRICTED / 06\nFIELD OPERATIONS DIVISION', bg: ['#24271e','#181d14','#10140f'], ink: '#e5e4cf', secondary: '#a5ab90', description: 'An industrial field terminal with tactical gold, a shield mark, and restrained gridwork.' },
    kangtao: { name: 'Kang Tao / Precision', brand: 'KANG TAO', wordmark: '康陶', caption: 'KANG TAO', symbol: 'emblem-kangtao', theme: 'orange', network: 'KT.SMART.088', label: 'SMART LINK', region: 'PRECISION SYSTEMS', sub: '智能系统', system: 'KANG TAO SMART OS', ghost: '康陶', stamp: 'SMART SYSTEMS / 08\nPRECISION THROUGH INNOVATION', bg: ['#29201d','#172026','#0c141b'], ink: '#e8dfd7', secondary: '#a89d99', description: 'Warm orange on deep graphite with a diamond smart-link insignia and Chinese typography.' },
    mantis: { name: 'Mantis / Blueprint', brand: 'ARASAKA', wordmark: 'arasaka', caption: 'CORPORATION', symbol: 'emblem', theme: 'crimson', network: 'RND.MANTIS.001', label: 'RESEARCH ACCESS', region: 'ENGINEERING DIVISION', sub: '研究開発', system: 'ARASAKA R&D', ghost: '', stamp: '', bg: ['#2a3745','#222f3c','#1b2632'], ink: '#d8e0e4', secondary: '#97acba', description: 'A graphite cyberware blueprint inspired by your Corsair desk mat. Select the numbered callouts to explore.' }
  };
  const signals = { crimson: ['#ff2438','255,36,56'], ice: ['#a3e5ff','163,229,255'], amber: ['#ffaf4d','255,175,77'], gold: ['#e4cd72','228,205,114'], orange: ['#ff773d','255,119,61'] };
  const images = new Map();
  function svgImage(svg) {
    if (!images.has(svg)) images.set(svg, new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Could not render the vector artwork')); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; }));
    return images.get(svg);
  }
  const spaced = (ctx, value, x, y, spacing = 1) => { for (const char of value) { ctx.fillText(char, x, y); x += ctx.measureText(char).width + spacing; } };

  function paintBackground(ctx, w, h, profile, accent, preset) {
    const gradient = ctx.createRadialGradient(w * .53, h * .46, 0, w * .53, h * .46, Math.max(w,h) * .65);
    profile.bg.forEach((color,index) => gradient.addColorStop([0,.6,1][index],color)); ctx.fillStyle = gradient; ctx.fillRect(0,0,w,h);
    if (preset === 'mantis' || preset === 'militech') {
      ctx.save(); ctx.strokeStyle = preset === 'mantis' ? '#cddbe407' : '#dce0b706'; ctx.lineWidth = .5;
      const step = preset === 'mantis' ? 24 : 60;
      ctx.beginPath(); for (let x=0;x<w;x+=step){ctx.moveTo(x,0);ctx.lineTo(x,h);} for(let y=0;y<h;y+=step){ctx.moveTo(0,y);ctx.lineTo(w,y);} ctx.stroke(); ctx.restore();
    }
    if (preset === 'ceramic') {
      ctx.strokeStyle = '#bdc3bf70'; ctx.lineWidth = 1; for (const extra of [0,18,80]) {ctx.beginPath();ctx.arc(w*1.025,h*.5,w*.315+extra,0,Math.PI*2);ctx.stroke();}
    }
    if (profile.ghost) {
      ctx.save(); ctx.globalAlpha = preset === 'ceramic' ? .045 : .025; ctx.fillStyle = preset === 'ceramic' ? '#4b5255' : accent; ctx.font = `600 ${w*.22}px Rajdhani, sans-serif`; ctx.textAlign = 'right'; ctx.fillText(profile.ghost,w*.94,h*.58); ctx.restore();
    }
  }

  async function render(settings, options = {}) {
    await document.fonts.ready;
    const profile = presets[settings.preset] || presets.classic;
    const accent = (signals[settings.theme] || signals[profile.theme])[0];
    const lock = !!options.lock;
    const outW = Math.max(640, Math.min(7680, Math.round(options.width || 3840)));
    const outH = Math.max(400, Math.min(7680, Math.round(options.height || 2400)));
    const w = options.cssWidth || 1440, h = w * outH / outW;
    const output = document.createElement('canvas'); output.width = outW; output.height = outH;
    const ctx = output.getContext('2d'); ctx.scale(outW/w,outH/h);
    paintBackground(ctx,w,h,profile,accent,settings.preset);
    const symbol = document.getElementById(profile.symbol);
    const logo = await svgImage(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" color="${accent}">${symbol.innerHTML}</svg>`);
    const railX = w <= 760 ? 16 : w >= 1900 ? 29 : 24;
    ctx.fillStyle=accent; ctx.shadowColor=accent; ctx.shadowBlur=settings.preset==='ceramic'?0:7; ctx.fillRect(railX,28,2,h-56);ctx.shadowBlur=0;
    ctx.save();ctx.translate(railX+12,h-31);ctx.rotate(-Math.PI/2);ctx.font='7px monospace';spaced(ctx,`${profile.system} / V.3.14.080 — AUTHORIZED PERSONNEL ONLY`,0,0,1.2);ctx.restore();
    const mobile=w<=520;
    if(settings.preset==='mantis' && settings.layout!=='emblem') {
      const art=await svgImage(window.MANTIS_ARTWORK);
      const sceneScale = lock ? Math.min(settings.scale / 100, 1) : settings.scale / 100;
      const bw = (lock ? Math.min(800, w * .65, h * .67) : Math.min(900, w * .76)) * sceneScale, bh = bw * .52;
      const x = (w - bw) / 2, y = (lock ? h * .57 : h * .48) - bh / 2;
      ctx.fillStyle=profile.secondary;ctx.font='8px monospace';spaced(ctx,'ARASAKA / ENGINEERING DIVISION',x,y-47,1.7);
      ctx.font='600 42px Rajdhani';ctx.fillStyle=profile.ink;ctx.fillText('MANTIS',x,y-4);ctx.fillStyle=accent;ctx.fillText('BLADES',x+169,y-4);
      ctx.font='7px monospace';ctx.fillStyle=profile.secondary;spaced(ctx,'CYBERWARE SCHEMATIC — MODEL 001',x,y+12,1.3);
      if(!lock){ctx.font='600 24px Rajdhani';ctx.fillStyle=accent;ctx.textAlign='right';ctx.fillText(options.clock?.value||'',x+bw,y-14);ctx.textAlign='left';}
      ctx.drawImage(art,x,y+10,bw,bh);ctx.strokeStyle='#93a6b34d';ctx.beginPath();ctx.moveTo(x,y+bh+22);ctx.lineTo(x+bw,y+bh+22);ctx.stroke();ctx.fillStyle=accent;ctx.font='600 11px Rajdhani';spaced(ctx,'ARASAKA RESEARCH / MANTIS BLADES',x,y+bh+43,2);
      ctx.fillStyle=profile.secondary;ctx.font='7px monospace';spaced(ctx,'CONCEPT SCHEMATIC / LOCAL SIMULATION',x,y+bh+60,.8);
    } else if(lock) {
      // Leave the top third and bottom fifth open for the operating system's UI.
      const size=Math.min(180,h*.2)*(settings.scale/100);
      const x=w/2-size/2,y=h*.55-size/2;
      ctx.shadowColor=accent;ctx.shadowBlur=settings.preset==='ceramic'?0:settings.glow*.12;ctx.drawImage(logo,x,y,size,size);ctx.shadowBlur=0;
      ctx.textAlign='center';ctx.fillStyle=profile.ink;ctx.font=`600 ${profile.wordmark==='康陶'?38:profile.brand==='MILITECH'?34:40}px Rajdhani, sans-serif`;ctx.fillText(profile.wordmark,w/2,y+size+35);
      ctx.fillStyle=profile.secondary;ctx.font='600 11px Rajdhani';ctx.fillText(profile.caption.split('').join(' '),w/2,y+size+57);ctx.textAlign='left';
    } else {
      const scale = (w <= 760 && !mobile ? .8 : w >= 1900 ? 1.18 : 1) * settings.scale / 100;
      ctx.save();ctx.translate(w/2,h*(mobile ? .44 : .465));ctx.scale(scale,scale);
      const emblemOnly=settings.layout==='emblem';if(emblemOnly)ctx.scale(1.35,1.35);
      const x=emblemOnly?-78:mobile?-54:-291,y=emblemOnly?-104:mobile?-180:-100,size=mobile&&!emblemOnly?108:156;
      ctx.shadowColor=accent;ctx.shadowBlur=settings.preset==='ceramic'?0:settings.glow*.12;ctx.drawImage(logo,x,y,size,size);ctx.shadowBlur=0;
      ctx.fillStyle=profile.ink;ctx.font=`600 ${mobile&&!emblemOnly?30:profile.brand==='MILITECH'?33:39}px Rajdhani, sans-serif`;ctx.textAlign='center';ctx.fillText(profile.wordmark,x+size/2,y+size+34);
      ctx.fillStyle=profile.secondary;ctx.font=`600 ${mobile&&!emblemOnly?8:11}px Rajdhani`;ctx.fillText(profile.caption.split('').join(' '),x+size/2,y+size+51);ctx.textAlign='left';
      if(!emblemOnly){
        const px=mobile?-144:-95,py=mobile?9:-56,pw=mobile?288:392,box=mobile?52:61;
        ctx.fillStyle=accent;ctx.font='600 11px Rajdhani';spaced(ctx,profile.label,px,py-9,1.25);
        ctx.textAlign='right';ctx.font=`600 ${mobile?37:46}px Rajdhani`;ctx.fillText((options.clock?.value||'')+(options.clock?.period?` ${options.clock.period}`:''),px+pw,py-26);ctx.font='600 14px Rajdhani';ctx.fillText(options.clock?.date||'',px+pw,py-9);ctx.textAlign='left';
        ctx.strokeStyle=accent;ctx.lineWidth=1;ctx.strokeRect(px,py,pw,box);ctx.font='600 19px Rajdhani';ctx.fillText(`UID_ ${settings.operator}`,px+19,py+box/2+6);
        ctx.fillStyle=profile.secondary;ctx.font='600 14px Rajdhani';spaced(ctx,'///////////',px+1,py+box+21,1.6);ctx.strokeStyle=profile.secondary;ctx.globalAlpha=.6;ctx.beginPath();ctx.moveTo(px+113,py+box+17);ctx.lineTo(px+pw,py+box+17);ctx.stroke();ctx.globalAlpha=1;
        ctx.font='600 10px Rajdhani';spaced(ctx,'CURR_NETWORK:',px,py+box+37,1);ctx.fillStyle=accent;spaced(ctx,profile.network,px+99,py+box+37,1);ctx.fillStyle=profile.secondary;spaced(ctx,'NL_PORT_STATUS:',px,py+box+52,1);ctx.fillStyle=accent;spaced(ctx,settings.operator?'SECURE':'OPEN',px+111,py+box+52,1);
      }ctx.restore();
    }
    ctx.textAlign='right';ctx.fillStyle=accent;ctx.font=`600 ${profile.brand==='MILITECH'?22:27}px Rajdhani, sans-serif`;ctx.fillText(profile.wordmark,w-49,h-66);ctx.strokeStyle=profile.secondary;ctx.beginPath();ctx.moveTo(w-150,h-56);ctx.lineTo(w-109,h-56);ctx.stroke();ctx.fillStyle=profile.secondary;ctx.font='9px sans-serif';ctx.fillText(profile.sub,w-49,h-52);
    if(settings.telemetry&&!lock){ctx.textAlign='left';ctx.font='8px monospace';ctx.fillStyle=accent;spaced(ctx,`01 / ${profile.region}`,64,h-76,1.2);ctx.font='7px monospace';ctx.fillStyle=profile.secondary;ctx.globalAlpha=.6;spaced(ctx,'PERSONAL TERMINAL / LOCAL SIMULATION',64,h-59,.8);ctx.globalAlpha=1;}
    if(settings.scanlines){ctx.fillStyle=settings.preset==='ceramic'?'#00000004':'#00000013';for(let y=0;y<h;y+=4)ctx.fillRect(0,y,w,1);}
    return output;
  }
  window.WallpaperCollection={presets,signals,render};
})();
