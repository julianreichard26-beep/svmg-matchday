import { useState, useRef, useEffect, useLayoutEffect, Fragment } from "react";
import html2canvas from "html2canvas";

function loadLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function findLogoInLib(name, lib) {
  if (!name) return null;
  const n = name.toLowerCase();
  const match = (lib||[]).find(e => n.includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(n));
  return match ? match.logo : null;
}

const POST_TYPES = [
  { id: "matchday", label: "⚽ Spieltag-Ankündigung" },
  { id: "result",   label: "🏁 Spielbericht" },
  { id: "schedule", label: "🗓️ Spielplan" },
];
const MOODS = ["motivierend", "emotional", "lässig", "professionell", "humorvoll"];
const FONTS = [
  { id: "'Comic Sans MS','Chalkboard SE',cursive", label: "Comic Sans" },
  { id: "'Bebas Neue',cursive",                    label: "Bebas Neue" },
  { id: "'Anton',sans-serif",                      label: "Anton" },
  { id: "'Oswald',sans-serif",                     label: "Oswald" },
  { id: "'Bangers',cursive",                       label: "Bangers" },
  { id: "'Russo One',sans-serif",                  label: "Russo One" },
  { id: "'Righteous',cursive",                     label: "Righteous" },
  { id: "'Permanent Marker',cursive",              label: "Marker" },
  { id: "'Impact','Arial Narrow',sans-serif",      label: "Impact" },
  { id: "'Arial Black','Arial',sans-serif",        label: "Arial Black" },
  { id: "'Georgia',serif",                         label: "Georgia" },
];
const FORMATS = [
  { id: "square",   label: "⬛ Quadrat", sub: "1:1",  ratio: "1/1" },
  { id: "portrait", label: "📱 Hoch",    sub: "4:5",  ratio: "4/5" },
  { id: "story",    label: "📲 Story",   sub: "9:16", ratio: "9/16" },
];
const BLANK = {
  postType:"matchday", homeTeam:"", awayTeam:"",
  rawDate:"", league:"", matchday:"",
  extraLines:["Team II – 14:00 Uhr","Team I  – 16:00 Uhr","anschließend Saisonabschlussfeier"],
  lineSizes:[100,100,100],
  team1Name:"Team I",  team1GoalsHome:"", team1GoalsAway:"", team1ScorersHome:"", team1ScorersAway:"", team1SvmgSide:"home",
  team2Name:"Team II", team2GoalsHome:"", team2GoalsAway:"", team2ScorersHome:"", team2ScorersAway:"", team2SvmgSide:"home",
  team3Name:"Team III", team3GoalsHome:"", team3GoalsAway:"", team3ScorersHome:"", team3ScorersAway:"", team3SvmgSide:"home",
  mood:"motivierend", font:"'Comic Sans MS','Chalkboard SE',cursive",
  format:"square", hashtags:"#SVMG #Amateurfußball",
  homeLogoMatchday:null, awayLogoMatchday:null,
  homeTeam2:"", awayTeam2:"", homeLogoMatchday2:null, awayLogoMatchday2:null,
  homeTeam3:"", awayTeam3:"", homeLogoMatchday3:null, awayLogoMatchday3:null,
  homeLogoResult:null,   awayLogoResult:null,
  bgActiveMatchday:[], bgSettingsMatchday:{},
  bgActiveResult:[],   bgSettingsResult:{},
  bgActiveSchedule:[], bgSettingsSchedule:{},
  scheduleTitle:"TEAM I", ownLogo:null,
  schedScale:100, schedX:0, schedY:0, schedTimeSize:100,
  sections:[{ name:"Testspiele", matches:[{ opponent:"", isHome:true, date:"", time:"" }] }],
};

