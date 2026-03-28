import { useState, useEffect, useRef, useCallback } from "react";

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface PlatformState {
  name: string;
  color: string;
  enabled: boolean;
  ping: number;
  status: "online" | "offline" | "scanning";
  lastProfit: number;
}

interface BetRecord {
  id: string;
  time: string;
  platform: string;
  event: string;
  odd: number;
  stake: number;
  result: "win" | "loss";
  profit: number;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
}

type OperationMode = "conservador" | "agressivo" | "turbo";
type Tab = "dashboard" | "modulos" | "plataformas" | "historico" | "config";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PLATFORMS_DEFAULT: PlatformState[] = [
  { name: "Bet365", color: "#00a651", enabled: true, ping: 42, status: "online", lastProfit: 0 },
  { name: "Betano", color: "#e2001a", enabled: true, ping: 67, status: "online", lastProfit: 0 },
  { name: "Blaze", color: "#f04c23", enabled: true, ping: 38, status: "online", lastProfit: 0 },
  { name: "Betfair", color: "#ffb900", enabled: false, ping: 91, status: "offline", lastProfit: 0 },
  { name: "1xBet", color: "#1a73e8", enabled: true, ping: 55, status: "online", lastProfit: 0 },
  { name: "KTO", color: "#e20074", enabled: true, ping: 48, status: "online", lastProfit: 0 },
  { name: "Pixbet", color: "#8a2be2", enabled: false, ping: 110, status: "offline", lastProfit: 0 },
  { name: "Novibet", color: "#ff5a00", enabled: true, ping: 72, status: "online", lastProfit: 0 },
  { name: "Sportingbet", color: "#f7a600", enabled: false, ping: 88, status: "offline", lastProfit: 0 },
  { name: "Betmotion", color: "#00c8ff", enabled: true, ping: 61, status: "online", lastProfit: 0 },
  { name: "EstrelaBet", color: "#ffd700", enabled: true, ping: 44, status: "online", lastProfit: 0 },
  { name: "Betsul", color: "#00bfa5", enabled: false, ping: 99, status: "offline", lastProfit: 0 },
];

const MODULES_DEFAULT = [
  { id: "rollover_bypass", label: "Bypass de Rollover", desc: "Zera rollover automaticamente em todas as casas", icon: "🔓", risk: "Baixo", riskColor: "#00ff50", enabled: true },
  { id: "limit_remover", label: "Removedor de Limites", desc: "Remove tetos de saque e apostas impostos pela casa", icon: "📈", risk: "Médio", riskColor: "#ffd700", enabled: false },
  { id: "bonus_extractor", label: "Extrator de Bônus", desc: "Captura bônus sem cumprir requisitos de liberação", icon: "🎁", risk: "Baixo", riskColor: "#00ff50", enabled: true },
  { id: "odds_injector", label: "Injetor de Odds +EV", desc: "Força odds com valor esperado positivo no mercado", icon: "⚡", risk: "Alto", riskColor: "#ff4444", enabled: false },
  { id: "account_shield", label: "Escudo Anti-Bloqueio", desc: "Mascara padrões suspeitos para evitar limitação de conta", icon: "🛡️", risk: "Baixo", riskColor: "#00ff50", enabled: true },
  { id: "auto_cashout", label: "Auto Cash-Out Inteligente", desc: "Saída automática calculada por IA no pico do valor", icon: "💸", risk: "Médio", riskColor: "#ffd700", enabled: true },
  { id: "vpn_rotator", label: "Rotação de VPN", desc: "Troca IP automaticamente a cada sessão para anonimato total", icon: "🌐", risk: "Baixo", riskColor: "#00ff50", enabled: false },
  { id: "stealth_mode", label: "Modo Stealth", desc: "Emula comportamento humano para evitar detecção por bots", icon: "👁️", risk: "Baixo", riskColor: "#00ff50", enabled: true },
  { id: "arb_scanner", label: "Scanner de Arbitragem", desc: "Detecta brechas de arbitragem em tempo real entre casas", icon: "🔍", risk: "Médio", riskColor: "#ffd700", enabled: false },
];

const EVENTS = [
  "Futebol > Premier League > Arsenal vs Chelsea",
  "Futebol > Brasileirão > Flamengo vs Palmeiras",
  "Futebol > Champions League > Real Madrid vs Bayern",
  "Tênis > ATP > Djokovic vs Alcaraz",
  "Basquete > NBA > Lakers vs Warriors",
  "Futebol > Serie A > Juventus vs Milan",
  "Crash > Blaze > Rodada #48219",
  "Futebol > La Liga > Barcelona vs Atletico",
  "Futebol > Brasileirão > Corinthians vs São Paulo",
  "MMA > UFC 305 > Main Event",
];

