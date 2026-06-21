'use client'
import { useEffect, useRef, useState } from 'react'

interface UserSettings {
  hr_zone1_max?: number
  hr_zone2_max?: number
  hr_zone3_max?: number
  hr_zone4_max?: number
  ftp?: number
  units?: string
  glow_level?: number
}

interface Props {
  userSettings?: UserSettings
  displayName: string
}

export default function GameCanvas({ userSettings, displayName }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const engineRef  = useRef<VectorVeloEngine | null>(null)
  const [phase, setPhase]  = useState<'title'|'ride'|'done'>('title')
  const [saving, setSaving] = useState(false)
  const [savedRide, setSavedRide] = useState<{ rideId: string; stravaUrl?: string } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const engine = new VectorVeloEngine(canvas, userSettings ?? {}, setPhase)
    engineRef.current = engine
    engine.start()
    return () => engine.destroy()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveRide(uploadToStrava: boolean) {
    const engine = engineRef.current
    if (!engine) return
    setSaving(true)
    try {
      const res = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats:          engine.getRideStats(),
          samples:        engine.getSamples(),
          uploadToStrava,
        }),
      })
      const data = await res.json()
      setSavedRide({ rideId: data.rideId, stravaUrl: data.stravaUrl })
    } finally {
      setSaving(false)
    }
  }

  const imperial = userSettings?.units !== 'metric'

  return (
    <div className="fixed inset-0 bg-phos-bg">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* CRT overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          background: 'repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,.18) 3px, rgba(0,0,0,0) 4px)',
          mixBlendMode: 'multiply',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,.5) 100%)' }}
      />

      {/* TITLE screen buttons */}
      {phase === 'title' && (
        <div className="fixed inset-x-0 bottom-14 z-20 flex flex-col items-center gap-3">
          <button
            onClick={() => engineRef.current?.connectBike()}
            className="btn-vec text-phos-cyan border-phos-cyan"
            style={{ fontSize: 15, padding: '12px 32px' }}
          >
            ⚡ CONNECT KICKR
          </button>
          <button
            onClick={() => engineRef.current?.startDemo()}
            className="btn-vec text-phos-green border-phos-green"
            style={{ fontSize: 14, padding: '10px 28px' }}
          >
            ▶ DEMO RIDE
          </button>
          <p className="text-phos-green/30 mt-1" style={{ fontSize: 10, letterSpacing: '0.3em' }}>
            CHROME / EDGE · HTTPS OR LOCALHOST
          </p>
        </div>
      )}

      {/* IN-RIDE controls */}
      {phase === 'ride' && (
        <div className="fixed top-4 right-4 z-20 flex gap-2">
          <button
            onClick={() => engineRef.current?.endRide()}
            className="btn-vec text-phos-red border-phos-red"
            style={{ fontSize: 12, padding: '7px 14px' }}
          >
            ■ END RIDE
          </button>
        </div>
      )}

      {/* RIDE COMPLETE overlay */}
      {phase === 'done' && !savedRide && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-end pb-10 gap-3">
          {saving
            ? <p className="text-phos-amber glow-amber" style={{ fontSize: 13, letterSpacing: '0.3em' }}>TRANSMITTING…</p>
            : <>
                <button
                  onClick={() => handleSaveRide(true)}
                  className="btn-vec text-phos-cyan border-phos-cyan"
                  style={{ fontSize: 14, padding: '11px 28px' }}
                >
                  ⬆ SAVE + UPLOAD TO STRAVA
                </button>
                <button
                  onClick={() => handleSaveRide(false)}
                  className="btn-vec text-phos-green border-phos-green"
                  style={{ fontSize: 13, padding: '9px 22px' }}
                >
                  ✓ SAVE LOCALLY ONLY
                </button>
                <button
                  onClick={() => engineRef.current?.resetToTitle()}
                  className="text-phos-green/30 hover:text-phos-green transition-colors"
                  style={{ fontSize: 11, letterSpacing: '0.25em', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  DISCARD RIDE
                </button>
              </>
          }
        </div>
      )}

      {/* Post-save options */}
      {phase === 'done' && savedRide && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-end pb-10 gap-3">
          {savedRide.stravaUrl && (
            <a
              href={savedRide.stravaUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-vec text-phos-amber border-phos-amber"
              style={{ fontSize: 13, padding: '9px 22px' }}
            >
              VIEW ON STRAVA ↗
            </a>
          )}
          <a
            href={`/rides/${savedRide.rideId}`}
            className="btn-vec text-phos-cyan border-phos-cyan"
            style={{ fontSize: 13, padding: '9px 22px' }}
          >
            VIEW RIDE DETAIL →
          </a>
          <button
            onClick={() => { setSavedRide(null); engineRef.current?.resetToTitle(); }}
            className="btn-vec text-phos-green border-phos-green"
            style={{ fontSize: 13, padding: '9px 22px' }}
          >
            ↻ NEW RIDE
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VectorVeloEngine — the full canvas game engine
// (same core as the standalone HTML, wired for Next.js lifecycle)
// ─────────────────────────────────────────────────────────────────────────────
class VectorVeloEngine {
  private canvas: HTMLCanvasElement
  private cx: CanvasRenderingContext2D
  private raf  = 0
  private last = performance.now()
  private cfg: UserSettings
  private setPhase: (p: 'title'|'ride'|'done') => void

  // telemetry
  private power = 0; private cadence = 0; private speedKmh = 0; private hr = 0
  private smoothPower = 0; private smoothCad = 0; private smoothSpeed = 0
  // ride state
  private mode: 'title'|'ride'|'done' = 'title'
  private t = 0; private W = 0; private H = 0
  private demo = false; private demoEffort = 185
  private elapsed = 0; private distM = 0; private kJ = 0
  private maxPower = 0; private avgPower = 0; private _pSum = 0; private _pN = 0
  private maxHr = 0; private maxSpeed = 0
  private _lastSample = 0; private crank = 0; private roadScroll = 0
  private wave = 1; private waveFlash = 0; private shake = 0
  private startTime = new Date()
  private samples: Array<{ t:string; distM:number; power:number; cad:number; speedMs:number; hr?:number|null }> = []
  private deviceDistBase: number|null = null; private deviceDistLast: number|null = null
  private ble: { device?: BluetoothDevice; mode?: string; control?: BluetoothRemoteGATTCharacteristic; lastCrank?: { revs:number; t:number } } = {}
  private stars = Array.from({length:90}, ()=>({ x:Math.random(), y:Math.random()*0.55, s:Math.random() }))
  private rocks = Array.from({length:7}, ()=>this.makeRock())
  private _msgTimeout = 0; private _msgEl: HTMLElement|null = null

  constructor(canvas: HTMLCanvasElement, cfg: UserSettings, setPhase: (p: 'title'|'ride'|'done')=>void) {
    this.canvas = canvas
    this.cx = canvas.getContext('2d')!
    this.cfg = cfg
    this.setPhase = setPhase
    this.resize()
    window.addEventListener('resize', () => this.resize())
    window.addEventListener('keydown', (e) => this.onKey(e))
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio||1, 2)
    this.W = window.innerWidth; this.H = window.innerHeight
    this.canvas.width  = this.W * dpr
    this.canvas.height = this.H * dpr
    this.cx.setTransform(dpr,0,0,dpr,0,0)
  }

  start() { this.raf = requestAnimationFrame(t => this.frame(t)) }
  destroy() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', () => this.resize())
    window.removeEventListener('keydown', (e) => this.onKey(e))
  }

  private frame(now: number) {
    const dt = Math.min(0.05, (now - this.last)/1000); this.last = now
    this.update(dt)
    this.render(dt)
    this.raf = requestAnimationFrame(t => this.frame(t))
  }

  // ── Public API ────────────────────────────────────────────────────────────
  getRideStats() {
    return {
      startedAt:      this.startTime.toISOString(),
      elapsedSeconds: Math.round(this.elapsed),
      distanceMeters: this.distM,
      avgPower:       this.avgPower,
      maxPower:       this.maxPower,
      avgHr:          this.samples.filter(s => s.hr).length
        ? this.samples.reduce((a,s) => a+(s.hr||0), 0) / this.samples.filter(s=>s.hr).length
        : undefined,
      maxHr:          this.maxHr || undefined,
      avgSpeedKmh:    this.distM / Math.max(1, this.elapsed) * 3.6,
      maxSpeedKmh:    this.maxSpeed,
      energyKj:       this.kJ,
    }
  }
  getSamples() { return this.samples }

  endRide() {
    if (this.mode !== 'ride') return
    this.mode = 'done'
    this.setPhase('done')
  }
  resetToTitle() {
    this.mode = 'title'
    this.setPhase('title')
  }
  startDemo() {
    this.initRide(true)
  }

  async connectBike() {
    if (!(navigator as any).bluetooth) { this.msg('NO WEB BLUETOOTH — USE CHROME/EDGE ON HTTPS'); return }
    const FTMS = 0x1826, IBD = 0x2AD2, FTMS_CP = 0x2AD9, CPS = 0x1818, CPM = 0x2A63, HRS = 0x180D, HRM = 0x2A37
    try {
      this.msg('SCANNING…', 0)
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services:[FTMS] },{ services:[CPS] },{ namePrefix:'KICKR' },{ namePrefix:'Wahoo' }],
        optionalServices: [FTMS, CPS, HRS]
      })
      this.ble.device = device
      const server = await device.gatt.connect()
      try {
        const svc = await server.getPrimaryService(FTMS)
        const ibd = await svc.getCharacteristic(IBD)
        await ibd.startNotifications()
        ibd.addEventListener('characteristicvaluechanged', (e:any) => this.parseIBD(e.target.value))
        this.ble.mode = 'ftms'
        try {
          const ctl = await svc.getCharacteristic(FTMS_CP)
          await ctl.startNotifications()
          await ctl.writeValue(Uint8Array.of(0x00))
          this.ble.control = ctl
        } catch(_) {}
      } catch(_) {
        const svc = await server.getPrimaryService(CPS)
        const cpm = await svc.getCharacteristic(CPM)
        await cpm.startNotifications()
        cpm.addEventListener('characteristicvaluechanged', (e:any) => this.parseCPS(e.target.value))
        this.ble.mode = 'cps'
      }
      try {
        const hs = await server.getPrimaryService(HRS)
        const hc = await hs.getCharacteristic(HRM)
        await hc.startNotifications()
        hc.addEventListener('characteristicvaluechanged', (e:any) => {
          const dv = e.target.value
          this.hr = (dv.getUint8(0)&1) ? dv.getUint16(1,true) : dv.getUint8(1)
        })
      } catch(_) {}
      this.msg('LINKED: ' + (device.name||'TRAINER'), 4000)
      this.initRide(false)
    } catch(e:any) {
      if (e?.name === 'NotFoundError') this.msg('SCAN CANCELLED', 3000)
      else this.msg('BLE ERROR: ' + (e?.message||e), 6000)
    }
  }

  private parseIBD(dv: DataView) {
    let o = 0; const f = dv.getUint16(o,true); o+=2
    if (!(f&0x0001)){ this.speedKmh = dv.getUint16(o,true)/100; o+=2 }
    if (f&0x0002) o+=2
    if (f&0x0004){ this.cadence = dv.getUint16(o,true)/2; o+=2 }
    if (f&0x0008) o+=2
    if (f&0x0010){ const d=dv.getUint16(o,true)+(dv.getUint8(o+2)<<16); o+=3; if(this.deviceDistBase===null) this.deviceDistBase=d; this.deviceDistLast=d }
    if (f&0x0020) o+=2
    if (f&0x0040){ this.power=Math.max(0,dv.getInt16(o,true)); o+=2 }
    if (f&0x0200){ this.hr=dv.getUint8(o) }
  }

  private parseCPS(dv: DataView) {
    const f = dv.getUint16(0,true); this.power=Math.max(0,dv.getInt16(2,true)); let o=4
    if (f&0x0001) o+=1; if (f&0x0004) o+=2; if (f&0x0010) o+=6
    if (f&0x0020){ const revs=dv.getUint16(o,true), t=dv.getUint16(o+2,true), prev=this.ble.lastCrank
      if (prev){ const dr=(revs-prev.revs+65536)%65536, dt=(t-prev.t+65536)%65536; if(dt>0&&dr>0) this.cadence=dr/(dt/1024)*60 }
      this.ble.lastCrank={revs,t}
    }
    this.speedKmh = this.p2v(this.power)
  }

  private p2v(p: number) { return p<=0?0:3.6*Math.cbrt(p/0.19) }

  private initRide(demo: boolean) {
    Object.assign(this, {
      demo, mode:'ride', startTime:new Date(), elapsed:0, distM:0, kJ:0,
      maxPower:0, avgPower:0, _pSum:0, _pN:0, samples:[], _lastSample:0,
      deviceDistBase:null, deviceDistLast:null, wave:1, waveFlash:0,
      power:0, cadence:0, speedKmh:0, hr:0, smoothPower:0, smoothCad:0, smoothSpeed:0,
      maxHr:0, maxSpeed:0
    })
    this.setPhase('ride')
  }

  private update(dt: number) {
    this.t += dt
    if (this.mode !== 'ride') return
    if (this.demo) {
      const w = Math.sin(this.t*0.7)*22+Math.sin(this.t*2.3)*9+(Math.random()-0.5)*14
      this.power = Math.max(0, this.demoEffort+w)
      this.cadence = this.power<5?0:82+Math.sin(this.t*0.5)*6+(Math.random()-0.5)*3
      this.speedKmh = this.p2v(this.power)
      this.hr = Math.round(95+Math.min(85,this.power*0.32)+Math.sin(this.t*0.2)*4)
    }
    const k = 1-Math.pow(0.001,dt)
    this.smoothPower  += (this.power    - this.smoothPower)*k
    this.smoothCad    += (this.cadence  - this.smoothCad)*k
    this.smoothSpeed  += (this.speedKmh - this.smoothSpeed)*k
    this.elapsed += dt
    this.kJ += this.power*dt/1000
    if (this.power>this.maxPower) this.maxPower=this.power
    if (this.hr>this.maxHr) this.maxHr=this.hr
    if (this.speedKmh>this.maxSpeed) this.maxSpeed=this.speedKmh
    if (this.power>0){ this._pSum+=this.power*dt; this._pN+=dt; this.avgPower=this._pSum/Math.max(1e-6,this._pN) }
    if (this.deviceDistBase!==null&&this.deviceDistLast!==null) this.distM=this.deviceDistLast-this.deviceDistBase
    else this.distM+=(this.speedKmh/3.6)*dt
    const w=Math.floor(this.distM/5000)+1
    if (w!==this.wave){ this.wave=w; this.waveFlash=3; this.shake=0.6 }
    if (this.waveFlash>0) this.waveFlash-=dt
    if (this.shake>0) this.shake-=dt*2
    if (this.elapsed-this._lastSample>=1){
      this._lastSample=this.elapsed
      this.samples.push({ t:new Date().toISOString(), distM:this.distM, power:Math.round(this.power), cad:Math.round(this.cadence), speedMs:this.speedKmh/3.6, hr:this.hr||null })
    }
  }

  private onKey(e: KeyboardEvent) {
    if (this.mode==='ride'&&this.demo){
      if (e.key==='ArrowUp')   this.demoEffort=Math.min(600,this.demoEffort+10)
      if (e.key==='ArrowDown') this.demoEffort=Math.max(0,this.demoEffort-10)
    }
    if (e.key==='Escape'&&this.mode==='ride') this.endRide()
    if (e.code==='Space'&&this.mode==='title') this.startDemo()
  }

  msg(text: string, ms = 4000) {
    // Update a floating overlay via DOM if available, otherwise console
    let el = document.getElementById('vv-msg')
    if (!el){ el=document.createElement('div'); el.id='vv-msg'; Object.assign(el.style,{position:'fixed',bottom:'6vh',left:'50%',transform:'translateX(-50%)',zIndex:'30',fontFamily:'Courier New,monospace',fontSize:'13px',letterSpacing:'.2em',color:'#ffc234',textShadow:'0 0 8px #ffc234',pointerEvents:'none',transition:'opacity .3s'}); document.body.appendChild(el) }
    this._msgEl=el; el.textContent=text; el.style.opacity='1'
    clearTimeout(this._msgTimeout)
    if (ms) this._msgTimeout=window.setTimeout(()=>{ if(this._msgEl) this._msgEl.style.opacity='0' },ms) as any
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  private glow(color: string, blur=12, width=1.6) {
    const g = this.cfg.glow_level??1
    this.cx.strokeStyle=color; this.cx.lineWidth=width
    this.cx.shadowColor=color; this.cx.shadowBlur=blur*g
    this.cx.lineJoin='round'; this.cx.lineCap='round'
  }
  private noGlow(){ this.cx.shadowBlur=0 }

  private ramp(t: number) {
    const z = this.cfg
    const zones = [
      [0,           [39,232,255]],
      [(z.hr_zone1_max??115)/220, [39,232,255]],
      [(z.hr_zone2_max??152)/220, [57,255,110]],
      [(z.hr_zone3_max??162)/220, [255,194,52]],
      [(z.hr_zone4_max??174)/220, [255,59,78]],
      [1,                         [255,59,78]],
    ] as [number, number[]][]
    t = Math.max(0,Math.min(1,t))
    for (let i=1;i<zones.length;i++){
      if (t<=zones[i][0]){
        const a=zones[i-1],b=zones[i],f=(t-a[0])/(b[0]-a[0])
        return `rgb(${Math.round(a[1][0]+(b[1][0]-a[1][0])*f)},${Math.round(a[1][1]+(b[1][1]-a[1][1])*f)},${Math.round(a[1][2]+(b[1][2]-a[1][2])*f)})`
      }
    }
    return '#ff3b4e'
  }

  private bigStat(text: string, x: number, y: number, size: number, color: string, maxW: number, right=false) {
    const cx=this.cx; cx.save()
    cx.font=`${size}px Anton,"Arial Black",Impact,sans-serif`
    let w=cx.measureText(text).width
    if (w>maxW){ size*=maxW/w; cx.font=`${size}px Anton,"Arial Black",Impact,sans-serif`; w=cx.measureText(text).width }
    if (right) x-=w
    cx.textAlign='left'; cx.textBaseline='alphabetic'
    cx.lineWidth=Math.max(1.4,size/28)
    cx.strokeStyle=color; cx.shadowColor=color; cx.shadowBlur=3*(this.cfg.glow_level??1)
    cx.strokeText(text,x,y); cx.restore()
  }

  private vecText(str: string, x: number, y: number, size: number, color: string, align:'left'|'center'|'right'='left', blur=8) {
    const cx=this.cx; cx.save()
    cx.font=`bold ${size}px "Courier New",monospace`; cx.textAlign='left'; cx.textBaseline='alphabetic'
    cx.lineWidth=Math.max(0.8,size/22); cx.strokeStyle=color; cx.shadowColor=color; cx.shadowBlur=blur*(this.cfg.glow_level??1)
    const ls=size*0.18
    if (align!=='left'){ let tot=0; for(const c of str) tot+=cx.measureText(c).width+ls; tot-=ls; x-=align==='center'?tot/2:tot }
    for (const ch of str){ cx.strokeText(ch,x,y); x+=cx.measureText(ch).width+ls }
    cx.restore()
  }

  private bar(x:number,y:number,w:number,h:number,frac:number,color:string,segs=24){
    this.glow(color,6,1); this.cx.strokeRect(x,y,w,h); this.noGlow()
    for(let i=0;i<segs;i++){ const sx=x+3+i*(w-6)/segs; this.cx.fillStyle=i<Math.round(frac*segs)?color:'rgba(255,255,255,0.06)'; this.cx.fillRect(sx,y+3,(w-6)/segs-2,h-6) }
  }

  private makeRock(){ const n=8+(Math.random()*4|0); return { verts:Array.from({length:n},(_,i)=>{ const a=i/n*Math.PI*2,r=0.6+Math.random()*0.45; return [Math.cos(a)*r,Math.sin(a)*r] }),x:Math.random()*1.2-0.1,y:Math.random()*0.35+0.03,r:14+Math.random()*26,rot:Math.random()*Math.PI*2,vr:(Math.random()-0.5)*0.8,vx:(Math.random()*0.5+0.1)*(Math.random()<0.5?-1:1) } }

  private render(dt: number) {
    const {cx,W,H,t}=this
    cx.save()
    cx.fillStyle='rgba(2,4,3,0.55)'; cx.fillRect(0,0,W,H)
    if (this.mode==='title')  this.drawTitle()
    else if (this.mode==='ride') this.drawRide(dt)
    else this.drawDone()
    cx.restore()
  }

  private drawTitle() {
    const {cx,W,H,t}=this; const hy=H*0.46
    this.drawStars(hy); this.drawRocks(hy,1/60); this.drawMountains(hy); this.drawRoad(hy,1/60)
    this.smoothSpeed=24
    this.vecText('VECTOR',W/2,H*0.22,Math.min(80,W/9),'#39ff6e','center',20)
    this.vecText('VELO',  W/2,H*0.22+Math.min(94,W/8),Math.min(80,W/9),'#27e8ff','center',20)
    if (Math.sin(t*3.2)>-0.25) this.vecText('INSERT WATTS TO PLAY',W/2,H*0.58,16,'#ffc234','center')
    this.vecText('© 2026 MOSTLY CLICKS AMUSEMENTS · VECTORVELO.APP',W/2,H-42,10,'rgba(57,255,110,0.25)','center',4)
  }

  private drawDone() {
    const {W,H,t}=this; const hy=H*0.46
    this.drawStars(hy); this.drawMountains(hy)
    this.vecText('RIDE COMPLETE',W/2,H*0.18,Math.min(44,W/12),'#ffc234','center',18)
    const imp=this.cfg.units!=='metric'
    const dist=imp?(this.distM/1609.344).toFixed(2)+' MI':(this.distM/1000).toFixed(2)+' KM'
    const rows=[['TIME',this.fmtTime(this.elapsed)],['DIST',dist],['AVG PWR',Math.round(this.avgPower)+' W'],['MAX PWR',Math.round(this.maxPower)+' W'],['ENERGY',Math.round(this.kJ)+' KJ'],['SCORE',String(Math.round(this.kJ)).padStart(6,'0')]]
    let y=H*0.3
    for(const [k,v] of rows){ this.vecText(k,W/2-36,y,17,'rgba(57,255,110,0.4)','right',4); this.vecText(v,W/2+36,y,17,'#39ff6e','left',5); y+=36 }
    if(Math.sin(t*3)>0) this.vecText('SAVE RIDE BELOW ▼',W/2,y+20,12,'#27e8ff','center')
  }

  private drawRide(dt: number) {
    const {W,H}=this; const hy=H*0.42
    if(this.shake>0) this.cx.translate((Math.random()-0.5)*6*this.shake,(Math.random()-0.5)*6*this.shake)
    this.drawStars(hy); this.drawRocks(hy,dt); this.drawMountains(hy); this.drawRoad(hy,dt)
    this.drawBikeRear(dt); this.drawHUD()
  }

  private drawStars(hy: number) {
    this.noGlow()
    for(const st of this.stars){ const tw=0.4+0.6*Math.abs(Math.sin(this.t*1.5+st.s*20)); this.cx.fillStyle=`rgba(234,255,233,${0.25+st.s*0.5*tw})`; this.cx.fillRect(st.x*this.W,st.y*hy,st.s>0.8?2:1,st.s>0.8?2:1) }
  }

  private drawMountains(hy: number) {
    this.glow('rgba(39,232,255,0.5)',7,1.2)
    this.cx.beginPath()
    const seg=26,amp=this.H*0.05
    for(let i=0;i<=seg;i++){ const x=i/seg*this.W,ph=i*1.7+Math.floor(this.distM/40)*0.013,y=hy-Math.abs(Math.sin(ph)*Math.cos(ph*0.37))*amp-2; i?this.cx.lineTo(x,y):this.cx.moveTo(x,y) }
    this.cx.stroke()
  }

  private drawRocks(hy: number, dt: number) {
    this.glow('rgba(57,255,110,0.35)',5,1.1)
    for(const r of this.rocks){
      r.rot+=r.vr*dt; r.x+=r.vx*dt*0.04*(1+this.smoothSpeed/40)
      if(r.x<-0.15)r.x=1.15; if(r.x>1.15)r.x=-0.15
      this.cx.save(); this.cx.translate(r.x*this.W,r.y*hy+hy*0.2); this.cx.rotate(r.rot)
      this.cx.beginPath(); r.verts.forEach(([vx,vy],i)=>i?this.cx.lineTo(vx*r.r,vy*r.r):this.cx.moveTo(vx*r.r,vy*r.r))
      this.cx.closePath(); this.cx.stroke(); this.cx.restore()
    }
  }

  private drawRoad(hy: number, dt: number) {
    const {W,H}=this; const vp={x:W/2+Math.sin(this.distM/900)*W*0.06,y:hy}; const bh=W*0.62; const LANES=8
    this.glow('#27e8ff',13,1.7)
    for(let i=0;i<=LANES;i++){ const u=i/LANES*2-1; this.cx.beginPath(); this.cx.moveTo(vp.x+u*W*0.012,vp.y); this.cx.lineTo(W/2+u*bh,H+8); this.cx.stroke() }
    this.roadScroll=(this.roadScroll+(this.smoothSpeed/3.6)*dt*0.06)%1
    this.glow('#39ff6e',11,1.5)
    for(let i=0;i<11;i++){ let z=((i/11)+this.roadScroll)%1; const p=Math.pow(z,3.1),y=vp.y+(H+8-vp.y)*p,half=W*0.012+(bh-W*0.012)*p,xC=vp.x+(W/2-vp.x)*p; this.cx.globalAlpha=0.25+0.75*p; this.cx.beginPath(); this.cx.moveTo(xC-half,y); this.cx.lineTo(xC+half,y); this.cx.stroke() }
    this.cx.globalAlpha=1
  }

  private drawBikeRear(dt: number) {
    this.crank+=(this.smoothCad/60)*Math.PI*2*dt
    const u=Math.min(this.W,this.H)*0.082
    const rock=Math.sin(this.crank)*(0.018+Math.min(0.045,this.smoothPower/9000))
    const bob=Math.sin(this.crank*2)*u*0.02
    const cx=this.cx
    cx.save(); cx.translate(this.W/2,this.H*0.88+bob); cx.rotate(rock)
    this.glow('#39ff6e',9,1.6)
    const wr=u*0.62
    cx.beginPath(); cx.ellipse(0,0,wr*0.15,wr,0,0,Math.PI*2); cx.stroke()
    const va=this.crank*2.1; cx.beginPath(); cx.arc(Math.cos(va)*wr*0.12,Math.sin(va)*wr*0.88,1.6,0,Math.PI*2); cx.stroke()
    const sad={x:0,y:-u*1.46}
    cx.beginPath(); cx.moveTo(0,-wr*0.08); cx.lineTo(sad.x,sad.y); cx.moveTo(-wr*0.15,-wr*0.05); cx.lineTo(-u*0.05,sad.y+u*0.2); cx.moveTo(wr*0.15,-wr*0.05); cx.lineTo(u*0.05,sad.y+u*0.2); cx.moveTo(-u*0.14,sad.y); cx.lineTo(u*0.14,sad.y); cx.stroke()
    const barY=-u*1.76,bh2=u*0.45
    cx.beginPath(); cx.moveTo(-bh2,barY); cx.lineTo(bh2,barY); cx.moveTo(-bh2,barY); cx.lineTo(-bh2,barY+u*0.16); cx.moveTo(bh2,barY); cx.lineTo(bh2,barY+u*0.16); cx.moveTo(0,barY); cx.lineTo(0,barY+u*0.3); cx.stroke()
    this.glow('#39ff6e',10,1.7)
    const hipY=sad.y-u*0.06; const hipL={x:-u*0.17,y:hipY},hipR={x:u*0.17,y:hipY}; const shL={x:-u*0.40,y:-u*2.30},shR={x:u*0.40,y:-u*2.30}
    cx.beginPath(); cx.moveTo(hipL.x-u*0.05,hipL.y); cx.lineTo(shL.x,shL.y); cx.lineTo(shR.x,shR.y); cx.lineTo(hipR.x+u*0.05,hipR.y); cx.closePath(); cx.stroke()
    cx.beginPath(); cx.arc(0,-u*2.60,u*0.21,0,Math.PI*2); cx.stroke(); cx.beginPath(); cx.arc(0,-u*2.64,u*0.26,Math.PI*1.12,Math.PI*1.88); cx.stroke()
    const armTo=(sh:{x:number,y:number},hx:number)=>{ const hand={x:hx,y:barY+u*0.02},elb={x:sh.x*1.28,y:(sh.y+hand.y)/2+u*0.04}; cx.beginPath(); cx.moveTo(sh.x,sh.y); cx.lineTo(elb.x,elb.y); cx.lineTo(hand.x,hand.y); cx.stroke() }
    armTo(shL,-bh2*0.9); armTo(shR,bh2*0.9)
    const legTo=(hip:{x:number,y:number},side:number,phase:number)=>{ const foot={x:side*u*0.27,y:-wr*0.5+Math.cos(this.crank+phase)*u*0.34},lift=0.5-Math.cos(this.crank+phase)/2,knee={x:side*(u*0.30+lift*u*0.14),y:(hip.y+foot.y)/2-u*0.16-lift*u*0.12}; cx.beginPath(); cx.moveTo(hip.x,hip.y); cx.lineTo(knee.x,knee.y); cx.lineTo(foot.x,foot.y); cx.stroke(); cx.beginPath(); cx.moveTo(foot.x-u*0.09,foot.y); cx.lineTo(foot.x+u*0.09,foot.y); cx.stroke() }
    legTo(hipL,-1,Math.PI); legTo(hipR,1,0)
    if(this.smoothPower>240){ this.glow('#ffc234',11,1.3); const f=u*0.2+(this.smoothPower-240)/700*u+Math.random()*u*0.08; cx.beginPath(); cx.moveTo(-wr*0.15,wr*0.6); cx.lineTo(0,wr*0.6+f); cx.lineTo(wr*0.15,wr*0.6); cx.stroke() }
    cx.restore()
  }

  private drawHUD() {
    const {W,H}=this; const m=Math.round(W*0.02); const col=W/3-m; const bottom=H-64
    const imp=this.cfg.units!=='metric'
    const mph=imp?this.smoothSpeed*0.621371:this.smoothSpeed
    const dist=imp?this.distM/1609.344:this.distM/1000
    const rows:[string,string][]=[
      [Math.round(this.power)+' W',                  this.ramp(this.smoothPower/Math.max(1,(this.cfg.ftp??200)*1.2))],
      [Math.round(mph)+(imp?' MPH':' KMH'),           this.ramp(this.smoothSpeed/45)],
      [dist.toFixed(1)+(imp?' MI':' KM'),             '#27e8ff'],
      [Math.round(this.cadence)+' RPM',               '#27e8ff'],
    ]
    if(this.hr) rows.push([Math.round(this.hr)+' BPM', this.ramp(this.hr/Math.max(1,this.cfg.hr_zone4_max??174))])
    const n=rows.length; const rowH=Math.min((bottom-m)/(n+0.5),H*0.175); const barSpace=rowH*0.45; const barH=Math.max(8,rowH*0.16)
    let y=bottom-(n-1)*rowH-barSpace
    for(let i=0;i<n;i++){
      this.bigStat(rows[i][0],m,y,rowH*1.04,rows[i][1],col)
      if(i===0){ this.bar(m,y+rowH*0.16,col,barH,Math.min(1,this.smoothPower/Math.max(1,(this.cfg.ftp??200)*1.2)),rows[0][1],24); y+=barSpace }
      y+=rowH
    }
    const rRow=rowH*0.5; const rRows:[string,string][]=[['TIME '+this.fmtTime(this.elapsed),'#eaffe9'],['AVG '+Math.round(this.avgPower)+' W','#39ff6e'],['SCORE '+String(Math.round(this.kJ)).padStart(6,'0'),'#ffc234']]
    let ry=bottom-rRow*(rRows.length-1)
    for(const [txt,c] of rRows){ this.bigStat(txt,W-m,ry,rRow,c,col,true); ry+=rRow }
    this.vecText('WAVE '+this.wave,W/2,40,16,'#27e8ff','center',5)
    if(this.waveFlash>0&&Math.sin(this.t*16)>0) this.vecText('WAVE '+this.wave+' — SPEED BONUS',W/2,H*0.3,24,'#ffc234','center',13)
    if(this.demo) this.vecText('DEMO',W/2,H-14,11,'rgba(57,255,110,0.3)','center',3)
  }

  private fmtTime(s: number) {
    s=Math.floor(s); const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60
    return (h?h+':':'') + String(m).padStart(h?2:1,'0') + ':' + String(x).padStart(2,'0')
  }
}
