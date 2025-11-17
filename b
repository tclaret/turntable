<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Turntable — Vintage Arrow RPM Selector</title>
<link rel="icon" href="data:," />

<style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
        height:100vh;
        background:#333;
        display:flex;
        justify-content:center;
        align-items:center;
        font-family:Arial;
        color:white;
        user-select:none;
    }

    #turntable {
        position:relative;
        width:80vmin;
        height:80vmin;
        max-width:700px;
        max-height:700px;
        background:#8b7966;
        border-radius:12px;
        box-shadow:0 0 40px rgba(0,0,0,0.7);
        overflow:hidden;
    }

    #vinyl {
        position:absolute;
        top:5%; left:5%;
        width:90%; height:90%;
        border-radius:50%;
        background-image:url('img/DISC.png');
        background-size:cover;
        background-position:center;
        transform:rotate(0deg);
        cursor:grab;
        will-change:transform;
    }
    #vinyl:active { cursor:grabbing; }

    #rpm-wrapper {
        position:absolute;
        bottom:20px;
        left:20px;
        width:auto;
        height:auto;
        transform-origin:50% 50%;
    }
    #rpm-img {
        width:50%;
        display:block;
        transform:rotate(0deg);
        transition: transform 0.2s ease;
    }

    .rpm-zone {
        position:absolute;
        top:0; bottom:0;
        opacity:0;
        cursor:pointer;
        width:50%; /* increased zone width to match image better */
    }
    .zone-left { left:0; }
    .zone-mid  { left:25%; }
    .zone-right{ left:50%; }

    .zone-outline {
        border:1px solid rgba(255,255,255,0.35);
        pointer-events:none;
    }
</style>
</head>
<body>

<div id="turntable">
    <button id="stop-button" style="position:absolute; top:20px; left:20px; z-index:50; padding:10px 18px; background:#c0392b; border:none; border-radius:8px; color:white; font-weight:bold; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.45);">STOP</button>

    <button id="zoom-button" style="position:absolute; top:20px; left:120px; z-index:50; padding:10px 18px; background:#3498db; border:none; border-radius:8px; color:white; font-weight:bold; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.45);">ZOOM</button>

    <div id="vinyl"></div>

    <div id="rpm-wrapper">
        <img id="rpm-img" src="img/ChickenHead.png" />

        <div class="rpm-zone zone-left"></div>
        <div class="rpm-zone zone-mid"></div>
        <div class="rpm-zone zone-right"></div>

        <div class="zone-outline" style="position:absolute; left:0; top:0; bottom:0; width:50%;"></div>
        <div class="zone-outline" style="position:absolute; left:25%; top:0; bottom:0; width:50%;"></div>
        <div class="zone-outline" style="position:absolute; left:50%; top:0; bottom:0; width:50%;"></div>
    </div>
</div>

<script>
const vinyl = document.getElementById("vinyl");
const rpmImg = document.getElementById("rpm-img");

let currentRotation = 0;
let velocity = 0;
let targetVelocity = 0;
let isDragging = false;
let lastAngle = 0;
let center = {x:0, y:0};
const returnStrength = 0.08;

let rpmMode = "off";
const RPM_SPEED = {"33":0.6,"45":0.9,"off":0};

let audioCtx = null;
let buffer = null;
let source = null;
const audioURL = "JB.mp3";

function initAudio(){ if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }
async function loadAudio(){ initAudio(); const res = await fetch(audioURL); const arr = await res.arrayBuffer(); buffer = await audioCtx.decodeAudioData(arr); }
loadAudio();
function startAudio(){ if(!buffer) return; if(source) source.stop(); source = audioCtx.createBufferSource(); source.buffer = buffer; source.loop = true; source.playbackRate.value = 1; source.connect(audioCtx.destination); source.start(); }

function updateCenter(){ const r = vinyl.getBoundingClientRect(); center.x = r.left + r.width/2; center.y = r.top + r.height/2; }
updateCenter(); window.addEventListener("resize", updateCenter);
function getAngle(e){ return Math.atan2(e.clientY - center.y, e.clientX - center.x) * 180 / Math.PI; }

vinyl.addEventListener("pointerdown", e => { initAudio(); audioCtx.resume(); startAudio(); isDragging=true; lastAngle=getAngle(e); vinyl.setPointerCapture(e.pointerId); });
vinyl.addEventListener("pointermove", e => { if(!isDragging) return; const ang=getAngle(e); let delta=ang-lastAngle; if(delta>180) delta-=360; if(delta<-180) delta+=360; lastAngle=ang; currentRotation+=delta; velocity=delta; targetVelocity=delta; });
vinyl.addEventListener("pointerup", ()=>{ isDragging=false; targetVelocity=RPM_SPEED[rpmMode]; });

function engine(){ if(!isDragging){ velocity += (targetVelocity - velocity)*returnStrength; } currentRotation+=velocity; vinyl.style.transform=`rotate(${currentRotation}deg)`; if(source && audioCtx){ source.playbackRate.value=Math.max(0.01,1+velocity*0.02); } requestAnimationFrame(engine); }
engine();

const zoneLeft=document.querySelector('.zone-left');
const zoneMid=document.querySelector('.zone-mid');
const zoneRight=document.querySelector('.zone-right');

function setRPM(mode){ rpmMode=mode; targetVelocity=RPM_SPEED[mode]; if(mode=="45") rpmImg.style.transform="rotate(30deg) scale(0.5)";
else if(mode=="33") rpmImg.style.transform="rotate(-30deg) scale(0.5)";
else rpmImg.style.transform="rotate(0deg) scale(0.5)"; }

zoneLeft.onclick=()=>{ setRPM("33"); };
zoneMid.onclick=()=>{ setRPM("off"); };
zoneRight.onclick=()=>{ setRPM("45"); };
</script>
</body>
</html>
