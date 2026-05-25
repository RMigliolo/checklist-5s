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
  Users,
  UserRound,
  UserRoundCheck,
  Star,
  Timer,
  CalendarDays,
  RefreshCw,
  PackageCheck,
  PackageX,
  Gauge,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

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
const logoDorado = `${import.meta.env.BASE_URL}logos/Logos-PI-02.png`;
const logoBlanco = `${import.meta.env.BASE_URL}logos/Logos-PI-04.png`;

const RANKING_AUTO_REFRESH_MS = 15 * 60 * 1000; // 15 minutos
const RANKING_AUTO_SCROLL_MS = 15 * 60 * 1000; // espera 15 minutos antes de iniciar cada recorrido
const RANKING_SCROLL_DOWN_DURATION_MS = 60000; // 60 segundos bajando suave
const RANKING_SCROLL_UP_DURATION_MS = 60000; // 60 segundos subiendo suave
const RANKING_SCROLL_BOTTOM_PAUSE_MS = 15000; // 15 segundos abajo

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
  { cantidad: 1, objeto: 'Pinza Tenaza' },
  { cantidad: 1, objeto: 'Llave Doble Punta' },
  { cantidad: 6, objeto: 'Tornillos' },
  { cantidad: 6, objeto: 'Tuercas' },
  { cantidad: 6, objeto: 'Taquetes' },
  { cantidad: 1, objeto: 'Placa 3 Figuras' },
  { cantidad: 1, objeto: 'Placa 3 Orificios' },
  { cantidad: 1, objeto: 'Placa 2 Orificios' },
  { cantidad: 1, objeto: 'Base 3 Orificios' },
  { cantidad: 1, objeto: 'Base 2 Orificios' },
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

const toPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
};

const getParticipantesTotal = (hombres, mujeres) => {
  return toPositiveNumber(hombres) + toPositiveNumber(mujeres);
};

const smoothScrollToPosition = (targetY, duration = 60000) => {
  const startY = window.scrollY;
  const distance = targetY - startY;
  const startTime = performance.now();

  const easeInOutCubic = (progress) => {
    return progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  };

  const animateScroll = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeInOutCubic(progress);

    window.scrollTo(0, startY + distance * easedProgress);

    if (progress < 1) {
      window.requestAnimationFrame(animateScroll);
    }
  };

  window.requestAnimationFrame(animateScroll);
};
const parseIntegrantes = (value = '') => {
  return value
    .split(/[,\n]/)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => name.split(/\s+/)[0])
    .map((name) => name.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ-]/g, ''))
    .filter(Boolean)
    .slice(0, 10);
};

const formatIntegrantes = (integrantes = []) => {
  if (!Array.isArray(integrantes) || integrantes.length === 0) return 'N/A';
  return integrantes.join(', ');
};
const normalizeIntegrantes = (integrantes = []) => {
  if (!Array.isArray(integrantes)) return [];
  return integrantes
    .map((name) => String(name).trim())
    .filter(Boolean)
    .slice(0, 10);
};

const renderIntegrantesRanking = (integrantes = [], index = 0) => {
  const names = normalizeIntegrantes(integrantes);

  if (names.length === 0) {
    return (
      <span className="text-sm md:text-base xl:text-lg font-black leading-none">
        N/A
      </span>
    );
  }

  return (
   <div className="w-full grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-x-1.5 gap-y-1">
     {names.map((name, nameIndex) => (
       <span
         key={`${name}-${nameIndex}`}
         className={`rounded-full px-2 py-1 text-[9px] md:text-[10px] xl:text-xs 2xl:text-sm font-black leading-none text-center whitespace-nowrap overflow-hidden ${
           index <= 2
             ? 'bg-white/75 text-slate-950'
             : 'bg-white/18 text-white border border-white/15'
         }`}
         title={name}
       >
         {name}
       </span>
     ))}
   </div>
  );
};

const DashboardMetricCard = ({
  title,
  value,
  subtitle,
  icon,
  color = 'cyan',
  progress = null,
}) => {
  const colorMap = {
    cyan: {
      text: 'text-cyan-600',
      bg: 'bg-cyan-50',
      bar: 'bg-cyan-500',
      glow: 'from-cyan-100 to-blue-50',
    },
    green: {
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      bar: 'bg-emerald-500',
      glow: 'from-emerald-100 to-green-50',
    },
    blue: {
      text: 'text-blue-600',
      bg: 'bg-blue-50',
      bar: 'bg-blue-500',
      glow: 'from-blue-100 to-sky-50',
    },
    pink: {
      text: 'text-pink-500',
      bg: 'bg-pink-50',
      bar: 'bg-pink-500',
      glow: 'from-pink-100 to-rose-50',
    },
    amber: {
      text: 'text-amber-600',
      bg: 'bg-amber-50',
      bar: 'bg-amber-500',
      glow: 'from-amber-100 to-yellow-50',
    },
    purple: {
      text: 'text-purple-600',
      bg: 'bg-purple-50',
      bar: 'bg-purple-500',
      glow: 'from-purple-100 to-violet-50',
    },
  };

  const theme = colorMap[color] || colorMap.cyan;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-white rounded-[28px] p-4 border border-white shadow-[0_16px_38px_rgba(15,23,42,0.09),inset_5px_5px_12px_rgba(15,23,42,0.035),inset_-5px_-5px_12px_rgba(255,255,255,0.95)] min-h-[142px]"
    >
      <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full bg-gradient-to-br ${theme.glow} opacity-80`} />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className={`text-[11px] uppercase tracking-[0.18em] font-black ${theme.text}`}>
            {title}
          </div>

          <div className="text-3xl md:text-4xl font-black text-slate-900 mt-2 leading-none">
            {value}
          </div>

          <div className="text-sm text-slate-500 font-semibold mt-2">
            {subtitle}
          </div>
        </div>

        <div className={`w-12 h-12 rounded-2xl ${theme.bg} ${theme.text} flex items-center justify-center shadow-[inset_4px_4px_10px_rgba(15,23,42,0.06),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]`}>
          {icon}
        </div>
      </div>

      {progress !== null && (
        <div className="relative z-10 mt-4 w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${theme.bar} rounded-full transition-all duration-700`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </motion.div>
  );
};

