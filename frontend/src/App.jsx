import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { 
  Activity, 
  BarChart3, 
  ShieldAlert, 
  ShieldCheck, 
  Upload, 
  History, 
  Settings,
  Menu,
  X,
  PlusCircle, Plus, ChevronDown, ArrowUp,
  Database,
  PieChart as PieChartIcon,
  TrendingDown,
  ChevronRight,
  FileText,
  AlertTriangle,
  Download,
  CheckCircle2,
  XCircle,
  BrainCircuit,
  Zap,
  Globe,
  Terminal as TerminalIcon,
  Calendar
} from 'lucide-react'
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  LineChart,
  Line 
} from 'recharts'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:9000'

function App() {
  const reportRef = useRef(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [savedReports, setSavedReports] = useState([])
  
  // Nouveaux états pour le Chat IA
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [journalData, setJournalData] = useState({ daily: [], monthly: [], yearly: [] })
  
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('ddos_reports') || '[]')
    setSavedReports(saved)
  }, [])

  useEffect(() => {
    if (activeTab === 'journal') {
      const fetchJournal = async () => {
        try {
          const res = await axios.get(`${API_URL}/api/journal/stats`)
          setJournalData(res.data)
        } catch (e) {
          console.error("Erreur chargement journal", e)
        }
      }
      fetchJournal()
    }
  }, [activeTab])

  const saveToHistory = (stats, filename) => {
    const newReport = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      filename: filename,
      stats: stats,
      riskLevel: stats['BENIGN'] > 90 ? 'Low' : (stats['BENIGN'] > 50 ? 'Medium' : 'Critical')
    }
    const updated = [newReport, ...savedReports]
    setSavedReports(updated)
    localStorage.setItem('ddos_reports', JSON.stringify(updated))
  }

  const downloadReportPDF = async (reportData) => {
    const doc = new jsPDF('p', 'pt', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // Header styling
    doc.setFillColor(15, 23, 42) // Deep navy
    doc.rect(0, 0, pageWidth, 120, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(28)
    doc.setFont("helvetica", "bold")
    doc.text("DDoS GUARD : AUDIT REPORT", 40, 60)
    
    doc.setFontSize(10)
    doc.setTextColor(148, 163, 184)
    doc.text("AUTONOMOUS LSTM DETECTION ENGINE", 40, 85)
    doc.text(`ID: ${reportData.id}`, pageWidth - 180, 85)

    // Divider
    doc.setDrawColor(56, 189, 248)
    doc.setLineWidth(2)
    doc.line(40, 140, pageWidth - 40, 140)

    // Metadata section
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(14)
    doc.text("INFRASTRUCTURE ANALYSIS SUMMARY", 40, 180)
    
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(1)
    doc.rect(40, 195, pageWidth - 80, 100)
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`DATE DE L'AUDIT :`, 60, 220)
    doc.text(`${reportData.date}`, 180, 220)
    
    doc.text(`SOURCE DES DONNÉES :`, 60, 245)
    doc.text(`${reportData.filename}`, 180, 245)
    
    doc.text(`NIVEAU DE MENACE :`, 60, 270)
    doc.setFont("helvetica", "bold")
    const riskColor = reportData.riskLevel === 'Critical' ? [244, 63, 94] : (reportData.riskLevel === 'Medium' ? [245, 158, 11] : [16, 185, 129])
    doc.setTextColor(riskColor[0], riskColor[1], riskColor[2])
    doc.text(`${reportData.riskLevel.toUpperCase()}`, 180, 270)

    // Stats Grid
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(14)
    doc.text("DISTRIBUTION DES VECTEURS D'ATTAQUE", 40, 340)
    
    let y = 370
    Object.keys(reportData.stats).forEach((label, i) => {
       // Row background for alternate
       if (i % 2 === 0) {
         doc.setFillColor(248, 250, 252)
         doc.rect(40, y - 15, pageWidth - 80, 25, 'F')
       }
       
       doc.setTextColor(51, 65, 85)
       doc.setFontSize(10)
       doc.setFont("helvetica", "bold")
       doc.text(label, 60, y)
       
       doc.setFont("helvetica", "normal")
       doc.text(`${reportData.stats[label]} paquets identifiés`, pageWidth - 200, y)
       y += 25
    })

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text("Ce document est généré automatiquement par le système DDoS Guard LSTM.", 40, pageWidth + 250)
    doc.text("Copyright © 2026 DDoS Guard Infrastructure.", 40, pageWidth + 265)

    const finalFilename = `DDoS_Report_${Date.now()}.pdf`
    
    // Fallback Manual Download for Better Browser Compatibility
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = finalFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const [metrics, setMetrics] = useState({
    accuracy: 98.5,
    precision: 97.8,
    recall: 99.2,
    f1_score: 98.5
  })
  const [uploadStatus, setUploadStatus] = useState('idle') // idle, uploading, success, error
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState(null)
  const [predictionTimeline, setPredictionTimeline] = useState(null)
  const [predictionStats, setPredictionStats] = useState(null)
  const [blockedIPs, setBlockedIPs] = useState([])
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [showBlockedIPs, setShowBlockedIPs] = useState(false)
  const [geoMap, setGeoMap] = useState({})
  const [systemLogs, setSystemLogs] = useState([])
  const logsContainerRef = useRef(null)

  useEffect(() => {
    if (logsContainerRef.current) {
       logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [systemLogs])

  // Polling Temps Réel
  useEffect(() => {
    let interval;
    if (isLiveMode) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_URL}/api/live_stream`);
          const stream = res.data.stream;
          const geo = res.data.geo;
          if (geo) {
             setGeoMap(geo);
          }
          if (res.data.blocked_ips) {
             setBlockedIPs(res.data.blocked_ips);
          }
          if (res.data.system_logs) {
             setSystemLogs(res.data.system_logs);
          }

          if (stream && stream.length > 0) {
            setPredictionTimeline(stream);
            
            // Recompute stats for the pie chart
            let totalBenign = 0;
            let totalAttack = 0;
            
            stream.forEach(point => {
               totalBenign += point.benign;
               totalAttack += point.attack;
            });
            
            setPredictionStats({
               'BENIGN': totalBenign,
               'ATTACKS': totalAttack
            });
          }
        } catch(e) {
          console.error('Erreur Live Stream: ', e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLiveMode, blockedIPs]);

  // Fetch metrics on mount
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/metrics`)
        setMetrics(response.data)
      } catch (error) {
        console.error("API error fetching metrics:", error)
      }
    }
    fetchMetrics()
  }, [])

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploadStatus('uploading')
    setUploadProgress(0)
    setActiveTab('analysis') // Redirection immédiate pour voir la barre de progression
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // On attend jusqu'à 60 secondes pour les gros fichiers
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percentCompleted)
        }
      })
      setAnalysisResults(response.data)
      setUploadStatus('success')
      setActiveTab('analysis')
      setUploadProgress(0)
    } catch (error) {
      console.error("Upload error:", error)
      setUploadStatus('error')
      alert("❌ Erreur de connexion au serveur ! Vérifiez que le backend tourne bien sur le port 9000.")
    }
}

  const handleSendChat = async () => {
    if (!chatInput.trim()) return
    
    const userMsg = { role: 'user', content: chatInput }
    setChatMessages(prev => [...prev, userMsg])
    const currentInput = chatInput
    setChatInput('')
    setIsTyping(true)
    
    try {
      const res = await axios.post(`${API_URL}/api/chat`, { message: currentInput })
      setChatMessages(prev => [...prev, { role: 'ai', content: res.data.response }])
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', content: "❌ Désolé, impossible de joindre le serveur IA actuellement." }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleAnalyze = async () => {
      if (!analysisResults || !analysisResults.preview) return
      
      setIsAnalyzing(true)
      try {
        const response = await axios.post(`${API_URL}/api/analyze`, analysisResults.preview)
        setPredictionStats(response.data.stats)
        setPredictionTimeline(response.data.timeline)
        setBlockedIPs(response.data.blocked_ips || [])
        
        // Let it "think" for effect
        setTimeout(() => {
          setActiveTab('dashboard')
          setIsAnalyzing(false)
          saveToHistory(response.data.stats, analysisResults.filename)
        }, 1500)
      } catch (error) {
        console.error("Analysis error:", error)
        setIsAnalyzing(false)
      }
  }

  // Data for Charts (Dynamic real analysis vs dummy)
  const dataPerformance = predictionTimeline || [
    { name: '00:00', benign: 400, attack: 24 },
    { name: '04:00', benign: 300, attack: 13 },
    { name: '08:00', benign: 900, attack: 200 },
    { name: '12:00', benign: 1200, attack: 450 },
    { name: '16:00', benign: 1100, attack: 300 },
    { name: '20:00', benign: 800, attack: 45 },
  ]

  const COLORS_MAP = {
    'BENIGN': '#10b981',      // Vert Émeraude
    'UDP-lag': '#f43f5e',     // Rose/Rouge
    'SYN-Flood': '#ef4444',   // Rouge
    'HTTP-Flood': '#dc2626',  // Rouge foncé
    'DrDoS_SNMP': '#b91c1c',  // Rouge Sang
    'DrDoS_DNS': '#991b1b',   // Bordeaux
    'Brute Force': '#d946ef', // Fuchsia
    'DrDoS_LDAP': '#f59e0b',  // Ambré / Orange
    'DrDoS_MSSQL': '#0284c7', // Bleu Cyan
    'DrDoS_NetBIOS': '#eab308',// Jaune Moutarde / Or
    'DrDoS_Portmap': '#6366f1',// Indigo / Bleu Violet
    'DrDoS_SSDP': '#14b8a6',  // Vert d'eau (Teal)
    'DrDoS_NTP': '#ec4899',   // Rose vif (Pink)
    'DrDoS_UDP': '#94a3b8'    // Gris / Slate
  }

  const dataPie = predictionStats 
    ? Object.keys(predictionStats).map((key) => ({
        name: key,
        value: predictionStats[key],
        color: COLORS_MAP[key] || '#f43f5e' // Rouge par défaut pour toute attaque non listée
      }))
    : [
        { name: 'BENIGN', value: 45, color: '#10b981' },
        { name: 'UDP-lag', value: 17, color: '#f43f5e' },
        { name: 'SYN-Flood', value: 15, color: '#ef4444' },
      ]

  const totalValue = dataPie.reduce((acc, curr) => acc + curr.value, 0)

  return (
    <div className="relative min-h-screen w-full bg-[#020617] text-slate-100 font-['Outfit'] overflow-x-hidden selection:bg-primary-500/30">
      {/* Visual Background Blobs (Premium Depth) */}
      <div className="bg-blur-blob blob-1"></div>
      <div className="bg-blur-blob blob-2" style={{ bottom: '-10%', right: '-10%', transform: 'scale(1.5)' }}></div>
      <div className="bg-blur-blob" style={{ top: '30%', left: '40%', opacity: 0.05, background: 'radial-gradient(circle, #f43f5e 0%, transparent 70%)' }}></div>

      {/* Futuristic Nav Menu */}
      <div className="fixed top-10 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav className="glass-nav px-3 py-1.5 flex flex-row items-center gap-1 shadow-[0_0_50px_rgba(0,0,0,0.5)] pointer-events-auto">
          <div className="flex items-center gap-3 px-5 py-1 mr-2 group cursor-pointer border-r border-slate-700/30">
            <div className="bg-gradient-to-br from-primary-400 to-indigo-600 p-1.5 rounded-lg shadow-lg rotate-3 group-hover:rotate-12 transition-transform duration-500">
              <ShieldCheck size={22} className="text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">DDoS GUARD</span>
          </div>
          
          <div className="flex flex-row items-center gap-1">
            <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<BarChart3 size={18} />} label="Dashboard" />
            <NavItem active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} icon={<Upload size={18} />} label="Analyse IA" />
            <NavItem active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} icon={<Activity size={18} />} label="LSTM Stats" />
            <NavItem active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} icon={<Calendar size={18} />} label="Journal" />
            <NavItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={18} />} label="Intelligence" />
          </div>
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="pt-48 pb-20 px-8 relative z-10">
        <div className="max-w-7xl mx-auto w-full flex flex-col space-y-16">
          
          {/* Elite Centered Header */}
          <header className="flex flex-col items-center text-center space-y-8 w-full mb-8 animate-float">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-[10px] font-black tracking-[0.2em] uppercase text-primary-400">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse"></div>
                 Network Infrastructure Security Active
              </div>
              <h1 className="text-8xl font-black text-white leading-tight tracking-tighter drop-shadow-2xl">
                {activeTab === 'dashboard' ? (
                  <>Real-Time <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary-400 to-indigo-500">Defense</span></>
                ) : (
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-rose-400">Deep Engine</span>
                )}
              </h1>
              <p className="text-slate-400 text-2xl max-w-3xl mx-auto leading-relaxed font-light opacity-80 backdrop-blur-sm">
                Advanced prediction of DDoS attack vectors using 
                <span className="text-white font-bold"> LSTM Deep Learning </span> 
                architectures on CIC-DDoS2019 dataset streams.
              </p>
            </div>
            
            <div className="flex flex-row items-center justify-center gap-6 pt-6">
               <label 
                 className="group relative cursor-pointer overflow-hidden bg-white/5 border border-white/10 text-slate-300 hover:text-white px-8 py-5 rounded-2xl font-black transition-all shadow-xl hover:-translate-y-1 active:scale-95 flex items-center gap-3 backdrop-blur-md"
               >
                  <Upload size={24} />
                  <span className="uppercase text-sm tracking-widest hidden md:inline">Analyse Hors Ligne</span>
                  <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
               </label>
               
               <button 
                 onClick={() => setIsLiveMode(!isLiveMode)}
                 className={`group relative overflow-hidden px-8 py-5 md:px-12 rounded-3xl font-black transition-all hover:-translate-y-2 active:scale-95 text-lg md:text-xl flex items-center gap-4 border ${isLiveMode ? 'bg-rose-600/20 border-rose-500/50 text-rose-400 shadow-[0_20px_50px_rgba(244,63,94,0.3)] glow-border-danger' : 'bg-primary-600 border-transparent text-white shadow-[0_20px_50px_rgba(14,165,233,0.3)]'}`}
               >
                  {isLiveMode ? (
                     <><span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span></span> DÉSACTIVER ÉCOUTE</>
                  ) : (
                     <><Globe size={28} className="animate-pulse text-primary-300" /> DÉPLOYER CAPTEUR LIVE</>
                  )}
               </button>

               <button 
                 onClick={() => setActiveTab('journal')}
                 className="bg-white/5 hover:bg-white/10 text-slate-400 px-8 py-5 rounded-2xl font-black transition-all flex items-center gap-3 border border-white/10 text-sm backdrop-blur-xl group uppercase tracking-widest"
               >
                  <Calendar size={20} /> <span className="hidden md:inline">Journal BDD</span>
               </button>
            </div>
          </header>

          {/* Dashoard UI Section */}
          {activeTab === 'dashboard' && (
            <div className="space-y-16 animate-in fade-in duration-1000">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <KPICard 
                  title="Global Network Load" 
                  value={predictionStats ? `${Object.values(predictionStats).reduce((a, b) => a + b, 0).toLocaleString()} Packets` : "Attente..."} 
                  icon={<Database className="text-primary-400" />} 
                  subtext={analysisResults?.filename || "No source stream"} 
                />
                <KPICard 
                  title="Malicious Payloads" 
                  value={predictionStats ? (Object.values(predictionStats).reduce((a, b) => a + b, 0) - (predictionStats['BENIGN'] || 0)).toLocaleString() : "0"} 
                  icon={<ShieldAlert className={ (predictionStats && (Object.values(predictionStats).reduce((a, b) => a + b, 0) - (predictionStats['BENIGN'] || 0)) > 0) ? "text-rose-500" : "text-slate-500"} />} 
                  subtext="Attack Vectors Identified" 
                  alert={(predictionStats && (Object.values(predictionStats).reduce((a, b) => a + b, 0) - (predictionStats['BENIGN'] || 0)) > 0)} 
                />
                <KPICard 
                  title="LSTM Predictive Accuracy" 
                  value={`${(metrics?.accuracy < 1 ? metrics.accuracy * 100 : (metrics?.accuracy ?? 98.7)).toFixed(1)}%`} 
                  icon={<Activity className="text-emerald-400" />} 
                  subtext="Autonomous Detection Logic" 
                />
                <KPICard 
                  title="Analysis Latency" 
                  value={isAnalyzing ? "Processing..." : "1.2ms"} 
                  icon={<TrendingDown className="text-violet-400" />} 
                  subtext="Real-time async stream" 
                />
              </div>

              {blockedIPs.length > 0 && (
                <div className="glass-panel p-8 rounded-[2.5rem] border border-rose-500/30 bg-rose-500/10 animate-in fade-in slide-in-from-top-4 duration-700 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                    <div className="flex items-center gap-4">
                       <span className="flex h-4 w-4 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 shadow-[0_0_10px_#f43f5e]"></span>
                       </span>
                       <h3 className="text-2xl font-black text-rose-400 tracking-tight">Cisco IPS Intervention ({blockedIPs.length})</h3>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className="bg-rose-500 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full">
                         Mise en Quarantaine Automatique
                       </span>
                       <button onClick={() => setShowBlockedIPs(!showBlockedIPs)} className="bg-rose-950/80 border border-rose-500/50 hover:bg-rose-500/30 text-rose-300 hover:text-white px-5 py-2 rounded-full font-black text-xs uppercase tracking-wider transition-all shadow-lg">
                         {showBlockedIPs ? 'Masquer' : 'Voir les IPs'}
                       </button>
                    </div>
                  </div>
                  {showBlockedIPs && (
                    <div className="flex gap-4 flex-wrap mt-6 animate-in fade-in duration-300">
                      {blockedIPs.map(ip => (
                         <div key={ip} className="bg-rose-950/50 border border-rose-500/50 text-slate-200 px-5 py-3 rounded-2xl flex items-center justify-between gap-6 font-mono shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:-translate-y-1 transition-transform group cursor-default min-w-[280px]">
                            <div className="flex items-center gap-3">
                               <Zap size={18} className="text-amber-400 group-hover:scale-125 transition-transform" /> 
                               <span className="font-bold">ACL BLOCKED :</span>  
                               <span className="text-rose-400 font-black tracking-widest">{ip}</span>
                            </div>
                            {geoMap[ip] && (
                               <a 
                                 href={geoMap[ip].code === 'LAN' ? `https://ipinfo.io/${ip}` : `https://www.google.com/maps/search/?api=1&query=${geoMap[ip].lat},${geoMap[ip].lon}`} 
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="flex items-center gap-2 text-xs font-sans px-3 py-1 rounded-full border border-white/5 transition-colors text-primary-300 bg-primary-900/20 hover:bg-primary-500/20 hover:text-white cursor-pointer"
                                 title={geoMap[ip].code === 'LAN' ? `Analyser l'IP ${ip}` : `Voir ${geoMap[ip].city || geoMap[ip].country} sur Google Maps`}
                               >
                                 {geoMap[ip].code === 'LAN' ? (
                                   <Globe size={14} className="text-primary-400" />
                                 ) : (
                                   <img src={`https://flagcdn.com/w20/${geoMap[ip].code.toLowerCase()}.png`} className="w-4 rounded-sm shadow-sm" alt="flag" />
                                 )}
                                 <span className="font-bold tracking-wide">{geoMap[ip].city ? `${geoMap[ip].city}, ${geoMap[ip].country}` : geoMap[ip].country}</span>
                               </a>
                            )}
                         </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {systemLogs.length > 0 && (
                 <div className="glass-panel p-8 rounded-[2.5rem] bg-black/80 border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500/50 to-transparent"></div>
                    <div className="flex items-center gap-3 mb-4">
                       <TerminalIcon className="text-slate-400" size={20} />
                       <h3 className="text-xl font-mono font-bold text-slate-300 tracking-wider">SYSTEM_LOGS<span className="animate-pulse text-primary-500">_</span></h3>
                    </div>
                    <div ref={logsContainerRef} className="h-64 overflow-y-auto font-mono text-[10px] md:text-xs rounded-xl bg-[#09090b] p-6 border border-white/5 space-y-3 flex flex-col scroll-smooth shadow-inner">
                       {systemLogs.map((log, idx) => (
                          <div key={idx} className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4 border-b border-white/5 pb-3 last:border-0 last:pb-0 hover:bg-white/5 p-2 rounded transition-colors">
                             <span className="text-slate-500 whitespace-nowrap">[{log.time}]</span>
                             <span className={`uppercase font-bold whitespace-nowrap min-w-[70px] ${log.level === 'danger' ? 'text-rose-500 drop-shadow-[0_0_5px_#f43f5e]' : log.level === 'success' ? 'text-emerald-500' : log.level === 'error' ? 'text-red-500' : 'text-primary-400'}`}>
                                {log.level}
                             </span>
                             <span className={`flex-1 leading-relaxed ${log.level === 'danger' ? 'text-rose-100' : 'text-slate-300'}`}>{log.msg}</span>
                          </div>
                       ))}
                    </div>
                 </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                <div className="xl:col-span-2 glass-panel p-10 rounded-[3rem]">
                  <div className="flex justify-between items-center mb-12">
                     <h3 className="text-3xl font-black flex items-center gap-5 tracking-tight text-white drop-shadow-lg">
                       <div className="w-2 h-10 bg-gradient-to-b from-primary-500 to-indigo-600 rounded-full"></div>
                       Inference Trends
                     </h3>
                     <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                        <span className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 glow-border-primary"></div> Benign Trafic</span>
                        <span className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-rose-500 glow-border-danger"></div> Threat Ingress</span>
                     </div>
                  </div>
                  <div className="h-[450px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dataPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barGap={12}>
                        <defs>
                          <linearGradient id="barBenign" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.6}/>
                          </linearGradient>
                          <linearGradient id="barAttack" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#e11d48" stopOpacity={0.6}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="5 15" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                        <YAxis stroke="#64748b" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                        <Tooltip 
                           cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 12 }}
                           contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} 
                           itemStyle={{ fontSize: '14px', fontWeight: '800' }}
                        />
                        <Bar dataKey="benign" fill="url(#barBenign)" radius={[8, 8, 0, 0]} barSize={35} />
                        <Bar dataKey="attack" fill="url(#barAttack)" radius={[8, 8, 0, 0]} barSize={35} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-panel p-10 rounded-[3rem] flex flex-col justify-between">
                  <h3 className="text-2xl font-black text-white tracking-tight mb-4">Vector Distribution</h3>
                  <div className="h-64 w-full flex items-center justify-center relative">
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                           <div className="text-3xl font-black text-white">
                             {predictionStats ? (
                               ((predictionStats['BENIGN'] || 0) / (Object.values(predictionStats).reduce((a, b) => a + b, 0) || 1) * 100).toFixed(0)
                             ) : "100"}%
                           </div>
                           <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Safety Score</div>
                        </div>
                     </div>
                     <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dataPie}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={105}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {dataPie.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '1rem' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4 mt-8 bg-black/20 p-6 rounded-2xl border border-white/5">
                     {dataPie.map((item) => (
                        <div key={item.name} className="flex justify-between items-center group cursor-default">
                           <div className="flex items-center gap-4">
                              <div className="w-3 h-3 rounded-full transition-transform group-hover:scale-150" style={{ backgroundColor: item.color }}></div>
                              <span className="text-slate-300 font-bold text-sm tracking-wide">{item.name}</span>
                           </div>
                           <span className="font-black text-slate-400 text-lg opacity-50 group-hover:opacity-100 transition-opacity">
                           {((item.value / (totalValue || 1)) * 100).toFixed(1)}%
                           </span>
                        </div>
                     ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Analysis View */}
          {activeTab === 'analysis' && (
             <div className="animate-in slide-in-from-bottom-10 duration-1000">
                {!analysisResults ? (
                  <div className="glass-panel p-24 rounded-[4rem] flex flex-col items-center justify-center border-dashed border-4 border-slate-800 hover:border-primary-500/50 transition-all group overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className={`p-10 rounded-[2.5rem] mb-10 transition-all ring-1 ring-white/10 ${uploadStatus === 'uploading' ? 'bg-primary-500 shadow-[0_0_50px_rgba(14,165,233,0.5)] text-white' : 'bg-slate-900 group-hover:bg-primary-500 group-hover:text-white group-hover:scale-110 text-slate-600'}`}>
                      <Upload size={64} className={uploadStatus === 'uploading' ? 'animate-bounce' : ''} />
                    </div>
                    
                    <h2 className="text-4xl font-extrabold mb-4 text-white tracking-tighter">Injection de Dataset Reseaux</h2>
                    
                    {uploadStatus === 'uploading' ? (
                      <div className="w-full max-w-md space-y-4 mb-12">
                        <div className="flex justify-between text-sm font-black uppercase tracking-widest text-primary-400">
                          <span>Téléchargement...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner border border-white/5">
                          <div 
                            className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-300 relative"
                            style={{ width: `${uploadProgress}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                          </div>
                        </div>
                        <p className="text-slate-500 text-center text-sm italic">Séquençage du trafic en cours...</p>
                      </div>
                    ) : (
                      <>
                        {chatMessages.length === 0 ? (
                          <p className="text-slate-400 text-center max-w-xl mb-12 text-lg font-medium leading-relaxed">
                            Transférez vos captures (CIC-DDoS2019) ou décrivez votre analyse.
                          </p>
                        ) : (
                          <div className="w-full max-w-3xl mb-8 space-y-6 h-[400px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            {chatMessages.map((msg, i) => (
                              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-primary-500 text-white rounded-br-none' : 'bg-white/10 text-slate-200 rounded-bl-none border border-white/5'}`}>
                                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                                </div>
                              </div>
                            ))}
                            {isTyping && (
                              <div className="flex justify-start">
                                <div className="bg-white/10 rounded-2xl rounded-bl-none p-4 border border-white/5 flex gap-2 items-center">
                                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="w-full max-w-3xl relative group mt-4">
                          <div className="absolute -inset-1 bg-gradient-to-r from-primary-500/20 to-indigo-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                          
                          <div className="relative flex items-center bg-[#1e1e1e] border border-white/10 rounded-2xl p-1.5 w-full transition-all focus-within:border-primary-500/50 focus-within:bg-[#252525] shadow-2xl">
                            <label className="cursor-pointer p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Uploader un fichier">
                              <Plus size={24} />
                              <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
                            </label>

                            <input 
                              type="text" 
                              placeholder="Rechercher une attaque ou sélectionner un fichier CSV..." 
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                              className="flex-1 bg-transparent border-none outline-none text-white px-4 placeholder:text-slate-500 text-lg font-medium"
                            />

                            <div className="flex items-center gap-2 pr-1">
                               <button className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-300 text-[10px] uppercase font-black tracking-widest flex items-center gap-2 hover:bg-white/10 transition-colors">
                                  <span>LSTM 4.0</span>
                                  <ChevronDown size={14} />
                               </button>
                               <button 
                                  onClick={handleSendChat}
                                  disabled={isTyping || !chatInput.trim()}
                                  className="p-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-400 hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                                >
                                  <ArrowUp size={20} />
                               </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-12 pb-12 animate-in fade-in zoom-in-95 duration-1000">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                       <div className="glass-panel p-10 rounded-[3rem] flex flex-col items-center text-center group hover:glow-border-primary transition-all">
                          <div className="p-5 bg-primary-500/10 rounded-2xl mb-6 text-primary-400">
                            <FileText size={48} />
                          </div>
                          <span className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] mb-2">Fichier Source</span>
                          <span className="text-2xl font-black text-white truncate w-full">{analysisResults.filename}</span>
                       </div>
                       <div className="glass-panel p-10 rounded-[3rem] flex flex-col items-center text-center group hover:glow-border-primary transition-all">
                          <div className="p-5 bg-primary-500/10 rounded-2xl mb-6 text-primary-400">
                            <Database size={48} />
                          </div>
                          <span className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] mb-2">Flux de Données</span>
                          <span className="text-4xl font-black text-white">{analysisResults.row_count}</span>
                       </div>
                       <div className="glass-panel p-10 rounded-[3rem] flex flex-col items-center text-center group hover:glow-border-primary transition-all">
                          <div className="p-5 bg-primary-500/10 rounded-2xl mb-6 text-primary-400">
                            <ShieldCheck size={48} />
                          </div>
                          <span className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] mb-2">Statut Intégrité</span>
                          <span className="text-emerald-400 text-2xl font-black">Prêt pour Inference</span>
                       </div>
                    </div>

                    <div className="glass-panel rounded-[3.5rem] overflow-hidden">
                       <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/5">
                         <h3 className="text-2xl font-black flex items-center gap-4">
                           <div className="w-1.5 h-7 bg-primary-500 rounded-full"></div>
                           Structure de Features Détectée
                         </h3>
                         <button onClick={() => setAnalysisResults(null)} className="px-6 py-2 rounded-full border border-white/10 text-xs font-black uppercase text-slate-400 hover:text-white transition-colors">
                           Réinitialiser
                         </button>
                       </div>
                       <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-[#0f172a] text-slate-500 text-[10px] uppercase font-black tracking-widest leading-none">
                              <tr>
                                {analysisResults.columns.map(col => (
                                  <th key={col} className="p-8 pb-4 whitespace-nowrap">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="text-sm font-bold">
                              {analysisResults.preview.slice(0, 15).map((row, i) => {
                                const labelValue = row['Label'] || row['label'] || '';
                                const isAttack = labelValue && labelValue.toUpperCase() !== 'BENIGN';
                                return (
                                  <tr key={i} className={`border-t border-white/5 transition-colors ${isAttack ? 'bg-rose-500/20 hover:bg-rose-500/30 glow-border-danger' : 'hover:bg-white/5'}`}>
                                    {analysisResults.columns.map(col => (
                                      <td key={col} className={`p-8 whitespace-nowrap font-mono ${isAttack ? 'text-rose-400 font-black opacity-100 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-slate-300 opacity-70'}`}>
                                        {row[col]}
                                      </td>
                                    ))}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                       </div>
                    </div>

                    <div className="flex justify-center pt-8">
                       <button 
                          onClick={handleAnalyze}
                          disabled={isAnalyzing}
                          className={`group relative bg-gradient-to-br ${isAnalyzing ? 'from-slate-600 to-slate-700' : 'from-emerald-600 to-green-700'} text-white px-16 py-7 rounded-[2.5rem] font-black text-2xl flex items-center gap-4 shadow-[0_20px_50px_rgba(16,185,129,0.3)] hover:-translate-y-2 transition-all active:scale-95`}
                       >
                          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]"></div>
                          <ShieldAlert size={32} className={isAnalyzing ? 'animate-spin' : ''} />
                          {isAnalyzing ? "ANALYSE EN COURS..." : "LANCER L'IA LSTM CORE"}
                       </button>
                    </div>
                  </div>
                )}
             </div>
          )}

          {activeTab === 'journal' && (
             <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000 space-y-10">
                <div className="flex justify-between items-end mb-4">
                   <div>
                     <h2 className="text-5xl font-black text-white tracking-tighter mb-4">Journal Global</h2>
                     <p className="text-slate-400 text-lg">Persistance SQLite des menaces interceptées au fil du temps.</p>
                   </div>
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="glass-panel p-10 rounded-[3rem]">
                      <h3 className="text-3xl font-black text-white mb-8 border-b border-white/5 pb-4">Activité Journalière (14j)</h3>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={journalData.daily} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="5 15" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '1rem', fontWeight: 'bold' }} />
                            <Bar dataKey="attacks" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="glass-panel p-10 rounded-[3rem]">
                      <h3 className="text-3xl font-black text-white mb-8 border-b border-white/5 pb-4">Activité Mensuelle (12m)</h3>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={journalData.monthly} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                            <defs>
                              <linearGradient id="colorMonth" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="5 15" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '1rem', fontWeight: 'bold' }} />
                            <Area type="monotone" dataKey="attacks" stroke="#ec4899" fillOpacity={1} fill="url(#colorMonth)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="xl:col-span-2 glass-panel p-10 rounded-[3rem]">
                      <h3 className="text-3xl font-black text-white mb-8 border-b border-white/5 pb-4">Activité Annuelle</h3>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={journalData.yearly} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                            <defs>
                              <linearGradient id="colorYearly" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={1}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="5 15" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '1rem', fontWeight: 'bold' }} />
                            <Bar dataKey="attacks" fill="url(#colorYearly)" radius={[8, 8, 0, 0]} barSize={80} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                </div>
             </div>
          )}

          {activeTab === 'history' && (
            <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000 space-y-10">
               <div className="flex justify-between items-end mb-4">
                  <div>
                    <h2 className="text-5xl font-black text-white tracking-tighter mb-4">Intelligence Archive</h2>
                    <p className="text-slate-400 text-lg">Consultez et exportez vos audits de sécurité passés.</p>
                  </div>
                  <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-4 animate-pulse">
                     <BrainCircuit size={24} className="text-primary-400" />
                     <span className="text-xs font-black uppercase tracking-widest text-slate-300">LSTM Monitor Active</span>
                  </div>
               </div>

               {savedReports.length === 0 ? (
                 <div className="glass-panel p-20 rounded-[3rem] flex flex-col items-center justify-center text-center border-dashed border-2 border-slate-800 transition-all hover:border-primary-500/50">
                    <div className="p-8 bg-slate-900 rounded-3xl mb-8 text-slate-700">
                       <FileText size={64} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-4">Aucun rapport disponible</h3>
                    <p className="text-slate-500 max-w-md">Réalisez une analyse IA pour générer votre premier audit de sécurité.</p>
                    <button onClick={() => setActiveTab('analysis')} className="mt-8 text-primary-400 font-extrabold uppercase text-xs tracking-widest flex items-center gap-2 hover:gap-4 transition-all underline underline-offset-8">
                       Lancer une analyse <ChevronRight size={16} />
                    </button>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 gap-6">
                    {savedReports.map((report) => (
                      <div key={report.id} className="glass-panel p-8 rounded-[2.5rem] flex flex-row items-center justify-between border border-white/5 hover:border-primary-500/30 transition-all group relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-3xl -mr-10 -mt-10 rounded-full group-hover:bg-primary-500/10 transition-colors"></div>
                         
                         <div className="flex items-center gap-8 relative z-10">
                            <div className={`p-5 rounded-2xl ${report.riskLevel === 'Critical' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.2)]' : (report.riskLevel === 'Medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20')} transition-all group-hover:scale-110`}>
                               {report.riskLevel === 'Critical' ? <ShieldAlert size={32} /> : (report.riskLevel === 'Medium' ? <AlertTriangle size={32} /> : <ShieldCheck size={32} />)}
                            </div>
                            
                            <div className="space-y-1">
                               <div className="flex items-center gap-4">
                                  <h3 className="text-xl font-black text-white tracking-tight">{report.filename}</h3>
                                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${report.riskLevel === 'Critical' ? 'bg-rose-500 text-white' : (report.riskLevel === 'Medium' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-white')}`}>
                                    {report.riskLevel}
                                  </span>
                               </div>
                               <div className="flex items-center gap-4 text-xs font-bold text-slate-500 lowercase tracking-wide">
                                  <span className="flex items-center gap-1"><History size={12} /> {report.date}</span>
                                  <span className="flex items-center gap-1"><Database size={12} /> Paquets {Object.values(report.stats).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                               </div>
                            </div>
                         </div>

                         <div className="flex items-center gap-4 relative z-10">
                            <button 
                               onClick={() => downloadReportPDF(report)}
                               className="flex items-center gap-3 bg-white/5 hover:bg-primary-500 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all ring-1 ring-white/5 hover:ring-primary-400 group/btn shadow-xl"
                            >
                               <Download size={16} className="group-hover/btn:-translate-y-1 transition-transform" />
                               Download PDF
                            </button>
                            <button 
                               onClick={() => {
                                 if (window.confirm("🗑️ Voulez-vous vraiment supprimer cet audit de l'historique ?")) {
                                   const updated = savedReports.filter(r => r.id !== report.id)
                                   setSavedReports(updated)
                                   localStorage.setItem('ddos_reports', JSON.stringify(updated))
                                 }
                               }}
                               className="p-3 bg-white/5 hover:bg-rose-500 text-slate-500 hover:text-white rounded-2xl transition-all border border-white/5"
                               title="Supprimer le rapport"
                            >
                               <XCircle size={18} />
                            </button>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          )}

          {activeTab === 'metrics' && (
             <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000 space-y-10">
                <div className="glass-panel p-12 rounded-[3.5rem] border border-white/5">
                   <h2 className="text-4xl font-black mb-8 text-white">LSTM Model Performance</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      <div className="bg-white/5 p-8 rounded-3xl border border-white/5 text-center">
                         <div className="text-4xl font-black text-primary-400 mb-2">{metrics?.accuracy ? (metrics.accuracy < 1 ? metrics.accuracy * 100 : metrics.accuracy).toFixed(1) : "0.0"}%</div>
                         <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Accuracy Score</div>
                      </div>
                      <div className="bg-white/5 p-8 rounded-3xl border border-white/5 text-center">
                         <div className="text-4xl font-black text-emerald-400 mb-2">{metrics?.precision ? (metrics.precision < 1 ? metrics.precision * 100 : metrics.precision).toFixed(1) : "0.0"}%</div>
                         <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Precision</div>
                      </div>
                      <div className="bg-white/5 p-8 rounded-3xl border border-white/5 text-center">
                         <div className="text-4xl font-black text-rose-400 mb-2">{metrics?.recall ? (metrics.recall < 1 ? metrics.recall * 100 : metrics.recall).toFixed(1) : "0.0"}%</div>
                         <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Recall Rate</div>
                      </div>
                      <div className="bg-white/5 p-8 rounded-3xl border border-white/5 text-center">
                         <div className="text-4xl font-black text-indigo-400 mb-2">{metrics?.f1_score ? (metrics.f1_score < 1 ? metrics.f1_score : metrics.f1_score / 100).toFixed(3) : "0.000"}</div>
                         <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">F1 Score</div>
                      </div>
                   </div>
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  )
}

function NavItem({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`group relative flex items-center gap-3 px-6 py-3 rounded-full transition-all duration-500 font-extrabold text-sm tracking-tighter ${
        active 
          ? 'bg-white/10 text-white shadow-xl ring-1 ring-white/20' 
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <div className={`transition-transform duration-500 ${active ? 'scale-110' : 'group-hover:rotate-12'}`}>{icon}</div>
      <span className="uppercase">{label}</span>
      {active && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-400 shadow-[0_0_10px_#0ea5e9]"></div>}
    </button>
  )
}

function KPICard({ title, value, icon, subtext, alert }) {
  return (
    <div className={`glass-panel p-8 flex flex-row items-center gap-8 rounded-[2.5rem] border border-white/5 hover:border-white/20 transition-all hover:-translate-y-2 group cursor-default ${alert ? 'glow-border-danger bg-rose-500/5' : 'hover:glow-border-primary'}`}>
      <div className={`p-5 rounded-3xl transition-all duration-500 group-hover:scale-110 ${alert ? 'bg-rose-500/20 text-rose-500' : 'bg-white/5 text-primary-400 shadow-inner ring-1 ring-white/10'}`}>
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{title}</h4>
          {alert && (
            <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-[0_0_10px_#f43f5e] animate-pulse">
              ALERT
            </span>
          )}
        </div>
        <p className="text-4xl font-black text-white tracking-tighter leading-none mb-2 drop-shadow-lg">{value}</p>
        <p className={`text-[10px] font-bold italic tracking-wide opacity-50 ${alert ? 'text-rose-400' : 'text-slate-400'}`}>
          {subtext}
        </p>
      </div>
    </div>
  )
}

export default App
