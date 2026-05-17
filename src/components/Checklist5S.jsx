import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  CheckCircle2,
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  Trophy,
  Download,
  Save,
  LogIn,
  LogOut,
  RotateCcw,
  Wifi,
  WifiOff,
  Clock,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion } from 'framer-motion';

/*
=========================================================
CHECKLIST 5S WEB APP - VERSIÓN MULTIEQUIPO CON SUPABASE
CON CRONÓMETRO COMPETITIVO
=========================================================

DEPENDENCIAS:
npm install @supabase/supabase-js lucide-react jspdf framer-motion

VARIABLES DE ENTORNO EN .env.local:
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
VITE_EVENT_CODE=dinamica-5s-2026

TABLA SUPABASE REQUERIDA:
auditorias_5s

CRITERIO DE RANKING:
1. Mayor score
2. Menor tiempo de evaluación
3. Fecha de guardado
*/

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const eventCode = import.meta.env.VITE_EVENT_CODE || 'evento-demo-5s';

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

const baseItems = [
  { cantidad: 1, objeto: 'Lima' },
  { cantidad: 1, objeto: 'Martillo' },
  { cantidad: 1, objeto: 'Llave' },
  { cantidad: 1, objeto: 'Destornillador Cruz' },
  { cantidad: 1, objeto: 'Pinzas' },
  { cantidad: 1, objeto: 'Alicates' },
  { cantidad: 1, objeto: 'Llave Doble Punta' },
  { cantidad: 6, objeto: 'Tornillos' },
  { cantidad: 6, objeto: 'Clavos' },
  { cantidad: 1, objeto: 'Placa 3 Figuras' },
  { cantidad: 1, objeto: 'Placa 3 Orificios' },
  { cantidad: 1, objeto: 'Placa 2 Orificios' },
  { cantidad: 1, objeto: 'Base Mesa 3 Orificios' },
  { cantidad: 1, objeto: 'Base Mesa 2 Orificios' },
  { cantidad: 1, objeto: 'Placa Esquinero' },
];

const createInitialItems = () =>
  baseItems.map((item) => ({
    ...item,
    disponible: false,
    observaciones: '',
  }));

