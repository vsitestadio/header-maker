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
const backgroundRemovalModule='https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';
let backgroundRemovalLoader=null;
let cutoutBusy=false;
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
  $('#rotationOut').value=Math.round(l.rotation)+'°';
  $('#refineCutout').classList.toggle('hidden', !l.cutout);
  $('#restoreBackground').classList.toggle('hidden', !l.cutout);
  $('#removeBackgroundAI').textContent=l.cutout?'高精度でやり直す':'高精度AIで背景を削除';
  $('#removeBackgroundAI').disabled=cutoutBusy;
  $('#refineCutout').disabled=cutoutBusy;
  $('#restoreBackground').disabled=cutoutBusy;
  if(!cutoutBusy) {
    setCutoutStatus(
      l.cutout?'背景が残ったら「細かく修正」でなぞって消せます':'人物・キャラクター画像におすすめです',
      l.cutout?'success':''
    )
  }
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
function makeThumbnail(source) {
  const width=source.naturalWidth||source.width;
  const height=source.naturalHeight||source.height;
  const rate=Math.min(1, 120/Math.max(width, height));
  const thumb=document.createElement('canvas');
  thumb.width=Math.max(1, Math.round(width*rate));
  thumb.height=Math.max(1, Math.round(height*rate));
  thumb.getContext('2d').drawImage(source, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL('image/png')
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
        const max=2400, rate=Math.min(1, max/Math.max(source.naturalWidth, source.naturalHeight)), work=document.createElement('canvas');
        work.width=Math.max(1, Math.round(source.naturalWidth*rate));
        work.height=Math.max(1, Math.round(source.naturalHeight*rate));
        work.getContext('2d').drawImage(source, 0, 0, work.width, work.height);
        const thumb=makeThumbnail(work);
        URL.revokeObjectURL(sourceUrl);
        onReady(work, thumb);
        setUploadStatus('画像を追加しました。続けて別の画像も追加できます')
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
      }, scale:.55, rotation:0, flipX:false, originalImg:img, originalUrl:url, cutout:false
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
function setCutoutStatus(message, type='') {
  $('#cutoutStatus').textContent=message;
  $('#cutoutStatus').className='cutout-status'+(type?' '+type:'')
}
function setCutoutBusy(busy) {
  cutoutBusy=busy;
  $('#layerTools').setAttribute('aria-busy', String(busy));
  $('#removeBackgroundAI').disabled=busy;
  $('#refineCutout').disabled=busy;
  $('#restoreBackground').disabled=busy
}
function makeProcessingCanvas(source) {
  const sourceWidth=source.naturalWidth||source.width;
  const sourceHeight=source.naturalHeight||source.height;
  const mobile=window.matchMedia('(max-width: 700px)').matches;
  const maxSide=mobile?1600:2200;
  const rate=Math.min(1, maxSide/Math.max(sourceWidth, sourceHeight));
  const work=document.createElement('canvas');
  work.width=Math.max(1, Math.round(sourceWidth*rate));
  work.height=Math.max(1, Math.round(sourceHeight*rate));
  work.getContext('2d').drawImage(source, 0, 0, work.width, work.height);
  return work
}
function canvasToBlob(source) {
  return new Promise((resolve, reject)=> {
    source.toBlob(blob=> {
      if(blob)resolve(blob);
      else reject(new Error('画像を変換できませんでした'))
    }, 'image/png')
  })
}
function blobToCanvas(blob) {
  return new Promise((resolve, reject)=> {
    const image=new Image();
    const objectUrl=URL.createObjectURL(blob);
    image.onload=()=> {
      try {
        const result=document.createElement('canvas');
        result.width=image.naturalWidth;
        result.height=image.naturalHeight;
        result.getContext('2d').drawImage(image, 0, 0);
        URL.revokeObjectURL(objectUrl);
        resolve(result)
      }
      catch(error) {
        URL.revokeObjectURL(objectUrl);
        reject(error)
      }
    };
    image.onerror=()=> {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('切り抜き画像を読み込めませんでした'))
    };
    image.src=objectUrl
  })
}
async function getBackgroundRemoval() {
  if(!backgroundRemovalLoader) {
    backgroundRemovalLoader=import(backgroundRemovalModule)
      .then(module=> {
        const removeBackground=module.removeBackground||module.default;
        if(typeof removeBackground!=='function')throw new Error('AI切り抜きを読み込めませんでした');
        return removeBackground
      })
      .catch(error=> {
        backgroundRemovalLoader=null;
        throw error
      })
  }
  return backgroundRemovalLoader
}
function updateCutoutProgress(key, current, total) {
  const progress=$('#cutoutProgress');
  const value=total>0?clamp(Math.round(current/total*100), 0, 100):null;
  const preparing=String(key).toLowerCase().includes('fetch');
  progress.classList.remove('hidden');
  if(value===null)progress.removeAttribute('value');
  else progress.value=value;
  setCutoutStatus(
    `${preparing?'AIを準備中':'被写体を切り抜き中'}${value===null?'…':`… ${value}%`}`,
    'loading'
  )
}
async function removeSelectedLayerBackground() {
  const layer=selectedLayer();
  if(!layer||cutoutBusy)return;
  const layerId=layer.id;
  const progress=$('#cutoutProgress');
  let completion=null;
  setCutoutBusy(true);
  progress.classList.remove('hidden');
  progress.removeAttribute('value');
  setCutoutStatus('高精度AIを準備しています。初回のみ少し時間がかかります…', 'loading');
  try {
    const processingCanvas=makeProcessingCanvas(layer.originalImg||layer.img);
    const [removeBackground, inputBlob]=await Promise.all([
      getBackgroundRemoval(),
      canvasToBlob(processingCanvas)
    ]);
    const resultBlob=await removeBackground(inputBlob, {
      model:'isnet_fp16',
      progress:updateCutoutProgress
    });
    progress.value=100;
    setCutoutStatus('透明な画像に仕上げています…', 'loading');
    const resultCanvas=await blobToCanvas(resultBlob);
    const target=state.layers.find(item=>item.id===layerId);
    if(!target)return;
    target.img=resultCanvas;
    target.url=makeThumbnail(resultCanvas);
    target.cutout=true;
    target.cutoutSource=processingCanvas;
    renderLayers();
    draw();
    completion={message:'背景を削除しました', type:'success'}
  }
  catch(error) {
    console.error('Background removal failed:', error);
    completion={message:'切り抜きに失敗しました。通信環境を確認して、もう一度お試しください', type:'error'}
  }
  finally {
    setCutoutBusy(false);
    progress.classList.add('hidden');
    progress.value=0;
    syncLayerTools();
    if(completion)setCutoutStatus(completion.message, completion.type)
  }
}
$('#removeBackgroundAI').onclick=removeSelectedLayerBackground;
$('#restoreBackground').onclick=()=> {
  const layer=selectedLayer();
  if(!layer||!layer.cutout||cutoutBusy)return;
  layer.img=layer.originalImg;
  layer.url=layer.originalUrl;
  layer.cutout=false;
  layer.cutoutSource=null;
  renderLayers();
  draw();
  setCutoutStatus('元画像に戻しました', 'success')
};
const refineCanvas=$('#refineCanvas');
const refineContext=refineCanvas.getContext('2d');
const restoreBrushCanvas=document.createElement('canvas');
const refineState= {
  layerId:null,
  source:null,
  previous:null,
  next:null,
  drawing:false,
  mode:'erase',
  lastPoint:null,
  fitScale:1
};
function cloneCanvas(source) {
  const copy=document.createElement('canvas');
  copy.width=source.width;
  copy.height=source.height;
  copy.getContext('2d').drawImage(source, 0, 0);
  return copy
}
function setRefineMode(mode) {
  refineState.mode=mode;
  const erase=mode==='erase';
  $('#eraseMode').classList.toggle('active', erase);
  $('#restoreMode').classList.toggle('active', !erase);
  $('#eraseMode').setAttribute('aria-pressed', String(erase));
  $('#restoreMode').setAttribute('aria-pressed', String(!erase))
}
function syncRefineHistoryButtons() {
  $('#undoRefine').disabled=!refineState.previous;
  $('#redoRefine').disabled=!refineState.next
}
function sizeRefineCanvas() {
  if(!refineCanvas.width)return;
  const stage=$('#refineStage');
  const availableWidth=Math.max(120, stage.clientWidth-32);
  const zoom=Number($('#refineZoom').value)/100;
  refineState.fitScale=Math.min(1, availableWidth/refineCanvas.width);
  refineCanvas.style.width=Math.round(refineCanvas.width*refineState.fitScale*zoom)+'px';
  refineCanvas.style.height='auto'
}
function sourceForRefine(layer) {
  if(
    layer.cutoutSource&&
    layer.cutoutSource.width===layer.img.width&&
    layer.cutoutSource.height===layer.img.height
  )return layer.cutoutSource;
  const source=document.createElement('canvas');
  source.width=layer.img.width;
  source.height=layer.img.height;
  source.getContext('2d').drawImage(layer.originalImg, 0, 0, source.width, source.height);
  return source
}
function openRefineEditor() {
  const layer=selectedLayer();
  if(!layer||!layer.cutout)return;
  refineState.layerId=layer.id;
  refineState.source=sourceForRefine(layer);
  refineState.previous=null;
  refineState.next=null;
  refineState.drawing=false;
  refineState.lastPoint=null;
  refineCanvas.width=layer.img.width;
  refineCanvas.height=layer.img.height;
  refineContext.clearRect(0, 0, refineCanvas.width, refineCanvas.height);
  refineContext.drawImage(layer.img, 0, 0);
  syncRefineHistoryButtons();
  $('#refineZoom').value=100;
  $('#refineZoomOut').value='100%';
  setRefineMode('erase');
  $('#refineDialog').showModal();
  requestAnimationFrame(()=> {
    sizeRefineCanvas();
    $('#refineStage').scrollTo(0, 0)
  })
}
function refinePoint(event) {
  const rect=refineCanvas.getBoundingClientRect();
  return {
    x:(event.clientX-rect.left)/rect.width*refineCanvas.width,
    y:(event.clientY-rect.top)/rect.height*refineCanvas.height
  }
}
function paintEraseStamp(x, y, radius) {
  refineContext.save();
  refineContext.globalCompositeOperation='destination-out';
  const gradient=refineContext.createRadialGradient(x, y, radius*.72, x, y, radius);
  gradient.addColorStop(0, 'rgba(0,0,0,1)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  refineContext.fillStyle=gradient;
  refineContext.beginPath();
  refineContext.arc(x, y, radius, 0, Math.PI*2);
  refineContext.fill();
  refineContext.restore()
}
function paintRestoreStamp(x, y, radius) {
  const size=Math.max(2, Math.ceil(radius*2));
  const center=size/2;
  restoreBrushCanvas.width=size;
  restoreBrushCanvas.height=size;
  const brushContext=restoreBrushCanvas.getContext('2d');
  brushContext.drawImage(refineState.source, center-x, center-y);
  brushContext.globalCompositeOperation='destination-in';
  const gradient=brushContext.createRadialGradient(center, center, radius*.72, center, center, radius);
  gradient.addColorStop(0, 'rgba(0,0,0,1)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  brushContext.fillStyle=gradient;
  brushContext.fillRect(0, 0, size, size);
  refineContext.save();
  refineContext.globalCompositeOperation='source-over';
  refineContext.drawImage(restoreBrushCanvas, x-center, y-center);
  refineContext.restore()
}
function paintRefineSegment(from, to) {
  const radius=Number($('#brushSize').value)/2;
  const distance=Math.hypot(to.x-from.x, to.y-from.y);
  const steps=Math.max(1, Math.ceil(distance/Math.max(2, radius*.28)));
  for(let index=1; index<=steps; index++) {
    const progress=index/steps;
    const x=from.x+(to.x-from.x)*progress;
    const y=from.y+(to.y-from.y)*progress;
    if(refineState.mode==='restore')paintRestoreStamp(x, y, radius);
    else paintEraseStamp(x, y, radius)
  }
}
function startRefineStroke(event) {
  if(refineState.drawing)return;
  event.preventDefault();
  refineState.previous=cloneCanvas(refineCanvas);
  refineState.next=null;
  syncRefineHistoryButtons();
  refineState.drawing=true;
  refineCanvas.setPointerCapture?.(event.pointerId);
  refineState.lastPoint=refinePoint(event);
  paintRefineSegment(refineState.lastPoint, refineState.lastPoint)
}
function moveRefineStroke(event) {
  if(!refineState.drawing)return;
  event.preventDefault();
  const point=refinePoint(event);
  paintRefineSegment(refineState.lastPoint, point);
  refineState.lastPoint=point
}
function endRefineStroke(event) {
  if(!refineState.drawing)return;
  event.preventDefault();
  refineState.drawing=false;
  refineState.lastPoint=null
}
function closeRefineEditor() {
  $('#refineDialog').close()
}
$('#refineCutout').onclick=openRefineEditor;
$('#eraseMode').onclick=()=>setRefineMode('erase');
$('#restoreMode').onclick=()=>setRefineMode('restore');
$('#brushSize').oninput=event=> {
  $('#brushSizeOut').value=event.target.value
};
$('#refineZoom').oninput=event=> {
  $('#refineZoomOut').value=event.target.value+'%';
  sizeRefineCanvas()
};
$('#undoRefine').onclick=()=> {
  if(!refineState.previous)return;
  refineState.next=cloneCanvas(refineCanvas);
  refineContext.clearRect(0, 0, refineCanvas.width, refineCanvas.height);
  refineContext.drawImage(refineState.previous, 0, 0);
  refineState.previous=null;
  syncRefineHistoryButtons()
};
$('#redoRefine').onclick=()=> {
  if(!refineState.next)return;
  refineState.previous=cloneCanvas(refineCanvas);
  refineContext.clearRect(0, 0, refineCanvas.width, refineCanvas.height);
  refineContext.drawImage(refineState.next, 0, 0);
  refineState.next=null;
  syncRefineHistoryButtons()
};
$('#applyRefine').onclick=()=> {
  const layer=state.layers.find(item=>item.id===refineState.layerId);
  if(!layer)return closeRefineEditor();
  layer.img=cloneCanvas(refineCanvas);
  layer.url=makeThumbnail(layer.img);
  layer.cutout=true;
  closeRefineEditor();
  renderLayers();
  draw();
  setCutoutStatus('細かい修正を反映しました', 'success')
};
$('#closeRefine').onclick=closeRefineEditor;
$('#cancelRefine').onclick=closeRefineEditor;
$('#refineDialog').addEventListener('close', ()=> {
  refineState.layerId=null;
  refineState.source=null;
  refineState.previous=null;
  refineState.next=null;
  refineState.drawing=false;
  refineState.lastPoint=null
});
$('#refineDialog').addEventListener('click', event=> {
  if(event.target===$('#refineDialog'))closeRefineEditor()
});
refineCanvas.addEventListener('pointerdown', startRefineStroke, {passive:false});
refineCanvas.addEventListener('pointermove', moveRefineStroke, {passive:false});
refineCanvas.addEventListener('pointerup', endRefineStroke, {passive:false});
refineCanvas.addEventListener('pointercancel', endRefineStroke, {passive:false});
window.addEventListener('resize', ()=> {
  if($('#refineDialog').open)sizeRefineCanvas()
});
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
const xShareText='ヘッダーメーカーでオリジナルヘッダーを作りました！\n\n@VsiteStadio #ヘッダー作成 #Xヘッダー';
function canShareResultFile() {
  return Boolean(
    resultFile&&
    navigator.share&&
    navigator.canShare&&
    navigator.canShare({
      files:[resultFile]
    })
  )
}
function xIntentUrl() {
  const pageUrl=location.protocol==='file:'?'':location.href;
  const text=[xShareText, pageUrl].filter(Boolean).join('\n\n');
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`
}
function showXFallback() {
  $('#shareFallbackNote').classList.remove('hidden');
  $('#openXPost').href=xIntentUrl();
  $('#openXPost').classList.remove('hidden')
}
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
  const canShareFile=canShareResultFile();
  $('#shareImage').hidden=!canShareFile;
  $('#shareX').innerHTML=canShareFile?'<span aria-hidden="true">𝕏</span> 画像付きでXにシェア':'<span aria-hidden="true">𝕏</span> Xの投稿画面を開く';
  $('#shareFallbackNote').classList.toggle('hidden', canShareFile);
  $('#openXPost').classList.add('hidden');
  $('#openXPost').href=xIntentUrl();
  $('#saveDialog').showModal()
}
$('#download').onclick=()=> {
  draw(false);
  canvas.toBlob(blob=> {
    draw(true); if(blob)showSaveDialog(blob); else alert('画像を作成できませんでした。もう一度お試しください。')
  }, 'image/png')
};
async function shareResultImage() {
  if(!resultFile)return;
  try {
    await navigator.share( {
      files:[resultFile],
      title:'作成したヘッダー画像',
      text:xShareText
    })
  }
  catch(e) {
    if(e.name!=='AbortError')showXFallback()
  }
}
$('#shareX').onclick=()=> {
  if(canShareResultFile()) {
    shareResultImage();
    return
  }
  showXFallback();
  window.open(xIntentUrl(), '_blank', 'noopener,noreferrer')
};
$('#shareImage').onclick=shareResultImage;
$('#closeDialog').onclick=()=>$('#saveDialog').close();
$('#saveDialog').addEventListener('click', e=> {
  if(e.target===$('#saveDialog'))$('#saveDialog').close()
});
syncText();
renderLayers();
syncPreview();
draw();