// Aus Screenshot erkannte Spiele
function ImgUpload({ label, value, onChange, h=90 }) {
  const ref = useRef();
  const pick = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => onChange(ev.target.result);
    r.readAsDataURL(f);
  };
  return (
    <div>
      {label && <div style={{fontSize:11,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",color:"rgba(255,255,255,0.45)",marginBottom:6}}>{label}</div>}
      <div onClick={()=>ref.current.click()} style={{width:"100%",height:h,borderRadius:10,border:`2px dashed ${value?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.3)"}`,backgroundImage:value?`url("${value}")`:"none",backgroundSize:"contain",backgroundRepeat:"no-repeat",backgroundPosition:"center",backgroundColor:value?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.07)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",userSelect:"none",color:"rgba(255,255,255,0.4)",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>
        {!value && <><span style={{fontSize:20,marginBottom:4}}>📁</span>Hochladen</>}
        <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={pick}/>
      </div>
      {value && <button onClick={()=>onChange(null)} style={{marginTop:5,background:"rgba(255,60,60,0.15)",border:"1px solid rgba(255,60,60,0.35)",borderRadius:6,padding:"3px 10px",color:"#ff8080",fontSize:11,cursor:"pointer"}}>✕ Entfernen</button>}
    </div>
  );
}

function Collapsible({ title, icon, badge, defaultOpen=false, cardStyle, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{...cardStyle, padding:0, overflow:"hidden"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:16,cursor:"pointer",userSelect:"none"}}>
        <div style={{fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
          {icon && <span>{icon}</span>}{title}
          {badge}
        </div>
        <span style={{fontSize:14,color:"rgba(255,255,255,0.4)",transform:open?"rotate(180deg)":"none",transition:"transform .15s"}}>▾</span>
      </div>
      {open && <div style={{padding:"0 16px 16px"}}>{children}</div>}
    </div>
  );
}

function SplashTop({ dim }) {
  return (
    <svg viewBox="0 0 980 220" style={{position:"absolute",top:0,left:0,width:"100%",pointerEvents:"none",zIndex:1,opacity:dim?0.35:1}} preserveAspectRatio="none">
      <path d="M0,0 L980,0 L980,155 Q820,210 650,175 Q480,140 310,180 Q160,210 0,175 Z" fill="#2233d4"/>
      <ellipse cx="900" cy="28" rx="65" ry="20" fill="#2233d4" transform="rotate(-18,900,28)"/>
      <ellipse cx="55" cy="22" rx="58" ry="18" fill="#2233d4" transform="rotate(14,55,22)"/>
    </svg>
  );
}
function SplashBottom({ dim }) {
  return (
    <svg viewBox="0 0 980 220" style={{position:"absolute",bottom:0,left:0,width:"100%",pointerEvents:"none",zIndex:1,opacity:dim?0.35:1}} preserveAspectRatio="none">
      <path d="M0,220 L980,220 L980,65 Q820,15 650,50 Q480,85 310,42 Q160,10 0,48 Z" fill="#1a22b8"/>
      <ellipse cx="910" cy="200" rx="58" ry="18" fill="#1a22b8" transform="rotate(12,910,200)"/>
      <ellipse cx="65" cy="198" rx="52" ry="16" fill="#1a22b8" transform="rotate(-14,65,198)"/>
    </svg>
  );
}

function DragText({ id, positions, onMove, children, style }) {
  const dragging = useRef(false);
  const start = useRef({mx:0,my:0,ox:0,oy:0,baseDX:0,baseDY:0});
  const elRef = useRef(null);
  const pos = positions[id] || {x:0,y:0};

  const setGuide = (axis, active) => {
    const frame = elRef.current && elRef.current.closest('[data-poster-frame]');
    const guide = frame && frame.querySelector(`[data-guide="${axis}"]`);
    if (guide) {
      guide.style.opacity = active ? "1" : "0.55";
      guide.style.borderColor = active ? "#ff2f7e" : "rgba(255,60,120,0.6)";
    }
  };

  const move2 = e => {
    if (!dragging.current) return;
    e.preventDefault();
    const cl = e.touches ? e.touches[0] : e;
    const mdx = cl.clientX - start.current.mx;
    const mdy = cl.clientY - start.current.my;
    let nx = start.current.ox + mdx;
    let ny = start.current.oy + mdy;

    const THRESH = 10;
    const curDX = start.current.baseDX + mdx;
    const curDY = start.current.baseDY + mdy;
    if (Math.abs(curDX) < THRESH) { nx -= curDX; setGuide("v", true); } else setGuide("v", false);
    if (Math.abs(curDY) < THRESH) { ny -= curDY; setGuide("h", true); } else setGuide("h", false);

    onMove(id, {x: nx, y: ny});
  };
  const up = () => {
    dragging.current = false;
    setGuide("v", false);
    setGuide("h", false);
    window.removeEventListener("mousemove", move2);
    window.removeEventListener("mouseup", up);
    window.removeEventListener("touchmove", move2);
    window.removeEventListener("touchend", up);
  };
  const down = e => {
    e.preventDefault();
    dragging.current = true;
    const cl = e.touches ? e.touches[0] : e;
    let baseDX = 0, baseDY = 0;
    const frame = elRef.current && elRef.current.closest('[data-poster-frame]');
    if (frame && elRef.current) {
      const frameRect = frame.getBoundingClientRect();
      const elRect = elRef.current.getBoundingClientRect();
      baseDX = (elRect.left + elRect.width/2) - (frameRect.left + frameRect.width/2);
      baseDY = (elRect.top + elRect.height/2) - (frameRect.top + frameRect.height/2);
    }
    start.current = {mx:cl.clientX, my:cl.clientY, ox:pos.x, oy:pos.y, baseDX, baseDY};
    window.addEventListener("mousemove", move2);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move2, {passive:false});
    window.addEventListener("touchend", up);
  };
  return (
    <div ref={elRef} onMouseDown={down} onTouchStart={down} style={{position:"absolute",left:"50%",top:"50%",transform:`translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,cursor:"grab",userSelect:"none",zIndex:10,...style}}>
      {children}
    </div>
  );
}

function LogoBox({ src, alt, size=70 }) {
  return (
    <div style={{width:size,height:size,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",boxSizing:"border-box"}}>
      {src
        ? <img src={src} alt={alt} style={{maxWidth:"100%",maxHeight:"100%",width:"auto",height:"auto",display:"block"}}/>
        : <span style={{fontSize:size*0.4}}>🛡️</span>
      }
    </div>
  );
}
const INK = "#1a3fd6";
const PAINT = "#1a3fd6";
const TITLE_FONT = "'Arial Black','Helvetica Neue',Arial,sans-serif";

function PaintCorner({ corner }) {
  const isBR = corner === "br";
  return (
    <svg viewBox="0 0 220 220" style={{
      position:"absolute",
      top: isBR ? "auto" : 0, left: isBR ? "auto" : 0,
      bottom: isBR ? 0 : "auto", right: isBR ? 0 : "auto",
      width:"46%", height:"32%",
      transform: isBR ? "rotate(180deg)" : "none",
      zIndex:1, pointerEvents:"none",
    }} preserveAspectRatio="none">
      <path d="M0,0 L165,0
               C130,18 148,30 118,42
               C142,56 108,66 128,82
               C96,92 112,108 82,116
               C100,132 68,140 82,158
               C52,164 62,178 32,178
               L0,178 Z" fill={PAINT} opacity="0.92"/>
      <path d="M0,0 L90,0 C68,10 78,20 52,28 C64,38 40,42 46,52 L0,38 Z" fill="#ffffff" opacity="0.13"/>
      <circle cx="182" cy="55" r="6" fill={PAINT} opacity="0.7"/>
      <circle cx="198" cy="84" r="3.5" fill={PAINT} opacity="0.5"/>
      <circle cx="35" cy="188" r="4.5" fill={PAINT} opacity="0.55"/>
    </svg>
  );
}

function ChevronAccent({ side }) {
  const isLeft = side === "left";
  return (
    <svg viewBox="0 0 40 70" style={{
      position:"absolute", top:"44%",
      left: isLeft ? 0 : "auto", right: isLeft ? "auto" : 0,
      width:"7%", height:"11%",
      transform: isLeft ? "scaleX(-1)" : "none",
      zIndex:1, pointerEvents:"none",
    }}>
      <path d="M2 2 L26 35 L2 68" stroke={PAINT} strokeWidth="6" fill="none" opacity="0.85" strokeLinecap="round"/>
      <path d="M16 2 L36 35 L16 68" stroke={PAINT} strokeWidth="6" fill="none" opacity="0.6" strokeLinecap="round"/>
    </svg>
  );
}

function BrushUnderline({ width="58%" }) {
  return (
    <svg viewBox="0 0 300 22" style={{width, display:"block", margin:"6px auto 0"}}>
      <path d="M5,11 C40,4 60,17 95,10 C130,3 150,16 185,9 C215,4 235,15 295,10" stroke={PAINT} strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.9"/>
    </svg>
  );
}

function PosterFrame({ aspect, children, editMode }) {
  const [w, h] = aspect.split("/").map(Number);
  const pctHeight = (h / w) * 100;
  return (
    <div style={{width:"100%",position:"relative"}}>
      <div style={{width:"100%",paddingBottom:`${pctHeight}%`}}/>
      <div data-poster-frame style={{position:"absolute",inset:0,borderRadius:14,overflow:"hidden",background:"#ffffff",boxShadow:"0 8px 40px rgba(20,30,90,0.25)",border:"2px solid rgba(20,30,90,0.08)"}}>
        <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
          {children}
        </div>
        {editMode && (
          <>
            <div data-guide="v" style={{position:"absolute",left:"50%",top:0,bottom:0,width:0,borderLeft:"2px dashed rgba(255,60,120,0.6)",zIndex:50,pointerEvents:"none",transition:"border-color .1s"}}/>
            <div data-guide="h" style={{position:"absolute",top:"50%",left:0,right:0,height:0,borderTop:"2px dashed rgba(255,60,120,0.6)",zIndex:50,pointerEvents:"none",transition:"border-color .1s"}}/>
          </>
        )}
      </div>
    </div>
  );
}

function ResultPoster({ d, positions, onMove, editMode }) {
  const fmt = FORMATS.find(f=>f.id===d.format)||FORMATS[0];
  const dateStr = d.rawDate ? new Date(d.rawDate+"T12:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}) : "";
  const db = editMode ? "1px dashed rgba(20,30,90,0.5)" : "none";
  const dp = editMode ? "4px 8px" : "0";
  return (
    <PosterFrame aspect={fmt.ratio} editMode={editMode}>
      {(d.bgLayers||[]).map((layer,li) => (
        <div key={li} style={{position:"absolute",inset:0,zIndex:0,overflow:"hidden"}}>
          <img src={layer.image} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:(layer.opacity??20)/100,transform:`scale(${(layer.scale??100)/100}) translate(${layer.x??0}%, ${layer.y??0}%)`,transformOrigin:"center"}}/>
        </div>
      ))}
      {/* TOP */}
      <div style={{flex:"0 0 20%",position:"relative",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",paddingTop:"2%"}}>
        <DragText id="date" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,textAlign:"center",whiteSpace:"nowrap"}}>
          <div style={{fontFamily:d.font,fontStyle:"italic",fontWeight:700,fontSize:"clamp(15px,5vw,24px)",color:INK,position:"relative",zIndex:2}}>{dateStr||"Datum"}</div>
          {d.league && <div style={{fontSize:"clamp(9px,2.2vw,11px)",color:"rgba(20,40,150,0.55)",letterSpacing:1,textTransform:"uppercase",position:"relative",zIndex:2}}>{d.league}</div>}
        </DragText>
      </div>
      {/* MIDDLE */}
      <div style={{flex:"0 0 20%",position:"relative"}}>
        <DragText id="matchup" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:8,whiteSpace:"nowrap"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16}}>
            <LogoBox src={d.homeLogo} alt="Heim"/>
            <div style={{fontFamily:TITLE_FONT,fontWeight:900,fontSize:"clamp(16px,5.5vw,30px)",color:PAINT}}>VS</div>
            <LogoBox src={d.awayLogo} alt="Gast"/>
          </div>
        </DragText>
      </div>
      {/* BOTTOM */}
      <div style={{flex:1,position:"relative"}}>
        {[1,2,3].map((num,i)=>{
          const nameKey=`team${num}Name`, ghKey=`team${num}GoalsHome`, gaKey=`team${num}GoalsAway`, shKey=`team${num}ScorersHome`, saKey=`team${num}ScorersAway`;
          const nameTop = 8 + i*29, scoreTop = 20 + i*29, dividerTop = 34 + i*29;
          return (
            <Fragment key={num}>
              <DragText id={`t${num}name`} positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,textAlign:"center",whiteSpace:"nowrap",top:`${nameTop}%`}}>
                <div style={{fontFamily:d.font,fontStyle:"italic",fontWeight:700,fontSize:"clamp(13px,4vw,20px)",color:INK,position:"relative",zIndex:2}}>{d[nameKey]||`Team ${["","I","II","III"][num]}`}</div>
              </DragText>
              <DragText id={`t${num}score`} positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,width:"88%",top:`${scoreTop}%`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,position:"relative",zIndex:2}}>
                  <div style={{fontSize:"clamp(8px,2.2vw,11px)",color:"rgba(20,40,150,0.7)",lineHeight:1.6,flex:1}}>
                    {d[shKey] && d[shKey].split("\n").map((s,j)=><div key={j}>{s}</div>)}
                  </div>
                  <div style={{fontFamily:TITLE_FONT,fontWeight:900,fontSize:"clamp(24px,7.5vw,40px)",color:PAINT,lineHeight:1,flexShrink:0}}>
                    {d[ghKey]||"–"}:{d[gaKey]||"–"}
                  </div>
                  <div style={{fontSize:"clamp(8px,2.2vw,11px)",color:"rgba(20,40,150,0.7)",lineHeight:1.6,flex:1,textAlign:"right"}}>
                    {d[saKey] && d[saKey].split("\n").map((s,j)=><div key={j}>{s}</div>)}
                  </div>
                </div>
              </DragText>
              {num<3 && (
                <DragText id={`divider${num}`} positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,width:"88%",top:`${dividerTop}%`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,position:"relative",zIndex:2}}>
                    <div style={{flex:1,height:1,background:"rgba(20,40,150,0.25)"}}/>
                    <div style={{width:7,height:7,background:PAINT,transform:"rotate(45deg)",flexShrink:0,opacity:0.6}}/>
                    <div style={{flex:1,height:1,background:"rgba(20,40,150,0.25)"}}/>
                  </div>
                </DragText>
              )}
            </Fragment>
          );
        })}
        {d.hashtags && (
          <DragText id="hashtags" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,top:"97%",whiteSpace:"nowrap"}}>
            <div style={{fontSize:"clamp(7px,1.8vw,10px)",color:"rgba(20,40,150,0.45)",letterSpacing:.5,position:"relative",zIndex:2}}>{d.hashtags.split(" ").map(t=>t.startsWith("#")?t:`#${t}`).join(" ")}</div>
          </DragText>
        )}
      </div>
    </PosterFrame>
  );
}

function MatchdayPoster({ d, caption, positions, onMove, editMode }) {
  const fmt = FORMATS.find(f=>f.id===d.format)||FORMATS[0];
  const dateStr = d.rawDate ? new Date(d.rawDate+"T12:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}) : "";
  const allLines = (d.extraLines||[]).map((line,i)=>({line,i})).filter(x=>x.line);
  const db = editMode ? "1px dashed rgba(20,30,90,0.5)" : "none";
  const dp = editMode ? "4px 8px" : "0";
  return (
    <PosterFrame aspect={fmt.ratio} editMode={editMode}>
      {(d.bgLayers||[]).map((layer,li) => (
        <div key={li} style={{position:"absolute",inset:0,zIndex:0,overflow:"hidden"}}>
          <img src={layer.image} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:(layer.opacity??20)/100,transform:`scale(${(layer.scale??100)/100}) translate(${layer.x??0}%, ${layer.y??0}%)`,transformOrigin:"center"}}/>
        </div>
      ))}
      {/* TOP */}
      <div style={{flex:"0 0 22%",position:"relative",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",paddingTop:"2%"}}>
        <DragText id="date" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,textAlign:"center",whiteSpace:"nowrap"}}>
          {dateStr && <div style={{fontFamily:d.font,fontStyle:"italic",fontWeight:700,fontSize:"clamp(15px,5vw,24px)",color:INK,position:"relative",zIndex:2}}>{dateStr}</div>}
          {d.league && <div style={{fontSize:"clamp(9px,2.5vw,12px)",color:"rgba(20,40,150,0.55)",marginTop:2,letterSpacing:1,textTransform:"uppercase",position:"relative",zIndex:2}}>{d.league}</div>}
        </DragText>
      </div>
      {/* MIDDLE */}
      <div style={{flex:"0 0 44%",position:"relative",display:"flex",flexDirection:"column",justifyContent:"center",gap:"3%"}}>
        {[
          {h:d.homeLogo, a:d.awayLogo, hn:d.homeTeam, an:d.awayTeam, id:"matchup"},
          {h:d.homeLogoMatchday2, a:d.awayLogoMatchday2, hn:d.homeTeam2, an:d.awayTeam2, id:"matchup2"},
          {h:d.homeLogoMatchday3, a:d.awayLogoMatchday3, hn:d.homeTeam3, an:d.awayTeam3, id:"matchup3"},
        ].filter(p=>p.hn||p.an||p.h||p.a).map(p=>(
          <DragText key={p.id} id={p.id} positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:8,whiteSpace:"nowrap"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14}}>
              <LogoBox src={p.h} alt="Heim" size={56}/>
              <div style={{fontFamily:TITLE_FONT,fontWeight:900,fontSize:"clamp(13px,4.5vw,24px)",color:PAINT}}>VS</div>
              <LogoBox src={p.a} alt="Gast" size={56}/>
            </div>
          </DragText>
        ))}
      </div>
      {/* BOTTOM */}
      <div style={{flex:1,position:"relative"}}>
        {allLines.map(({line,i},idx)=>{
          const sm = line.length>22 && idx===allLines.length-1;
          const top = allLines.length>1 ? 12 + idx*(66/(allLines.length-1)) : 40;
          const mult = ((d.lineSizes||[])[i]??100)/100;
          return (
            <DragText key={i} id={`line${i}`} positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,textAlign:"center",width:"85%",top:`${top}%`}}>
              <div style={{fontFamily:d.font,fontStyle:"italic",fontWeight:sm?600:700,fontSize:sm?`clamp(${11*mult}px,${3.5*mult}vw,${16*mult}px)`:`clamp(${13*mult}px,${5*mult}vw,${26*mult}px)`,color:sm?"rgba(20,40,150,0.65)":INK,lineHeight:1.3,position:"relative",zIndex:2}}>{line}</div>
            </DragText>
          );
        })}
        {caption && (
          <DragText id="caption" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,width:"85%",top:"80%"}}>
            <div style={{fontSize:"clamp(8px,2.2vw,11px)",color:"rgba(20,40,150,0.75)",lineHeight:1.5,background:"rgba(20,40,150,0.06)",borderRadius:7,padding:"5px 9px",textAlign:"left",position:"relative",zIndex:2}}>{caption}</div>
          </DragText>
        )}
        {d.hashtags && (
          <DragText id="hashtags" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,top:"92%",whiteSpace:"nowrap"}}>
            <div style={{fontSize:"clamp(7px,1.8vw,10px)",color:"rgba(20,40,150,0.45)",letterSpacing:.5,position:"relative",zIndex:2}}>{d.hashtags.split(" ").map(t=>t.startsWith("#")?t:`#${t}`).join(" ")}</div>
          </DragText>
        )}
      </div>
    </PosterFrame>
  );
}