const LOG_FNS = [
  (p: string) => `[✓] Conectado à ${p} — sessão autenticada`,
  (p: string) => `[⚡] Odds +EV detectadas em ${p} — janela aberta`,
  (p: string) => `[✓] Bypass de rollover aplicado em ${p}`,
  (p: string) => `[🛡️] Padrão mascarado em ${p} — risco mínimo`,
  (p: string) => `[✓] Cash-out automático executado em ${p}`,
  (p: string) => `[🎁] Bônus de R$ ${(Math.random()*80+20).toFixed(2)} extraído em ${p}`,
  (p: string) => `[🌐] VPN rotacionada — novo IP: ${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.x.x`,
  (p: string) => `[🔍] Arbitragem detectada: ${p} vs Betfair — spread ${(Math.random()*3+1).toFixed(2)}%`,
  (p: string) => `[✓] Limite removido na conta #${p.slice(0,2).toUpperCase()}-${Math.floor(Math.random()*90000+10000)}`,
];

// ─── STORAGE ─────────────────────────────────────────────────────────────────
function load<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(`bu_${key}`); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function save(key: string, val: unknown) {
  try { localStorage.setItem(`bu_${key}`, JSON.stringify(val)); } catch {}
}

// ─── PROFIT CHART ─────────────────────────────────────────────────────────────
function ProfitChart({ data }: { data: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c || data.length < 2) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
    const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * W, y: H - ((v - mn) / rng) * (H - 16) - 8 }));
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(0,255,80,0.28)"); g.addColorStop(1, "rgba(0,255,80,0)");
    ctx.beginPath(); ctx.moveTo(pts[0].x, H);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length-1].x, H); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = "#00ff50"; ctx.lineWidth = 2;
    ctx.shadowColor = "#00ff50"; ctx.shadowBlur = 6; ctx.stroke();
    const last = pts[pts.length-1];
    ctx.beginPath(); ctx.arc(last.x, last.y, 4, 0, Math.PI*2);
    ctx.fillStyle = "#00ff50"; ctx.shadowBlur = 12; ctx.fill();
  }, [data]);
  return <canvas ref={ref} width={680} height={76} style={{ width: "100%", height: 76 }} />;
}