const DashboardPanel = ({ title, subtitle, children, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-[28px] p-4 border border-white shadow-[0_16px_38px_rgba(15,23,42,0.09),inset_4px_4px_10px_rgba(15,23,42,0.03),inset_-4px_-4px_10px_rgba(255,255,255,0.95)] ${className}`}
    >
      <div className="mb-3">
        <h3 className="text-lg font-black text-slate-900 leading-tight">
          {title}
        </h3>
        <p className="text-sm text-slate-500 font-semibold">
          {subtitle}
        </p>
      </div>

      {children}
    </motion.div>
  );
};

const DashboardSmallKpi = ({
  title,
  value,
  subtitle,
  icon,
  color = 'cyan',
}) => {
  const colorMap = {
    cyan: {
      text: 'text-cyan-600',
      bg: 'bg-cyan-50',
      border: 'border-cyan-100',
    },
    green: {
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    amber: {
      text: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    purple: {
      text: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
    },
    red: {
      text: 'text-red-500',
      bg: 'bg-red-50',
      border: 'border-red-100',
    },
  };

  const theme = colorMap[color] || colorMap.cyan;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[26px] p-4 border border-white shadow-[0_14px_32px_rgba(15,23,42,0.085),inset_4px_4px_10px_rgba(15,23,42,0.03),inset_-4px_-4px_10px_rgba(255,255,255,0.95)] min-h-[112px]"
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-2xl ${theme.bg} ${theme.border} ${theme.text} border flex items-center justify-center shadow-[inset_4px_4px_10px_rgba(15,23,42,0.06),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <div className={`text-[11px] uppercase tracking-[0.18em] font-black ${theme.text}`}>
            {title}
          </div>

          <div className="text-2xl font-black text-slate-900 leading-none mt-1">
            {value}
          </div>

          <div className="text-sm text-slate-500 font-semibold mt-2 truncate">
            {subtitle}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const DashboardTableCard = ({ title, subtitle, children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[28px] p-4 border border-white shadow-[0_16px_38px_rgba(15,23,42,0.09),inset_4px_4px_10px_rgba(15,23,42,0.03),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]"
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-2xl font-black text-slate-900">
            {title}
          </h3>
          <p className="text-sm text-slate-500 font-semibold">
            {subtitle}
          </p>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shadow-inner">
          <Trophy className="w-6 h-6 text-amber-500" />
        </div>
      </div>

      {children}
    </motion.div>
  );
};

export default function Checklist5S() {
  const [logged, setLogged] = useState(false);
  const [loginData, setLoginData] = useState({
  equipo: '',
  departamento: '',
  responsable: '',
  integrantesText: '',
  hombres: '',
  mujeres: '',
  password: '',
});
  const [ranking, setRanking] = useState([]);
  const [adminView, setAdminView] = useState('auditorias');
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
  integrantes: [],
  hombres: 0,
  mujeres: 0,
  participantesTotal: 0,
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
  const hombres = Number(loginData.hombres || 0);
  const mujeres = Number(loginData.mujeres || 0);
  const participantesTotal = hombres + mujeres;

  if (
    !loginData.equipo.trim() ||
    !loginData.departamento.trim() ||
    !loginData.responsable.trim() ||
    !loginData.password.trim()
  ) {
    alert('Ingresa nombre de equipo, departamento, responsable y contraseña rápida.');
    return;
  }

  if (!Number.isInteger(hombres) || hombres < 0) {
    alert('Ingresa una cantidad válida de hombres.');
    return;
  }

  if (!Number.isInteger(mujeres) || mujeres < 0) {
    alert('Ingresa una cantidad válida de mujeres.');
    return;
  }

  if (participantesTotal <= 0) {
    alert('Ingresa al menos 1 participante entre hombres y mujeres.');
    return;
  }

  if (participantesTotal > 10) {
    alert('El equipo no puede tener más de 10 participantes.');
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
  integrantes: parseIntegrantes(loginData.integrantesText),
  hombres,
  mujeres,
  participantesTotal,
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

  if (!Number.isInteger(Number(formData.hombres)) || Number(formData.hombres) < 0) {
    return 'La cantidad de hombres no es válida.';
  }

  if (!Number.isInteger(Number(formData.mujeres)) || Number(formData.mujeres) < 0) {
    return 'La cantidad de mujeres no es válida.';
  }

  if (Number(formData.participantesTotal) <= 0) {
    return 'Debe existir al menos 1 participante.';
  }

  if (Number(formData.participantesTotal) > 10) {
    return 'El equipo no puede tener más de 10 participantes.';
  }

  if (!formData.fecha) return 'Selecciona la fecha.';

  if (elapsedSeconds <= 0) {
    return 'El cronómetro aún no registra tiempo. Espera al menos 1 segundo antes de guardar.';
  }

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
  Participantes: ${formData.participantesTotal}
  Hombres: ${formData.hombres}
  Mujeres: ${formData.mujeres}
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
      integrantes: formData.integrantes || [],
      hombres: Number(formData.hombres),
      mujeres: Number(formData.mujeres),
      participantes_total: Number(formData.participantesTotal),
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
    const hombres = Number(loginData.hombres || 0);
    const mujeres = Number(loginData.mujeres || 0);

    setFormData({
      equipo: '',
      departamento: '',
      responsable: '',
      integrantes: [],
      hombres: 0,
      mujeres: 0,
      participantesTotal: 0,
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
      integrantesText: '',
      hombres: '',
      mujeres: '',
      password: '',
    });

    setFormData({
      equipo: '',
      departamento: '',
      responsable: '',
      integrantes: [],
      hombres: 0,
      mujeres: 0,
      participantesTotal: 0,
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
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const integrantesPdf =
      Array.isArray(formData.integrantes) && formData.integrantes.length > 0
        ? formData.integrantes.join(', ')
        : 'N/A';
    const margin = 14;
    const primary = [8, 117, 155];
    const secondary = [37, 99, 235];
    const dark = [15, 23, 42];
    const light = [239, 246, 255];
    const green = [22, 163, 74];
    const red = [220, 38, 38];
    let y = 16;

    const addHeader = () => {
      doc.setFillColor(...primary);
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.setFillColor(...secondary);
      doc.rect(pageWidth - 62, 0, 62, 30, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('CHECKLIST 5S - AUDITORÍA', margin, 13);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Clasificar · Ordenar · Limpiar · Estandarizar · Disciplina', margin, 22);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`${score}%`, pageWidth - margin, 13, { align: 'right' });
      doc.setFontSize(8);
      doc.text('RESULTADO', pageWidth - margin, 22, { align: 'right' });
    };

    const addFooter = () => {
      const pageNumber = doc.internal.getNumberOfPages();
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text('Auditoría 5S · Dinámica multiequipo', margin, pageHeight - 8);
      doc.text(`Página ${pageNumber}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    };

    const checkPage = (neededSpace = 12) => {
      if (y + neededSpace > pageHeight - 20) {
        addFooter();
        doc.addPage();
        addHeader();
        y = 42;
      }
    };

    addHeader();
    y = 40;

    doc.setFillColor(...light);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 72, 4, 4, 'F');
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 72, 4, 4, 'S');

    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Nombre de Equipo', margin + 6, y + 9);
    doc.text('Departamento', margin + 72, y + 9);
    doc.text('Responsable', margin + 130, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(formData.equipo, margin + 6, y + 17);
    doc.text(formData.departamento, margin + 72, y + 17);
    doc.text(formData.responsable, margin + 130, y + 17);

    doc.setFont('helvetica', 'bold');
    doc.text('Fecha', margin + 6, y + 30);
    doc.text('Tiempo', margin + 72, y + 30);
    doc.text('Piezas OK', margin + 130, y + 30);

    doc.setFont('helvetica', 'normal');
    doc.text(formData.fecha, margin + 6, y + 38);
    doc.text(formatDuration(elapsedSeconds), margin + 72, y + 38);
    doc.text(`${completedItems} / ${items.length}`, margin + 130, y + 38);

    doc.setFont('helvetica', 'bold');
    doc.text('Integrantes', margin + 6, y + 50);

    doc.setFont('helvetica', 'normal');
    const integrantesLines = doc.splitTextToSize(integrantesPdf, pageWidth - margin * 2 - 12);
    doc.text(integrantesLines.slice(0, 1), margin + 6, y + 58);

    doc.setFont('helvetica', 'bold');
    doc.text('Participantes', margin + 6, y + 68);

    doc.setFont('helvetica', 'normal');
    doc.text(
     `${formData.participantesTotal || 0} total · Hombres: ${formData.hombres || 0} · Mujeres: ${formData.mujeres || 0}`,
     margin + 42,
     y + 68
    );

    y += 86;

    const tableX = margin;
    const tableW = pageWidth - margin * 2;
    const col = {
      num: tableX,
      item: tableX + 16,
      qty: tableX + 93,
      status: tableX + 116,
      obs: tableX + 145,
    };

    const drawTableHeader = () => {
      checkPage(14);
      doc.setFillColor(...primary);
      doc.roundedRect(tableX, y, tableW, 10, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('#', col.num + 4, y + 7);
      doc.text('Herramienta / Componente', col.item, y + 7);
      doc.text('Cant.', col.qty, y + 7);
      doc.text('Estado', col.status, y + 7);
      doc.text('Observaciones', col.obs, y + 7);
      y += 12;
    };

    drawTableHeader();

    items.forEach((item, index) => {
      const status = item.disponible ? 'OK' : 'FALTANTE';
      const obs = item.observaciones || '-';
      const obsLines = doc.splitTextToSize(obs, 42);
      const rowHeight = Math.max(10, obsLines.length * 5 + 4);
      checkPage(rowHeight + 4);

      if (y < 44) drawTableHeader();

      doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252);
      doc.rect(tableX, y - 2, tableW, rowHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(tableX, y + rowHeight - 2, tableX + tableW, y + rowHeight - 2);

      doc.setTextColor(...dark);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(String(index + 1), col.num + 4, y + 5);
      doc.text(item.objeto, col.item, y + 5);
      doc.text(String(item.cantidad), col.qty + 3, y + 5);

      if (item.disponible) {
        doc.setTextColor(...green);
      } else {
        doc.setTextColor(...red);
      }
      doc.setFont('helvetica', 'bold');
      doc.text(status, col.status, y + 5);

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.text(obsLines, col.obs, y + 5);

      y += rowHeight;
    });

    checkPage(26);
    y += 8;
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 3, 3, 'F');
    doc.setTextColor(146, 64, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Compromiso 5S:', margin + 5, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text('mantener el área clasificada, ordenada, limpia, estandarizada y con disciplina.', margin + 38, y + 7);
    doc.text('Este reporte forma parte de una dinámica de aprendizaje operativo.', margin + 5, y + 14);

    addFooter();

    const safeTeam = formData.equipo.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`auditoria_5s_${safeTeam || 'equipo'}.pdf`);
    playSound('success');
  };

  const exportAuditPDF = (audit) => {
  if (!audit) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;

  const primary = [8, 117, 155];
  const secondary = [37, 99, 235];
  const dark = [15, 23, 42];
  const light = [239, 246, 255];
  const green = [22, 163, 74];
  const red = [220, 38, 38];

  const auditItems = Array.isArray(audit.items) ? audit.items : [];
  const integrantesText =
    Array.isArray(audit.integrantes) && audit.integrantes.length > 0
      ? audit.integrantes.join(', ')
      : 'N/A';

      const hombresAudit = Number(audit.hombres || 0);
  const mujeresAudit = Number(audit.mujeres || 0);
  const participantesAudit =
    Number(audit.participantes_total || hombresAudit + mujeresAudit || 0);
  let y = 16;

  const addHeader = () => {
    doc.setFillColor(...primary);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setFillColor(...secondary);
    doc.rect(pageWidth - 62, 0, 62, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('CHECKLIST 5S - AUDITORÍA', margin, 13);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Clasificar · Ordenar · Limpiar · Estandarizar · Disciplina', margin, 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${audit.score || 0}%`, pageWidth - margin, 13, { align: 'right' });

    doc.setFontSize(8);
    doc.text('RESULTADO', pageWidth - margin, 22, { align: 'right' });
  };

  const addFooter = () => {
    const pageNumber = doc.internal.getNumberOfPages();
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Auditoría 5S · Dinámica multiequipo', margin, pageHeight - 8);
    doc.text(`Página ${pageNumber}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  };

  const checkPage = (neededSpace = 12) => {
    if (y + neededSpace > pageHeight - 20) {
      addFooter();
      doc.addPage();
      addHeader();
      y = 42;
    }
  };

  addHeader();
  y = 40;

  doc.setFillColor(...light);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 72, 4, 4, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 72, 4, 4, 'S');

  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Nombre de Equipo', margin + 6, y + 9);
  doc.text('Departamento', margin + 72, y + 9);
  doc.text('Responsable', margin + 130, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(audit.area || 'N/A', margin + 6, y + 17);
  doc.text(audit.departamento || 'N/A', margin + 72, y + 17);
  doc.text(audit.responsable || 'N/A', margin + 130, y + 17);

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha', margin + 6, y + 30);
  doc.text('Tiempo', margin + 72, y + 30);
  doc.text('Piezas OK', margin + 130, y + 30);

  doc.setFont('helvetica', 'normal');
  doc.text(audit.fecha || 'N/A', margin + 6, y + 38);
  doc.text(audit.tiempo_formateado || formatDuration(audit.tiempo_segundos || 0), margin + 72, y + 38);
  doc.text(`${audit.completados || 0} / ${audit.total_items || auditItems.length}`, margin + 130, y + 38);

  doc.setFont('helvetica', 'bold');
  doc.text('Integrantes', margin + 6, y + 50);

  doc.setFont('helvetica', 'normal');
  const integrantesLines = doc.splitTextToSize(integrantesText, pageWidth - margin * 2 - 12);
  doc.text(integrantesLines.slice(0, 1), margin + 6, y + 58);

  doc.setFont('helvetica', 'bold');
  doc.text('Participantes', margin + 6, y + 68);

  doc.setFont('helvetica', 'normal');
  doc.text(
    `${participantesAudit} total · Hombres: ${hombresAudit} · Mujeres: ${mujeresAudit}`,
    margin + 42,
    y + 68
  );

  y += 86;

  const tableX = margin;
  const tableW = pageWidth - margin * 2;

  const col = {
    num: tableX,
    item: tableX + 16,
    qty: tableX + 93,
    status: tableX + 116,
    obs: tableX + 145,
  };

  const drawTableHeader = () => {
    checkPage(14);
    doc.setFillColor(...primary);
    doc.roundedRect(tableX, y, tableW, 10, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('#', col.num + 4, y + 7);
    doc.text('Herramienta / Componente', col.item, y + 7);
    doc.text('Cant.', col.qty, y + 7);
    doc.text('Estado', col.status, y + 7);
    doc.text('Observaciones', col.obs, y + 7);

    y += 12;
  };

  drawTableHeader();

  auditItems.forEach((item, index) => {
    const status = item.disponible ? 'OK' : 'FALTANTE';
    const obs = item.observaciones || '-';
    const obsLines = doc.splitTextToSize(obs, 42);
    const rowHeight = Math.max(10, obsLines.length * 5 + 4);

    checkPage(rowHeight + 4);

    doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252);
    doc.rect(tableX, y - 2, tableW, rowHeight, 'F');

    doc.setDrawColor(226, 232, 240);
    doc.line(tableX, y + rowHeight - 2, tableX + tableW, y + rowHeight - 2);

    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(String(index + 1), col.num + 4, y + 5);
    doc.text(item.objeto || 'N/A', col.item, y + 5);
    doc.text(String(item.cantidad || ''), col.qty + 3, y + 5);

    doc.setTextColor(...(item.disponible ? green : red));
    doc.setFont('helvetica', 'bold');
    doc.text(status, col.status, y + 5);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(obsLines, col.obs, y + 5);

    y += rowHeight;
  });

  checkPage(26);
  y += 8;

  doc.setFillColor(255, 251, 235);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 3, 3, 'F');

  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Compromiso 5S:', margin + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.text('mantener el área clasificada, ordenada, limpia, estandarizada y con disciplina.', margin + 38, y + 7);
  doc.text('Este reporte forma parte de una dinámica de aprendizaje operativo.', margin + 5, y + 14);

  addFooter();

  const safeTeam = String(audit.area || 'equipo')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();

  doc.save(`auditoria_5s_${safeTeam}.pdf`);
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

  const dashboardStats = useMemo(() => {
  const totalAuditorias = ranking.length;

  const totalScore = ranking.reduce(
    (sum, audit) => sum + Number(audit.score || 0),
    0
  );

  const promedioScore =
    totalAuditorias > 0 ? Math.round(totalScore / totalAuditorias) : 0;

  const totalTiempo = ranking.reduce(
    (sum, audit) => sum + Number(audit.tiempo_segundos || 0),
    0
  );

  const tiempoPromedio =
    totalAuditorias > 0 ? Math.round(totalTiempo / totalAuditorias) : 0;

  const totalHombres = ranking.reduce(
    (sum, audit) => sum + Number(audit.hombres || 0),
    0
  );

  const totalMujeres = ranking.reduce(
    (sum, audit) => sum + Number(audit.mujeres || 0),
    0
  );

  const totalParticipantes = ranking.reduce((sum, audit) => {
    const participantes = Number(audit.participantes_total || 0);
    const hombres = Number(audit.hombres || 0);
    const mujeres = Number(audit.mujeres || 0);

    return sum + (participantes || hombres + mujeres);
  }, 0);

  const totalPiezas = ranking.reduce(
    (sum, audit) => sum + Number(audit.total_items || 0),
    0
  );

  const piezasEncontradas = ranking.reduce(
    (sum, audit) => sum + Number(audit.completados || 0),
    0
  );

  const piezasFaltantes = ranking.reduce(
    (sum, audit) => sum + Number(audit.faltantes || 0),
    0
  );

  const cumplimientoPiezas =
    totalPiezas > 0 ? Math.round((piezasEncontradas / totalPiezas) * 100) : 0;

  const faltantesPorPieza = {};

  ranking.forEach((audit) => {
    const auditItems = Array.isArray(audit.items) ? audit.items : [];

    auditItems.forEach((item) => {
      if (!item.disponible) {
        const name = item.objeto || 'Sin nombre';
        faltantesPorPieza[name] = (faltantesPorPieza[name] || 0) + 1;
      }
    });
  });

  const piezaMasFaltanteEntry = Object.entries(faltantesPorPieza).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const piezaMasFaltante = piezaMasFaltanteEntry
    ? {
        nombre: piezaMasFaltanteEntry[0],
        veces: piezaMasFaltanteEntry[1],
      }
    : {
        nombre: 'N/A',
        veces: 0,
      };

  const departamentosMap = {};

  ranking.forEach((audit) => {
    const departamento = audit.departamento || 'Sin departamento';

    if (!departamentosMap[departamento]) {
      departamentosMap[departamento] = {
        departamento,
        auditorias: 0,
        scoreTotal: 0,
        participantes: 0,
      };
    }

    departamentosMap[departamento].auditorias += 1;
    departamentosMap[departamento].scoreTotal += Number(audit.score || 0);
    departamentosMap[departamento].participantes += Number(
      audit.participantes_total ||
        Number(audit.hombres || 0) + Number(audit.mujeres || 0)
    );
  });

  const departamentos = Object.values(departamentosMap)
    .map((item) => ({
      ...item,
      promedio:
        item.auditorias > 0 ? Math.round(item.scoreTotal / item.auditorias) : 0,
    }))
    .sort((a, b) => b.auditorias - a.auditorias);

  const mejorEquipo = ranking[0] || null;

  const mejorTiempo =
    ranking.length > 0
      ? [...ranking].sort(
          (a, b) =>
            Number(a.tiempo_segundos || 999999) -
            Number(b.tiempo_segundos || 999999)
        )[0]
      : null;

  const genderData = [
    { name: 'Hombres', value: totalHombres },
    { name: 'Mujeres', value: totalMujeres },
  ];

  const piezasData = [
    { name: 'Encontradas', value: piezasEncontradas },
    { name: 'Faltantes', value: piezasFaltantes },
  ];

  const departmentData = departamentos.slice(0, 6).map((item) => ({
    name: item.departamento,
    auditorias: item.auditorias,
    promedio: item.promedio,
    participantes: item.participantes,
  }));

  const scoreTrend = [...ranking]
    .sort((a, b) => new Date(a.fecha_guardado || 0) - new Date(b.fecha_guardado || 0))
    .slice(-10)
    .map((audit, index) => ({
      name: `#${index + 1}`,
      score: Number(audit.score || 0),
    }));

  return {
    totalAuditorias,
    promedioScore,
    tiempoPromedio,
    totalParticipantes,
    totalHombres,
    totalMujeres,
    totalPiezas,
    piezasEncontradas,
    piezasFaltantes,
    cumplimientoPiezas,
    piezaMasFaltante,
    departamentos,
    mejorEquipo,
    mejorTiempo,
    top5: ranking.slice(0, 5),
    auditoriasRecientes: [...ranking]
      .sort((a, b) => new Date(b.fecha_guardado || 0) - new Date(a.fecha_guardado || 0))
      .slice(0, 5),
    genderData,
    piezasData,
    departmentData,
    scoreTrend,
  };
}, [ranking]);
const isConnected = connectionStatus === 'Conectado';

