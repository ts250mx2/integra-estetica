'use client';

import { useState, useEffect } from 'react';
import { ArrowLeftRight, ArrowUpRight, ArrowDownRight, Search, Calendar as CalendarIcon } from 'lucide-react';
import styles from '../clientes/clientes.module.css';

interface Movement {
  IdMovimiento: number;
  IdApertura: number;
  Concepto: string;
  Efectivo: number;
  FechaRetiro: string;
}

export default function MovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchMovements(); }, []);

  const fetchMovements = async () => {
    const res = await fetch('/api/movements/history');
    const data = await res.json();
    setMovements(data);
    setLoading(false);
  };

  const filtered = movements.filter(m => 
    m.Concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.IdApertura.toString().includes(searchTerm)
  );

  if (loading) return <div className="flex-center" style={{ height: '100%' }}>Cargando historial...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <ArrowLeftRight size={32} color="var(--gold)" />
          <div>
            <h1>Historial de Movimientos</h1>
            <p className={styles.subtitle}>Registro de entradas y salidas de efectivo</p>
          </div>
        </div>
      </header>

      <div className={styles.searchBar} style={{ marginBottom: '1.5rem', maxWidth: '400px', display: 'flex', alignItems: 'center', background: 'var(--surface-2)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <Search size={18} color="var(--text-muted)" style={{ marginRight: '10px' }} />
        <input 
            type="text" 
            placeholder="Buscar por concepto o folio de caja..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', width: '100%' }}
        />
      </div>

      <div className={`${styles.tableWrapper} glass animate-fade`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Caja (Folio)</th>
              <th>Concepto</th>
              <th>Tipo</th>
              <th style={{ textAlign: 'right' }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No se encontraron movimientos</td></tr>
            ) : filtered.map(m => (
              <tr key={m.IdMovimiento}>
                <td style={{ fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarIcon size={14} color="var(--text-muted)" />
                        {new Date(m.FechaRetiro).toLocaleString()}
                    </div>
                </td>
                <td><span className="badge-info" style={{ fontSize: '0.7rem' }}>Caja #{m.IdApertura}</span></td>
                <td style={{ fontWeight: 600 }}>{m.Concepto}</td>
                <td>
                    <span className={m.Efectivo >= 0 ? 'badge-success' : 'badge-danger'} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                        {m.Efectivo >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {m.Efectivo >= 0 ? 'Ingreso' : 'Egreso'}
                    </span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: m.Efectivo >= 0 ? '#2ecc71' : 'var(--danger)' }}>
                  ${Number(Math.abs(m.Efectivo)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
