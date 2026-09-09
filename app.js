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
const transformersModule='https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';
const animeCutoutModel='BritishWerewolf/IS-Net-Anime';
let backgroundRemovalLoader=null;
let animeBackgroundRemovalLoader=null;
let animeBackgroundRemovalDevice=null;
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
  const anime=selectedCutoutMode()==='anime';
  $('#removeBackgroundAI').textContent=l.cutout
    ?(anime?'全身を優先して切り抜き直す':'写真向けAIでやり直す')
    :(anime?'全身を優先して切り抜く':'写真・人物を切り抜く');
  $('#removeBackgroundAI').disabled=cutoutBusy;
  $('#refineCutout').disabled=cutoutBusy;
  $('#restoreBackground').disabled=cutoutBusy;
  if(!cutoutBusy) {
    setCutoutStatus(
      l.cutout
        ?'髪・服・体が消えたら「消えた部分を精密補正」で元画像から戻せます'
        :(anime
          ?(selectedCutoutRetention()==='body'
            ?'服や体を広めに残します。背景が残った部分だけ精密補正で消せます'
            :'背景を優先してすっきり切り抜きます')
          :'写真や人物画像におすすめです'),
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
function selectedCutoutMode() {
  return document.querySelector('input[name="cutoutMode"]:checked')?.value||'anime'
}
function selectedCutoutRetention() {
  return document.querySelector('input[name="cutoutRetention"]:checked')?.value||'body'
}
function syncCutoutRetention() {
  all('.cutout-retention-option').forEach(label=> {
    label.classList.toggle('active', label.querySelector('input').checked)
  });
  if(selectedCutoutMode()==='anime'&&!cutoutBusy) {
    setCutoutStatus(
      selectedCutoutRetention()==='body'
        ?'服や体を広めに残します。背景が残った部分だけ精密補正で消せます'
        :'背景を優先してすっきり切り抜きます。消えた部分は精密補正で戻せます'
    )
  }
}
function syncCutoutMode() {
  const anime=selectedCutoutMode()==='anime';
  all('.cutout-model').forEach(label=> {
    label.classList.toggle('active', label.querySelector('input').checked)
  });
  $('#animeRetention').classList.toggle('hidden', !anime);
  $('#cutoutModeNote').textContent=anime
    ?'全身優先では髪・服・体を広めに残します。処理に失敗した場合は、端末に合う互換モードで自動的にもう一度試します。'
    :'軽くて速い写真向けAIです。髪や服が消えた場合は精密補正で戻せます。';
  syncLayerTools();
  if(anime)syncCutoutRetention()
}
function setCutoutBusy(busy) {
  cutoutBusy=busy;
  $('#layerTools').setAttribute('aria-busy', String(busy));
  $('#removeBackgroundAI').disabled=busy;
  $('#refineCutout').disabled=busy;
  $('#restoreBackground').disabled=busy;
  all('input[name="cutoutMode"]').forEach(input=> {
    input.disabled=busy
  });
  all('input[name="cutoutRetention"]').forEach(input=> {
    input.disabled=busy
  })
}
function makeProcessingCanvas(source, mode='photo') {
  const sourceWidth=source.naturalWidth||source.width;
  const sourceHeight=source.naturalHeight||source.height;
  const mobile=window.matchMedia('(max-width: 700px)').matches;
  const maxSide=mode==='anime'
    ?(mobile?1200:1400)
    :(mobile?1600:2200);
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
function cutoutAtSourceResolution(cutout, source) {
  const width=source.naturalWidth||source.width;
  const height=source.naturalHeight||source.height;
  if(cutout.width===width&&cutout.height===height)return cutout;
  const mask=document.createElement('canvas');
  mask.width=width;
  mask.height=height;
  mask.getContext('2d').drawImage(cutout, 0, 0, width, height);
  const result=document.createElement('canvas');
  result.width=width;
  result.height=height;
  const resultContext=result.getContext('2d');
  resultContext.drawImage(source, 0, 0, width, height);
  resultContext.globalCompositeOperation='destination-in';
  resultContext.drawImage(mask, 0, 0);
  resultContext.globalCompositeOperation='source-over';
  return result
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
function updateAnimeCutoutProgress(event) {
  if(!event)return;
  const progress=$('#cutoutProgress');
  const value=Number.isFinite(event.progress)
    ?clamp(Math.round(event.progress), 0, 100)
    :(event.total>0?clamp(Math.round(event.loaded/event.total*100), 0, 100):null);
  if(event.status==='progress'||event.status==='download'||event.status==='initiate') {
    progress.classList.remove('hidden');
    if(value===null)progress.removeAttribute('value');
    else progress.value=value;
    setCutoutStatus(`イラスト精密AIを読み込み中${value===null?'…':`… ${value}%`}`, 'loading')
  }
}
async function createAnimeBackgroundRemoval(forceCompatible=false) {
  const module=await import(transformersModule);
  if(
    typeof module.AutoModel?.from_pretrained!=='function'||
    typeof module.RawImage?.read!=='function'||
    typeof module.Tensor!=='function'
  ) {
    throw new Error('イラスト精密AIを読み込めませんでした')
  }
  if(!self.crossOriginIsolated&&module.env?.backends?.onnx?.wasm) {
    module.env.backends.onnx.wasm.numThreads=1
  }
  const loadRuntime=async device=> {
    const options= {
      dtype:'fp32',
      progress_callback:updateAnimeCutoutProgress
    };
    if(device==='webgpu')options.device='webgpu';
    const model=await module.AutoModel.from_pretrained(animeCutoutModel, options);
    return {
      model,
      RawImage:module.RawImage,
      Tensor:module.Tensor,
      device
    }
  };
  if(!forceCompatible&&navigator.gpu) {
    try {
      const runtime=await loadRuntime('webgpu');
      animeBackgroundRemovalDevice='webgpu';
      return runtime
    }
    catch(error) {
      console.warn('WebGPU cutout unavailable. Falling back to WASM.', error)
    }
  }
  const runtime=await loadRuntime('wasm');
  animeBackgroundRemovalDevice='wasm';
  return runtime
}
async function getAnimeBackgroundRemoval(forceCompatible=false) {
  if(!animeBackgroundRemovalLoader) {
    animeBackgroundRemovalLoader=createAnimeBackgroundRemoval(forceCompatible).catch(error=> {
      animeBackgroundRemovalLoader=null;
      animeBackgroundRemovalDevice=null;
      throw error
    })
  }
  return animeBackgroundRemovalLoader
}
async function disposeAnimeBackgroundRemoval(runtime) {
  try {
    if(typeof runtime?.model?.dispose==='function')await runtime.model.dispose()
  }
  catch(error) {
    console.warn('Could not release the precision cutout model.', error)
  }
  finally {
    animeBackgroundRemovalLoader=null;
    animeBackgroundRemovalDevice=null
  }
}
async function releaseAnimeBackgroundRemoval(runtime) {
  if(!window.matchMedia('(max-width: 700px)').matches)return;
  await disposeAnimeBackgroundRemoval(runtime)
}
function bodySafeAlpha(value) {
  if(value<=2)return 0;
  const confidence=clamp((value-2)/46, 0, 1);
  const eased=confidence*confidence*(3-2*confidence);
  return Math.max(value, Math.round(eased*255))
}
function cropMaskPadding(alphaCanvas, crop) {
  const left=clamp(
    Math.round(Number(crop?.x)||0),
    0,
    alphaCanvas.width-1
  );
  const top=clamp(
    Math.round(Number(crop?.y)||0),
    0,
    alphaCanvas.height-1
  );
  const height=clamp(
    Math.round(Number(crop?.h)||alphaCanvas.height),
    1,
    alphaCanvas.height-top
  );
  const width=clamp(
    Math.round(Number(crop?.w)||alphaCanvas.width),
    1,
    alphaCanvas.width-left
  );
  if(
    left===0&&
    top===0&&
    width===alphaCanvas.width&&
    height===alphaCanvas.height
  )return alphaCanvas;
  const cropped=document.createElement('canvas');
  cropped.width=width;
  cropped.height=height;
  cropped.getContext('2d').drawImage(
    alphaCanvas,
    left,
    top,
    width,
    height,
    0,
    0,
    width,
    height
  );
  return cropped
}
function maskToAlphaCanvas(mask, retainBody=false, crop=null) {
  const dimensions=Array.from(mask?.dims||[]);
  const width=Number(mask?.width||dimensions.at(-1));
  const height=Number(mask?.height||dimensions.at(-2));
  if(!width||!height)throw new Error('イラスト精密AIのマスクサイズを取得できませんでした');
  const alphaCanvas=document.createElement('canvas');
  alphaCanvas.width=width;
  alphaCanvas.height=height;
  const alphaContext=alphaCanvas.getContext('2d');
  const alphaImage=alphaContext.createImageData(width, height);
  const sourceData=mask.data;
  if(sourceData&&sourceData.length>=width*height) {
    const channels=Math.max(1, Math.round(sourceData.length/(width*height)));
    let minimum=Infinity;
    let maximum=-Infinity;
    for(let index=0; index<sourceData.length; index+=channels) {
      const value=Number(sourceData[index]);
      if(!Number.isFinite(value))continue;
      minimum=Math.min(minimum, value);
      maximum=Math.max(maximum, value)
    }
    const range=maximum-minimum;
    if(!Number.isFinite(range)||range<=Number.EPSILON) {
      throw new Error('イラスト精密AIが被写体を検出できませんでした')
    }
    for(let pixel=0; pixel<width*height; pixel++) {
      const sourceIndex=pixel*channels;
      let value;
      if(channels===1) {
        value=sourceData[sourceIndex]
      } else {
        const red=Number(sourceData[sourceIndex])||0;
        const green=Number(sourceData[sourceIndex+1])||red;
        const blue=Number(sourceData[sourceIndex+2])||red;
        const suppliedAlpha=channels>=4?Number(sourceData[sourceIndex+3]):255;
        value=suppliedAlpha<255?suppliedAlpha:(red+green+blue)/3
      }
      const rawAlpha=clamp(
        Math.round(((Number(value)-minimum)/range)*255),
        0,
        255
      );
      const alpha=retainBody?bodySafeAlpha(rawAlpha):rawAlpha;
      const targetIndex=pixel*4;
      alphaImage.data[targetIndex]=255;
      alphaImage.data[targetIndex+1]=255;
      alphaImage.data[targetIndex+2]=255;
      alphaImage.data[targetIndex+3]=alpha
    }
    alphaContext.putImageData(alphaImage, 0, 0);
    return cropMaskPadding(alphaCanvas, crop)
  }
  if(typeof mask.toCanvas!=='function')throw new Error('イラスト精密AIのマスクを画像に変換できませんでした');
  const maskCanvas=mask.toCanvas();
  alphaContext.drawImage(maskCanvas, 0, 0, width, height);
  const pixels=alphaContext.getImageData(0, 0, width, height);
  for(let index=0; index<pixels.data.length; index+=4) {
    const suppliedAlpha=pixels.data[index+3];
    const luminance=Math.round((pixels.data[index]+pixels.data[index+1]+pixels.data[index+2])/3);
    pixels.data[index]=255;
    pixels.data[index+1]=255;
    pixels.data[index+2]=255;
    const rawAlpha=suppliedAlpha<255?suppliedAlpha:luminance;
    pixels.data[index+3]=retainBody?bodySafeAlpha(rawAlpha):rawAlpha
  }
  alphaContext.putImageData(pixels, 0, 0);
  return cropMaskPadding(alphaCanvas, crop)
}
function applySegmentationMask(source, segmentation, retainBody=false) {
  const alpha=maskToAlphaCanvas(
    segmentation.mask,
    retainBody,
    segmentation.crop
  );
  const result=document.createElement('canvas');
  result.width=source.width;
  result.height=source.height;
  const resultContext=result.getContext('2d');
  resultContext.drawImage(source, 0, 0);
  resultContext.globalCompositeOperation='destination-in';
  resultContext.imageSmoothingEnabled=true;
  resultContext.imageSmoothingQuality='high';
  resultContext.drawImage(alpha, 0, 0, result.width, result.height);
  resultContext.globalCompositeOperation='source-over';
  return result
}
async function prepareAnimeInput(runtime, image) {
  const inputSize=1024;
  const rgb=image.rgb();
  const scale=inputSize/Math.max(rgb.width, rgb.height);
  const width=Math.max(1, Math.round(rgb.width*scale));
  const height=Math.max(1, Math.round(rgb.height*scale));
  const resized=await rgb.resize(width, height, {resample:2});
  const left=Math.floor((inputSize-width)/2);
  const top=Math.floor((inputSize-height)/2);
  const planeSize=inputSize*inputSize;
  const tensorData=new Float32Array(planeSize*3);
  const pixels=resized.data;
  const channels=resized.channels;
  for(let y=0; y<height; y++) {
    for(let x=0; x<width; x++) {
      const sourceIndex=(y*width+x)*channels;
      const targetIndex=(y+top)*inputSize+x+left;
      tensorData[targetIndex]=pixels[sourceIndex]/255-.485;
      tensorData[planeSize+targetIndex]=pixels[sourceIndex+1]/255-.456;
      tensorData[planeSize*2+targetIndex]=pixels[sourceIndex+2]/255-.406
    }
  }
  return {
    pixelValues:new runtime.Tensor(
      'float32',
      tensorData,
      [1, 3, inputSize, inputSize]
    ),
    crop: {
      x:left,
      y:top,
      w:width,
      h:height
    }
  }
}
async function requestAnimeMask(runtime, objectUrl) {
  const image=await runtime.RawImage.read(objectUrl);
  const prepared=await prepareAnimeInput(runtime, image);
  let output;
  try {
    output=await runtime.model({
      img:prepared.pixelValues
    })
  }
  finally {
    if(typeof prepared.pixelValues.dispose==='function') {
      prepared.pixelValues.dispose()
    }
  }
  const mask=output?.mask;
  if(!mask)throw new Error('イラスト精密AIの結果を取得できませんでした');
  return {
    mask,
    crop:prepared.crop
  }
}
async function runAnimeCutout(processingCanvas) {
  const retainBody=selectedCutoutRetention()==='body';
  const inputBlob=await canvasToBlob(processingCanvas);
  const objectUrl=URL.createObjectURL(inputBlob);
  let runtime=null;
  try {
    runtime=await getAnimeBackgroundRemoval();
    setCutoutStatus(
      retainBody
        ?'服や体を消しすぎないよう、全身を広めに判定しています…'
        :'背景を優先して輪郭を精密に判定しています…',
      'loading'
    );
    let segmentation;
    try {
      segmentation=await requestAnimeMask(runtime, objectUrl)
    }
    catch(error) {
      if(animeBackgroundRemovalDevice!=='webgpu')throw error;
      console.warn('WebGPU inference failed. Retrying the anime cutout with WASM.', error);
      setCutoutStatus('端末と相性のよい互換モードでもう一度判定しています…', 'loading');
      await disposeAnimeBackgroundRemoval(runtime);
      runtime=await getAnimeBackgroundRemoval(true);
      segmentation=await requestAnimeMask(runtime, objectUrl)
    }
    return canvasToBlob(
      applySegmentationMask(processingCanvas, segmentation, retainBody)
    )
  }
  finally {
    URL.revokeObjectURL(objectUrl);
    if(runtime)await releaseAnimeBackgroundRemoval(runtime)
  }
}
async function runPhotoCutout(processingCanvas) {
  const [removeBackground, inputBlob]=await Promise.all([
    getBackgroundRemoval(),
    canvasToBlob(processingCanvas)
  ]);
  return removeBackground(inputBlob, {
    model:'isnet_fp16',
    progress:updateCutoutProgress
  })
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
  const mode=selectedCutoutMode();
  const progress=$('#cutoutProgress');
  let completion=null;
  setCutoutBusy(true);
  progress.classList.remove('hidden');
  progress.removeAttribute('value');
  setCutoutStatus(mode==='anime'?'イラスト精密AIを準備しています。初回は時間がかかります…':'写真向けAIを準備しています。初回のみ少し時間がかかります…', 'loading');
  try {
    const sourceCanvas=layer.originalImg||layer.img;
    const processingCanvas=makeProcessingCanvas(sourceCanvas, mode);
    let resultBlob;
    if(mode==='anime') {
      resultBlob=await runAnimeCutout(processingCanvas)
    } else {
      resultBlob=await runPhotoCutout(processingCanvas)
    }
    progress.value=100;
    setCutoutStatus('透明な画像に仕上げています…', 'loading');
    const resultCanvas=cutoutAtSourceResolution(await blobToCanvas(resultBlob), sourceCanvas);
    const target=state.layers.find(item=>item.id===layerId);
    if(!target)return;
    target.img=resultCanvas;
    target.url=makeThumbnail(resultCanvas);
    target.cutout=true;
    target.cutoutSource=sourceCanvas;
    renderLayers();
    draw();
    completion= {
      message:mode==='anime'
        ?(selectedCutoutRetention()==='body'
          ?'イラスト用AIで全身を広めに残しました。残った背景は精密補正で消せます'
          :'イラスト用AIで背景を優先して切り抜きました')
        :'背景を削除しました。消えた部分は精密補正で戻せます',
      type:'success'
    }
  }
  catch(error) {
    console.error('Background removal failed:', error);
    completion= {
      message:mode==='anime'
        ?'イラスト用AIで切り抜けませんでした。写真用AIには切り替えず、今回の結果は反映していません'
        :'切り抜きに失敗しました。通信環境を確認して、もう一度お試しください',
      type:'error'
    }
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
all('input[name="cutoutMode"]').forEach(input=> {
  input.onchange=syncCutoutMode
});
all('input[name="cutoutRetention"]').forEach(input=> {
  input.onchange=syncCutoutRetention
});
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
const refineReference=$('#refineReference');
const refineReferenceContext=refineReference.getContext('2d');
const restoreBrushCanvas=document.createElement('canvas');
const refineState= {
  layerId:null,
  source:null,
  previous:null,
  next:null,
  drawing:false,
  pointers:new Map(),
  pan:null,
  strokeStart:null,
  undoBeforeStroke:null,
  mode:'erase',
  reference:false,
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
  $('#restoreMode').setAttribute('aria-pressed', String(!erase));
  if(!erase)setReferenceVisible(true)
}
function setReferenceVisible(visible) {
  refineState.reference=visible;
  refineReference.classList.toggle('visible', visible);
  $('#referenceToggle').classList.toggle('active', visible);
  $('#referenceToggle').setAttribute('aria-pressed', String(visible));
  $('#referenceToggle').textContent=visible?'元画像を隠す':'元画像を重ねて確認'
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
  const displayWidth=Math.round(refineCanvas.width*refineState.fitScale*zoom);
  const displayHeight=Math.round(refineCanvas.height/refineCanvas.width*displayWidth);
  const stack=$('#refineCanvasStack');
  stack.style.width=displayWidth+'px';
  stack.style.height=displayHeight+'px'
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
  refineState.pointers.clear();
  refineState.pan=null;
  refineState.strokeStart=null;
  refineState.undoBeforeStroke=null;
  refineState.lastPoint=null;
  refineCanvas.width=layer.img.width;
  refineCanvas.height=layer.img.height;
  refineReference.width=layer.img.width;
  refineReference.height=layer.img.height;
  refineContext.clearRect(0, 0, refineCanvas.width, refineCanvas.height);
  refineContext.drawImage(layer.img, 0, 0);
  refineReferenceContext.clearRect(0, 0, refineReference.width, refineReference.height);
  refineReferenceContext.drawImage(refineState.source, 0, 0);
  syncRefineHistoryButtons();
  $('#refineZoom').value=100;
  $('#refineZoomOut').value='100%';
  setReferenceVisible(true);
  setRefineMode('restore');
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
  const hardness=clamp(Number($('#brushHardness').value)/100, .05, .995);
  const gradient=refineContext.createRadialGradient(x, y, radius*hardness, x, y, radius);
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
  const hardness=clamp(Number($('#brushHardness').value)/100, .05, .995);
  const gradient=brushContext.createRadialGradient(center, center, radius*hardness, center, center, radius);
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
  refineState.undoBeforeStroke=refineState.previous;
  refineState.strokeStart=cloneCanvas(refineCanvas);
  refineState.previous=refineState.strokeStart;
  refineState.next=null;
  syncRefineHistoryButtons();
  refineState.drawing=true;
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
  refineState.lastPoint=null;
  refineState.strokeStart=null;
  refineState.undoBeforeStroke=null
}
function restoreCanvasSnapshot(snapshot) {
  if(!snapshot)return;
  refineContext.clearRect(0, 0, refineCanvas.width, refineCanvas.height);
  refineContext.drawImage(snapshot, 0, 0)
}
function cancelStrokeForPan() {
  if(!refineState.drawing)return;
  restoreCanvasSnapshot(refineState.strokeStart);
  refineState.previous=refineState.undoBeforeStroke;
  refineState.next=null;
  refineState.drawing=false;
  refineState.lastPoint=null;
  refineState.strokeStart=null;
  refineState.undoBeforeStroke=null;
  syncRefineHistoryButtons()
}
function refinePointerCenter() {
  const points=[...refineState.pointers.values()];
  const total=points.reduce((sum, point)=>({x:sum.x+point.x, y:sum.y+point.y}), {x:0, y:0});
  return {
    x:total.x/points.length,
    y:total.y/points.length
  }
}
function startRefinePointer(event) {
  event.preventDefault();
  const stage=$('#refineStage');
  stage.setPointerCapture?.(event.pointerId);
  refineState.pointers.set(event.pointerId, {x:event.clientX, y:event.clientY});
  if(refineState.pointers.size>=2) {
    cancelStrokeForPan();
    const center=refinePointerCenter();
    refineState.pan= {
      x:center.x,
      y:center.y,
      scrollLeft:stage.scrollLeft,
      scrollTop:stage.scrollTop
    };
    stage.classList.add('panning');
    return
  }
  if(event.target===refineCanvas)startRefineStroke(event)
}
function moveRefinePointer(event) {
  if(!refineState.pointers.has(event.pointerId))return;
  event.preventDefault();
  refineState.pointers.set(event.pointerId, {x:event.clientX, y:event.clientY});
  if(refineState.pan&&refineState.pointers.size>=2) {
    const stage=$('#refineStage');
    const center=refinePointerCenter();
    stage.scrollLeft=refineState.pan.scrollLeft-(center.x-refineState.pan.x);
    stage.scrollTop=refineState.pan.scrollTop-(center.y-refineState.pan.y);
    return
  }
  if(refineState.drawing&&refineState.pointers.size===1)moveRefineStroke(event)
}
function endRefinePointer(event) {
  if(!refineState.pointers.has(event.pointerId))return;
  event.preventDefault();
  const wasPanning=Boolean(refineState.pan);
  refineState.pointers.delete(event.pointerId);
  if(wasPanning) {
    if(refineState.pointers.size<2) {
      refineState.pan=null;
      refineState.drawing=false;
      refineState.lastPoint=null;
      $('#refineStage').classList.remove('panning')
    }
    return
  }
  endRefineStroke(event)
}
function closeRefineEditor() {
  $('#refineDialog').close()
}
$('#refineCutout').onclick=openRefineEditor;
$('#eraseMode').onclick=()=>setRefineMode('erase');
$('#restoreMode').onclick=()=>setRefineMode('restore');
$('#referenceToggle').onclick=()=>setReferenceVisible(!refineState.reference);
$('#brushSize').oninput=event=> {
  $('#brushSizeOut').value=event.target.value
};
$('#brushHardness').oninput=event=> {
  $('#brushHardnessOut').value=event.target.value+'%'
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
  refineState.pointers.clear();
  refineState.pan=null;
  refineState.strokeStart=null;
  refineState.undoBeforeStroke=null;
  refineState.reference=false;
  refineState.lastPoint=null;
  $('#refineStage').classList.remove('panning')
});
$('#refineDialog').addEventListener('click', event=> {
  if(event.target===$('#refineDialog'))closeRefineEditor()
});
$('#refineStage').addEventListener('pointerdown', startRefinePointer, {passive:false});
$('#refineStage').addEventListener('pointermove', moveRefinePointer, {passive:false});
$('#refineStage').addEventListener('pointerup', endRefinePointer, {passive:false});
$('#refineStage').addEventListener('pointercancel', endRefinePointer, {passive:false});
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
