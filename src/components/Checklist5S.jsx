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
const logoDorado = `${import.meta.env.BASE_URL}logos/Logos-PI-02.png`;
const logoBlanco = `${import.meta.env.BASE_URL}logos/Logos-PI-04.png`;

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

export default function Checklist5S() {
  const [logged, setLogged] = useState(false);
  const [loginData, setLoginData] = useState({
  equipo: '',
  departamento: '',
  responsable: '',
  integrantesText: '',
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
  integrantes: [],
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
    const integrantes = parseIntegrantes(loginData.integrantesText);

if (
  !loginData.equipo.trim() ||
  !loginData.departamento.trim() ||
  !loginData.responsable.trim() ||
  integrantes.length === 0 ||
  !loginData.password.trim()
) {
  alert('Ingresa nombre de equipo, departamento, responsable, integrantes y contraseña rápida.');
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
  integrantes,
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
    if (!Array.isArray(formData.integrantes) || formData.integrantes.length === 0) {
  return 'Ingresa al menos un integrante del equipo.';
}
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
      integrantes: formData.integrantes,
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
  integrantes: parseIntegrantes(loginData.integrantesText),
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
  password: '',
});
    setFormData({
  equipo: '',
  departamento: '',
  responsable: '',
  integrantes: [],
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
    doc.roundedRect(margin, y, pageWidth - margin * 2, 45, 4, 4, 'F');
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 45, 4, 4, 'S');

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

    y += 58;

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
  const viewMode = new URLSearchParams(window.location.search).get('modo');
  const isRankingOnlyMode = viewMode === 'ranking';

  if (isRankingOnlyMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 p-4 md:p-8 text-white font-sans">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-white/10 border border-white/20 rounded-3xl p-3 md:p-4 flex items-center justify-center">
                  <img
                    src={logoBlanco}
                    alt="Logo PI"
                    className="w-16 h-16 md:w-24 md:h-24 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight">Ranking 5S en Vivo</h1>
                  <p className="text-cyan-100 text-lg md:text-2xl font-medium">
                    Mayor score primero · En empate gana menor tiempo
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
            <div className="grid gap-5">
              {ranking.slice(0, 12).map((item, index) => (
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-[30px] border p-5 md:p-6 shadow-2xl grid grid-cols-1 md:grid-cols-12 gap-4 items-center ${
                    index === 0
                      ? 'bg-gradient-to-r from-yellow-300 to-amber-500 text-slate-950 border-yellow-200'
                      : index === 1
                      ? 'bg-white/90 text-slate-900 border-slate-200'
                      : index === 2
                      ? 'bg-orange-200 text-slate-900 border-orange-100'
                      : 'bg-white/10 border-white/15 text-white'
                  }`}
                >
                  <div className="md:col-span-1 text-5xl md:text-6xl font-black text-center md:text-left">
                    {getRankingBadge(index)}
                  </div>

                  <div className="md:col-span-3">
                    <div className={`text-xs uppercase tracking-widest font-black ${index <= 2 ? 'text-slate-600' : 'text-cyan-100'}`}>
                      Equipo
                    </div>
                    <div className="text-3xl md:text-4xl font-black leading-tight">
                      {item.area || 'Sin equipo'}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className={`text-xs uppercase tracking-widest font-black ${index <= 2 ? 'text-slate-600' : 'text-cyan-100'}`}>
                      Departamento
                    </div>
                    <div className="text-xl md:text-2xl font-bold">
                      {item.departamento || 'N/A'}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className={`text-xs uppercase tracking-widest font-black ${index <= 2 ? 'text-slate-600' : 'text-cyan-100'}`}>
                      Integrantes
                    </div>
                    <div className="text-lg md:text-xl font-bold leading-tight">
                      {formatIntegrantes(item.integrantes)}
                    </div>
                  </div>

                  <div className="md:col-span-2 text-left md:text-center">
                    <div className={`text-xs uppercase tracking-widest font-black ${index <= 2 ? 'text-slate-600' : 'text-cyan-100'}`}>
                      Score
                    </div>
                    <div className={`text-5xl md:text-6xl font-black ${index <= 2 ? 'text-slate-950' : 'text-cyan-200'}`}>
                      {item.score}%
                    </div>
                  </div>

                  <div className="md:col-span-2 text-left md:text-center">
                    <div className={`text-xs uppercase tracking-widest font-black ${index <= 2 ? 'text-slate-600' : 'text-cyan-100'}`}>
                      Tiempo
                    </div>
                    <div className={`text-5xl md:text-6xl font-black ${index <= 2 ? 'text-slate-950' : 'text-yellow-200'}`}>
                      {item.tiempo_formateado || formatDuration(item.tiempo_segundos || 0)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-8 bg-white/10 border border-white/15 rounded-3xl p-5 text-center font-black text-2xl md:text-3xl text-white tracking-wide">
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