const searchParams = new URLSearchParams(window.location.search);
const hashQuery = window.location.hash.includes('?')
  ? window.location.hash.split('?')[1]
  : '';
const hashParams = new URLSearchParams(hashQuery);

const viewMode = searchParams.get('modo') || hashParams.get('modo');
const isRankingOnlyMode = viewMode === 'ranking';
const isAdminMode = viewMode === 'admin';
const liveRankingUrl = `${window.location.origin}${window.location.pathname}?modo=ranking`;

useEffect(() => {
  if (!isRankingOnlyMode) return;

  let cancelled = false;
  let isScrolling = false;
  let nextCycleTimeout = null;
  let bottomPauseTimeout = null;
  let animationFrameId = null;

  const easeInOutCubic = (progress) => {
    return progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  };

  const animateScrollTo = (targetY, duration) => {
    return new Promise((resolve) => {
      const startY = window.scrollY;
      const distance = targetY - startY;
      const startTime = performance.now();

      const step = (currentTime) => {
        if (cancelled) {
          resolve();
          return;
        }

        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeInOutCubic(progress);

        window.scrollTo(0, startY + distance * easedProgress);

        if (progress < 1) {
          animationFrameId = window.requestAnimationFrame(step);
        } else {
          resolve();
        }
      };

      animationFrameId = window.requestAnimationFrame(step);
    });
  };

  const wait = (ms) => {
    return new Promise((resolve) => {
      bottomPauseTimeout = window.setTimeout(resolve, ms);
    });
  };

  const runScrollCycle = async () => {
    if (cancelled || isScrolling) return;

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    if (maxScroll <= 0) {
      scheduleNextCycle();
      return;
    }

    isScrolling = true;

    await animateScrollTo(maxScroll, RANKING_SCROLL_DOWN_DURATION_MS);

    if (cancelled) return;

    await wait(RANKING_SCROLL_BOTTOM_PAUSE_MS);

    if (cancelled) return;

    await animateScrollTo(0, RANKING_SCROLL_UP_DURATION_MS);

    isScrolling = false;

    if (!cancelled) {
      scheduleNextCycle();
    }
  };

  const scheduleNextCycle = () => {
    nextCycleTimeout = window.setTimeout(() => {
      runScrollCycle();
    }, RANKING_AUTO_SCROLL_MS);
  };

  window.scrollTo(0, 0);
  scheduleNextCycle();

  return () => {
    cancelled = true;

    if (nextCycleTimeout) {
      window.clearTimeout(nextCycleTimeout);
    }

    if (bottomPauseTimeout) {
      window.clearTimeout(bottomPauseTimeout);
    }

    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
    }
  };
}, [isRankingOnlyMode]);

