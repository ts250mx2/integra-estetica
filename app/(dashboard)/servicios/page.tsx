'use client';

import { useState, useEffect } from 'react';
import { Scissors, Plus, Edit2, Trash2, X, Save, Image as ImageIcon } from 'lucide-react';
import styles from '../clientes/clientes.module.css';

interface Product {
  IdProducto: number;
  Producto: string;
  Precio1: number;
  Precio2: number;
  Precio3: number;
  IdCategoria: number;
  Categoria?: string;
  Status: number;
  Multiple: number;
  ArchivoImagen: string | null;
}

export default function ServicesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [formData, setFormData] = useState<any>({
    Producto: '', Precio1: '', Precio2: '', Precio3: '',
    IdCategoria: '', Status: 1, Multiple: 0, ArchivoImagen: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { 
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    const res = await fetch('/api/products/manage');
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const res = await fetch('/api/categories');
    const data = await res.json();
    setCategories(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const method = modal.product ? 'PUT' : 'POST';
    const url = modal.product ? `/api/products/manage/${modal.product.IdProducto}` : '/api/products/manage';
    
    const body = {
        ...formData,
        Precio1: parseFloat(formData.Precio1) || 0,
        Precio2: parseFloat(formData.Precio2) || 0,
        Precio3: parseFloat(formData.Precio3) || 0,
        IdCategoria: parseInt(formData.IdCategoria)
    };

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      setModal({ open: false, product: null });
      fetchProducts();
    } else {
      alert('Error al guardar');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro?')) return;
    const res = await fetch(`/api/products/manage/${id}`, { method: 'DELETE' });
    if (res.ok) fetchProducts();
  };

  if (loading) return <div className="flex-center" style={{ height: '100%' }}>Cargando...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <Scissors size={32} color="var(--gold)" />
          <div>
            <h1>Servicios y Productos</h1>
            <p className={styles.subtitle}>Administra tu catálogo de atención</p>
          </div>
        </div>
        <button className={styles.addBtn} onClick={() => { 
            setFormData({ Producto: '', Precio1: '', Precio2: '', Precio3: '', IdCategoria: categories[0]?.IdCategoria || '', Status: 1, Multiple: 0, ArchivoImagen: '' }); 
            setModal({ open: true, product: null }); 
        }}>
          <Plus size={20} /> Nuevo Servicio
        </button>
      </header>

      <div className={`${styles.tableWrapper} glass animate-fade`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Categoría</th>
              <th>Precio Principal</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.filter(p => p.Status === 1).map(p => (
              <tr key={p.IdProducto}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {p.ArchivoImagen ? (
                        <img src={p.ArchivoImagen} alt="" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                            <Scissors size={14} color="var(--text-muted)" />
                        </div>
                    )}
                    <span style={{ fontWeight: 600 }}>{p.Producto}</span>
                  </div>
                </td>
                <td><span className="badge-info" style={{ fontSize: '0.7rem' }}>{p.Categoria}</span></td>
                <td style={{ fontWeight: 700 }}>${Number(p.Precio1).toFixed(2)}</td>
                <td><span className="badge-success" style={{ fontSize: '0.7rem' }}>Activo</span></td>
                <td style={{ textAlign: 'right' }}>
                  <div className={styles.actions}>
                    <button onClick={() => { 
                        setFormData({ ...p }); 
                        setModal({ open: true, product: p }); 
                    }} className={styles.editBtn}><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(p.IdProducto)} className={styles.deleteBtn}><Trash2 size={16} /></button>
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
              <h3>{modal.product ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
              <button type="button" onClick={() => setModal({ open: false, product: null })}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label>Nombre del Servicio</label>
                <input type="text" value={formData.Producto} onChange={(e) => setFormData({ ...formData, Producto: e.target.value })} required />
              </div>
              
              <div className="grid-responsive" style={{ gap: '15px' }}>
                <div className={styles.inputGroup}>
                    <label>Categoría</label>
                    <select value={formData.IdCategoria} onChange={(e) => setFormData({ ...formData, IdCategoria: e.target.value })} required>
                        {categories.map(c => <option key={c.IdCategoria} value={c.IdCategoria}>{c.Categoria}</option>)}
                    </select>
                </div>
                <div className={styles.inputGroup}>
                    <label>Precio Principal ($)</label>
                    <input type="number" step="0.01" value={formData.Precio1} onChange={(e) => setFormData({ ...formData, Precio1: e.target.value })} required />
                </div>
              </div>

              <div className="grid-responsive" style={{ gap: '15px' }}>
                <div className={styles.inputGroup}>
                    <label>Precio Opcional 2 ($)</label>
                    <input type="number" step="0.01" value={formData.Precio2} onChange={(e) => setFormData({ ...formData, Precio2: e.target.value })} placeholder="0.00" />
                </div>
                <div className={styles.inputGroup}>
                    <label>Precio Opcional 3 ($)</label>
                    <input type="number" step="0.01" value={formData.Precio3} onChange={(e) => setFormData({ ...formData, Precio3: e.target.value })} placeholder="0.00" />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>URL de Imagen (opcional)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" value={formData.ArchivoImagen} onChange={(e) => setFormData({ ...formData, ArchivoImagen: e.target.value })} placeholder="https://..." />
                    <div style={{ width: '40px', height: '40px', background: 'var(--surface-2)', borderRadius: '4px', flexShrink: 0, overflow: 'hidden' }}>
                        {formData.ArchivoImagen ? <img src={formData.ArchivoImagen} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div className="flex-center" style={{ height: '100%' }}><ImageIcon size={18} color="var(--text-muted)" /></div>}
                    </div>
                </div>
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