function SchedulePoster({ d, logoLib, positions, onMove, editMode }) {
  const fmt = FORMATS.find(f=>f.id===d.format)||FORMATS[0];
  const db = editMode ? "1px dashed rgba(255,255,255,0.5)" : "none";
  const dp = editMode ? "4px 8px" : "0";
  const dateStr = raw => {
    if (!raw) return "TT.MM.JJJJ";
    const [y,m,day] = raw.split("-");
    return day && m && y ? `${day}.${m}.${y}` : raw;
  };

  const sections = d.sections||[];
  const totalMatches = sections.reduce((n,s)=>n+((s.matches||[]).length),0);
  const totalRows = totalMatches + sections.length;

  // Automatische Größenanpassung: misst tatsächlich, ob der Inhalt in den
  // verfügbaren Platz passt, und verkleinert so lange, bis es passt.
  const boxRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);
  const contentKey = `${totalRows}|${d.font}|${d.scheduleTitle}|${d.format}`;

  useEffect(() => { setScale(1); }, [contentKey]);

  useLayoutEffect(() => {
    const box = boxRef.current, inner = contentRef.current;
    if (!box || !inner) return;
    const avail = box.clientHeight;
    const needed = inner.scrollHeight;
    if (needed > avail + 1) {
      const next = Math.max(0.3, scale * (avail/needed) * 0.96);
      if (next < scale - 0.005) setScale(next);
    }
  }, [scale, contentKey]);

  const px = (min,vw,max) => `clamp(${(min*scale).toFixed(1)}px, ${(vw*scale).toFixed(2)}vw, ${(max*scale).toFixed(1)}px)`;
  const timeMult = (d.schedTimeSize??100)/100;
  const pxTime = (min,vw,max) => `clamp(${(min*scale*timeMult).toFixed(1)}px, ${(vw*scale*timeMult).toFixed(2)}vw, ${(max*scale*timeMult).toFixed(1)}px)`;
  const logoSize = Math.round(70*scale);

  return (
    <PosterFrame aspect={fmt.ratio} editMode={editMode}>
      {(d.bgLayers||[]).map((layer,li) => (
        <div key={li} style={{position:"absolute",inset:0,zIndex:0,overflow:"hidden"}}>
          <img src={layer.image} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:(layer.opacity??20)/100,transform:`scale(${(layer.scale??100)/100}) translate(${layer.x??0}%, ${layer.y??0}%)`,transformOrigin:"center"}}/>
        </div>
      ))}
      {/* TITLE */}
      <div style={{flex:"0 0 20%",position:"relative",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",paddingTop:"2%"}}>
        <DragText id="title" positions={positions} onMove={onMove} style={{border:db,padding:dp,borderRadius:4,textAlign:"center",whiteSpace:"nowrap"}}>
          <div style={{position:"relative",zIndex:2,textAlign:"center"}}>
            <div style={{fontFamily:TITLE_FONT,fontWeight:900,fontSize:"clamp(24px,8.5vw,46px)",color:PAINT,letterSpacing:1,lineHeight:1,textTransform:"uppercase"}}>
              {d.scheduleTitle || "TEAM I"}
            </div>
          </div>
        </DragText>
      </div>
      {/* CONTENT */}
      <div ref={boxRef} style={{flex:1,position:"relative"}}>
        <div ref={contentRef} style={{position:"relative",zIndex:2,padding:"4% 7%",display:"flex",flexDirection:"column",justifyContent:"center",minHeight:"100%",transform:`scale(${(d.schedScale??100)/100}) translate(${d.schedX??0}%, ${d.schedY??0}%)`,transformOrigin:"center"}}>
          {sections.map((sec,si)=>(
            <div key={si} style={{marginBottom:`${(6*scale).toFixed(1)}%`}}>
              <div style={{fontFamily:d.font,fontStyle:"italic",fontWeight:900,fontSize:px(13,4,18),color:INK,textAlign:"center",letterSpacing:1,marginBottom:`${(4*scale).toFixed(1)}%`}}>{sec.name}</div>
              {(sec.matches||[]).map((m,mi)=>{
                const oppLogo = findLogoInLib(m.opponent, logoLib);
                const left  = m.isHome ? d.ownLogo : oppLogo;
                const right = m.isHome ? oppLogo   : d.ownLogo;
                return (
                  <div key={mi} style={{display:"flex",alignItems:"center",gap:"3%",marginBottom:`${(5*scale).toFixed(1)}%`}}>
                    <LogoBox src={left}  alt="Heim" size={logoSize}/>
                    <div style={{fontFamily:d.font,fontStyle:"italic",fontWeight:900,fontSize:px(14,4,20),color:PAINT,flexShrink:0}}>–</div>
                    <LogoBox src={right} alt="Gast" size={logoSize}/>
                    <div style={{width:2,alignSelf:"stretch",background:"rgba(20,40,150,0.25)",flexShrink:0}}/>
                    <div style={{fontFamily:d.font,fontStyle:"italic",fontWeight:900,color:INK,letterSpacing:1,lineHeight:1.4,flex:1,minWidth:0}}>
                      <div style={{fontSize:px(16,5,22),whiteSpace:"nowrap"}}>{dateStr(m.date)}</div>
                      <div style={{fontSize:pxTime(10,3,14),color:INK,whiteSpace:"nowrap"}}>{m.time?`${m.time} UHR`:"HH:MM UHR"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </PosterFrame>
  );
}

export default function App() {
  const [form, setForm]           = useState(() => ({...BLANK, ...loadLS("svmg_form", {})}));
  const [caption, setCaption]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [copied, setCopied]       = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showTpl, setShowTpl]     = useState(false);
  const [showLogos, setShowLogos] = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [allPositions, setAllPositions] = useState(() => loadLS("svmg_positions", { matchday: {}, result: {}, schedule: {} }));
  const positions = allPositions[form.postType] || {};
  const [slots, setSlots]         = useState(() => loadLS("svmg_slots", { matchday: null, result: null, schedule: null }));
  const [savedMsg, setSavedMsg]   = useState("");
  const [logoLib, setLogoLib]     = useState(() => loadLS("svmg_logos", []));
  const [bgLib, setBgLib]         = useState(() => loadLS("svmg_bglib", []));
  const [newLogoName, setNewLogoName] = useState("");
  const [pendingLogo, setPendingLogo] = useState(null);
  const logoUploadRef = useRef(null);
  const posterRef = useRef(null);

  // Automatisch in localStorage speichern
  useEffect(() => { saveLS("svmg_form", form); }, [form]);
  useEffect(() => { saveLS("svmg_slots", slots); }, [slots]);
  useEffect(() => { saveLS("svmg_logos", logoLib); }, [logoLib]);
  useEffect(() => { saveLS("svmg_bglib", bgLib); }, [bgLib]);
  useEffect(() => { saveLS("svmg_positions", allPositions); }, [allPositions]);

  // Logo-Bibliothek
  const handleLogoPick = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      // Bild verkleinern damit es in localStorage passt
      const img = new Image();
      img.onload = () => {
        const max = 200; // max 200px
        let { width, height } = img;
        if (width > height) { if (width > max) { height = height * max / width; width = max; } }
        else { if (height > max) { width = width * max / height; height = max; } }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        setPendingLogo(canvas.toDataURL("image/png"));
      };
      img.src = ev.target.result;
    };
    r.readAsDataURL(f);
    e.target.value = "";
  };
  const addToLib = () => {
    if (!pendingLogo || !newLogoName.trim()) return;
    const updated = [...logoLib, { name: newLogoName.trim(), logo: pendingLogo }];
    setLogoLib(updated);
    try {
      saveLS("svmg_logos", updated);
    } catch {
      alert("Speicher voll — bitte ein paar alte Logos löschen.");
    }
    setNewLogoName(""); setPendingLogo(null);
  };
  const removeFromLib = async (name) => {
    const updated = logoLib.filter(e => e.name !== name);
    setLogoLib(updated);
    saveLS("svmg_logos", updated);
  };
  // Hintergrundfoto-Bibliothek — Fotos sind gemeinsam; Ein/Aus-Status und Einstellungen getrennt gespeichert, damit Ausblenden nichts löscht
  const addBgPhoto = (dataUrl) => {
    if (!dataUrl) return null;
    const existing = bgLib.find(b => b.image === dataUrl);
    if (existing) return existing.id;
    const id = `bg_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    setBgLib([...bgLib, { id, image: dataUrl }]);
    return id;
  };
  const removeBgPhoto = (id) => {
    setBgLib(bgLib.filter(b => b.id !== id));
    ["Matchday","Result","Schedule"].forEach(suf => {
      set(`bgActive${suf}`, (form[`bgActive${suf}`]||[]).filter(x => x !== id));
      const settings = {...(form[`bgSettings${suf}`]||{})};
      delete settings[id];
      set(`bgSettings${suf}`, settings);
    });
  };
  const getBgEntry = id => bgLib.find(b => b.id === id) || null;
  const activateBgPhoto = (suf, photoId) => {
    const active = form[`bgActive${suf}`]||[];
    if (!active.includes(photoId)) set(`bgActive${suf}`, [...active, photoId]);
    const settings = form[`bgSettings${suf}`]||{};
    if (!settings[photoId]) set(`bgSettings${suf}`, {...settings, [photoId]: {opacity:35,scale:100,x:0,y:0}});
  };
  const toggleBgLayer = (suf, photoId) => {
    const active = form[`bgActive${suf}`]||[];
    if (active.includes(photoId)) set(`bgActive${suf}`, active.filter(x => x !== photoId));
    else activateBgPhoto(suf, photoId);
  };
  const updateBgLayer = (suf, photoId, key, value) => {
    const settings = form[`bgSettings${suf}`]||{};
    const cur = settings[photoId] || {opacity:35,scale:100,x:0,y:0};
    set(`bgSettings${suf}`, {...settings, [photoId]: {...cur, [key]: value}});
  };
  const bgFor = suf => {
    const active = form[`bgActive${suf}`]||[];
    const settings = form[`bgSettings${suf}`]||{};
    return { bgLayers: active.map(id => {
      const entry = getBgEntry(id);
      if (!entry) return null;
      const s = settings[id] || {opacity:35,scale:100,x:0,y:0};
      return { image: entry.image, opacity: s.opacity, scale: s.scale, x: s.x, y: s.y };
    }).filter(Boolean) };
  };

  const [ocrStatus, setOcrStatus] = useState("");

  // Nutzt den mitlaufenden Spielstand (z.B. "0:1", "0:2", "1:2" ...) um automatisch zu erkennen,
  // welche Seite getroffen hat — funktioniert mit einem einzigen Foto für beide Mannschaften.
  const parseMatchReportBothSides = (text) => {
    let raw = text.replace(/\r/g,"");
    // Überschrift/Endstand ("SPIELDETAILS 2:5") und Halbzeitstand ("[0:3]") sind keine einzelnen
    // Tor-Einträge — deshalb erst ab dem Wort "TORE" (Tore-Liste) auswerten, falls vorhanden.
    const toreIdx = raw.search(/\bTORE\b/i);
    if (toreIdx >= 0) raw = raw.slice(toreIdx + 4);
    const scoreMatches = [...raw.matchAll(/(\d{1,2})\s*[:.]\s*(\d{1,2})/g)];
    const events = [];
    for (let i=0; i<scoreMatches.length; i++) {
      const sm = scoreMatches[i];
      const home = parseInt(sm[1],10), away = parseInt(sm[2],10);
      if (home>20 || away>20) continue; // unrealistisch hohe "Scores" ausfiltern (z.B. Uhrzeiten)
      const before = raw.slice(0, sm.index);
      const name = (before.trimEnd().split("\n").pop() || "").replace(/[0-9:.\-–]+/g," ").replace(/\s+/g," ").trim();
      if (!name || name.length<2) continue;
      const winEnd = scoreMatches[i+1] ? scoreMatches[i+1].index : Math.min(raw.length, sm.index + sm[0].length + 40);
      const after = raw.slice(sm.index + sm[0].length, winEnd);
      const minMatch = after.match(/(\d{1,3})/);
      let minute = minMatch ? parseInt(minMatch[1],10) : null;
      // OCR liest manchmal eine zusätzliche führende Ziffer (z.B. "140" statt "40") —
      // in dem Fall die letzten zwei Ziffern nehmen.
      if (minute > 99) {
        const alt = minute % 100;
        minute = (alt >= 1 && alt <= 99) ? alt : null;
      }
      if (!minute || minute<1 || minute>99) minute = null;
      // Wichtiger als die Minute ist Name + richtige Seite (Heim/Gast) — deshalb Tor nie verwerfen,
      // notfalls Minute leer lassen statt das ganze Tor zu verlieren.
      events.push({ minute, home, away, name });
    }
    const homeEvents=[], awayEvents=[];
    let prevH=0, prevA=0;
    for (const ev of events) {
      if (ev.home>prevH) homeEvents.push(ev);
      else if (ev.away>prevA) awayEvents.push(ev);
      prevH=Math.max(prevH,ev.home); prevA=Math.max(prevA,ev.away);
    }
    // Mehrfache Tore desselben Spielers zu einer Zeile zusammenfassen (z.B. "15', 24' S. Brauner")
    const groupByScorer = (evs) => {
      const order = [];
      const minutesByName = {};
      for (const ev of evs) {
        if (!(ev.name in minutesByName)) { minutesByName[ev.name] = []; order.push(ev.name); }
        if (ev.minute) minutesByName[ev.name].push(`${ev.minute}'`);
      }
      return order.map(name => {
        const mins = minutesByName[name];
        return mins.length ? `${mins.join(", ")} ${name}` : `' ${name}`;
      });
    };
    const homeGoals = groupByScorer(homeEvents);
    const awayGoals = groupByScorer(awayEvents);
    return { homeGoals, awayGoals };
  };

  const [ocrRawText, setOcrRawText] = useState("");
  const [ocrRawFor, setOcrRawFor] = useState(null);

  // Text direkt einfügen (z.B. von FuPa kopiert) — keine Bilderkennung nötig, deutlich zuverlässiger
  const [pasteText, setPasteText] = useState("");
  const [pasteFor, setPasteFor] = useState(null);
  const applyPastedText = (shKey, saKey) => {
    if (!pasteText.trim()) return;
    const { homeGoals, awayGoals } = parseMatchReportBothSides(pasteText);
    if (homeGoals.length===0 && awayGoals.length===0) {
      setOcrStatus("⚠️ Im eingefügten Text kein Minute+Spielstand-Muster gefunden.");
      setOcrRawFor(shKey+saKey); setOcrRawText(pasteText);
      return;
    }
    setForm(f => ({
      ...f,
      [shKey]: homeGoals.join("\n"),
      [saKey]: awayGoals.join("\n"),
    }));
    setOcrStatus(`✅ Erkannt: ${homeGoals.length} Tor(e) links, ${awayGoals.length} Tor(e) rechts — bitte Seiten prüfen (Feld-Inhalt wurde ersetzt)`);
    setOcrRawFor(shKey+saKey); setOcrRawText(pasteText);
    setPasteText(""); setPasteFor(null);
  };

  // Auto-Zuweisung
  const findLogo = name => findLogoInLib(name, logoLib);
  const setWithAutoLogo = (updates) => {
    setForm(f => {
      const next = {...f, ...updates};
      const suffix = f.postType==="result" ? "Result" : "Matchday";
      if (updates.homeTeam !== undefined) { const l = findLogo(updates.homeTeam); if (l) next[`homeLogo${suffix}`] = l; }
      if (updates.awayTeam !== undefined) { const l = findLogo(updates.awayTeam); if (l) next[`awayLogo${suffix}`] = l; }
      if (updates.homeTeam2 !== undefined) { const l = findLogo(updates.homeTeam2); if (l) next.homeLogoMatchday2 = l; }
      if (updates.awayTeam2 !== undefined) { const l = findLogo(updates.awayTeam2); if (l) next.awayLogoMatchday2 = l; }
      if (updates.homeTeam3 !== undefined) { const l = findLogo(updates.homeTeam3); if (l) next.homeLogoMatchday3 = l; }
      if (updates.awayTeam3 !== undefined) { const l = findLogo(updates.awayTeam3); if (l) next.awayLogoMatchday3 = l; }
      return next;
    });
  };

  const saveSlot = async (type) => {
    const data = {...form, _savedAt: new Date().toLocaleTimeString("de-DE", {hour:"2-digit", minute:"2-digit"})};
    const updated = {...slots, [type]: data};
    setSlots(updated);
    saveLS("svmg_slots", updated);
    setSavedMsg(type);
    setTimeout(() => setSavedMsg(""), 2000);
  };

  const loadSlot = (type) => {
    if (!slots[type]) return;
    setForm({...BLANK, ...slots[type]});
    setShowTpl(false);
  };

  const deleteSlot = async (type) => {
    const updated = {...slots, [type]: null};
    setSlots(updated);
    saveLS("svmg_slots", updated);
  };

  const set = (k,v) => {
    if (k === "homeTeam" || k === "awayTeam" || k === "homeTeam2" || k === "awayTeam2" || k === "homeTeam3" || k === "awayTeam3") {
      setWithAutoLogo({[k]: v});
    } else {
      setForm(f=>({...f,[k]:v}));
    }
  };
  const setLine = (i,v) => setForm(f=>{const l=[...f.extraLines];l[i]=v;return{...f,extraLines:l};});
  const addLine = () => setForm(f=>({...f,extraLines:[...f.extraLines,""],lineSizes:[...(f.lineSizes||[]),100]}));
  const removeLine = i => setForm(f=>({...f,extraLines:f.extraLines.filter((_,j)=>j!==i),lineSizes:(f.lineSizes||[]).filter((_,j)=>j!==i)}));
  const setLineSize = (i,v) => setForm(f=>{const s=[...(f.lineSizes||[])];while(s.length<=i)s.push(100);s[i]=v;return{...f,lineSizes:s};});

  // Spielplan (Rubriken & Spiele)
  const addSection = () => setForm(f=>({...f,sections:[...(f.sections||[]),{name:"Neue Rubrik",matches:[{opponent:"",isHome:true,date:"",time:""}]}]}));
  const removeSection = si => setForm(f=>({...f,sections:(f.sections||[]).filter((_,i)=>i!==si)}));
  const setSectionName = (si,name) => setForm(f=>{const s=[...(f.sections||[])];s[si]={...s[si],name};return{...f,sections:s};});
  const addMatch = si => setForm(f=>{const s=[...(f.sections||[])];s[si]={...s[si],matches:[...(s[si].matches||[]),{opponent:"",isHome:true,date:"",time:""}]};return{...f,sections:s};});
  const removeMatch = (si,mi) => setForm(f=>{const s=[...(f.sections||[])];s[si]={...s[si],matches:(s[si].matches||[]).filter((_,j)=>j!==mi)};return{...f,sections:s};});
  const setMatchField = (si,mi,key,val) => setForm(f=>{const s=[...(f.sections||[])];const matches=[...(s[si].matches||[])];matches[mi]={...matches[mi],[key]:val};s[si]={...s[si],matches};return{...f,sections:s};});
  const onMove = (id,pos) => setAllPositions(p => ({...p, [form.postType]: {...(p[form.postType]||{}), [id]: pos}}));

  const downloadPoster = async () => {
    setDownloading(true);
    try {
      const canvas = await html2canvas(posterRef.current,{scale:3,useCORS:true,allowTaint:true,backgroundColor:null});
      const filename = `matchday-${form.homeTeam||form.scheduleTitle||"post"}.png`.replace(/\s+/g,"-");
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      const file = new File([blob], filename, { type: "image/png" });

      // iOS/Safari: natives Teilen-Menü mit "In Fotos sichern" (funktioniert dort zuverlässiger als der Download-Link)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filename });
        } catch (shareErr) {
          if (!shareErr || shareErr.name !== "AbortError") {
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 10000);
          }
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.download = filename;
        a.href = url;
        a.click();
        // Fallback: Bild zusätzlich in neuem Tab öffnen, falls der Download-Link vom Browser ignoriert wird
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch (e) {
      if (e && e.name !== "AbortError") alert("Download fehlgeschlagen.");
    }
    setDownloading(false);
  };

  const isResult = form.postType==="result";
  const isSchedule = form.postType==="schedule";
  const typeSuffix = isSchedule ? "Schedule" : isResult ? "Result" : "Matchday";

  const renderTeamBlock = (num, medal) => {
    const nameKey=`team${num}Name`, sideKey=`team${num}SvmgSide`, ghKey=`team${num}GoalsHome`, gaKey=`team${num}GoalsAway`, shKey=`team${num}ScorersHome`, saKey=`team${num}ScorersAway`;
    return (
      <Collapsible key={num} title={`${medal} Team ${["","I","II","III"][num]}`} cardStyle={card}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{gridColumn:"1/-1"}}><label>Teamname</label><input value={form[nameKey]} onChange={e=>set(nameKey,e.target.value)} placeholder={`Team ${["","I","II","III"][num]}`}/></div>
          <div style={{gridColumn:"1/-1",display:"flex",gap:8}}>
            <button onClick={()=>set(sideKey,"home")} style={{flex:1,background:form[sideKey]==="home"?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${form[sideKey]==="home"?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:7,padding:"7px",color:form[sideKey]==="home"?"#6eb4ff":"rgba(255,255,255,0.5)",fontSize:12,fontWeight:600,cursor:"pointer"}}>🏠 SVMG spielt Heim</button>
            <button onClick={()=>set(sideKey,"away")} style={{flex:1,background:form[sideKey]==="away"?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${form[sideKey]==="away"?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:7,padding:"7px",color:form[sideKey]==="away"?"#6eb4ff":"rgba(255,255,255,0.5)",fontSize:12,fontWeight:600,cursor:"pointer"}}>🚌 SVMG spielt Auswärts</button>
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
            <div style={{flex:1}}><label>Heim-Tore</label><input value={form[ghKey]} onChange={e=>set(ghKey,e.target.value)} placeholder="2" style={{textAlign:"center",fontSize:22,fontWeight:700}}/></div>
            <span style={{fontSize:22,color:"rgba(255,255,255,0.3)",paddingBottom:8}}>:</span>
            <div style={{flex:1}}><label>Gast-Tore</label><input value={form[gaKey]} onChange={e=>set(gaKey,e.target.value)} placeholder="1" style={{textAlign:"center",fontSize:22,fontWeight:700}}/></div>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <div style={{marginTop:8,background:"rgba(46,204,113,0.08)",border:"1px solid rgba(46,204,113,0.3)",borderRadius:7,padding:9}}>
              <div style={{fontSize:12,fontWeight:600,color:"#7ee8a8",marginBottom:6}}>📋 Text einfügen (z. B. von FuPa kopiert) — zuverlässiger als Foto</div>
              <textarea value={pasteFor===(shKey+saKey) ? pasteText : ""} onFocus={()=>setPasteFor(shKey+saKey)} onChange={e=>{setPasteFor(shKey+saKey); setPasteText(e.target.value);}} placeholder={"Text vom Spielbericht hier einfügen (lange auf die Seite tippen → Alles auswählen → Kopieren)"} style={{minHeight:70}}/>
              <button onClick={()=>applyPastedText(shKey,saKey)} disabled={!pasteText.trim() || pasteFor!==(shKey+saKey)} style={{marginTop:6,width:"100%",background:(pasteText.trim() && pasteFor===(shKey+saKey))?"#2ecc71":"rgba(255,255,255,0.08)",border:"none",borderRadius:6,padding:"8px",color:(pasteText.trim() && pasteFor===(shKey+saKey))?"#0a1f14":"rgba(255,255,255,0.3)",fontSize:12,fontWeight:700,cursor:(pasteText.trim() && pasteFor===(shKey+saKey))?"pointer":"not-allowed"}}>
                Text auswerten
              </button>
            </div>

            {(ocrRawFor===(shKey+saKey) || ocrRawFor===shKey || ocrRawFor===saKey) && ocrStatus && (
              <div style={{marginTop:8,fontSize:11,color:"rgba(255,255,255,0.55)",background:"rgba(255,255,255,0.05)",borderRadius:6,padding:"6px 8px"}}>{ocrStatus}</div>
            )}
            {(ocrRawFor===(shKey+saKey) || ocrRawFor===shKey || ocrRawFor===saKey) && (
              <div style={{marginTop:8}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:4}}>Erkannter/eingefügter Text (zum manuellen Kopieren) — {ocrRawText ? `${ocrRawText.length} Zeichen` : "leer"}:</div>
                <textarea readOnly value={ocrRawText || "(kein Text erkannt)"} style={{width:"100%",minHeight:90,fontSize:11,fontFamily:"monospace",background:"rgba(0,0,0,0.3)",color:"rgba(255,255,255,0.6)"}}/>
              </div>
            )}
          </div>
          <div style={{gridColumn:"1/-1",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label>Torschützen Heim</label>
              <textarea value={form[shKey]} onChange={e=>set(shKey,e.target.value)} placeholder={"23' S. Brauner\n87' L. Schwarzenbach"}/>
            </div>
            <div>
              <label>Torschützen Gast</label>
              <textarea value={form[saKey]} onChange={e=>set(saKey,e.target.value)} placeholder={"5' F. Stöckeler\n33' E. Gresser"}/>
            </div>
          </div>
        </div>
      </Collapsible>
    );
  };
  const fullText = [caption, form.hashtags?"\n\n"+form.hashtags.split(" ").map(t=>t.startsWith("#")?t:`#${t}`).join(" "):""].join("");
  const card = {background:"rgba(255,255,255,0.04)",borderRadius:12,padding:16,border:"1px solid rgba(255,255,255,0.07)"};

  return (
    <div style={{minHeight:"100vh",background:"#090e3a",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#fff"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Anton&family=Oswald:wght@700&family=Bangers&family=Russo+One&family=Righteous&family=Permanent+Marker&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input,select,textarea{background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.15);border-radius:8px;padding:9px 12px;color:#fff;font-family:inherit;font-size:14px;outline:none;width:100%;transition:border-color .2s}
        input:focus,select:focus,textarea:focus{border-color:#6eb4ff}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.22)}
        textarea{resize:vertical;min-height:60px}
        label{font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:rgba(255,255,255,0.45);display:block;margin-bottom:5px}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Header */}
      <div style={{background:"linear-gradient(90deg,#2233d4,#1018b0)",borderBottom:"3px solid rgba(255,255,255,0.18)",padding:"14px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:26}}>⚽</span>
          <div>
            <div style={{fontFamily:"'Comic Sans MS',cursive",fontStyle:"italic",fontWeight:700,fontSize:20}}>Matchday Post Generator</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",letterSpacing:1,textTransform:"uppercase"}}>SV Maierhöfen-Grünenbach</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowLogos(v=>!v)} style={{background:"rgba(255,255,255,0.1)",border:"1.5px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"8px 14px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            🛡️ Logos {logoLib.length>0&&<span style={{background:"#2233d4",borderRadius:10,padding:"1px 7px",fontSize:11,marginLeft:4}}>{logoLib.length}</span>}
          </button>
          <button onClick={()=>setShowTpl(v=>!v)} style={{background:"rgba(255,255,255,0.1)",border:"1.5px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"8px 14px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            💾 Vorlagen
          </button>
        </div>
      </div>

      {/* Logo-Bibliothek Panel */}
      {showLogos && (
        <div style={{background:"#111a4a",borderBottom:"1px solid rgba(255,255,255,0.1)",padding:"16px 22px"}}>
          <div style={{maxWidth:1080,margin:"0 auto"}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"rgba(255,255,255,0.7)"}}>🛡️ Logo-Bibliothek — einmal hochladen, automatisch zuweisen</div>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
              <div onClick={()=>logoUploadRef.current.click()} style={{width:56,height:56,borderRadius:8,background:pendingLogo?`url("${pendingLogo}") center/contain no-repeat #fff`:"rgba(255,255,255,0.08)",border:"2px dashed rgba(255,255,255,0.25)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                {!pendingLogo && "📁"}
                <input ref={logoUploadRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleLogoPick}/>
              </div>
              <input value={newLogoName} onChange={e=>setNewLogoName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addToLib()} placeholder="Vereinsname (z. B. TSV Meckenbeuren)" style={{flex:1,minWidth:180,background:"rgba(255,255,255,0.08)",border:"1.5px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"9px 12px",color:"#fff",fontSize:14,outline:"none"}}/>
              <button onClick={addToLib} disabled={!pendingLogo||!newLogoName.trim()} style={{background:pendingLogo&&newLogoName.trim()?"#2233d4":"rgba(255,255,255,0.1)",border:"none",borderRadius:8,padding:"9px 18px",color:"#fff",fontWeight:700,fontSize:13,cursor:pendingLogo&&newLogoName.trim()?"pointer":"not-allowed",whiteSpace:"nowrap"}}>+ Hinzufügen</button>
            </div>
            {logoLib.length===0
              ? <div style={{fontSize:13,color:"rgba(255,255,255,0.3)"}}>Noch keine Logos. Wappen hochladen + Vereinsname eingeben.</div>
              : <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                  {logoLib.map(e=>(
                    <div key={e.name} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"8px 12px",display:"flex",alignItems:"center",gap:10}}>
                      <img src={e.logo} alt={e.name} style={{width:36,height:36,objectFit:"contain",borderRadius:4,background:"#fff",padding:2}}/>
                      <span style={{fontSize:13,fontWeight:600}}>{e.name}</span>
                      <button onClick={()=>removeFromLib(e.name)} style={{background:"rgba(255,60,60,0.15)",border:"1px solid rgba(255,60,60,0.3)",borderRadius:6,padding:"3px 8px",color:"#ff8080",fontSize:12,cursor:"pointer"}}>✕</button>
                    </div>
                  ))}
                </div>
            }
            <div style={{marginTop:10,fontSize:11,color:"rgba(255,255,255,0.25)"}}>💡 Beim Tippen eines Vereinsnamens oder Laden eines Spiels wird das Logo automatisch zugewiesen.</div>
          </div>
        </div>
      )}



      {showTpl && (
        <div style={{background:"#111a4a",borderBottom:"1px solid rgba(255,255,255,0.1)",padding:"16px 22px"}}>
          <div style={{maxWidth:1080,margin:"0 auto"}}>

            {/* Slots */}
            <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:16}}>
              {[{type:"matchday",label:"⚽ Spieltag-Ankündigung"},{type:"result",label:"🏁 Spielbericht"},{type:"schedule",label:"🗓️ Spielplan"}].map(({type,label})=>(
                <div key={type} style={{flex:1,minWidth:220,background:"rgba(255,255,255,0.05)",borderRadius:10,padding:14,border:"1px solid rgba(255,255,255,0.1)"}}>
                  <div style={{fontWeight:700,fontSize:12,marginBottom:10,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:.8}}>{label}</div>
                  {slots[type] ? (
                    <div>
                      <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginBottom:4}}>Gespeichert um {slots[type]._savedAt}</div>
                      <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:10}}>{type==="schedule" ? (slots[type].scheduleTitle||"Spielplan") : `${slots[type].homeTeam||"–"} vs ${slots[type].awayTeam||"–"}`}</div>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>loadSlot(type)} style={{flex:1,background:"rgba(34,51,212,0.6)",border:"1px solid #6eb4ff",borderRadius:7,padding:"8px",color:"#6eb4ff",fontSize:13,fontWeight:700,cursor:"pointer"}}>📂 Laden</button>
                        <button onClick={()=>saveSlot(type)} style={{flex:1,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.18)",borderRadius:7,padding:"8px",color:"#fff",fontSize:12,cursor:"pointer"}}>🔄 Update</button>
                        <button onClick={()=>deleteSlot(type)} style={{background:"rgba(255,60,60,0.15)",border:"1px solid rgba(255,60,60,0.3)",borderRadius:7,padding:"8px 10px",color:"#ff8080",fontSize:13,cursor:"pointer"}}>✕</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{fontSize:12,color:"rgba(255,255,255,0.3)",marginBottom:10}}>Noch nichts gespeichert.</div>
                      <button onClick={()=>saveSlot(type)} style={{width:"100%",background:"#2233d4",border:"none",borderRadius:7,padding:"10px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>💾 Jetzt speichern</button>
                    </div>
                  )}
                  {savedMsg===type && <div style={{marginTop:8,fontSize:12,color:"#5dff8a",fontWeight:600}}>✅ Gespeichert!</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{maxWidth:1080,margin:"0 auto",padding:22,display:"flex",gap:22,alignItems:"flex-start"}}>

        {/* FORM */}
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:14}}>

          <div style={card}>
            <label style={{fontSize:13,marginBottom:10}}>Post-Typ</label>
            <div style={{display:"flex",gap:8}}>
              {POST_TYPES.map(t=>(
                <button key={t.id} onClick={()=>set("postType",t.id)} style={{flex:1,background:form.postType===t.id?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${form.postType===t.id?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:8,padding:"10px",color:form.postType===t.id?"#6eb4ff":"rgba(255,255,255,0.55)",fontSize:14,fontWeight:600,cursor:"pointer"}}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* Format */}
          <Collapsible title="Format" cardStyle={card}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {FORMATS.map(f=>(
                <button key={f.id} onClick={()=>set("format",f.id)} style={{background:form.format===f.id?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${form.format===f.id?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:8,padding:"10px 8px",cursor:"pointer",textAlign:"center",display:"flex",flexDirection:"column",gap:3,alignItems:"center"}}>
                  <span style={{fontSize:20}}>{f.label.split(" ")[0]}</span>
                  <span style={{fontSize:12,fontWeight:700,color:form.format===f.id?"#6eb4ff":"#fff"}}>{f.label.split(" ").slice(1).join(" ")}</span>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>{f.sub}</span>
                </button>
              ))}
            </div>
          </Collapsible>

          {/* Wappen */}
          {!isSchedule && (
            <Collapsible title="Vereinswappen" cardStyle={card}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <ImgUpload label="Heim-Wappen" value={form[`homeLogo${isResult?"Result":"Matchday"}`]} onChange={v=>set(`homeLogo${isResult?"Result":"Matchday"}`,v)} h={100}/>
                <ImgUpload label="Gast-Wappen" value={form[`awayLogo${isResult?"Result":"Matchday"}`]} onChange={v=>set(`awayLogo${isResult?"Result":"Matchday"}`,v)} h={100}/>
              </div>
            </Collapsible>
          )}

          {/* Hintergrundfoto */}
          <Collapsible title={`🖼️ Hintergrundfoto — ${typeSuffix==="Matchday"?"Spieltag-Ankündigung":typeSuffix==="Result"?"Spielbericht":"Spielplan"}`} cardStyle={card}>
            <ImgUpload label="" value={null} onChange={v=>{ if(!v) return; const id=addBgPhoto(v); activateBgPhoto(typeSuffix,id); }} h={110}/>

            {bgLib.length>0 && (
              <div style={{marginTop:12}}>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginBottom:6}}>Deine Fotos — anklicken zum Ein-/Ausblenden (mehrere gleichzeitig möglich, Einstellungen bleiben beim Ausblenden erhalten)</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {bgLib.map(entry=>{
                    const active = (form[`bgActive${typeSuffix}`]||[]).includes(entry.id);
                    return (
                      <div key={entry.id} style={{position:"relative"}}>
                        <img src={entry.image} alt="" onClick={()=>toggleBgLayer(typeSuffix,entry.id)}
                          style={{width:56,height:56,objectFit:"cover",borderRadius:8,cursor:"pointer",border:active?"2.5px solid #6eb4ff":"2.5px solid transparent",opacity:active?1:0.5}}/>
                        {active && <div style={{position:"absolute",bottom:-6,left:"50%",transform:"translateX(-50%)",background:"#6eb4ff",color:"#0a1030",fontSize:9,fontWeight:700,borderRadius:8,padding:"1px 6px"}}>AN</div>}
                        <button onClick={()=>removeBgPhoto(entry.id)} style={{position:"absolute",top:-6,right:-6,width:18,height:18,borderRadius:"50%",background:"rgba(255,60,60,0.9)",border:"none",color:"#fff",fontSize:11,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(form[`bgActive${typeSuffix}`]||[]).map(photoId=>{
              const entry = getBgEntry(photoId);
              if (!entry) return null;
              const s = (form[`bgSettings${typeSuffix}`]||{})[photoId] || {opacity:35,scale:100,x:0,y:0};
              return (
                <div key={photoId} style={{marginTop:14,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.08)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <img src={entry.image} alt="" style={{width:24,height:24,objectFit:"cover",borderRadius:5}}/>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Einstellungen für dieses Foto — nur bei {typeSuffix==="Matchday"?"Spieltag-Ankündigung":typeSuffix==="Result"?"Spielbericht":"Spielplan"}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {[
                      {key:"opacity", label:"Helligkeit", min:5,  max:100, unit:"%"},
                      {key:"scale",   label:"Größe",      min:50, max:400, unit:"%"},
                      {key:"x",       label:"Position X", min:-50,max:50,  unit:""},
                      {key:"y",       label:"Position Y", min:-50,max:50,  unit:""},
                    ].map(({key,label,min,max,unit})=>(
                      <div key={key} style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:12,color:"rgba(255,255,255,0.5)",width:72,flexShrink:0}}>{label}</span>
                        <input type="range" min={min} max={max} value={s[key]}
                          onChange={e=>updateBgLayer(typeSuffix,photoId,key,parseInt(e.target.value))}
                          style={{flex:1,background:"transparent",border:"none",padding:0,accentColor:"#6eb4ff"}}/>
                        <span style={{fontSize:12,color:"rgba(255,255,255,0.5)",width:38,textAlign:"right"}}>{s[key]}{unit}</span>
                      </div>
                    ))}
                    <button onClick={()=>{updateBgLayer(typeSuffix,photoId,"opacity",35);updateBgLayer(typeSuffix,photoId,"scale",100);updateBgLayer(typeSuffix,photoId,"x",0);updateBgLayer(typeSuffix,photoId,"y",0);}}
                      style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,padding:"6px",color:"rgba(255,255,255,0.4)",fontSize:12,cursor:"pointer"}}>
                      ↺ Zurücksetzen
                    </button>
                  </div>
                </div>
              );
            })}
          </Collapsible>

          {/* Spielplan-Editor (nur Spielplan) */}
          {isSchedule && (
            <>
              <Collapsible title="Titel & eigenes Wappen" cardStyle={card}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <div><label>Titel</label><input value={form.scheduleTitle} onChange={e=>set("scheduleTitle",e.target.value)} placeholder="TEAM I"/></div>
                  <ImgUpload label="Eigenes Wappen (SVMG)" value={form.ownLogo} onChange={v=>set("ownLogo",v)} h={90}/>
                </div>
              </Collapsible>

              <Collapsible title="↕️ Größe & Position (Spielliste)" cardStyle={card}>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.32)",marginBottom:12}}>Die Liste passt sich automatisch an — hiermit kannst du zusätzlich manuell nachjustieren.</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[
                    {key:"schedScale",    label:"Größe",         min:50,  max:150, def:100, unit:"%"},
                    {key:"schedX",        label:"Position X",    min:-50, max:50,  def:0,   unit:""},
                    {key:"schedY",        label:"Position Y",    min:-50, max:50,  def:0,   unit:""},
                    {key:"schedTimeSize", label:"Uhrzeit-Größe", min:50,  max:200, def:100, unit:"%"},
                  ].map(({key,label,min,max,def,unit})=>(
                    <div key={key} style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:12,color:"rgba(255,255,255,0.5)",width:72,flexShrink:0}}>{label}</span>
                      <input type="range" min={min} max={max} value={form[key]??def}
                        onChange={e=>set(key,parseInt(e.target.value))}
                        style={{flex:1,background:"transparent",border:"none",padding:0,accentColor:"#6eb4ff"}}/>
                      <span style={{fontSize:12,color:"rgba(255,255,255,0.5)",width:38,textAlign:"right"}}>{form[key]??def}{unit}</span>
                    </div>
                  ))}
                  <button onClick={()=>{set("schedScale",100);set("schedX",0);set("schedY",0);set("schedTimeSize",100);}}
                    style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,padding:"6px",color:"rgba(255,255,255,0.4)",fontSize:12,cursor:"pointer"}}>
                    ↺ Zurücksetzen
                  </button>
                </div>
              </Collapsible>

              {(form.sections||[]).map((sec,si)=>(
                <div key={si} style={card}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
                    <input value={sec.name} onChange={e=>setSectionName(si,e.target.value)} placeholder="Rubrik (z. B. Testspiele)" style={{flex:1,fontWeight:700}}/>
                    <button onClick={()=>removeSection(si)} style={{background:"rgba(255,60,60,0.15)",border:"1px solid rgba(255,60,60,0.3)",borderRadius:6,padding:"8px 10px",color:"#ff8080",fontSize:13,cursor:"pointer",flexShrink:0}}>✕ Rubrik</button>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {(sec.matches||[]).map((m,mi)=>(
                      <div key={mi} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:10,display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          <div style={{gridColumn:"1/-1"}}><label>Gegner</label><input value={m.opponent} onChange={e=>setMatchField(si,mi,"opponent",e.target.value)} placeholder="TSV Meckenbeuren"/></div>
                          <div><label>Datum</label><input type="date" value={m.date} onChange={e=>setMatchField(si,mi,"date",e.target.value)}/></div>
                          <div>
                            <label>Uhrzeit</label>
                            <input type="time" value={m.time} onChange={e=>setMatchField(si,mi,"time",e.target.value)}/>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}>
                              <span style={{fontSize:10,color:"rgba(255,255,255,0.4)",flexShrink:0}}>Größe</span>
                              <input type="range" min={50} max={200} value={form.schedTimeSize??100}
                                onChange={e=>set("schedTimeSize",parseInt(e.target.value))}
                                style={{flex:1,background:"transparent",border:"none",padding:0,accentColor:"#6eb4ff",height:16}}/>
                              <span style={{fontSize:10,color:"rgba(255,255,255,0.4)",width:30,textAlign:"right",flexShrink:0}}>{form.schedTimeSize??100}%</span>
                            </div>
                          </div>
                          <div style={{gridColumn:"1/-1",display:"flex",gap:8}}>
                            <button onClick={()=>setMatchField(si,mi,"isHome",true)}  style={{flex:1,background:m.isHome?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${m.isHome?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:7,padding:"7px",color:m.isHome?"#6eb4ff":"rgba(255,255,255,0.5)",fontSize:12,fontWeight:600,cursor:"pointer"}}>🏠 Heim</button>
                            <button onClick={()=>setMatchField(si,mi,"isHome",false)} style={{flex:1,background:!m.isHome?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${!m.isHome?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:7,padding:"7px",color:!m.isHome?"#6eb4ff":"rgba(255,255,255,0.5)",fontSize:12,fontWeight:600,cursor:"pointer"}}>🚌 Auswärts</button>
                          </div>
                        </div>
                        <button onClick={()=>removeMatch(si,mi)} style={{background:"rgba(255,60,60,0.15)",border:"1px solid rgba(255,60,60,0.3)",borderRadius:6,padding:"8px 10px",color:"#ff8080",fontSize:13,cursor:"pointer",alignSelf:"start"}}>✕</button>
                      </div>
                    ))}
                    <button onClick={()=>addMatch(si)} style={{background:"rgba(255,255,255,0.05)",border:"1px dashed rgba(255,255,255,0.18)",borderRadius:8,padding:"8px",color:"rgba(255,255,255,0.38)",fontSize:12,cursor:"pointer"}}>+ Spiel hinzufügen</button>
                  </div>
                </div>
              ))}
              <button onClick={addSection} style={{background:"rgba(255,255,255,0.05)",border:"1px dashed rgba(255,255,255,0.18)",borderRadius:8,padding:"10px",color:"rgba(255,255,255,0.5)",fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Rubrik hinzufügen</button>
            </>
          )}

          {/* Spieldaten */}
          {!isSchedule && (
            <Collapsible title="Spieldaten" cardStyle={card} defaultOpen>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label>Heimteam</label><input value={form.homeTeam} onChange={e=>set("homeTeam",e.target.value)} placeholder="SV Maierhöfen-Grünenbach"/></div>
                <div><label>Gastteam</label><input value={form.awayTeam} onChange={e=>set("awayTeam",e.target.value)} placeholder="TSV Meckenbeuren"/></div>
                <div><label>Liga</label><input value={form.league} onChange={e=>set("league",e.target.value)} placeholder="Kreisklasse A"/></div>
                <div><label>Spieltag</label><input value={form.matchday} onChange={e=>set("matchday",e.target.value)} placeholder="34"/></div>
                <div style={{gridColumn:"1/-1"}}><label>Datum</label><input type="date" value={form.rawDate} onChange={e=>set("rawDate",e.target.value)}/></div>
              </div>
            </Collapsible>
          )}

          {/* Weitere Paarungen (nur Spieltag-Ankündigung) */}
          {!isResult && !isSchedule && (
            <Collapsible title="⚽ Weitere Paarungen (optional)" cardStyle={card}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.32)",marginBottom:12}}>Für mehrere Mannschaften am selben Spieltag, z. B. Team II und Team III.</div>
              {[2,3].map(num=>(
                <div key={num} style={{marginBottom:num===2?16:0,paddingBottom:num===2?16:0,borderBottom:num===2?"1px solid rgba(255,255,255,0.08)":"none"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.5)",marginBottom:8}}>Paarung {num}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                    <div><label>Heimteam</label><input value={form[`homeTeam${num}`]} onChange={e=>set(`homeTeam${num}`,e.target.value)} placeholder="Team II"/></div>
                    <div><label>Gastteam</label><input value={form[`awayTeam${num}`]} onChange={e=>set(`awayTeam${num}`,e.target.value)} placeholder="Gegner II"/></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                    <ImgUpload label="Heim-Wappen" value={form[`homeLogoMatchday${num}`]} onChange={v=>set(`homeLogoMatchday${num}`,v)} h={80}/>
                    <ImgUpload label="Gast-Wappen" value={form[`awayLogoMatchday${num}`]} onChange={v=>set(`awayLogoMatchday${num}`,v)} h={80}/>
                  </div>
                </div>
              ))}
            </Collapsible>
          )}

          {/* Spielbericht — 2 Teams */}
          {isResult && (
            <>
              {renderTeamBlock(1, "🥇")}
              {renderTeamBlock(2, "🥈")}
              {renderTeamBlock(3, "🥉")}
            </>
          )}

          {/* Extrazeilen (nur Spieltag) */}
          {!isResult && !isSchedule && (
            <Collapsible title="Textzeilen auf dem Poster" cardStyle={card}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.32)",marginBottom:12}}>z. B. „Team II – 14:00 Uhr"</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {form.extraLines.map((line,i)=>(
                  <div key={i} style={{border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,padding:8}}>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input value={line} onChange={e=>setLine(i,e.target.value)} placeholder={`Zeile ${i+1}`}/>
                      <button onClick={()=>removeLine(i)} style={{background:"rgba(255,60,60,0.15)",border:"1px solid rgba(255,60,60,0.3)",borderRadius:6,padding:"8px 10px",color:"#ff8080",fontSize:13,cursor:"pointer",flexShrink:0}}>✕</button>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8}}>
                      <span style={{fontSize:10,color:"rgba(255,255,255,0.4)",flexShrink:0}}>Größe</span>
                      <input type="range" min={50} max={200} value={(form.lineSizes||[])[i]??100}
                        onChange={e=>setLineSize(i,parseInt(e.target.value))}
                        style={{flex:1,background:"transparent",border:"none",padding:0,accentColor:"#6eb4ff"}}/>
                      <span style={{fontSize:10,color:"rgba(255,255,255,0.4)",width:32,textAlign:"right",flexShrink:0}}>{(form.lineSizes||[])[i]??100}%</span>
                    </div>
                  </div>
                ))}
                <button onClick={addLine} style={{background:"rgba(255,255,255,0.05)",border:"1px dashed rgba(255,255,255,0.18)",borderRadius:8,padding:"8px",color:"rgba(255,255,255,0.38)",fontSize:12,cursor:"pointer"}}>+ Zeile hinzufügen</button>
              </div>
            </Collapsible>
          )}

          {/* Schriftart */}
          <Collapsible title="Schriftart" cardStyle={card}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {FONTS.map(f=>(
                <button key={f.id} onClick={()=>set("font",f.id)} style={{background:form.font===f.id?"rgba(34,51,212,0.5)":"rgba(255,255,255,0.05)",border:`1.5px solid ${form.font===f.id?"#6eb4ff":"rgba(255,255,255,0.1)"}`,borderRadius:8,padding:"10px 12px",cursor:"pointer",textAlign:"left",display:"flex",flexDirection:"column",gap:2}}>
                  <span style={{fontFamily:f.id,fontSize:18,color:"#fff",fontStyle:"italic",lineHeight:1}}>Spieltag</span>
                  <span style={{fontSize:10,color:form.font===f.id?"#6eb4ff":"rgba(255,255,255,0.4)",letterSpacing:.5,textTransform:"uppercase"}}>{f.label}</span>
                </button>
              ))}
            </div>
          </Collapsible>

          {!isSchedule && (
            <Collapsible title="#️⃣ Hashtags" cardStyle={card}>
              <input value={form.hashtags} onChange={e=>set("hashtags",e.target.value)} placeholder="#SVMG #Amateurfußball #Spieltag"/>
            </Collapsible>
          )}
        </div>


        {/* PREVIEW */}
        <div style={{width:310,flexShrink:0,position:"sticky",top:22}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",color:"rgba(255,255,255,0.35)",marginBottom:10}}>Vorschau</div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <button onClick={()=>setEditMode(v=>!v)} style={{flex:1,background:editMode?"rgba(255,200,0,0.2)":"rgba(255,255,255,0.07)",border:`1.5px solid ${editMode?"#ffd700":"rgba(255,255,255,0.18)"}`,borderRadius:8,padding:"8px",color:editMode?"#ffd700":"rgba(255,255,255,0.6)",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              {editMode?"✅ Fertig":"✏️ Texte verschieben"}
            </button>
            {Object.keys(positions).length>0 && <button onClick={()=>setAllPositions(p=>({...p, [form.postType]: {}}))} style={{background:"rgba(255,60,60,0.15)",border:"1px solid rgba(255,60,60,0.3)",borderRadius:8,padding:"8px 12px",color:"#ff8080",fontSize:12,cursor:"pointer"}}>↺</button>}
          </div>
          {editMode && <div style={{background:"rgba(255,200,0,0.08)",border:"1px solid rgba(255,200,0,0.25)",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12,color:"rgba(255,220,100,0.8)"}}>👆 Texte auf dem Poster ziehen</div>}

          <div ref={posterRef}>
            {isSchedule
              ? <SchedulePoster d={{...form, ...bgFor("Schedule")}} logoLib={logoLib} positions={positions} onMove={onMove} editMode={editMode}/>
              : isResult
                ? <ResultPoster d={{...form, ...bgFor("Result"), homeLogo:form.homeLogoResult, awayLogo:form.awayLogoResult}} positions={positions} onMove={onMove} editMode={editMode}/>
                : <MatchdayPoster d={{...form, ...bgFor("Matchday"), homeLogo:form.homeLogoMatchday, awayLogo:form.awayLogoMatchday}} caption={caption} positions={positions} onMove={onMove} editMode={editMode}/>
            }
          </div>

          <button onClick={downloadPoster} disabled={downloading} style={{width:"100%",marginTop:10,background:downloading?"rgba(34,51,212,0.35)":"linear-gradient(135deg,#2233d4,#1018b0)",border:"none",borderRadius:8,padding:"11px",color:"#fff",fontSize:14,fontWeight:700,cursor:downloading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:downloading?"none":"0 3px 14px rgba(34,51,212,0.4)"}}>
            {downloading ? <><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.25)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> Wird erstellt...</> : "📥 Als PNG speichern"}
          </button>

          {caption && (
            <div>
              <div style={{marginTop:12,background:"rgba(255,255,255,0.05)",borderRadius:10,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.08)"}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",color:"rgba(255,255,255,0.35)",marginBottom:7}}>Caption-Text</div>
                <p style={{fontSize:13,lineHeight:1.6,color:"rgba(255,255,255,0.82)",whiteSpace:"pre-wrap"}}>{caption}</p>
                {form.hashtags && <p style={{marginTop:7,fontSize:12,color:"rgba(110,180,255,0.65)"}}>{form.hashtags.split(" ").map(t=>t.startsWith("#")?t:`#${t}`).join(" ")}</p>}
              </div>
              <button onClick={()=>{navigator.clipboard.writeText(fullText);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{width:"100%",marginTop:8,background:copied?"rgba(30,180,80,0.15)":"rgba(255,255,255,0.07)",border:`1.5px solid ${copied?"#5dff8a":"rgba(255,255,255,0.18)"}`,borderRadius:8,padding:"10px",color:copied?"#5dff8a":"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                {copied?"✅ Kopiert!":"📋 Text kopieren"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
