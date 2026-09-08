const canvas=document.querySelector('#canvas'), ctx=canvas.getContext('2d');
const $=s=>document.querySelector(s), all=s=>[...document.querySelectorAll(s)];
const sizes= {
  x:[1500, 500, 'X ヘッダー'], youtube:[2560, 1440, 'YouTube バナー'], discord:[960, 540, 'Discord バナー']
};
const state= {
  platform:'x', preview:'mobile', template:'left', bg:'#102a38', gradient:false, gradientColor:'#20d9ff', gradientDirection:'right', gradientBalance:.5, bgImg:null, bgScale:1, bgPos: {
    x:.5, y:.5
  }, layers:[], selected:null, safe:true, snap: {
    x:false, y:false
  }, text: {
    main:'YOUR NAME', sub:'Streamer / Creator', color:'#eefbff', font:'sans', align:'left', weight:900, mainSize:1, subSize:1, gap:78, spacing:0, strokeColor:'#061018', strokeWidth:0, shadowColor:'#000000', shadowBlur:0, pos: {
      x:.225, y:.5
    }
  }
};
const clamp=(v, min, max)=>Math.max(min, Math.min(max, v));
const selectedLayer=()=>state.layers.find(l=>l.id===state.selected)||null;
function fontName() {
  return state.text.font==='serif'?'"Yu Mincho",serif':state.text.font==='round'?'"Hiragino Maru Gothic ProN","Yu Gothic",sans-serif':'"Noto Sans JP","Yu Gothic",sans-serif'
}
function layerSize(l) {
  const h=canvas.height*l.scale;
  return {
    w:l.img.width*h/l.img.height, h
  }
}
function drawCover(img, scale, pos) {
  const r=Math.max(canvas.width/img.width, canvas.height/img.height)*scale, w=img.width*r, h=img.height*r;
  ctx.drawImage(img, pos.x*canvas.width-w/2, pos.y*canvas.height-h/2, w, h)
}
function drawLayer(l) {
  const {
    w, h
  }
  =layerSize(l);
  ctx.save();
  ctx.translate(l.pos.x*canvas.width, l.pos.y*canvas.height);
  ctx.rotate(l.rotation*Math.PI/180);
  ctx.scale(l.flipX?-1:1, 1);
  ctx.drawImage(l.img, -w/2, -h/2, w, h);
  ctx.restore()
}
function setText(size, alpha=1) {
  ctx.font=`${state.text.weight} ${size}px ${fontName()}`;
  ctx.textAlign=state.text.align;
  ctx.textBaseline='middle';
  ctx.globalAlpha=alpha;
  ctx.fillStyle=state.text.color;
  ctx.strokeStyle=state.text.strokeColor;
  ctx.lineWidth=state.text.strokeWidth*Math.max(1, canvas.width/1500);
  ctx.lineJoin='round';
  ctx.shadowColor=state.text.shadowBlur?state.text.shadowColor:'transparent';
  ctx.shadowBlur=state.text.shadowBlur*Math.max(1, canvas.width/1500);
  ctx.shadowOffsetX=ctx.shadowBlur*.25;
  ctx.shadowOffsetY=ctx.shadowBlur*.3;
  try {
    ctx.letterSpacing=`${state.text.spacing*Math.max(1,canvas.width/1500)}px`
  }
  catch(e) {
  }
}
function paintText(text, x, y) {
  if(!text)return;
  if(state.text.strokeWidth)ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y)
}
function drawText() {
  const unit=Math.min(canvas.width/1500, canvas.height/500), x=state.text.pos.x*canvas.width, y=state.text.pos.y*canvas.height, gap=state.text.gap*unit;
  const hasMain=Boolean(state.text.main), hasSub=Boolean(state.text.sub);
  ctx.save();
  if(hasMain&&hasSub) {
    setText(Math.max(36, 92*unit*state.text.mainSize));
    paintText(state.text.main, x, y-gap/2);
    setText(Math.max(18, 31*unit*state.text.subSize), .78);
    paintText(state.text.sub, x, y+gap/2)
  } else if(hasMain) {
    setText(Math.max(36, 92*unit*state.text.mainSize));
    paintText(state.text.main, x, y)
  } else if(hasSub) {
    setText(Math.max(18, 31*unit*state.text.subSize), .78);
    paintText(state.text.sub, x, y)
  }
  ctx.restore()
}
function safeRect() {
  if(state.platform==='youtube') {
    const w=canvas.width*(1235/2048), h=canvas.height*(338/1152);
    return {
      x:(canvas.width-w)/2, y:(canvas.height-h)/2, w, h
    }
  }
  if(state.platform==='x') {
    const mobile=state.preview==='mobile';
    return {
      x:canvas.width*(mobile?.225:.035), y:canvas.height*.12, w:canvas.width*(mobile?.55:.93), h:canvas.height*.76
    }
  }
  return {
    x:canvas.width*.05, y:canvas.height*.08, w:canvas.width*.9, h:canvas.height*.84
  }
}
function drawSafe() {
  if(!state.safe)return;
  const {
    x, y, w, h
  }=safeRect();
  ctx.save();
  ctx.fillStyle='rgba(8,24,20,.16)';
  ctx.fillRect(0, 0, canvas.width, y);
  ctx.fillRect(0, y, x, h);
  ctx.fillRect(x+w, y, canvas.width-x-w, h);
  ctx.fillRect(0, y+h, canvas.width, canvas.height-y-h);
  ctx.strokeStyle='#fff';
  ctx.lineWidth=Math.max(2, canvas.width/700);
  ctx.setLineDash([canvas.width/120, canvas.width/180]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  ctx.fillStyle='rgba(226, 226, 226, 0.82)';
  ctx.font=`800 ${Math.max(15,canvas.width/80)}px sans-serif`;
  ctx.textAlign='left';
  ctx.textBaseline='top';
  ctx.fillText('文字・ロゴは点線の内側へ', x+canvas.width*.01, y+canvas.width*.008);
  if(false&&state.platform==='x') {
    const mobile=state.preview==='mobile', guide=state.preview==='pc'? {
      y:.98, r:.34, label:'PC アイコン範囲'
    }
    :mobile? {
      y:.68, r:.24, label:'スマホ アイコン範囲'
    }
    : {
      y:1.10, r:.31, label:'アイコン重なり範囲'
    }, iconX=canvas.width*(mobile?.20:.13), iconY=canvas.height*guide.y, iconR=canvas.height*guide.r;
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconR, 0, Math.PI*2);
    ctx.fillStyle='rgba(255,74,105,.34)';
    ctx.fill();
    ctx.strokeStyle='#fff';
    ctx.lineWidth=Math.max(3, canvas.width/500);
    ctx.setLineDash([canvas.width/100, canvas.width/170]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#fff';
    ctx.font=`900 ${Math.max(18,canvas.width/72)}px sans-serif`;
    ctx.textAlign='left';
    ctx.textBaseline='bottom';
    ctx.fillText(guide.label, canvas.width*.11, canvas.height*.94)
  }
  ctx.restore()
}
function drawGuides() {
  ctx.save();
  ctx.strokeStyle='#20d9ff';
  ctx.lineWidth=Math.max(2, canvas.width/700);
  ctx.setLineDash([canvas.width/140, canvas.width/220]);
  if(state.snap.x) {
    ctx.beginPath();
    ctx.moveTo(canvas.width/2, 0);
    ctx.lineTo(canvas.width/2, canvas.height);
    ctx.stroke()
  }
  if(state.snap.y) {
    ctx.beginPath();
    ctx.moveTo(0, canvas.height/2);
    ctx.lineTo(canvas.width, canvas.height/2);
    ctx.stroke()
  }
  ctx.setLineDash([canvas.width/100, canvas.width/160]);
  const l=selectedLayer();
  if(l) {
    const {
      w, h
    }
    =layerSize(l);
    ctx.translate(l.pos.x*canvas.width, l.pos.y*canvas.height);
    ctx.rotate(l.rotation*Math.PI/180);
    ctx.strokeRect(-w/2, -h/2, w, h)
  } else if(state.selected==='bg'&&state.bgImg) {
    const i=Math.max(7, canvas.width/220);
    ctx.strokeRect(i, i, canvas.width-i*2, canvas.height-i*2)
  }
  ctx.restore()
}
function backgroundPaint() {
  if(!state.gradient)return state.bg;
  let g;
  if(state.gradientDirection==='bottom')g=ctx.createLinearGradient(0, 0, 0, canvas.height);
  else if(state.gradientDirection==='diagonal')g=ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  else if(state.gradientDirection==='radial')g=ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height)*.7);
  else g=ctx.createLinearGradient(0, 0, canvas.width, 0);
  const first=clamp(state.gradientBalance-.35, 0, .8), second=clamp(state.gradientBalance+.35, .2, 1);
  g.addColorStop(first, state.bg);
  g.addColorStop(second, state.gradientColor);
  return g
}
function draw(guides=true) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle=backgroundPaint();
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if(state.bgImg)drawCover(state.bgImg, state.bgScale, state.bgPos);
  state.layers.forEach(drawLayer);
  drawText();
  if(guides) {
    drawSafe();
    drawGuides()
  }
}
function syncLayerTools() {
  const l=selectedLayer();
  $('#layerTools').classList.toggle('hidden', !l);
  if(!l)return;
  $('#selectedLayerName').textContent=l.name;
  $('#fgScale').value=Math.round(l.scale*100);
  $('#fgScaleOut').value=Math.round(l.scale*100)+'%';
  $('#rotation').value=Math.round(l.rotation);
  $('#rotationOut').value=Math.round(l.rotation)+'°'
}
function renderLayers() {
  const list=$('#layerList');
  list.innerHTML='';
  if(!state.layers.length) {
    const p=document.createElement('p');
    p.textContent='追加された画像はありません';
    list.append(p)
  }
  state.layers.slice().reverse().forEach((l, i)=> {
    const b=document.createElement('button'); b.type='button'; b.className='layer-item'+(state.selected===l.id?' active':''); b.dataset.id=l.id; const img=document.createElement('img'); img.className='layer-thumb'; img.src=l.url; img.alt=''; const name=document.createElement('span'); name.className='layer-name'; name.textContent=l.name; const n=document.createElement('span'); n.className='layer-index'; n.textContent=String(state.layers.length-i); b.append(img, name, n); list.append(b)
  });
  syncLayerTools()
}
function setUploadStatus(message, type='') {
  $('#uploadStatus').textContent=message;
  $('#uploadStatus').className='upload-status'+(type?' '+type:'')
}
function prepareImage(file, onReady) {
  if(!file)return;
  if(file.size>30*1024*1024) {
    setUploadStatus('30MB以下の画像を選んでください', 'error');
    return
  }
  setUploadStatus('画像を読み込んでいます…', 'loading');
  const source=new Image(), sourceUrl=URL.createObjectURL(file);
  source.onload=()=> {
    setTimeout(()=> {
      try {
        const max=2400, rate=Math.min(1, max/Math.max(source.naturalWidth, source.naturalHeight)), work=document.createElement('canvas'); work.width=Math.max(1, Math.round(source.naturalWidth*rate)); work.height=Math.max(1, Math.round(source.naturalHeight*rate)); work.getContext('2d').drawImage(source, 0, 0, work.width, work.height); const thumbCanvas=document.createElement('canvas'), thumbRate=Math.min(1, 120/Math.max(work.width, work.height)); thumbCanvas.width=Math.max(1, Math.round(work.width*thumbRate)); thumbCanvas.height=Math.max(1, Math.round(work.height*thumbRate)); thumbCanvas.getContext('2d').drawImage(work, 0, 0, thumbCanvas.width, thumbCanvas.height); const thumb=thumbCanvas.toDataURL('image/png'); URL.revokeObjectURL(sourceUrl); onReady(work, thumb); setUploadStatus('画像を追加しました。続けて別の画像も追加できます')
      }
      catch(error) {
        URL.revokeObjectURL(sourceUrl); setUploadStatus('画像を読み込めませんでした。PNGまたはJPEGをお試しください', 'error')
      }
    }, 0)
  };
  source.onerror=()=> {
    URL.revokeObjectURL(sourceUrl);
    setUploadStatus('画像を読み込めませんでした。PNGまたはJPEGをお試しください', 'error')
  };
  source.src=sourceUrl
}
function addFiles(files) {
  const file=files[0];
  if(!file)return;
  prepareImage(file, (img, url)=> {
    const l= {
      id:`layer-${Date.now()}-${Math.random()}`, name:file.name||`画像 ${state.layers.length+1}`, img, url, pos: {
        x:.78-state.layers.length*.05, y:.55
      }, scale:.55, rotation:0, flipX:false
    }; state.layers.push(l); if(state.layers.length===1)repositionTemplateLayer(); state.selected=l.id; renderLayers(); draw()
  })
}
function syncPreview() {
  const isX=state.platform==='x', wrap=$('#canvasWrap');
  wrap.classList.remove('preview-design', 'preview-pc', 'preview-mobile');
  wrap.classList.add(isX?'preview-mobile':'preview-design');
  $('#previewNote').classList.toggle('hidden', !isX)
}
function templateLayerSide() {
  if(state.template==='left')return 'right';
  if(state.template==='split')return 'left';
  return null
}
function templateLayerX(l, side) {
  const bounds=state.safe?safeRect(): {
    x:0, w:canvas.width
  }, angle=Math.abs(l.rotation*Math.PI/180), size=layerSize(l), halfWidth=(Math.abs(size.w*Math.cos(angle))+Math.abs(size.h*Math.sin(angle)))/2, edge=side==='right'?bounds.x+bounds.w:bounds.x, center=side==='right'?edge-halfWidth:edge+halfWidth, minCenter=halfWidth, maxCenter=canvas.width-halfWidth;
  return (minCenter>maxCenter?canvas.width/2:clamp(center, minCenter, maxCenter))/canvas.width
}
function repositionTemplateLayer() {
  const l=state.layers[0], side=templateLayerSide();
  if(l&&side)l.pos.x=templateLayerX(l, side)
}
function applyTemplateTextEdge() {
  const bounds=state.safe?safeRect(): {
    x:canvas.width*.02, w:canvas.width*.96
  };
  if(state.template==='left') {
    state.text.pos.x=bounds.x/canvas.width;
    state.text.align='left'
  } else if(state.template==='split') {
    state.text.pos.x=(bounds.x+bounds.w)/canvas.width;
    state.text.align='right'
  }
}
all('.platform').forEach(b=>b.onclick=()=> {
  all('.platform').forEach(x=> {
    x.classList.toggle('active', x===b); x.setAttribute('aria-pressed', x===b)
  }); state.platform=b.dataset.platform; const [w, h, label]=sizes[state.platform]; canvas.width=w; canvas.height=h; $('#sizeLabel').textContent=`${label}・${w} × ${h} px`; syncPreview(); applyTemplateTextEdge(); repositionTemplateLayer(); syncText(); draw()
});
all('.template').forEach(b=>b.onclick=()=> {
  all('.template').forEach(x=>x.classList.toggle('active', x===b)); state.template=b.dataset.template; if(state.template==='center') {
    state.text.pos= {
      x:.5, y:.49
    }; state.text.align='center'
  } else if(state.template==='split') {
    state.text.pos= {
      x:.62, y:.49
    }; state.text.align='right'
  } else {
    state.text.pos= {
      x:state.platform==='x'?.225:.075, y:.5
    }; state.text.align='left'
  }
  applyTemplateTextEdge();
  repositionTemplateLayer();
  syncText(); draw()
});
$('#safeArea').onchange=e=> {
  state.safe=e.target.checked;
  applyTemplateTextEdge();
  repositionTemplateLayer();
  syncText();
  draw()
};
$('#bgColor').oninput=e=> {
  state.bg=e.target.value;
  draw()
};
$('#gradientToggle').onchange=e=> {
  state.gradient=e.target.checked;
  $('#gradientTools').classList.toggle('hidden', !state.gradient);
  draw()
};
$('#gradientColor').oninput=e=> {
  state.gradientColor=e.target.value;
  draw()
};
$('#gradientDirection').onchange=e=> {
  state.gradientDirection=e.target.value;
  draw()
};
$('#gradientBalance').oninput=e=> {
  state.gradientBalance=e.target.value/100;
  $('#gradientBalanceOut').value=e.target.value+'%';
  draw()
};
$('#bgUpload').onchange=e=> {
  const file=e.target.files[0];
  if(!file)return;
  prepareImage(file, img=> {
    state.bgImg=img; state.selected='bg'; $('#bgTools').classList.remove('hidden'); draw()
  });
  e.target.value=''
};
$('#bgScale').oninput=e=> {
  state.bgScale=e.target.value/100;
  $('#bgScaleOut').value=e.target.value+'%';
  draw()
};
$('#removeBg').onclick=()=> {
  state.bgImg=null;
  if(state.selected==='bg')state.selected=null;
  $('#bgUpload').value='';
  $('#bgTools').classList.add('hidden');
  draw()
};
$('#fgUpload').onchange=e=> {
  addFiles([...e.target.files]);
  e.target.value=''
};
$('#layerList').onclick=e=> {
  const item=e.target.closest('.layer-item');
  if(!item)return;
  state.selected=item.dataset.id;
  renderLayers();
  draw()
};
$('#fgScale').oninput=e=> {
  const l=selectedLayer();
  if(!l)return;
  l.scale=e.target.value/100;
  $('#fgScaleOut').value=e.target.value+'%';
  draw()
};
$('#rotation').oninput=e=> {
  const l=selectedLayer();
  if(!l)return;
  l.rotation=Number(e.target.value);
  $('#rotationOut').value=e.target.value+'°';
  draw()
};
$('#flipX').onclick=()=> {
  const l=selectedLayer();
  if(l) {
    l.flipX=!l.flipX;
    draw()
  }
};
function moveLayer(step) {
  const l=selectedLayer();
  if(!l)return;
  const i=state.layers.indexOf(l), n=clamp(i+step, 0, state.layers.length-1);
  state.layers.splice(i, 1);
  state.layers.splice(n, 0, l);
  renderLayers();
  draw()
}
$('#layerBack').onclick=()=>moveLayer(-1);
$('#layerFront').onclick=()=>moveLayer(1);
$('#removeFg').onclick=()=> {
  const l=selectedLayer();
  if(!l)return;
  URL.revokeObjectURL(l.url);
  state.layers=state.layers.filter(x=>x!==l);
  state.selected=state.layers.at(-1)?.id||(state.bgImg?'bg':null);
  renderLayers();
  draw()
};
function syncText() {
  $('#textAlign').value=state.text.align;
  $('#textX').value=Math.round(state.text.pos.x*100);
  $('#textY').value=Math.round(state.text.pos.y*100);
  $('#textXOut').value=Math.round(state.text.pos.x*100)+'%';
  $('#textYOut').value=Math.round(state.text.pos.y*100)+'%'
}
$('#mainText').oninput=e=> {
  state.text.main=e.target.value;
  draw()
};
$('#subText').oninput=e=> {
  state.text.sub=e.target.value;
  draw()
};
$('#textColor').oninput=e=> {
  state.text.color=e.target.value;
  draw()
};
$('#fontFamily').onchange=e=> {
  state.text.font=e.target.value;
  draw()
};
$('#textAlign').onchange=e=> {
  state.text.align=e.target.value;
  draw()
};
$('#fontWeight').onchange=e=> {
  state.text.weight=Number(e.target.value);
  draw()
};
$('#mainSize').oninput=e=> {
  state.text.mainSize=e.target.value/100;
  $('#mainSizeOut').value=e.target.value+'%';
  draw()
};
$('#subSize').oninput=e=> {
  state.text.subSize=e.target.value/100;
  $('#subSizeOut').value=e.target.value+'%';
  draw()
};
function textRange(id, key, out, suffix='') {
  $(id).oninput=e=> {
    state.text[key]=Number(e.target.value);
    $(out).value=e.target.value+suffix;
    draw()
  }
}
textRange('#textGap', 'gap', '#textGapOut');
textRange('#letterSpacing', 'spacing', '#letterSpacingOut');
textRange('#strokeWidth', 'strokeWidth', '#strokeWidthOut');
textRange('#shadowBlur', 'shadowBlur', '#shadowBlurOut');
$('#strokeColor').oninput=e=> {
  state.text.strokeColor=e.target.value;
  draw()
};
$('#shadowColor').oninput=e=> {
  state.text.shadowColor=e.target.value;
  draw()
};
$('#textX').oninput=e=> {
  state.text.pos.x=e.target.value/100;
  $('#textXOut').value=e.target.value+'%';
  draw()
};
$('#textY').oninput=e=> {
  state.text.pos.y=e.target.value/100;
  $('#textYOut').value=e.target.value+'%';
  draw()
};
const pointers=new Map();
let dragBase=null, pinchBase=null;
function point(e) {
  const r=canvas.getBoundingClientRect();
  return {
    x:(e.clientX-r.left)/r.width, y:(e.clientY-r.top)/r.height, px:e.clientX, py:e.clientY
  }
}
function hitLayer(l, p) {
  const {
    w, h
  }
  =layerSize(l), dx=p.x*canvas.width-l.pos.x*canvas.width, dy=p.y*canvas.height-l.pos.y*canvas.height, a=-l.rotation*Math.PI/180, rx=dx*Math.cos(a)-dy*Math.sin(a), ry=dx*Math.sin(a)+dy*Math.cos(a), pad=canvas.width*.012;
  return Math.abs(rx)<=w/2+pad&&Math.abs(ry)<=h/2+pad
}
function pick(p) {
  for(let i=state.layers.length-1; i>=0; i--)if(hitLayer(state.layers[i], p))return state.layers[i].id;
  return state.bgImg?'bg':null
}
const distance=(a, b)=>Math.hypot(a.px-b.px, a.py-b.py), angle=(a, b)=>Math.atan2(b.py-a.py, b.px-a.px)*180/Math.PI;
function pointerDown(e) {
  e.preventDefault();
  canvas.setPointerCapture?.(e.pointerId);
  const p=point(e);
  if(!pointers.size) {
    state.selected=pick(p);
    const l=selectedLayer(), pos=l?l.pos:state.selected==='bg'?state.bgPos:null;
    if(pos)dragBase= {
      pointer:p, pos: {
        ...pos
      }
    };
    renderLayers()
  }
  pointers.set(e.pointerId, p);
  if(pointers.size===2&&state.selected) {
    const [a, b]=[...pointers.values()], l=selectedLayer();
    pinchBase= {
      distance:distance(a, b), angle:angle(a, b), scale:l?l.scale:state.bgScale, rotation:l?l.rotation:0
    };
    dragBase=null
  }
  canvas.classList.add('dragging');
  draw()
}
function pointerMove(e) {
  if(!pointers.has(e.pointerId))return;
  e.preventDefault();
  const p=point(e);
  pointers.set(e.pointerId, p);
  const l=selectedLayer();
  if(pointers.size===2&&pinchBase&&state.selected) {
    const [a, b]=[...pointers.values()], ratio=distance(a, b)/Math.max(1, pinchBase.distance);
    if(l) {
      l.scale=clamp(pinchBase.scale*ratio, .1, 2);
      l.rotation=clamp(pinchBase.rotation+angle(a, b)-pinchBase.angle, -180, 180);
      syncLayerTools()
    } else {
      state.bgScale=clamp(pinchBase.scale*ratio, 1, 2.5);
      $('#bgScale').value=Math.round(state.bgScale*100);
      $('#bgScaleOut').value=Math.round(state.bgScale*100)+'%'
    }
    draw()
  } else if(pointers.size===1&&dragBase&&state.selected) {
    const target=l|| {
      pos:state.bgPos
    }, next= {
      x:clamp(dragBase.pos.x+p.x-dragBase.pointer.x, -.5, 1.5), y:clamp(dragBase.pos.y+p.y-dragBase.pointer.y, -.5, 1.5)
    };
    state.snap= {
      x:Math.abs(next.x-.5)<.025, y:Math.abs(next.y-.5)<.025
    };
    if(state.snap.x)next.x=.5;
    if(state.snap.y)next.y=.5;
    target.pos.x=next.x;
    target.pos.y=next.y;
    draw()
  }
}
function pointerEnd(e) {
  pointers.delete(e.pointerId);
  pinchBase=null;
  state.snap= {
    x:false, y:false
  };
  if(pointers.size===1&&state.selected) {
    const p=[...pointers.values()][0], l=selectedLayer(), pos=l?l.pos:state.bgPos;
    dragBase= {
      pointer:p, pos: {
        ...pos
      }
    }
  } else dragBase=null;
  if(!pointers.size)canvas.classList.remove('dragging');
  draw()
}
canvas.addEventListener('pointerdown', pointerDown, {
  passive:false
});
canvas.addEventListener('pointermove', pointerMove, {
  passive:false
});
canvas.addEventListener('pointerup', pointerEnd);
canvas.addEventListener('pointercancel', pointerEnd);
let resultUrl=null, resultFile=null;
function showSaveDialog(blob) {
  if(resultUrl)URL.revokeObjectURL(resultUrl);
  resultUrl=URL.createObjectURL(blob);
  const filename=`header-${state.platform}.png`;
  resultFile=new File([blob], filename, {
    type:'image/png'
  });
  $('#resultImage').src=resultUrl;
  $('#saveImage').href=resultUrl;
  $('#saveImage').download=filename;
  $('#shareImage').hidden=!(navigator.share&&navigator.canShare&&navigator.canShare( {
    files:[resultFile]
  }));
  $('#saveDialog').showModal()
}
$('#download').onclick=()=> {
  draw(false);
  canvas.toBlob(blob=> {
    draw(true); if(blob)showSaveDialog(blob); else alert('画像を作成できませんでした。もう一度お試しください。')
  }, 'image/png')
};
$('#shareImage').onclick=async()=> {
  if(!resultFile)return;
  try {
    await navigator.share( {
      files:[resultFile], title:'作成したヘッダー画像'
    })
  }
  catch(e) {
    if(e.name!=='AbortError')alert('共有できませんでした。画像を長押しして保存してください。')
  }
};
$('#closeDialog').onclick=()=>$('#saveDialog').close();
$('#saveDialog').addEventListener('click', e=> {
  if(e.target===$('#saveDialog'))$('#saveDialog').close()
});
syncText();
renderLayers();
syncPreview();
draw();