if (isAdminMode) {
  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,transparent_34%),radial-gradient(circle_at_bottom_right,#fef3c7_0,transparent_30%),linear-gradient(135deg,#f8fafc,#ffffff,#eef8ff)] p-3 md:p-5 xl:p-6 font-sans overflow-x-hidden">
      <div className="w-full max-w-none mx-0">
        <div className="w-full bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white rounded-[34px] p-5 md:p-6 mb-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)] border border-white/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 border border-white/20 rounded-3xl p-3 shadow-[inset_4px_4px_12px_rgba(255,255,255,0.08),0_12px_30px_rgba(0,0,0,0.25)]">
                <img
                  src={logoBlanco}
                  alt="Logo PI"
                  className="w-16 h-16 md:w-20 md:h-20 object-contain"
                />
              </div>

              <div>
                <h1 className="text-3xl md:text-5xl font-black">
                  Administrador 5S
                </h1>
                <p className="text-cyan-100 text-base md:text-xl">
                  Revisión de auditorías y descarga de PDFs
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setAdminView(adminView === 'dashboard' ? 'auditorias' : 'dashboard')}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-2xl px-6 py-4 font-black shadow-xl transition-all"
              >
                {adminView === 'dashboard' ? 'Ver auditorías' : 'Dashboard'}
              </button>

              <button
                onClick={loadRanking}
                className="bg-slate-950 hover:bg-slate-800 text-white rounded-2xl px-6 py-4 font-black shadow-xl transition-all"
              >
                Actualizar datos
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2 text-sm font-bold">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-300" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-300" />
              )}
              <span>Supabase: {connectionStatus}</span>
            </div>

            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2 text-sm font-bold">
              <Trophy className="w-4 h-4 text-yellow-300" />
              <span>Total auditorías: {ranking.length}</span>
            </div>
          </div>
        </div>

        {adminView === 'auditorias' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
              <div className="bg-white rounded-[28px] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] border border-white">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400 font-black mb-2">
                  Auditorías
                </div>
                <div className="text-5xl font-black text-slate-900">
                  {dashboardStats.totalAuditorias}
                </div>
                <div className="text-sm text-slate-500 font-semibold mt-2">
                  Checklists realizados
                </div>
              </div>

              <div className="bg-white rounded-[28px] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] border border-white">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400 font-black mb-2">
                  Participantes
                </div>
                <div className="text-5xl font-black text-slate-900">
                  {dashboardStats.totalParticipantes}
                </div>
                <div className="text-sm text-slate-500 font-semibold mt-2">
                  H: {dashboardStats.totalHombres} · M: {dashboardStats.totalMujeres}
                </div>
              </div>

              <div className="bg-white rounded-[28px] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] border border-white">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400 font-black mb-2">
                  Promedio
              </div>
              <div className="text-5xl font-black text-green-600">
                {dashboardStats.promedioScore}%
              </div>
              <div className="text-sm text-slate-500 font-semibold mt-2">
                Cumplimiento general
              </div>
            </div>

            <div className="bg-white rounded-[28px] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] border border-white">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400 font-black mb-2">
                Faltantes
              </div>
              <div className="text-5xl font-black text-red-500">
                {dashboardStats.piezasFaltantes}
              </div>
              <div className="text-sm text-slate-500 font-semibold mt-2">
                Piezas no encontradas
              </div>
            </div>
          </div>

    <div className="bg-white rounded-[32px] p-5 md:p-6 border border-white shadow-[0_20px_50px_rgba(15,23,42,0.10)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900">
            Auditorías realizadas
          </h2>
          <p className="text-slate-500 font-medium">
            Revisión de equipos registrados y descarga de reportes PDF.
          </p>
        </div>

        <div className="bg-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-700">
          Total: {ranking.length}
        </div>
      </div>

      {loadingRanking ? (
        <div className="bg-slate-50 rounded-3xl p-8 text-slate-500 shadow-inner">
          Cargando auditorías...
        </div>
      ) : ranking.length === 0 ? (
        <div className="bg-slate-50 rounded-3xl p-8 text-slate-500 shadow-inner">
          Aún no existen auditorías guardadas.
        </div>
      ) : (
        <div className="grid gap-4">
          {ranking.map((item, index) => (
            <motion.div
              key={item.id || index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-50 rounded-3xl p-5 border border-slate-100 grid grid-cols-1 lg:grid-cols-[80px_minmax(180px,1.3fr)_minmax(160px,1fr)_minmax(180px,1fr)_110px_110px_150px] gap-4 items-center shadow-sm"
            >
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-widest">
                  Lugar
                </div>
                <div className="text-3xl font-black text-slate-800">
                  {getRankingBadge(index)}
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-xs text-slate-500 uppercase tracking-widest">
                  Equipo
                </div>
                <div className="text-2xl font-black text-slate-800 truncate">
                  {item.area || 'Sin equipo'}
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-xs text-slate-500 uppercase tracking-widest">
                  Departamento
                </div>
                <div className="text-lg font-bold text-slate-700 truncate">
                  {item.departamento || 'N/A'}
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-xs text-slate-500 uppercase tracking-widest">
                  Responsable
                </div>
                <div className="text-lg font-bold text-slate-700 truncate">
                  {item.responsable || 'N/A'}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 uppercase tracking-widest">
                  Score
                </div>
                <div className="text-4xl font-black text-cyan-700">
                  {item.score}%
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 uppercase tracking-widest">
                  Tiempo
                </div>
                <div className="text-4xl font-black text-yellow-600">
                  {item.tiempo_formateado || formatDuration(item.tiempo_segundos || 0)}
                </div>
              </div>

              <button
                onClick={() => exportAuditPDF(item)}
                className="bg-red-500 hover:bg-red-600 text-white rounded-2xl px-4 py-4 font-black flex items-center justify-center gap-2 shadow-lg"
              >
                <Download className="w-5 h-5" />
                PDF
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  </>
) : (
  <>
    <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-6 w-full">
      {/* SIDEBAR */}
<aside className="relative overflow-hidden bg-white rounded-[40px] p-5 border border-white shadow-[0_28px_80px_rgba(15,23,42,0.14)] flex flex-col justify-between min-h-[680px]">
  <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyan-100 rounded-full blur-2xl opacity-80" />
  <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-amber-100 rounded-full blur-2xl opacity-80" />

  <div className="relative z-10">
    <div className="flex flex-col items-center text-center mb-5">
      <div className="w-24 h-24 rounded-[30px] bg-gradient-to-br from-white to-slate-100 shadow-[inset_8px_8px_18px_rgba(15,23,42,0.08),inset_-8px_-8px_18px_rgba(255,255,255,0.95),0_16px_32px_rgba(15,23,42,0.14)] flex items-center justify-center mb-3">
        <img
          src={logoDorado}
          alt="Logo 5S"
          className="w-18 h-18 object-contain"
       />
  </div>

      <h2 className="text-2xl font-black text-slate-900">
        DINÁMICA 5S
      </h2>
      <p className="text-sm text-slate-500 font-semibold">
        Cultura de excelencia operativa
      </p>
    </div>

    <div className="grid gap-3">
      <button className="group bg-cyan-50 border border-cyan-100 text-cyan-700 rounded-2xl px-4 py-3 font-black text-left shadow-[inset_4px_4px_10px_rgba(15,23,42,0.05),inset_-4px_-4px_10px_rgba(255,255,255,0.95)] flex items-center justify-between">
        <span>📊 Resumen ejecutivo</span>
        <span className="text-cyan-500">●</span>
      </button>

      <a
        href={liveRankingUrl}
        target="_blank"
        rel="noreferrer"
        className="bg-white hover:bg-slate-50 border border-slate-100 text-slate-700 rounded-2xl px-4 py-3 font-black text-left shadow-sm flex items-center justify-between transition-all"
      >
        <span>🏆 Ranking en vivo</span>
        <span className="text-slate-300">↗</span>
      </a>

      <button
        onClick={() => setAdminView('auditorias')}
        className="bg-white hover:bg-slate-50 border border-slate-100 text-slate-700 rounded-2xl px-4 py-3 font-black text-left shadow-sm flex items-center justify-between transition-all"
      >
        <span>📄 Auditorías</span>
        <span className="text-slate-300">›</span>
      </button>

      <button
        onClick={loadRanking}
        className="bg-white hover:bg-slate-50 border border-slate-100 text-slate-700 rounded-2xl px-4 py-3 font-black text-left shadow-sm flex items-center justify-between transition-all"
      >
        <span>🔄 Actualizar datos</span>
        <span className="text-slate-300">›</span>
      </button>
    </div>

    <div className="mt-6 bg-slate-50 rounded-[30px] p-5 shadow-[inset_6px_6px_14px_rgba(15,23,42,0.06),inset_-6px_-6px_14px_rgba(255,255,255,0.95)]">
      <div className="text-xs uppercase tracking-widest text-slate-400 font-black mb-2">
        Estado general
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-600">Auditorías</span>
          <span className="text-lg font-black text-slate-900">{dashboardStats.totalAuditorias}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-600">Promedio</span>
          <span className="text-lg font-black text-emerald-600">{dashboardStats.promedioScore}%</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-600">Faltantes</span>
          <span className="text-lg font-black text-red-500">{dashboardStats.piezasFaltantes}</span>
        </div>
      </div>
    </div>
  </div>

  <div className="relative z-10 bg-slate-50 rounded-[30px] p-5 shadow-[inset_6px_6px_14px_rgba(15,23,42,0.06),inset_-6px_-6px_14px_rgba(255,255,255,0.95)]">
    <div className="flex items-center gap-2 mb-3">
      {isConnected ? (
        <Wifi className="w-4 h-4 text-green-500" />
      ) : (
        <WifiOff className="w-4 h-4 text-red-500" />
      )}
      <span className="text-sm font-black text-slate-700">
        Conexión Supabase
      </span>
    </div>

    <div className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${
      isConnected
        ? 'bg-green-100 text-green-700'
        : 'bg-red-100 text-red-600'
    }`}>
      {connectionStatus}
    </div>

    <div className="mt-6 pt-5 border-t border-slate-200">
      <div className="text-3xl font-black text-slate-900">
        {new Date().toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
      <div className="text-xs text-slate-500 font-semibold mt-1">
        Última visualización
      </div>
    </div>
  </div>
</aside>

      {/* DASHBOARD PRINCIPAL */}
      <section className="w-full min-w-0 bg-white/95 rounded-[38px] p-5 md:p-6 xl:p-7 border border-white shadow-[0_28px_80px_rgba(15,23,42,0.14)]">
        {/* HEADER */}
<div className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-slate-950 via-cyan-950 to-blue-900 p-5 md:p-6 mb-5 text-white shadow-[0_22px_60px_rgba(15,23,42,0.20)]">
  <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl" />
  <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-amber-300/20 blur-3xl" />

  <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
    <div>
      <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2 mb-4 text-xs font-black uppercase tracking-widest text-cyan-100">
        <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
        Centro de Control 5S
      </div>

      <h2 className="text-4xl md:text-5xl font-black tracking-tight">
        Dashboard Ejecutivo
      </h2>

      <p className="text-cyan-100 text-base md:text-xl font-semibold mt-2 max-w-3xl">
        Visualización integral de participación, cumplimiento, tiempos, hallazgos y desempeño de equipos.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-3 min-w-[300px] max-w-[360px]">
      <div className="bg-white/10 border border-white/15 rounded-3xl p-4 backdrop-blur-md">
        <div className="text-xs uppercase tracking-widest text-cyan-100 font-black">
          Fecha
        </div>
        <div className="text-xl font-black mt-1">
          {new Date().toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </div>
      </div>

      <div className="bg-white/10 border border-white/15 rounded-3xl p-4 backdrop-blur-md">
        <div className="text-xs uppercase tracking-widest text-cyan-100 font-black">
          Mejor score
        </div>
        <div className="text-xl font-black mt-1">
          {dashboardStats.mejorEquipo?.score || 0}%
        </div>
      </div>

      <button
        onClick={loadRanking}
        className="col-span-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-3xl px-5 py-3 font-black shadow-xl transition-all"
      >
        🔄 Actualizar datos
      </button>

      <button
        onClick={() => setAdminView('auditorias')}
        className="col-span-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-3xl px-5 py-3 font-black transition-all"
      >
        Ver auditorías
      </button>
    </div>
  </div>
</div>

        {/* KPI SUPERIORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-5">
  <DashboardMetricCard
    title="Checklists realizados"
    value={dashboardStats.totalAuditorias}
    subtitle="Total registros"
    color="cyan"
    icon={<ClipboardCheck className="w-8 h-8" />}
  />

  <DashboardMetricCard
    title="Participantes totales"
    value={dashboardStats.totalParticipantes}
    subtitle="En la dinámica"
    color="green"
    icon={<Users className="w-8 h-8" />}
  />

  <DashboardMetricCard
    title="Hombres"
    value={dashboardStats.totalHombres}
    subtitle={
      dashboardStats.totalParticipantes > 0
        ? `${Math.round((dashboardStats.totalHombres / dashboardStats.totalParticipantes) * 100)}% del total`
        : '0% del total'
    }
    color="blue"
    progress={
      dashboardStats.totalParticipantes > 0
        ? Math.round((dashboardStats.totalHombres / dashboardStats.totalParticipantes) * 100)
        : 0
    }
    icon={<UserRound className="w-8 h-8" />}
  />

  <DashboardMetricCard
    title="Mujeres"
    value={dashboardStats.totalMujeres}
    subtitle={
      dashboardStats.totalParticipantes > 0
        ? `${Math.round((dashboardStats.totalMujeres / dashboardStats.totalParticipantes) * 100)}% del total`
        : '0% del total'
    }
    color="pink"
    progress={
      dashboardStats.totalParticipantes > 0
        ? Math.round((dashboardStats.totalMujeres / dashboardStats.totalParticipantes) * 100)
        : 0
    }
    icon={<UserRoundCheck className="w-8 h-8" />}
  />

  <DashboardMetricCard
    title="Promedio general"
    value={`${dashboardStats.promedioScore}%`}
    subtitle={
      dashboardStats.promedioScore >= 90
        ? 'Excelente'
        : dashboardStats.promedioScore >= 70
        ? 'Aceptable'
        : 'Requiere atención'
    }
    color="amber"
    progress={dashboardStats.promedioScore}
    icon={<Star className="w-8 h-8" />}
  />

  <DashboardMetricCard
    title="Tiempo promedio"
    value={formatDuration(dashboardStats.tiempoPromedio)}
    subtitle="Por checklist"
    color="purple"
    icon={<Timer className="w-8 h-8" />}
  />
</div>

        {/* GRAFICAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
  <DashboardPanel
    title="Cumplimiento general"
    subtitle="Promedio de todas las auditorías"
  >
    <div className="h-[200px] flex items-center justify-center">
      <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-white to-slate-100 shadow-[inset_12px_12px_24px_rgba(15,23,42,0.08),inset_-12px_-12px_24px_rgba(255,255,255,0.95),0_20px_45px_rgba(15,23,42,0.12)] flex items-center justify-center">
        <div
          className="absolute inset-5 rounded-full shadow-inner"
          style={{
            background: `conic-gradient(#22c55e 0deg, #06b6d4 ${
              dashboardStats.promedioScore * 3.6
            }deg, #e2e8f0 0deg)`,
          }}
        />

        <div className="relative w-24 h-24 rounded-full bg-white shadow-[0_14px_35px_rgba(15,23,42,0.16)] flex flex-col items-center justify-center">
          <div className="text-3xl font-black text-slate-900 leading-none">
            {dashboardStats.promedioScore}%
          </div>
          <div
            className={`text-sm font-black mt-2 ${
              dashboardStats.promedioScore >= 90
                ? 'text-green-600'
                : dashboardStats.promedioScore >= 70
                ? 'text-amber-600'
                : 'text-red-500'
            }`}
          >
            {dashboardStats.promedioScore >= 90
              ? 'Excelente'
              : dashboardStats.promedioScore >= 70
              ? 'Aceptable'
              : 'Atención'}
          </div>
        </div>

        <div className="absolute bottom-4 left-8 text-xs font-black text-slate-400">
          0%
        </div>
        <div className="absolute bottom-4 right-7 text-xs font-black text-slate-400">
          100%
        </div>
      </div>
    </div>
  </DashboardPanel>

  <DashboardPanel
    title="Participación por departamento"
    subtitle="Checklists realizados por área"
  >
    <div className="h-[200px] mt-2">
      {dashboardStats.departmentData.length === 0 ? (
        <div className="h-full flex items-center justify-center text-slate-400 font-bold">
          Sin datos disponibles
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dashboardStats.departmentData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={95}
              tick={{
                fontSize: 11,
                fill: '#475569',
                fontWeight: 800,
              }}
            />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              contentStyle={{
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 12px 30px rgba(15,23,42,0.12)',
                fontWeight: 700,
              }}
            />
            <Bar
              dataKey="auditorias"
              fill="#06b6d4"
              radius={[0, 10, 10, 0]}
              barSize={18}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  </DashboardPanel>

  <DashboardPanel
    title="Distribución por género"
    subtitle="Participación registrada"
  >
    <div className="h-[200px] mt-2 relative">
      {dashboardStats.totalParticipantes === 0 ? (
        <div className="h-full flex items-center justify-center text-slate-400 font-bold">
          Sin participantes registrados
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dashboardStats.genderData}
                dataKey="value"
                nameKey="name"
                innerRadius={62}
                outerRadius={94}
                paddingAngle={5}
              >
                <Cell fill="#2563eb" />
                <Cell fill="#ec4899" />
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 12px 30px rgba(15,23,42,0.12)',
                  fontWeight: 700,
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-3xl font-black text-slate-900">
                {dashboardStats.totalParticipantes}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
                Total
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 text-xs font-black">
            <div className="flex items-center gap-2 text-blue-600">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              Hombres
            </div>
            <div className="flex items-center gap-2 text-pink-500">
              <span className="w-3 h-3 rounded-full bg-pink-500" />
              Mujeres
            </div>
          </div>
        </>
      )}
    </div>
  </DashboardPanel>

  <DashboardPanel
    title="Evolución del cumplimiento"
    subtitle="Últimos registros guardados"
  >
    <div className="h-[220px] mt-2">
      {dashboardStats.scoreTrend.length === 0 ? (
        <div className="h-full flex items-center justify-center text-slate-400 font-bold">
          Sin datos disponibles
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={dashboardStats.scoreTrend}
            margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 12px 30px rgba(15,23,42,0.12)',
                fontWeight: 700,
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#06b6d4"
              strokeWidth={4}
              dot={{
                r: 5,
                fill: '#ffffff',
                stroke: '#06b6d4',
                strokeWidth: 3,
              }}
              activeDot={{
                r: 7,
                fill: '#06b6d4',
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  </DashboardPanel>
</div>

{/* KPIS OPERATIVOS */}
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-5">
  <DashboardSmallKpi
    title="Piezas revisadas"
    value={dashboardStats.totalPiezas}
    subtitle="Total de piezas"
    color="cyan"
    icon={<ClipboardCheck className="w-8 h-8" />}
  />

  <DashboardSmallKpi
    title="Piezas encontradas"
    value={dashboardStats.piezasEncontradas}
    subtitle="Correctas y disponibles"
    color="green"
    icon={<PackageCheck className="w-8 h-8" />}
  />

  <DashboardSmallKpi
    title="Piezas faltantes"
    value={dashboardStats.piezasFaltantes}
    subtitle="No encontradas"
    color="amber"
    icon={<AlertTriangle className="w-8 h-8" />}
  />

  <DashboardSmallKpi
    title="Cumplimiento piezas"
    value={`${dashboardStats.cumplimientoPiezas}%`}
    subtitle="Porcentaje general"
    color="purple"
    icon={<Gauge className="w-8 h-8" />}
  />

  <DashboardSmallKpi
    title="Pieza crítica"
    value={dashboardStats.piezaMasFaltante.veces}
    subtitle={dashboardStats.piezaMasFaltante.nombre}
    color="red"
    icon={<PackageX className="w-8 h-8" />}
  />
</div>

        {/* TABLAS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <DashboardTableCard
            title="Top 5 Equipos"
            subtitle="Mejores resultados por score y menor tiempo"
          >
            <div className="grid gap-3">
              {dashboardStats.top5.length === 0 ? (
                <div className="bg-slate-50 rounded-3xl p-6 text-center text-slate-400 font-bold shadow-inner">
                  Sin equipos registrados
                </div>
              ) : (
                dashboardStats.top5.map((item, index) => (
                  <div
                    key={item.id || index}
                    className={`rounded-3xl p-4 border grid grid-cols-1 md:grid-cols-[70px_1fr_110px_110px] gap-4 items-center ${
                      index === 0
                        ? 'bg-gradient-to-r from-amber-100 to-yellow-50 border-amber-200'
                        : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-inner ${
                          index === 0
                            ? 'bg-amber-200 text-amber-800'
                            : index === 1
                            ? 'bg-slate-200 text-slate-700'
                            : index === 2
                            ? 'bg-orange-200 text-orange-700'
                            : 'bg-white text-slate-700'
                        }`}
                      >
                        {getRankingBadge(index)}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-widest text-slate-400 font-black">
                        Equipo / Departamento
                      </div>
                      <div className="text-xl font-black text-slate-900 truncate">
                        {item.area || 'Sin equipo'}
                      </div>
                      <div className="text-sm text-slate-500 font-semibold truncate">
                        {item.departamento || 'N/A'}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                      <div className="text-xs uppercase tracking-widest text-slate-400 font-black">
                        Score
                      </div>
                      <div className="text-3xl font-black text-emerald-600">
                        {item.score || 0}%
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                      <div className="text-xs uppercase tracking-widest text-slate-400 font-black">
                        Tiempo
                      </div>
                      <div className="text-3xl font-black text-amber-600">
                        {item.tiempo_formateado || formatDuration(item.tiempo_segundos || 0)}
                      </div>
                    </div>
                  </div>
                ))
             )}
           </div>
         </DashboardTableCard>

         <DashboardTableCard
           title="Auditorías recientes"
           subtitle="Últimos registros guardados en Supabase"
         >
           <div className="grid gap-3">
             {dashboardStats.auditoriasRecientes.length === 0 ? (
               <div className="bg-slate-50 rounded-3xl p-6 text-center text-slate-400 font-bold shadow-inner">
                 Sin auditorías recientes
               </div>
             ) : (
               dashboardStats.auditoriasRecientes.map((item, index) => (
                 <div
                   key={item.id || index}
                   className="bg-slate-50 rounded-3xl p-4 border border-slate-100 grid grid-cols-1 md:grid-cols-[1fr_90px_100px_90px] gap-4 items-center"
                 >
                   <div className="min-w-0">
                     <div className="text-xs uppercase tracking-widest text-slate-400 font-black">
                       Equipo
                     </div>
                     <div className="text-lg font-black text-slate-900 truncate">
                      {item.area || 'N/A'}
                     </div>
                     <div className="text-sm text-slate-500 font-semibold truncate">
                      {item.departamento || 'N/A'}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs uppercase tracking-widest text-slate-400 font-black">
                      Score
                    </div>
                    <div className="text-2xl font-black text-emerald-600">
                      {item.score || 0}%
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs uppercase tracking-widest text-slate-400 font-black">
                      Tiempo
                    </div>
                   <div className="text-2xl font-black text-amber-600">
                     {item.tiempo_formateado || formatDuration(item.tiempo_segundos || 0)}
                   </div>
                 </div>

                 <button
                   onClick={() => exportAuditPDF(item)}
                   className="bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl px-4 py-3 font-black shadow-sm transition-all"
                 >
                   PDF
                 </button>
               </div>
             ))
           )}
         </div>
       </DashboardTableCard>
     </div>
                        <div className="mt-6 text-center text-slate-500 font-semibold">
                          “Las 5S no son solo un método, es nuestra forma de trabajar y mejorar cada día.”
                        </div>
                      </section>
                    </div>
                  </>
                )}
                      </div>
                    </div>
                   );
                }

if (isRankingOnlyMode) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 p-2 md:p-4 xl:p-5 text-white font-sans overflow-x-hidden">
        <div className="w-full max-w-none mx-0">
          <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-5">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-white/10 border border-white/20 rounded-3xl p-3 md:p-4 flex items-center justify-center">
                  <img
                    src={logoBlanco}
                    alt="Logo PI"
                    className="w-16 h-16 md:w-20 md:h-20 xl:w-24 xl:h-24 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl xl:text-6xl 2xl:text-7xl font-black tracking-tight leading-[0.95]">
                    Ranking 5S en Vivo
                  </h1>
                  <p className="text-cyan-100 text-base md:text-xl xl:text-2xl font-bold mt-2">
                    Dinámica 5S · Sistema de Gestión Integral
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2 text-sm font-bold">
                  {isConnected ? <Wifi className="w-4 h-4 text-green-300" /> : <WifiOff className="w-4 h-4 text-red-300" />}
                  <span>Supabase: {connectionStatus}</span>
                </div>
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2 text-sm font-bold">
                  <Clock className="w-4 h-4 text-yellow-200" />
                  <span>Vista para pantalla / administrador</span>
                </div>
              </div>
            </div>

            <button
              onClick={loadRanking}
              className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-2xl px-6 py-4 font-black text-lg shadow-xl transition-all"
            >
              Actualizar ranking
            </button>
          </div>

          {loadingRanking ? (
            <div className="bg-white/10 border border-white/15 rounded-[32px] p-10 text-center text-2xl font-bold">
              Cargando ranking...
            </div>
          ) : ranking.length === 0 ? (
            <div className="bg-white/10 border border-white/15 rounded-[32px] p-10 text-center">
              <div className="text-3xl font-black mb-2">Aún no existen auditorías guardadas.</div>
              <p className="text-cyan-100 text-lg">Cuando los equipos guarden sus evaluaciones aparecerán aquí en tiempo real.</p>
            </div>
          ) : (
             <div className="w-full grid gap-2.5">
              {ranking.slice(0, 12).map((item, index) => (
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full min-h-[122px] rounded-[24px] border p-3 md:p-4 xl:p-4 shadow-2xl grid grid-cols-1 xl:grid-cols-[70px_minmax(210px,1.15fr)_minmax(220px,1.15fr)_minmax(560px,2.45fr)_145px_145px] gap-3 xl:gap-5 items-center overflow-visible ${
                    index === 0
                      ? 'bg-gradient-to-r from-yellow-300 to-amber-500 text-slate-950 border-yellow-200'
                      : index === 1
                      ? 'bg-white/90 text-slate-900 border-slate-200'
                      : index === 2
                      ? 'bg-orange-200 text-slate-900 border-orange-100'
                      : 'bg-white/10 border-white/15 text-white'
                  }`}
                >
                  <div className="text-3xl md:text-4xl xl:text-5xl font-black text-center xl:text-left shrink-0">
                    {getRankingBadge(index)}
                  </div>

                  <div className="min-w-0">
                    <div
                      className={`text-xs xl:text-sm uppercase tracking-widest font-black ${
                        index <= 2 ? 'text-slate-600' : 'text-cyan-100'
                      }`}
                    >
                      Equipo
                    </div>
                    <div
                      className="text-2xl md:text-3xl xl:text-4xl font-black leading-tight whitespace-normal break-words max-h-[96px] overflow-hidden"
                      title={item.area || 'Sin equipo'}
                    >
                      {item.area || 'Sin equipo'}
                    </div>

                  </div>

                  <div className="min-w-0">
                    <div
                      className={`text-[10px] uppercase tracking-widest font-black mb-1 ${
                        index <= 2 ? 'text-slate-600' : 'text-cyan-100'
                      }`}
                    >
                      Departamento
                    </div>
                    <div
                      className="text-base md:text-lg xl:text-2xl font-black leading-tight whitespace-normal break-words max-h-[48px] overflow-hidden"
                      title={item.departamento || 'N/A'}
                    >
                      {item.departamento || 'N/A'}
                    </div>
                  </div>

                  <div className="min-w-0 self-center">
                    <div
                      className={`text-[9px] xl:text-[10px] uppercase tracking-widest font-black mb-1 ${
                        index <= 2 ? 'text-slate-600' : 'text-cyan-100'
                      }`}
                    >
                      Integrantes
                    </div>

                    {renderIntegrantesRanking(item.integrantes, index)}
                  </div>

                  <div className="text-left xl:text-center">
                    <div
                      className={`text-[10px] uppercase tracking-widest font-black ${
                        index <= 2 ? 'text-slate-600' : 'text-cyan-100'
                      }`}
                    >
                      Score
                    </div>
                    <div
                      className={`text-3xl md:text-4xl xl:text-5xl font-black leading-none ${
                        index <= 2 ? 'text-slate-950' : 'text-cyan-200'
                      }`}
                    >
                      {item.score}%
                    </div>
                  </div>

                  <div className="text-left xl:text-center">
                    <div
                      className={`text-[10px] uppercase tracking-widest font-black ${
                        index <= 2 ? 'text-slate-600' : 'text-cyan-100'
                      }`}
                    >
                      Tiempo
                    </div>
                    <div
                       className={`text-3xl md:text-4xl xl:text-5xl font-black leading-none ${
                        index <= 2 ? 'text-slate-950' : 'text-yellow-200'
                      }`}
                    >
                      {item.tiempo_formateado || formatDuration(item.tiempo_segundos || 0)}
                    </div>
                  </div>
                </motion.div>
                  ))}
            </div>
          )}

          <div className="mt-6 w-full bg-white/10 border border-white/15 rounded-3xl p-5 text-center font-black text-2xl md:text-3xl text-white tracking-wide">
            5S · Cultura de Excelencia
          </div>
        </div>
      </div>
    );
  }

  if (!logged) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-blue-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[30px] shadow-2xl p-8 md:p-10 w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <img
                src={logoDorado}
                alt="Logo PI"
                className="w-24 h-24 md:w-28 md:h-28 object-contain drop-shadow-sm"
              />
            </div>

            <h1 className="text-4xl font-black text-slate-800 mb-2">LOGIN 5S</h1>
            <p className="text-slate-500">Registro rápido antes de iniciar </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
                Nombre de Equipo
              </label>
              <input
                type="text"
                placeholder="Ej. Equipo 1"
                value={loginData.equipo}
                onChange={(e) => setLoginData({ ...loginData, equipo: e.target.value })}
                className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-base bg-white focus:outline-none focus:ring-4 focus:ring-cyan-300"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
                Departamento
              </label>
              <input
                type="text"
                placeholder="Ej. Producción"
                value={loginData.departamento}
                onChange={(e) => setLoginData({ ...loginData, departamento: e.target.value })}
                className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-base bg-white focus:outline-none focus:ring-4 focus:ring-cyan-300"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
                Responsable
              </label>
              <input
                type="text"
                placeholder="Ej. Juan Pérez"
                value={loginData.responsable}
                onChange={(e) => setLoginData({ ...loginData, responsable: e.target.value })}
                className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-base bg-white focus:outline-none focus:ring-4 focus:ring-cyan-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">
                  Hombres
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  placeholder="Ej. 4"
                  value={loginData.hombres}
                  onChange={(e) => setLoginData({ ...loginData, hombres: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-base bg-white focus:outline-none focus:ring-4 focus:ring-cyan-300"
               />
             </div>

             <div>
               <label className="block text-sm font-black text-slate-700 mb-2">
                 Mujeres
              </label>
              <input
                type="number"
                min="0"
                max="10"
                placeholder="Ej. 3"
                value={loginData.mujeres}
                onChange={(e) => setLoginData({ ...loginData, mujeres: e.target.value })}
                className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-base bg-white focus:outline-none focus:ring-4 focus:ring-cyan-300"
              />
            </div>
          </div>

          <p className="text-xs text-slate-400 -mt-2">
            Máximo 10 participantes por equipo entre hombres y mujeres.
          </p>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
               Integrantes del equipo
              </label>
              <textarea
                rows={3}
                placeholder="Ej. Ana, Luis, Pedro, Carlos"
                value={loginData.integrantesText}
                onChange={(e) => setLoginData({ ...loginData, integrantesText: e.target.value })}
                className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-base bg-white focus:outline-none focus:ring-4 focus:ring-cyan-300 resize-none"
              />
              <p className="text-xs text-slate-400 mt-2">
                 Máximo 10 integrantes. Escribe solo el primer nombre, separado por coma.
              </p>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
                Contraseña rápida
              </label>
              <input
                type="password"
                placeholder="Ingresa cualquier clave rápida"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-base bg-white focus:outline-none focus:ring-4 focus:ring-cyan-300"
              />
            </div>

            <button
              onClick={login}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-2xl py-4 font-bold text-lg hover:scale-[1.02] transition-all"
            >
              Ingresar e iniciar
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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-blue-100 p-3 md:p-5 xl:p-6 font-sans">
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

        <div className="grid grid-cols-1 md:grid-cols-6 gap-5 p-5 md:p-8 bg-slate-50 border-b border-slate-200">
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
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Participantes
            </label>
            <input
              type="text"
              value={`${formData.participantesTotal || 0} total · H: ${formData.hombres || 0} / M: ${formData.mujeres || 0}`}
              disabled
              className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-slate-100 text-slate-700 font-semibold"
            />
           </div>

          <div>
           <label className="block text-sm font-bold text-slate-700 mb-2">Integrantes</label>
           <input
             type="text"
             value={formatIntegrantes(formData.integrantes)}
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
          <div className="md:hidden grid gap-4">
            {items.map((item, index) => (
              <div
                key={item.objeto}
                className={`rounded-3xl border shadow-md p-4 ${
                  item.disponible ? 'bg-green-50 border-green-100' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 w-14 h-14 rounded-2xl bg-cyan-100 text-cyan-700 font-black text-2xl flex items-center justify-center">
                      {item.cantidad}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">Herramienta / Componente</div>
                      <div className="text-xl font-black text-slate-800 break-words">{item.objeto}</div>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 px-3 py-2 rounded-full text-xs font-black ${
                      item.disponible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {item.disponible ? 'OK' : 'FALTANTE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center mb-3">
                  <label className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200 flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-slate-700">Disponible</span>
                    <input
                      type="checkbox"
                      checked={item.disponible}
                      disabled={auditClosed}
                      onChange={(e) => updateItem(index, 'disponible', e.target.checked)}
                      className="w-7 h-7 accent-cyan-600 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </label>

                  <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200">
                    <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">Cantidad</div>
                    <div className="text-2xl font-black text-cyan-700">{item.cantidad}</div>
                  </div>
                </div>

                <input
                  type="text"
                  value={item.observaciones}
                  disabled={auditClosed}
                  onChange={(e) => updateItem(index, 'observaciones', e.target.value)}
                  placeholder="Observaciones opcionales"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-300 text-sm disabled:bg-slate-100"
                />
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-[28px] border border-slate-200 shadow-xl">
            <table className="w-full min-w-[760px] border-collapse table-fixed">
              <colgroup>
                <col className="w-[90px]" />
                <col className="w-[260px]" />
                <col className="w-[120px]" />
                <col className="w-[120px]" />
                <col className="w-[250px]" />
              </colgroup>
              <thead>
                <tr className="bg-gradient-to-r from-cyan-700 to-blue-700 text-white">
                  <th className="px-3 py-4 text-center text-xs lg:text-sm uppercase tracking-wide">Cantidad</th>
                  <th className="px-3 py-4 text-left text-xs lg:text-sm uppercase tracking-wide">Herramienta / Componente</th>
                  <th className="px-3 py-4 text-center text-xs lg:text-sm uppercase tracking-wide">Disponible</th>
                  <th className="px-3 py-4 text-center text-xs lg:text-sm uppercase tracking-wide">Estado</th>
                  <th className="px-3 py-4 text-left text-xs lg:text-sm uppercase tracking-wide">Observaciones</th>
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
                    <td className="px-3 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-cyan-100 text-cyan-700 font-black text-xl shadow-sm">
                        {item.cantidad}
                      </div>
                    </td>

                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-slate-100 rounded-xl p-2 shrink-0">
                          <Wrench className="w-5 h-5 text-cyan-700" />
                        </div>
                        <span className="font-bold text-slate-700 text-sm lg:text-base break-words">{item.objeto}</span>
                      </div>
                    </td>

                    <td className="px-3 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={item.disponible}
                        disabled={auditClosed}
                        onChange={(e) => updateItem(index, 'disponible', e.target.checked)}
                        className="w-7 h-7 accent-cyan-600 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </td>

                    <td className="px-3 py-4 text-center">
                      {item.disponible ? (
                        <span className="bg-green-100 text-green-700 px-3 py-2 rounded-full text-xs font-bold">OK</span>
                      ) : (
                        <span className="bg-red-100 text-red-600 px-3 py-2 rounded-full text-xs font-bold">FALTANTE</span>
                      )}
                    </td>

                    <td className="px-3 py-4">
                      <input
                        type="text"
                        value={item.observaciones}
                        disabled={auditClosed}
                        onChange={(e) => updateItem(index, 'observaciones', e.target.value)}
                        placeholder="Agregar comentario"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 text-sm disabled:bg-slate-100"
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
                  className="bg-white rounded-2xl p-5 shadow-md border border-slate-200 grid grid-cols-1 lg:grid-cols-[80px_minmax(180px,1.6fr)_minmax(170px,1.3fr)_minmax(150px,1.2fr)_120px_120px_120px] gap-4 items-center"
                >
                  <div>
                    <div className="text-sm text-slate-500 uppercase tracking-widest">Lugar</div>
                    <div className="text-3xl font-black text-slate-800">{getRankingBadge(index)}</div>
                  </div>

                  
                    <div className="min-w-0">
                      <div className="text-sm text-slate-500 uppercase tracking-widest">Equipo</div>
                      <div className="text-2xl font-black text-slate-800 truncate">
                        {item.area || 'Sin equipo'}
                      </div>
                    </div>

                  <div className="min-w-0">
                    <div className="text-sm text-slate-500 uppercase tracking-widest">Departamento</div>
                    <div className="text-lg font-bold text-slate-700 truncate">
                      {item.departamento || 'N/A'}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm text-slate-500 uppercase tracking-widest">Responsable</div>
                    <div className="text-lg font-bold text-slate-700 truncate">
                      {item.responsable || 'N/A'}
                    </div>
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