// ─── RADAR ────────────────────────────────────────────────────────────────────
function Radar({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const angle = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const W = c.width, H = c.height, cx = W/2, cy = H/2, r = Math.min(cx,cy) - 8;
    const dots = Array.from({length:7}, () => ({
      a: Math.random()*Math.PI*2, d: Math.random()*r*0.8+r*0.15, o: 0
    }));
    const draw = () => {
      ctx.clearRect(0,0,W,H);
      [0.33,0.66,1].forEach(f => {
        ctx.beginPath(); ctx.arc(cx,cy,r*f,0,Math.PI*2);
        ctx.strokeStyle="rgba(0,255,80,0.14)"; ctx.lineWidth=1; ctx.stroke();
      });
      ctx.strokeStyle="rgba(0,255,80,0.09)";
      ctx.beginPath(); ctx.moveTo(cx-r,cy); ctx.lineTo(cx+r,cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy-r); ctx.lineTo(cx,cy+r); ctx.stroke();
      if (active) {
        angle.current += 0.045;
        const a = angle.current;
        for (let i=0; i<40; i++) {
          const ta = a - (i*Math.PI/55);
          ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,ta,ta+0.04); ctx.closePath();
          ctx.fillStyle = `rgba(0,255,80,${(1-i/40)*0.16})`; ctx.fill();
        }
        ctx.beginPath(); ctx.moveTo(cx,cy);
        ctx.lineTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r);
        ctx.strokeStyle="rgba(0,255,80,0.9)"; ctx.lineWidth=1.5;
        ctx.shadowColor="#00ff50"; ctx.shadowBlur=8; ctx.stroke(); ctx.shadowBlur=0;
        dots.forEach(d => {
          const da = ((d.a-a)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
          if (da < 0.12) d.o = 1; else d.o = Math.max(0, d.o - 0.018);
          if (d.o > 0) {
            ctx.beginPath(); ctx.arc(cx+Math.cos(d.a)*d.d, cy+Math.sin(d.a)*d.d, 3, 0, Math.PI*2);
            ctx.fillStyle=`rgba(0,255,80,${d.o})`; ctx.shadowColor="#00ff50"; ctx.shadowBlur=10; ctx.fill(); ctx.shadowBlur=0;
          }
        });
      }
      ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fillStyle="#00ff50"; ctx.fill();
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);
  return <canvas ref={ref} width={154} height={154} style={{width:154,height:154}} />;
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [tab, setTab] = useState<Tab>(() => load("tab", "dashboard" as Tab));
  const [isRunning, setIsRunning] = useState(() => load("running", false));
  const [modules, setModules] = useState(() => load("modules", MODULES_DEFAULT));
  const [platforms, setPlatforms] = useState<PlatformState[]>(() => load("platforms", PLATFORMS_DEFAULT));
  const [opMode, setOpMode] = useState<OperationMode>(() => load("opmode", "conservador" as OperationMode));
  const [stake, setStake] = useState(() => load("stake", 50));
  const [totalProfit, setTotalProfit] = useState(() => load("profit", 0));
  const [sessionProfit, setSessionProfit] = useState(0);
  const [bets, setBets] = useState<BetRecord[]>(() => load("bets", []));
  const [profHist, setProfHist] = useState<number[]>(() => load("profhist", [0]));
  const [logs, setLogs] = useState<string[]>(() => load("logs", []));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [totalBets, setTotalBets] = useState(() => load("totalbets", 0));
  const [wins, setWins] = useState(() => load("wins", 0));
  const [alertSound, setAlertSound] = useState(() => load("alertsound", true));
  const [autoRestart, setAutoRestart] = useState(() => load("autorestart", false));
  const [maxLoss, setMaxLoss] = useState(() => load("maxloss", 200));
  const [stealthDelay, setStealthDelay] = useState(() => load("stealthdelay", 3));
  const [scanProg, setScanProg] = useState(0);
  const [scanPlat, setScanPlat] = useState("");
  const [ptcls] = useState(() => Array.from({length:22},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,s:Math.random()*2.5+0.5,d:Math.random()*5,dur:Math.random()*4+3})));
  const logRef = useRef<HTMLDivElement>(null);
  const tick = useRef(0);

  // persist
  useEffect(() => { save("tab",tab); }, [tab]);
  useEffect(() => { save("running",isRunning); }, [isRunning]);
  useEffect(() => { save("modules",modules); }, [modules]);
  useEffect(() => { save("platforms",platforms); }, [platforms]);
  useEffect(() => { save("opmode",opMode); }, [opMode]);
  useEffect(() => { save("stake",stake); }, [stake]);
  useEffect(() => { save("profit",totalProfit); }, [totalProfit]);
  useEffect(() => { save("bets",bets.slice(-50)); }, [bets]);
  useEffect(() => { save("profhist",profHist.slice(-60)); }, [profHist]);
  useEffect(() => { save("logs",logs.slice(-20)); }, [logs]);
  useEffect(() => { save("totalbets",totalBets); }, [totalBets]);
  useEffect(() => { save("wins",wins); }, [wins]);
  useEffect(() => { save("alertsound",alertSound); }, [alertSound]);
  useEffect(() => { save("autorestart",autoRestart); }, [autoRestart]);
  useEffect(() => { save("maxloss",maxLoss); }, [maxLoss]);
  useEffect(() => { save("stealthdelay",stealthDelay); }, [stealthDelay]);

  const addToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p.slice(-3), {id,message,type}]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4200);
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const enabled = platforms.filter(p => p.enabled);
    if (!enabled.length) return;
    const mult = opMode === "turbo" ? 2.2 : opMode === "agressivo" ? 1.5 : 1;
    const speed = opMode === "turbo" ? 1100 : opMode === "agressivo" ? 1700 : 2400;
    const interval = setInterval(() => {
      tick.current++;
      const plat = enabled[tick.current % enabled.length];
      const winChance = 0.70 + (modules.filter(m=>m.enabled).length * 0.016);
      const isWin = Math.random() < winChance;
      const odd = +(Math.random()*1.5+1.15).toFixed(2);
      const betStake = stake * mult;
      const profit = isWin ? +(betStake*(odd-1)).toFixed(2) : -(betStake*0.88).toFixed(2) as any;
      const event = EVENTS[Math.floor(Math.random()*EVENTS.length)];
      const bet: BetRecord = {
        id: Math.random().toString(36).slice(2),
        time: new Date().toLocaleTimeString("pt-BR"),
        platform: plat.name, event, odd, stake: betStake,
        result: isWin ? "win" : "loss", profit,
      };
      setBets(prev => [bet,...prev].slice(0,50));
      setTotalBets(p => p+1);
      if (isWin) setWins(p => p+1);
      setTotalProfit(p => +(p+profit).toFixed(2));
      setSessionProfit(p => +(p+profit).toFixed(2));
      setProfHist(prev => [...prev, +(prev[prev.length-1]||0)+profit].slice(-60));
      setPlatforms(prev => prev.map(p => p.name===plat.name ? {...p, lastProfit:+(p.lastProfit+profit).toFixed(2), ping:Math.floor(Math.random()*80+30), status:"online"} : p));
      const logFn = LOG_FNS[Math.floor(Math.random()*LOG_FNS.length)];
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString("pt-BR")}] ${logFn(plat.name)}`].slice(-10));
      setScanProg(p => (p+Math.random()*22+6) % 100);
      setScanPlat(plat.name);
      if (isWin && profit > 25) addToast(`+R$ ${profit.toFixed(2)} na ${plat.name} 🎉`, "success");
      else if (!isWin) addToast(`Perda R$ ${Math.abs(profit).toFixed(2)} em ${plat.name}`, "warning");
    }, speed);
    return () => clearInterval(interval);
  }, [isRunning, platforms, modules, opMode, stake, addToast]);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

  const wr = totalBets > 0 ? ((wins/totalBets)*100).toFixed(1) : "0.0";
  const activeMods = modules.filter(m=>m.enabled).length;
  const activePlats = platforms.filter(p=>p.enabled).length;

  const modeColors: Record<OperationMode, string> = { conservador: "#00ff50", agressivo: "#ffd700", turbo: "#ff4444" };
  const modeLabels: Record<OperationMode, string> = { conservador: "Conservador", agressivo: "Agressivo", turbo: "Turbo" };

  const card = { background:"rgba(0,18,8,0.72)", border:"1px solid rgba(0,255,80,0.12)", borderRadius:16, backdropFilter:"blur(8px)" } as React.CSSProperties;
  const sectionTitle = { fontSize:11, fontWeight:700, color:"#00ff50", letterSpacing:3, marginBottom:14 } as React.CSSProperties;

  const Toggle = ({ on, size=42 }: { on: boolean; size?: number }) => (
    <div style={{ width:size, height:size*0.54, background:on?"#00ff50":"rgba(255,255,255,0.08)", borderRadius:size*0.27, position:"relative", transition:"background 0.2s", flexShrink:0 }}>
      <div style={{ width:size*0.4, height:size*0.4, background:on?"#001a00":"rgba(255,255,255,0.3)", borderRadius:"50%", position:"absolute", top:size*0.07, left:on?size*0.53:size*0.07, transition:"left 0.2s" }} />
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"hsl(160,22%,4%)", fontFamily:"'Inter','Segoe UI',sans-serif", color:"#d4f5dc", position:"relative", overflowX:"hidden" }}>
      {/* Grid bg */}
      <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(0,255,80,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,80,0.022) 1px,transparent 1px)", backgroundSize:"44px 44px", pointerEvents:"none", zIndex:0 }} />

      {/* Particles */}
      {ptcls.map(p => <div key={p.id} style={{ position:"fixed", left:`${p.x}%`, top:`${p.y}%`, width:p.s, height:p.s, borderRadius:"50%", background:"rgba(0,255,80,0.45)", animation:`particle-float ${p.dur}s ease-in-out ${p.d}s infinite`, pointerEvents:"none", zIndex:0 }} />)}

      {/* Toasts */}
      <div style={{ position:"fixed", top:14, right:14, zIndex:9999, display:"flex", flexDirection:"column", gap:8 }}>
        {toasts.map(t => {
          const c = t.type==="success"?"rgba(0,255,80" : t.type==="warning"?"rgba(255,215,0" : t.type==="error"?"rgba(255,68,68" : "rgba(0,200,255";
          const tc = t.type==="success"?"#00ff50" : t.type==="warning"?"#ffd700" : t.type==="error"?"#ff6666" : "#00c8ff";
          return <div key={t.id} style={{ padding:"10px 14px", borderRadius:10, fontSize:12, fontWeight:600, background:`${c},0.12)`, border:`1px solid ${c},0.35)`, color:tc, backdropFilter:"blur(12px)", maxWidth:270, animation:"slideIn 0.3s ease" }}>{t.message}</div>;
        })}
      </div>

      <div style={{ position:"relative", zIndex:1, maxWidth:800, margin:"0 auto", padding:"0 16px 80px" }}>

        {/* ── HEADER ── */}
        <div style={{ textAlign:"center", padding:"36px 0 22px" }}>
          <div style={{ width:96, height:96, margin:"0 auto 14px", borderRadius:20, overflow:"hidden", boxShadow:isRunning?"0 0 50px rgba(0,255,80,0.6),0 0 100px rgba(0,255,80,0.25)":"0 0 30px rgba(0,255,80,0.3)", border:"2px solid rgba(0,255,80,0.3)", animation:isRunning?"glow-pulse 2s ease-in-out infinite":"none" }}>
            <img src="/logo.png" alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          </div>
          <h1 style={{ fontSize:40, fontWeight:800, color:"#00ff50", margin:0, letterSpacing:-1.5, textShadow:"0 0 28px rgba(0,255,80,0.8)" }}>Bet Unlocker</h1>
          <div style={{ fontSize:11, letterSpacing:7, color:"rgba(0,255,80,0.45)", marginTop:3, fontWeight:700 }}>V 2 . 0</div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginTop:14, padding:"5px 16px", borderRadius:20, background:isRunning?"rgba(0,255,80,0.08)":"rgba(255,255,255,0.03)", border:`1px solid ${isRunning?"rgba(0,255,80,0.28)":"rgba(255,255,255,0.08)"}` }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:isRunning?"#00ff50":"#444", boxShadow:isRunning?"0 0 8px #00ff50":"none", animation:isRunning?"glow-pulse 1.5s ease-in-out infinite":"none" }} />
            <span style={{ fontSize:11, fontWeight:700, color:isRunning?"#00ff50":"#555" }}>{isRunning?`ATIVO — MODO ${modeLabels[opMode].toUpperCase()}`:"SISTEMA PAUSADO"}</span>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:18 }}>
          {[
            { l:"Lucro Total", v:`R$ ${totalProfit.toFixed(2)}`, c:totalProfit>=0?"#00ff50":"#ff4444", s:`Sessão: R$ ${sessionProfit.toFixed(2)}` },
            { l:"Taxa de Acerto", v:`${wr}%`, c:"#ffd700", s:`${wins}/${totalBets} apostas` },
            { l:"Módulos", v:`${activeMods}/${modules.length}`, c:"#00c8ff", s:"ativos" },
            { l:"Plataformas", v:`${activePlats}/${platforms.length}`, c:"#bf80ff", s:"conectadas" },
          ].map(st => (
            <div key={st.l} style={{ ...card, padding:"13px 9px", textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:800, color:st.c, lineHeight:1 }}>{st.v}</div>
              <div style={{ fontSize:9, color:"rgba(212,245,220,0.38)", marginTop:3 }}>{st.l}</div>
              <div style={{ fontSize:9, color:"rgba(212,245,220,0.22)", marginTop:1 }}>{st.s}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN BUTTON ── */}
        <div style={{ textAlign:"center", marginBottom:18 }}>
          <button onClick={() => { if(!isRunning){addToast("Sistema iniciado!","success"); setSessionProfit(0);} else addToast("Sistema pausado.","info"); setIsRunning(r=>!r); }}
            style={{ background:isRunning?"linear-gradient(135deg,#6a0000,#ee1111)":"linear-gradient(135deg,#004d18,#00ff50)", color:isRunning?"#fff":"#001800", border:"none", borderRadius:14, padding:"15px 50px", fontSize:16, fontWeight:800, cursor:"pointer", letterSpacing:1, fontFamily:"inherit", boxShadow:isRunning?"0 0 40px rgba(238,17,17,0.45)":"0 0 40px rgba(0,255,80,0.45)", transition:"all 0.25s" }}>
            {isRunning ? "⏹  PARAR SISTEMA" : "▶  INICIAR SISTEMA"}
          </button>
          <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:12 }}>
            {(["conservador","agressivo","turbo"] as OperationMode[]).map(m => (
              <button key={m} onClick={() => setOpMode(m)} style={{ padding:"5px 14px", borderRadius:8, fontSize:11, fontWeight:700, border:`1px solid ${opMode===m?modeColors[m]:"rgba(255,255,255,0.09)"}`, background:opMode===m?`${modeColors[m]}16`:"transparent", color:opMode===m?modeColors[m]:"rgba(212,245,220,0.35)", cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}>
                {modeLabels[m]}
              </button>
            ))}
          </div>
          {isRunning && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:11, color:"rgba(0,255,80,0.45)", marginBottom:5 }}>Escaneando: <strong style={{ color:"#00ff50" }}>{scanPlat}</strong></div>
              <div style={{ height:3, background:"rgba(0,255,80,0.08)", borderRadius:3, maxWidth:240, margin:"0 auto", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${scanProg}%`, background:"linear-gradient(90deg,#00ff50,#7fff7f)", borderRadius:3, transition:"width 0.5s ease", boxShadow:"0 0 6px rgba(0,255,80,0.7)" }} />
              </div>
            </div>
          )}
        </div>

        {/* ── TABS ── */}
        <div style={{ display:"flex", gap:3, marginBottom:14, ...card, padding:5 }}>
          {([["dashboard","📊 Dashboard"],["modulos","⚙ Módulos"],["plataformas","🎯 Plataformas"],["historico","📋 Histórico"],["config","🔧 Config"]] as [Tab,string][]).map(([id,lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex:1, padding:"8px 3px", borderRadius:9, fontSize:11, fontWeight:700, border:"none", cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s", background:tab===id?"rgba(0,255,80,0.13)":"transparent", color:tab===id?"#00ff50":"rgba(212,245,220,0.38)", borderBottom:tab===id?"2px solid #00ff50":"2px solid transparent" }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* ══ DASHBOARD ══ */}
        {tab === "dashboard" && (
          <div style={{ display:"grid", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"154px 1fr", gap:14 }}>
              <div style={{ ...card, padding:14, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <Radar active={isRunning} />
                <div style={{ fontSize:9, color:"rgba(0,255,80,0.45)", marginTop:7, letterSpacing:2 }}>{isRunning?"SCANNING":"OFFLINE"}</div>
              </div>
              <div style={{ ...card, padding:16 }}>
                <div style={{ ...sectionTitle }}>CURVA DE LUCRO</div>
                <ProfitChart data={profHist.length>=2?profHist:[0,0]} />
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:7 }}>
                  <span style={{ fontSize:10, color:"rgba(212,245,220,0.28)" }}>Últimas {Math.min(profHist.length,60)} rodadas</span>
                  <span style={{ fontSize:11, fontWeight:800, color:totalProfit>=0?"#00ff50":"#ff4444" }}>{totalProfit>=0?"+":""}R$ {totalProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Terminal */}
            <div style={card}>
              <div style={{ padding:"9px 14px", borderBottom:"1px solid rgba(0,255,80,0.08)", display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ display:"flex", gap:4 }}>
                  {["#ff5f57","#febc2e",isRunning?"#28c840":"#333"].map((c,i) => <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:c, boxShadow:i===2&&isRunning?"0 0 7px #28c840":"none" }} />)}
                </div>
                <span style={{ fontSize:10, color:"rgba(0,255,80,0.45)", fontFamily:"monospace", marginLeft:6 }}>bet-unlocker@v2 ~ {isRunning?"● LIVE":"○ IDLE"}</span>
              </div>
              <div ref={logRef} style={{ padding:"11px 14px", minHeight:120, maxHeight:155, overflowY:"auto", fontFamily:"monospace" }}>
                {logs.length===0
                  ? <div style={{ fontSize:11, color:"rgba(0,255,80,0.22)" }}>{">"} Aguardando inicialização...</div>
                  : logs.map((log,i) => <div key={i} style={{ fontSize:11, color:`rgba(0,255,80,${0.3+(i/logs.length)*0.7})`, marginBottom:3 }}>{log}</div>)
                }
              </div>
            </div>

            {/* Last bets */}
            <div style={card}>
              <div style={{ padding:"11px 14px", borderBottom:"1px solid rgba(0,255,80,0.08)" }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#00ff50", letterSpacing:2 }}>ÚLTIMAS APOSTAS</span>
              </div>
              {bets.length===0
                ? <div style={{ padding:"22px 14px", fontSize:12, color:"rgba(212,245,220,0.28)", textAlign:"center" }}>Nenhuma aposta ainda.</div>
                : bets.slice(0,5).map(b => (
                  <div key={b.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px", borderBottom:"1px solid rgba(0,255,80,0.04)" }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background:b.result==="win"?"#00ff50":"#ff4444", boxShadow:`0 0 6px ${b.result==="win"?"#00ff50":"#ff4444"}` }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, color:"#d4f5dc", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{b.event}</div>
                      <div style={{ fontSize:10, color:"rgba(212,245,220,0.32)" }}>{b.platform} · {b.time} · odd {b.odd}</div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:800, color:b.profit>=0?"#00ff50":"#ff4444", flexShrink:0 }}>{b.profit>=0?"+":""}R$ {Math.abs(b.profit).toFixed(2)}</div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ══ MÓDULOS ══ */}
        {tab === "modulos" && (
          <div style={{ ...card, padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={sectionTitle}>MÓDULOS DO SISTEMA</span>
              <span style={{ fontSize:10, color:"rgba(0,255,80,0.45)" }}>{activeMods}/{modules.length} ativos</span>
            </div>
            <div style={{ display:"grid", gap:8 }}>
              {modules.map(m => (
                <div key={m.id} onClick={() => setModules(prev => prev.map(x => x.id===m.id?{...x,enabled:!x.enabled}:x))}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 13px", background:m.enabled?"rgba(0,255,80,0.065)":"rgba(0,0,0,0.28)", border:`1px solid ${m.enabled?"rgba(0,255,80,0.22)":"rgba(255,255,255,0.04)"}`, borderRadius:12, cursor:"pointer", transition:"all 0.2s" }}>
                  <span style={{ fontSize:21, flexShrink:0 }}>{m.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:m.enabled?"#d4f5dc":"rgba(212,245,220,0.32)" }}>{m.label}</div>
                    <div style={{ fontSize:11, color:"rgba(212,245,220,0.28)", marginTop:2 }}>{m.desc}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                    <Toggle on={m.enabled} />
                    <span style={{ fontSize:9, color:m.riskColor, fontWeight:700 }}>Risco {m.risk}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ PLATAFORMAS ══ */}
        {tab === "plataformas" && (
          <div style={{ ...card, padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={sectionTitle}>CASAS DE APOSTAS</span>
              <span style={{ fontSize:10, color:"rgba(0,255,80,0.45)" }}>{activePlats} conectadas</span>
            </div>
            <div style={{ display:"grid", gap:8 }}>
              {platforms.map(p => (
                <div key={p.name} onClick={() => setPlatforms(prev => prev.map(x => x.name===p.name?{...x,enabled:!x.enabled}:x))}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 13px", background:p.enabled?"rgba(0,255,80,0.055)":"rgba(0,0,0,0.22)", border:`1px solid ${p.enabled?"rgba(0,255,80,0.18)":"rgba(255,255,255,0.04)"}`, borderRadius:12, cursor:"pointer", transition:"all 0.2s" }}>
                  <div style={{ width:12, height:12, borderRadius:"50%", flexShrink:0, background:p.enabled?p.color:"#2a2a2a", boxShadow:p.enabled?`0 0 10px ${p.color}`:"none", transition:"all 0.3s" }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:p.enabled?"#d4f5dc":"rgba(212,245,220,0.32)" }}>{p.name}</div>
                    <div style={{ fontSize:10, color:"rgba(212,245,220,0.28)", marginTop:2 }}>
                      {p.ping}ms · {p.status==="online"?"🟢 Online":p.status==="scanning"?"🟡 Escaneando":"🔴 Offline"}
                    </div>
                  </div>
                  {p.enabled && (
                    <div style={{ textAlign:"right", marginRight:8 }}>
                      <div style={{ fontSize:12, fontWeight:800, color:p.lastProfit>=0?"#00ff50":"#ff4444" }}>{p.lastProfit>=0?"+":""}R$ {p.lastProfit.toFixed(2)}</div>
                      <div style={{ fontSize:9, color:"rgba(212,245,220,0.28)" }}>sessão</div>
                    </div>
                  )}
                  <Toggle on={p.enabled} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ HISTÓRICO ══ */}
        {tab === "historico" && (
          <div style={{ display:"grid", gap:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              {[
                { l:"Total de Apostas", v:totalBets.toString(), c:"#00c8ff" },
                { l:"Taxa de Acerto", v:`${wr}%`, c:"#ffd700" },
                { l:"ROI Total", v:totalBets>0?`${((totalProfit/(totalBets*stake))*100).toFixed(1)}%`:"0%", c:"#00ff50" },
              ].map(s => (
                <div key={s.l} style={{ ...card, padding:"12px 10px", textAlign:"center" }}>
                  <div style={{ fontSize:18, fontWeight:800, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:9, color:"rgba(212,245,220,0.38)", marginTop:3 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{ padding:"11px 14px", borderBottom:"1px solid rgba(0,255,80,0.08)", display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#00ff50", letterSpacing:2 }}>REGISTRO COMPLETO</span>
                <span style={{ fontSize:10, color:"rgba(212,245,220,0.32)" }}>{bets.length} apostas</span>
              </div>
              <div style={{ maxHeight:400, overflowY:"auto" }}>
                {bets.length===0
                  ? <div style={{ padding:"28px 14px", fontSize:12, color:"rgba(212,245,220,0.28)", textAlign:"center" }}>Inicie o sistema para registrar apostas.</div>
                  : bets.map(b => (
                    <div key={b.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px", borderBottom:"1px solid rgba(0,255,80,0.04)" }}>
                      <span style={{ fontSize:10, fontWeight:800, padding:"2px 7px", borderRadius:5, flexShrink:0, background:b.result==="win"?"rgba(0,255,80,0.13)":"rgba(255,68,68,0.13)", color:b.result==="win"?"#00ff50":"#ff6666", border:`1px solid ${b.result==="win"?"rgba(0,255,80,0.28)":"rgba(255,68,68,0.28)"}` }}>
                        {b.result==="win"?"WIN":"LOSS"}
                      </span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, color:"#d4f5dc", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{b.event}</div>
                        <div style={{ fontSize:10, color:"rgba(212,245,220,0.32)" }}>{b.platform} · {b.time} · R${b.stake.toFixed(0)} · odd {b.odd}</div>
                      </div>
                      <div style={{ fontSize:13, fontWeight:800, flexShrink:0, color:b.profit>=0?"#00ff50":"#ff4444" }}>{b.profit>=0?"+":""}R$ {Math.abs(b.profit).toFixed(2)}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {/* ══ CONFIG ══ */}
        {tab === "config" && (
          <div style={{ display:"grid", gap:13 }}>
            <div style={{ ...card, padding:18 }}>
              <div style={sectionTitle}>GESTÃO DE BANCA</div>
              <label style={{ fontSize:12, color:"rgba(212,245,220,0.55)", display:"block", marginBottom:7 }}>Stake por Aposta: <strong style={{ color:"#ffd700" }}>R$ {stake}</strong></label>
              <input type="range" min={10} max={500} step={10} value={stake} onChange={e=>setStake(+e.target.value)} style={{ width:"100%", accentColor:"#00ff50", cursor:"pointer" }} />
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"rgba(212,245,220,0.22)", marginTop:3 }}><span>R$ 10</span><span>R$ 500</span></div>
              <label style={{ fontSize:12, color:"rgba(212,245,220,0.55)", display:"block", marginTop:16, marginBottom:7 }}>Stop Loss: <strong style={{ color:"#ff6666" }}>R$ {maxLoss}</strong></label>
              <input type="range" min={50} max={1000} step={50} value={maxLoss} onChange={e=>setMaxLoss(+e.target.value)} style={{ width:"100%", accentColor:"#ff4444", cursor:"pointer" }} />
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"rgba(212,245,220,0.22)", marginTop:3 }}><span>R$ 50</span><span>R$ 1.000</span></div>
            </div>

            <div style={{ ...card, padding:18 }}>
              <div style={sectionTitle}>CONFIGURAÇÕES STEALTH</div>
              <label style={{ fontSize:12, color:"rgba(212,245,220,0.55)", display:"block", marginBottom:7 }}>Delay entre apostas: <strong style={{ color:"#00c8ff" }}>{stealthDelay}s</strong></label>
              <input type="range" min={1} max={15} step={1} value={stealthDelay} onChange={e=>setStealthDelay(+e.target.value)} style={{ width:"100%", accentColor:"#00c8ff", cursor:"pointer" }} />
            </div>

            <div style={{ ...card, padding:18 }}>
              <div style={sectionTitle}>PREFERÊNCIAS</div>
              {[
                { l:"Alertas Sonoros", d:"Emite sons ao detectar oportunidades", v:alertSound, s:setAlertSound },
                { l:"Reinício Automático", d:"Reinicia após atingir stop loss", v:autoRestart, s:setAutoRestart },
              ].map(cfg => (
                <div key={cfg.l} onClick={() => cfg.s((v: boolean) => !v)} style={{ display:"flex", alignItems:"center", gap:14, padding:"11px 0", borderBottom:"1px solid rgba(0,255,80,0.06)", cursor:"pointer" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#d4f5dc" }}>{cfg.l}</div>
                    <div style={{ fontSize:11, color:"rgba(212,245,220,0.32)", marginTop:2 }}>{cfg.d}</div>
                  </div>
                  <Toggle on={cfg.v} />
                </div>
              ))}
            </div>

            <div style={{ ...card, padding:18, border:"1px solid rgba(255,68,68,0.13)" }}>
              <div style={{ ...sectionTitle, color:"#ff6666" }}>⚠ ZONA DE PERIGO</div>
              <button onClick={() => { if(confirm("Resetar todos os dados?")){ setTotalProfit(0);setSessionProfit(0);setBets([]);setProfHist([0]);setLogs([]);setTotalBets(0);setWins(0);setIsRunning(false);addToast("Dados resetados.","info");} }}
                style={{ width:"100%", padding:"12px", borderRadius:10, background:"rgba(255,68,68,0.09)", border:"1px solid rgba(255,68,68,0.27)", color:"#ff6666", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                🗑 Resetar Todos os Dados
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign:"center", marginTop:30, paddingTop:18, borderTop:"1px solid rgba(0,255,80,0.07)" }}>
          <div style={{ fontSize:10, color:"rgba(212,245,220,0.18)", lineHeight:1.9 }}>
            Bet Unlocker V2.0 © 2025 — Uso estritamente educacional.<br />
            O desenvolvedor não se responsabiliza pelo uso desta ferramenta.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        input[type=range]{height:4px;border-radius:4px}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,255,80,0.18);border-radius:4px}
      `}</style>
    </div>
  );
}