const formatDuration = (totalSeconds = 0) => {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function Checklist5S() {
  const [logged, setLogged] = useState(false);
  const [loginData, setLoginData] = useState({
    equipo: '',
    departamento: '',
    responsable: '',
    password: '',
  });
  const [ranking, setRanking] = useState([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(
    supabase ? 'Conectando...' : 'Sin configurar'
  );

  const [timerStartedAt, setTimerStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [auditClosed, setAuditClosed] = useState(false);

  const [formData, setFormData] = useState({
    equipo: '',
    departamento: '',
    responsable: '',
    fecha: new Date().toISOString().split('T')[0],
  });

  const [items, setItems] = useState(createInitialItems);

  const completedItems = useMemo(
    () => items.filter((item) => item.disponible).length,
    [items]
  );

  const score = useMemo(
    () => Math.round((completedItems / items.length) * 100),
    [completedItems, items.length]
  );

  const faltantes = items.length - completedItems;

  const playSound = (type) => {
    try {
      const audio = new Audio(
        type === 'success'
          ? 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
          : 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'
      );
      audio.volume = 0.16;
      audio.play().catch(() => {});
    } catch {
      // Evita que un bloqueo del navegador rompa la aplicación.
    }
  };

  const loadRanking = async () => {
    if (!supabase) {
      setConnectionStatus('Sin configurar');
      return;
    }

    setLoadingRanking(true);

    const { data, error } = await supabase
      .from('auditorias_5s')
      .select('*')
      .eq('event_code', eventCode)
      .order('score', { ascending: false })
      .order('tiempo_segundos', { ascending: true, nullsFirst: false })
      .order('fecha_guardado', { ascending: true });

    if (error) {
      console.error(error);
      setConnectionStatus('Error de conexión');
      setLoadingRanking(false);
      return;
    }

    setRanking(data || []);
    setConnectionStatus('Conectado');
    setLoadingRanking(false);
  };

  useEffect(() => {
    loadRanking();

    if (!supabase) return;

    const channel = supabase
      .channel('ranking-auditorias-5s')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auditorias_5s', filter: `event_code=eq.${eventCode}` },
        () => {
          loadRanking();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('Conectado');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!logged || !timerStartedAt || auditClosed) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - timerStartedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [logged, timerStartedAt, auditClosed]);

  const login = () => {
    if (
      !loginData.equipo.trim() ||
      !loginData.departamento.trim() ||
      !loginData.responsable.trim() ||
      !loginData.password.trim()
    ) {
      alert('Ingresa nombre de equipo, departamento, responsable y contraseña rápida.');
      return;
    }

    setLogged(true);
    setAuditClosed(false);
    setElapsedSeconds(0);
    setTimerStartedAt(Date.now());
    setFormData({
      equipo: loginData.equipo.trim(),
      departamento: loginData.departamento.trim(),
      responsable: loginData.responsable.trim(),
      fecha: new Date().toISOString().split('T')[0],
    });
    playSound('success');
  };

  const updateItem = (index, field, value) => {
    if (auditClosed) {
      alert('Esta auditoría ya fue guardada. Usa Limpiar para iniciar una nueva evaluación.');
      return;
    }

    if (field === 'disponible') playSound('click');

    setItems((prevItems) =>
      prevItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const validateAudit = () => {
    if (!supabase) {
      return 'Falta configurar Supabase. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.';
    }
    if (!formData.equipo.trim()) return 'Ingresa el nombre de equipo.';
    if (!formData.departamento.trim()) return 'Ingresa el departamento.';
    if (!formData.responsable.trim()) return 'Ingresa el responsable.';
    if (!formData.fecha) return 'Selecciona la fecha.';
    if (elapsedSeconds <= 0) return 'El cronómetro aún no registra tiempo. Espera al menos 1 segundo antes de guardar.';
    return null;
  };

  const saveAudit = async () => {
    const errorMessage = validateAudit();
    if (errorMessage) {
      alert(errorMessage);
      return;
    }

    const confirmed = window.confirm(
      `¿Guardar evaluación final?

Equipo: ${formData.equipo}
Departamento: ${formData.departamento}
Responsable: ${formData.responsable}
Score: ${score}%
Tiempo: ${formatDuration(elapsedSeconds)}

Después de guardar se bloqueará esta auditoría.`
    );

    if (!confirmed) return;

    setSaving(true);
    setAuditClosed(true);

    const finalSeconds = elapsedSeconds;

    const audit = {
      event_code: eventCode,
      area: formData.equipo.trim(),
      departamento: formData.departamento.trim(),
      responsable: formData.responsable.trim(),
      fecha: formData.fecha,
      score,
      completados: completedItems,
      faltantes,
      total_items: items.length,
      tiempo_segundos: finalSeconds,
      tiempo_formateado: formatDuration(finalSeconds),
      items,
    };

    const { error } = await supabase.from('auditorias_5s').insert(audit);

    setSaving(false);

    if (error) {
      console.error(error);
      setAuditClosed(false);
      alert('No se pudo guardar la auditoría. Revisa la conexión o permisos de Supabase.');
      return;
    }

    await loadRanking();
    alert('Auditoría guardada correctamente en Supabase.');
    playSound('success');
  };

  const resetAudit = () => {
    const confirmed = window.confirm('¿Deseas limpiar el checklist actual e iniciar nuevamente el cronómetro?');
    if (!confirmed) return;

    setItems(createInitialItems());
    setFormData({
      equipo: loginData.equipo || '',
      departamento: loginData.departamento || '',
      responsable: loginData.responsable || '',
      fecha: new Date().toISOString().split('T')[0],
    });
    setAuditClosed(false);
    setElapsedSeconds(0);
    setTimerStartedAt(Date.now());
  };

  const exitToLogin = () => {
    if (!auditClosed && elapsedSeconds > 0) {
      const confirmed = window.confirm(
        'Esta evaluación aún no ha sido guardada. ¿Deseas salir al login de todas formas?'
      );
      if (!confirmed) return;
    }

    setLogged(false);
    setLoginData({
      equipo: '',
      departamento: '',
      responsable: '',
      password: '',
    });
    setFormData({
      equipo: '',
      departamento: '',
      responsable: '',
      fecha: new Date().toISOString().split('T')[0],
    });
    setItems(createInitialItems());
    setAuditClosed(false);
    setElapsedSeconds(0);
    setTimerStartedAt(null);
    setSaving(false);
  };

  const exportPDF = () => {
    if (!formData.equipo.trim() || !formData.departamento.trim() || !formData.responsable.trim() || !formData.fecha) {
      alert('Completa equipo, departamento, responsable y fecha antes de exportar.');
      return;
    }

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let y = 20;

    doc.setFontSize(20);
    doc.text('CHECKLIST 5S - AUDITORÍA', 20, y);

    y += 18;
    doc.setFontSize(12);
    doc.text(`Nombre de Equipo: ${formData.equipo}`, 20, y);
    y += 8;
    doc.text(`Departamento: ${formData.departamento}`, 20, y);
    y += 8;
    doc.text(`Responsable: ${formData.responsable}`, 20, y);
    y += 8;
    doc.text(`Fecha: ${formData.fecha}`, 20, y);
    y += 8;
    doc.text(`Resultado: ${score}%`, 20, y);
    y += 8;
    doc.text(`Tiempo: ${formatDuration(elapsedSeconds)}`, 20, y);
    y += 8;
    doc.text(`Piezas OK: ${completedItems} / ${items.length}`, 20, y);

    y += 15;
    doc.setFontSize(11);

    items.forEach((item, index) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }

      const status = item.disponible ? 'OK' : 'FALTANTE';
      const obs = item.observaciones ? ` | Obs: ${item.observaciones}` : '';
      const line = `${index + 1}. ${item.cantidad} x ${item.objeto} - ${status}${obs}`;
      const wrapped = doc.splitTextToSize(line, 170);

      doc.text(wrapped, 20, y);
      y += wrapped.length * 7;
    });

    const safeTeam = formData.equipo.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`auditoria_5s_${safeTeam || 'equipo'}.pdf`);
    playSound('success');
  };

  const getScoreColor = () => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-300';
    return 'text-red-400';
  };

  const getStatusText = () => {
    if (score >= 90) return 'Excelente';
    if (score >= 70) return 'Aceptable';
    return 'Atención requerida';
  };

  const getRankingBadge = (index) => {
    if (index === 0) return '🏆';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  const isConnected = connectionStatus === 'Conectado';

  if (!logged) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-blue-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[30px] shadow-2xl p-8 md:p-10 w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="inline-flex p-5 rounded-full bg-cyan-100 mb-5">
              <LogIn className="w-10 h-10 text-cyan-700" />
            </div>

            <h1 className="text-4xl font-black text-slate-800 mb-2">LOGIN 5S</h1>
            <p className="text-slate-500">Registro rápido antes de iniciar cronómetro</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nombre de Equipo. Ej. Equipo 1"
              value={loginData.equipo}
              onChange={(e) => setLoginData({ ...loginData, equipo: e.target.value })}
              className="w-full rounded-2xl border border-slate-300 px-5 py-4 focus:outline-none focus:ring-4 focus:ring-cyan-300"
            />

            <input
              type="text"
              placeholder="Departamento. Ej. Producción"
              value={loginData.departamento}
              onChange={(e) => setLoginData({ ...loginData, departamento: e.target.value })}
              className="w-full rounded-2xl border border-slate-300 px-5 py-4 focus:outline-none focus:ring-4 focus:ring-cyan-300"
            />

            <input
              type="text"
              placeholder="Responsable. Ej. Juan Pérez"
              value={loginData.responsable}
              onChange={(e) => setLoginData({ ...loginData, responsable: e.target.value })}
              className="w-full rounded-2xl border border-slate-300 px-5 py-4 focus:outline-none focus:ring-4 focus:ring-cyan-300"
            />

            <input
              type="password"
              placeholder="Contraseña rápida"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              className="w-full rounded-2xl border border-slate-300 px-5 py-4 focus:outline-none focus:ring-4 focus:ring-cyan-300"
            />

            <button
              onClick={login}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-2xl py-4 font-bold text-lg hover:scale-[1.02] transition-all"
            >
              Ingresar e iniciar cronómetro
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              {isConnected ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-red-500" />}
              <span>Supabase: {connectionStatus}</span>
            </div>

            <p className="text-xs text-slate-400 text-center">
              Captura los datos del equipo antes de iniciar. El cronómetro arranca al presionar ingresar.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-blue-100 p-3 md:p-6 lg:p-10 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto bg-white rounded-[30px] overflow-hidden shadow-2xl border border-cyan-100"
      >
        <div className="relative overflow-hidden bg-gradient-to-r from-cyan-700 via-blue-700 to-slate-800 text-white px-5 py-8 md:px-10 md:py-10">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full translate-x-24 -translate-y-24" />
          <div className="absolute bottom-0 left-0 w-52 h-52 bg-cyan-400/10 rounded-full -translate-x-16 translate-y-16" />

          <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-6 lg:items-center">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <ClipboardCheck className="w-10 h-10 text-cyan-200" />
                <h1 className="text-3xl md:text-5xl font-black tracking-wide">CHECKLIST 5S</h1>
              </div>
              <p className="text-cyan-100 text-base md:text-xl font-medium max-w-2xl">
                Auditoría visual multiequipo. Gana quien obtenga mayor score en menor tiempo.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm">
                  {isConnected ? <Wifi className="w-4 h-4 text-green-300" /> : <WifiOff className="w-4 h-4 text-red-300" />}
                  <span>Supabase: {connectionStatus}</span>
                </div>

                <div className="inline-flex items-center gap-2 bg-yellow-400/15 border border-yellow-300/30 rounded-full px-4 py-2 text-sm font-bold">
                  <Clock className="w-4 h-4 text-yellow-200" />
                  <span>Tiempo: {formatDuration(elapsedSeconds)}</span>
                  {auditClosed && <span className="text-green-200">· Guardado</span>}
                </div>
              </div>
            </div>

            <div className="w-full lg:max-w-[560px] xl:max-w-[620px]">
              <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="h-[88px] bg-white/10 backdrop-blur-lg rounded-2xl p-3 border border-white/20 text-center flex flex-col items-center justify-center shadow-lg">
                <CheckCircle2 className="w-5 h-5 mb-1 text-cyan-200" />
                <div className="text-[9px] md:text-[10px] uppercase tracking-wide text-cyan-100 leading-tight whitespace-nowrap">
                  Cumplimiento
                </div>
                <div className={`text-3xl leading-none mt-1 font-black ${getScoreColor()}`}>{score}%</div>
              </div>

              <div className="h-[88px] bg-white/10 backdrop-blur-lg rounded-2xl p-3 border border-white/20 text-center flex flex-col items-center justify-center shadow-lg">
                <Clock className="w-5 h-5 mb-1 text-yellow-200" />
                <div className="text-[9px] md:text-[10px] uppercase tracking-wide text-cyan-100 leading-tight whitespace-nowrap">Tiempo</div>
                <div className="text-3xl leading-none mt-1 font-black text-white">{formatDuration(elapsedSeconds)}</div>
              </div>

              <div className="h-[88px] bg-white/10 backdrop-blur-lg rounded-2xl p-3 border border-white/20 text-center flex flex-col items-center justify-center shadow-lg">
                <AlertTriangle className="w-5 h-5 mb-1 text-yellow-300" />
                <div className="text-[9px] md:text-[10px] uppercase tracking-wide text-cyan-100 leading-tight whitespace-nowrap">Faltantes</div>
                <div className="text-3xl leading-none mt-1 font-black text-white">{faltantes}</div>
              </div>

                            </div>

              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={saveAudit}
                  disabled={saving || auditClosed}
                  className="h-[76px] bg-green-500 hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed text-white rounded-2xl px-4 py-3 font-bold transition-all flex flex-col items-center justify-center gap-1 shadow-lg"
                >
                  <Save className="w-5 h-5" /> {saving ? 'Guardando...' : auditClosed ? 'Guardado' : 'Guardar'}
                </button>

                              <button onClick={exportPDF} className="h-[76px] bg-red-500 hover:bg-red-600 text-white rounded-2xl px-4 py-3 font-bold transition-all flex flex-col items-center justify-center gap-1 shadow-lg">
                  <Download className="w-5 h-5" /> PDF
                </button>

                <button onClick={resetAudit} className="h-[76px] bg-slate-600 hover:bg-slate-700 text-white rounded-2xl px-4 py-3 font-bold transition-all flex flex-col items-center justify-center gap-1 shadow-lg">
                  <RotateCcw className="w-5 h-5" /> Limpiar
                </button>

                <button onClick={exitToLogin} className="h-[76px] bg-orange-500 hover:bg-orange-600 text-white rounded-2xl px-4 py-3 font-bold transition-all flex flex-col items-center justify-center gap-1 shadow-lg">
                  <LogOut className="w-5 h-5" /> Salir
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-5 p-5 md:p-8 bg-slate-50 border-b border-slate-200">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nombre de Equipo</label>
            <input
              type="text"
              value={formData.equipo}
              disabled
              className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-slate-100 text-slate-700 font-semibold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Departamento</label>
            <input
              type="text"
              value={formData.departamento}
              disabled
              className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-slate-100 text-slate-700 font-semibold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Responsable</label>
            <input
              type="text"
              value={formData.responsable}
              disabled
              className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-slate-100 text-slate-700 font-semibold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Fecha</label>
            <input
              type="date"
              value={formData.fecha}
              disabled={auditClosed}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-cyan-300 disabled:bg-slate-100"
            />
          </div>

          <div className="bg-white rounded-2xl border border-cyan-100 shadow-sm p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">Cronómetro</div>
              <div className="text-4xl font-black text-cyan-700">{formatDuration(elapsedSeconds)}</div>
              <div className="text-xs text-slate-500">
                {auditClosed ? 'Tiempo final guardado' : 'Corre desde el login'}
              </div>
            </div>
            <Clock className="w-10 h-10 text-cyan-600" />
          </div>
        </div>

        <div className="p-3 md:p-6 lg:p-8">
          <div className="overflow-x-auto rounded-[28px] border border-slate-200 shadow-xl">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-cyan-700 to-blue-700 text-white">
                  <th className="px-4 py-5 text-left text-sm md:text-base uppercase tracking-wide">Cantidad</th>
                  <th className="px-4 py-5 text-left text-sm md:text-base uppercase tracking-wide">Herramienta / Componente</th>
                  <th className="px-4 py-5 text-center text-sm md:text-base uppercase tracking-wide">Disponible</th>
                  <th className="px-4 py-5 text-center text-sm md:text-base uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-5 text-left text-sm md:text-base uppercase tracking-wide">Observaciones</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={item.objeto}
                    className={`border-b border-slate-200 transition-all duration-200 ${
                      item.disponible ? 'bg-green-50/60' : index % 2 === 0 ? 'bg-white' : 'bg-cyan-50/40'
                    } hover:bg-cyan-100/50`}
                  >
                    <td className="px-4 py-5 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 font-black text-xl shadow-sm">
                        {item.cantidad}
                      </div>
                    </td>

                    <td className="px-4 py-5">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 rounded-xl p-2">
                          <Wrench className="w-5 h-5 text-cyan-700" />
                        </div>
                        <span className="font-bold text-slate-700 text-sm md:text-lg">{item.objeto}</span>
                      </div>
                    </td>

                    <td className="px-4 py-5 text-center">
                      <input
                        type="checkbox"
                        checked={item.disponible}
                        disabled={auditClosed}
                        onChange={(e) => updateItem(index, 'disponible', e.target.checked)}
                        className="w-7 h-7 accent-cyan-600 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </td>

                    <td className="px-4 py-5 text-center">
                      {item.disponible ? (
                        <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-xs md:text-sm font-bold">OK</span>
                      ) : (
                        <span className="bg-red-100 text-red-600 px-4 py-2 rounded-full text-xs md:text-sm font-bold">FALTANTE</span>
                      )}
                    </td>

                    <td className="px-4 py-5">
                      <input
                        type="text"
                        value={item.observaciones}
                        disabled={auditClosed}
                        onChange={(e) => updateItem(index, 'observaciones', e.target.value)}
                        placeholder="Agregar comentario"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-300 text-sm disabled:bg-slate-100"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900 text-white px-5 py-8 md:px-10 flex flex-col lg:flex-row gap-6 justify-between items-center">
          <div>
            <h3 className="text-2xl font-black mb-2">Metodología 5S</h3>
            <p className="text-slate-300 max-w-2xl text-sm md:text-base">Clasificar · Ordenar · Limpiar · Estandarizar · Disciplina</p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
            <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-3xl px-8 py-5 text-center backdrop-blur-md">
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-200 mb-1">Resultado final</div>
              <div className={`text-5xl font-black ${getScoreColor()}`}>{score}%</div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-3xl px-8 py-5 text-center backdrop-blur-md">
              <div className="text-xs uppercase tracking-[0.25em] text-yellow-200 mb-1">Tiempo</div>
              <div className="text-5xl font-black text-yellow-200">{formatDuration(elapsedSeconds)}</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl px-8 py-5 text-center">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-300 mb-1">Evaluación</div>
              <div className="text-2xl font-black text-white">{getStatusText()}</div>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-8 bg-gradient-to-r from-slate-100 to-cyan-50 border-t border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <h2 className="text-3xl font-black text-slate-800">Ranking Competitivo</h2>
                <p className="text-sm text-slate-500 font-medium">Criterio: mayor score y, en empate, menor tiempo.</p>
              </div>
            </div>
            <button
              onClick={loadRanking}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Actualizar ranking
            </button>
          </div>

          <div className="grid gap-4">
            {loadingRanking ? (
              <div className="bg-white rounded-2xl p-6 text-slate-500 shadow-md">Cargando ranking...</div>
            ) : ranking.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-slate-500 shadow-md">Aún no existen auditorías guardadas.</div>
            ) : (
              ranking.map((item, index) => (
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-2xl p-5 shadow-md border border-slate-200 grid grid-cols-1 md:grid-cols-7 gap-4 items-center"
                >
                  <div>
                    <div className="text-sm text-slate-500 uppercase tracking-widest">Lugar</div>
                    <div className="text-3xl font-black text-slate-800">{getRankingBadge(index)}</div>
                  </div>

                  <div>
                    <div className="text-sm text-slate-500 uppercase tracking-widest">Equipo</div>
                    <div className="text-2xl font-black text-slate-800">{item.area || 'Sin equipo'}</div>
                  </div>

                  <div>
                    <div className="text-sm text-slate-500 uppercase tracking-widest">Departamento</div>
                    <div className="text-lg font-bold text-slate-700">{item.departamento || 'N/A'}</div>
                  </div>

                  <div>
                    <div className="text-sm text-slate-500 uppercase tracking-widest">Responsable</div>
                    <div className="text-lg font-bold text-slate-700">{item.responsable || 'N/A'}</div>
                  </div>

                  <div>
                    <div className="text-sm text-slate-500 uppercase tracking-widest">Fecha</div>
                    <div className="text-lg font-bold text-slate-700">{item.fecha || 'N/A'}</div>
                  </div>

                  <div className="text-left md:text-center">
                    <div className="text-sm text-slate-500 uppercase tracking-widest">Score</div>
                    <div className="text-4xl font-black text-cyan-700">{item.score}%</div>
                  </div>

                  <div className="text-left md:text-center">
                    <div className="text-sm text-slate-500 uppercase tracking-widest">Tiempo</div>
                    <div className="text-4xl font-black text-yellow-600">
                      {item.tiempo_formateado || formatDuration(item.tiempo_segundos || 0)}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}