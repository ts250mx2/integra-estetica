'use client';

import { useState, useEffect } from 'react';
import { Tags, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import styles from '../clientes/clientes.module.css';

interface Category {
  IdCategoria: number;
  Categoria: string;
  EsExtra: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; category: Category | null }>({ open: false, category: null });
  const [formData, setFormData] = useState({ Categoria: '', EsExtra: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    const res = await fetch('/api/categories');
    const data = await res.json();
    setCategories(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const method = modal.category ? 'PUT' : 'POST';
    const url = modal.category ? `/api/categories/${modal.category.IdCategoria}` : '/api/categories';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setModal({ open: false, category: null });
      fetchCategories();
    } else {
      const d = await res.json();
      alert(d.message || 'Error');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro?')) return;
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (res.ok) fetchCategories();
    else alert('No se puede eliminar: tiene productos asociados');
  };

  if (loading) return <div className="flex-center" style={{ height: '100%' }}>Cargando...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <Tags size={32} color="var(--gold)" />
          <div>
            <h1>Categorías</h1>
            <p className={styles.subtitle}>Organiza tus servicios y extras</p>
          </div>
        </div>
        <button className={styles.addBtn} onClick={() => { setFormData({ Categoria: '', EsExtra: 0 }); setModal({ open: true, category: null }); }}>
          <Plus size={20} /> Nueva Categoría
        </button>
      </header>

      <div className={`${styles.tableWrapper} glass animate-fade`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre de Categoría</th>
              <th>Tipo</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.IdCategoria}>
                <td>{c.IdCategoria}</td>
                <td style={{ fontWeight: 600 }}>{c.Categoria}</td>
                <td>
                  <span className={c.EsExtra ? 'badge-warn' : 'badge-success'} style={{ fontSize: '0.7rem' }}>
                    {c.EsExtra ? 'Extra / Adicional' : 'Servicio / Producto'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className={styles.actions}>
                    <button onClick={() => { setFormData({ Categoria: c.Categoria, EsExtra: c.EsExtra }); setModal({ open: true, category: c }); }} className={styles.editBtn}><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(c.IdCategoria)} className={styles.deleteBtn}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <div className={styles.modalOverlay}>
          <form onSubmit={handleSave} className={`${styles.modal} glass animate-scale`}>
            <div className={styles.modalHeader}>
              <h3>{modal.category ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
              <button type="button" onClick={() => setModal({ open: false, category: null })}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label>Nombre</label>
                <input type="text" value={formData.Categoria} onChange={(e) => setFormData({ ...formData, Categoria: e.target.value })} required />
              </div>
              <div className={styles.inputGroup} style={{ flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
                <input type="checkbox" checked={formData.EsExtra === 1} onChange={(e) => setFormData({ ...formData, EsExtra: e.target.checked ? 1 : 0 })} id="chkExtra" />
                <label htmlFor="chkExtra" style={{ cursor: 'pointer' }}>Es categoría de extras</label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="submit" className={styles.saveBtn} disabled={saving}>
                <Save size={18} /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
