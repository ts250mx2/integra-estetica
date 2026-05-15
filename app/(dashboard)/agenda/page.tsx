'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Clock, User as UserIcon, X, Check } from 'lucide-react';
import styles from './agenda.module.css';

interface Cita {
  IdCita: number;
  IdCliente: number;
  NombreCliente: string;
  Telefono: string;
  Titulo: string;
  Descripcion: string;
  FechaCita: string;
  Duracion: number;
  Status: number;
}

interface Cliente {
  IdCliente: number;
  NombreCliente: string;
  Telefono: string;
}

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; cita: Cita | null; date?: Date }>({ open: false, cita: null });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  
  const [formData, setFormData] = useState({
    Titulo: '', Descripcion: '', Fecha: '', Hora: '', Duracion: '60'
  });

  useEffect(() => {
    fetchCitas();
    fetchClientes();
  }, [currentDate]);

  const fetchCitas = async () => {
    try {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const res = await fetch(`/api/citas?start=${monthStart.toISOString()}&end=${monthEnd.toISOString()}`);
      const data = await res.json();
      setCitas(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchClientes = async () => {
    const res = await fetch('/api/clientes');
    const data = await res.json();
    setClientes(data);
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleOpenModal = (cita: Cita | null = null, date?: Date) => {
    if (cita) {
      const d = new Date(cita.FechaCita);
      setFormData({
        Titulo: cita.Titulo,
        Descripcion: cita.Descripcion || '',
        Fecha: d.toISOString().split('T')[0],
        Hora: d.toTimeString().split(' ')[0].substring(0, 5),
        Duracion: cita.Duracion.toString()
      });
      setSelectedCliente({ IdCliente: cita.IdCliente, NombreCliente: cita.NombreCliente, Telefono: cita.Telefono });
    } else {
      setFormData({
        Titulo: '', Descripcion: '',
        Fecha: date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        Hora: '10:00', Duracion: '60'
      });
      setSelectedCliente(null);
    }
    setModal({ open: true, cita, date });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return alert('Selecciona un cliente');

    const citaData = {
      IdCliente: selectedCliente.IdCliente,
      Titulo: formData.Titulo,
      Descripcion: formData.Descripcion,
      FechaCita: `${formData.Fecha}T${formData.Hora}:00`,
      Duracion: parseInt(formData.Duracion),
    };

    const method = modal.cita ? 'PUT' : 'POST';
    const url = modal.cita ? `/api/citas/${modal.cita.IdCita}` : '/api/citas';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(citaData)
    });

    if (res.ok) {
      setModal({ open: false, cita: null });
      fetchCitas();
    }
  };

  const updateStatus = async (id: number, status: number) => {
    await fetch(`/api/citas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Status: status })
    });
    fetchCitas();
  };

  const filteredClientes = searchTerm ? clientes.filter(c => c.NombreCliente.toLowerCase().includes(searchTerm.toLowerCase())) : [];

  const renderCalendar = () => {
    const cells = [];
    // Empty cells before first day
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className={styles.dayCellEmpty}></div>);
    }
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = date.toDateString() === new Date().toDateString();
      const dayCitas = citas.filter(c => new Date(c.FechaCita).toDateString() === date.toDateString());

      cells.push(
        <div key={day} className={`${styles.dayCell} ${isToday ? styles.today : ''}`} onClick={() => handleOpenModal(null, date)}>
          <span className={styles.dayNumber}>{day}</span>
          <div className={styles.dayCitas}>
            {dayCitas.map(c => (
              <div 
                key={c.IdCita} 
                className={`${styles.citaBadge} ${c.Status === 2 ? styles.completed : c.Status === 3 ? styles.cancelled : ''}`}
                onClick={(e) => { e.stopPropagation(); handleOpenModal(c); }}
              >
                {c.NombreCliente.split(' ')[0]} - {new Date(c.FechaCita).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return cells;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <CalendarDays size={32} color="var(--gold)" />
          <div>
            <h1>Agenda de Citas</h1>
            <p className={styles.subtitle}>Organiza los servicios de tu estética</p>
          </div>
        </div>
        <button className={styles.addBtn} onClick={() => handleOpenModal()}>
          <Plus size={20} /> Nueva Cita
        </button>
      </header>

      <div className={`${styles.calendarWrap} glass animate-fade`}>
        <div className={styles.calendarHeader}>
          <div className={styles.monthName}>
            {currentDate.toLocaleString('es', { month: 'long', year: 'numeric' }).toUpperCase()}
          </div>
          <div className={styles.navBtns}>
            <button onClick={handlePrevMonth}><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentDate(new Date())} className={styles.todayBtn}>HOY</button>
            <button onClick={handleNextMonth}><ChevronRight size={20} /></button>
          </div>
        </div>
        
        <div className={styles.weekDays}>
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => <div key={d}>{d}</div>)}
        </div>
        
        <div className={styles.daysGrid}>
          {renderCalendar()}
        </div>
      </div>

      {modal.open && (
        <div className={styles.modalOverlay}>
          <form onSubmit={handleSave} className={`${styles.modal} glass animate-scale`}>
            <div className={styles.modalHeader}>
              <h3>{modal.cita ? 'Detalles de la Cita' : 'Agendar Cita'}</h3>
              <button type="button" onClick={() => setModal({ open: false, cita: null })}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label><UserIcon size={16} /> Cliente</label>
                {selectedCliente ? (
                  <div className={styles.selectedCliente}>
                    <span>{selectedCliente.NombreCliente}</span>
                    <button type="button" onClick={() => setSelectedCliente(null)}><X size={14} /></button>
                  </div>
                ) : (
                  <div className={styles.searchWrap}>
                    <input 
                      type="text" 
                      placeholder="Buscar cliente..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {filteredClientes.length > 0 && (
                      <div className={styles.dropdown}>
                        {filteredClientes.map(c => (
                          <div key={c.IdCliente} className={styles.option} onClick={() => { setSelectedCliente(c); setSearchTerm(''); }}>
                            {c.NombreCliente}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className={styles.inputGroup}>
                <label>Servicio / Título</label>
                <input 
                  type="text" 
                  value={formData.Titulo} 
                  onChange={(e) => setFormData({...formData, Titulo: e.target.value})} 
                  placeholder="Corte de cabello, Barba, etc." 
                  required
                />
              </div>

              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label>Fecha</label>
                  <input type="date" value={formData.Fecha} onChange={(e) => setFormData({...formData, Fecha: e.target.value})} required />
                </div>
                <div className={styles.inputGroup}>
                  <label><Clock size={16} /> Hora</label>
                  <input type="time" value={formData.Hora} onChange={(e) => setFormData({...formData, Hora: e.target.value})} required />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Notas</label>
                <textarea 
                  value={formData.Descripcion} 
                  onChange={(e) => setFormData({...formData, Descripcion: e.target.value})} 
                  rows={2}
                />
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              {modal.cita && (
                <div className={styles.statusActions}>
                  {modal.cita.Status === 1 && (
                    <button type="button" className={styles.completeBtn} onClick={() => updateStatus(modal.cita!.IdCita, 2)}>
                      <Check size={16} /> Marcar Completada
                    </button>
                  )}
                  <button type="button" className={styles.cancelBtn} onClick={() => updateStatus(modal.cita!.IdCita, 3)}>
                    Cancelar Cita
                  </button>
                </div>
              )}
              <button type="submit" className={styles.saveBtn}>Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
