'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store, User, AtSign, Mail, Phone, Lock, ArrowRight, Scissors } from 'lucide-react';
import { toDominio } from '@/lib/domain';
import LogoDropZone from '@/components/LogoDropZone';
import styles from './registro.module.css';

const REDIRECT_DELAY_MS = 3000;

interface FormData {
  nombreProyecto: string;
  usuarioAdmin: string;
  nombreUsuario: string;
  correoElectronico: string;
  telefono: string;
  password: string;
  repetirPassword: string;
}

const EMPTY_FORM: FormData = {
  nombreProyecto: '',
  usuarioAdmin: 'admin',
  nombreUsuario: '',
  correoElectronico: '',
  telefono: '',
  password: '',
  repetirPassword: '',
};

export default function RegistroPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);

  const setField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const dominio = toDominio(formData.nombreProyecto);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setMessage('');
    setIsSuccess(false);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, logoBase64: logo || undefined }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsSuccess(true);
        setMessage(`¡Registro exitoso! Tu usuario para entrar es ${data.login}. Redirigiendo al login...`);
        setTimeout(() => router.push('/login'), REDIRECT_DELAY_MS);
      } else {
        setMessage(data.message || 'Error en el registro');
        if (data.errors) setErrors(data.errors);
      }
    } catch {
      setMessage('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.card} glass animate-scale`}>
        <div className={styles.header}>
          <div className={styles.logoWrap}>
            <Scissors size={40} color="var(--gold)" />
          </div>
          <h1>HL Cuts</h1>
          <p>Crea tu proyecto y empieza a administrar tu negocio</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
          {/* ── Información del proyecto ── */}
          <div className={styles.sectionTitle}>
            <div className={styles.sectionBar} />
            <span>Información del Proyecto</span>
          </div>

          <div className={styles.inputGroup}>
            <Store size={18} className={styles.icon} />
            <input
              type="text"
              placeholder="Nombre del proyecto (ej. Estética Bella Vita)"
              value={formData.nombreProyecto}
              onChange={(e) => setField('nombreProyecto', e.target.value)}
              required
              autoFocus
            />
            {errors.nombreProyecto && <div className={styles.fieldError}>{errors.nombreProyecto}</div>}
          </div>

          {/* Usuario administrador: usuario editable + @ + dominio autocalculado */}
          <div>
            <div className={styles.userDomainRow}>
              <div className={`${styles.inputGroup} ${styles.userPart}`}>
                <AtSign size={18} className={styles.icon} />
                <input
                  type="text"
                  placeholder="Usuario"
                  value={formData.usuarioAdmin}
                  onChange={(e) => setField('usuarioAdmin', e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
              <span className={styles.at}>@</span>
              <span className={styles.domainBox}>{dominio || 'tuproyecto.hl'}</span>
            </div>
            <div className={styles.helperText}>
              Con este usuario entrarás al sistema:{' '}
              <strong>{(formData.usuarioAdmin || 'admin').toLowerCase()}@{dominio || 'tuproyecto.hl'}</strong>
            </div>
            {errors.usuarioAdmin && <div className={styles.fieldError}>{errors.usuarioAdmin}</div>}
          </div>

          {/* Logo del proyecto: arrastrar y soltar, o clic para seleccionar */}
          <div>
            <LogoDropZone
              value={logo}
              onChange={(dataUrl) => {
                setErrors((prev) => ({ ...prev, logo: '' }));
                setLogo(dataUrl);
              }}
              onError={(msg) => setErrors((prev) => ({ ...prev, logo: msg }))}
            />
            {errors.logo && <div className={styles.fieldError}>{errors.logo}</div>}
          </div>

          <hr className={styles.divider} />

          {/* ── Información de usuario ── */}
          <div className={styles.sectionTitle}>
            <div className={styles.sectionBar} />
            <span>Información de Usuario</span>
          </div>

          <div className={styles.inputGroup}>
            <User size={18} className={styles.icon} />
            <input
              type="text"
              placeholder="Nombre completo"
              value={formData.nombreUsuario}
              onChange={(e) => setField('nombreUsuario', e.target.value)}
              required
            />
            {errors.nombreUsuario && <div className={styles.fieldError}>{errors.nombreUsuario}</div>}
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <Mail size={18} className={styles.icon} />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={formData.correoElectronico}
                onChange={(e) => setField('correoElectronico', e.target.value)}
                required
              />
              {errors.correoElectronico && <div className={styles.fieldError}>{errors.correoElectronico}</div>}
            </div>

            <div className={styles.inputGroup}>
              <Phone size={18} className={styles.icon} />
              <input
                type="tel"
                placeholder="Teléfono (10 dígitos)"
                value={formData.telefono}
                onChange={(e) => setField('telefono', e.target.value)}
                autoComplete="off"
                required
              />
              {errors.telefono && <div className={styles.fieldError}>{errors.telefono}</div>}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <Lock size={18} className={styles.icon} />
              <input
                type="password"
                placeholder="Contraseña"
                value={formData.password}
                onChange={(e) => setField('password', e.target.value)}
                autoComplete="new-password"
                required
              />
              {errors.password && <div className={styles.fieldError}>{errors.password}</div>}
            </div>

            <div className={styles.inputGroup}>
              <Lock size={18} className={styles.icon} />
              <input
                type="password"
                placeholder="Repetir contraseña"
                value={formData.repetirPassword}
                onChange={(e) => setField('repetirPassword', e.target.value)}
                autoComplete="new-password"
                required
              />
              {errors.repetirPassword && <div className={styles.fieldError}>{errors.repetirPassword}</div>}
            </div>
          </div>

          {message && (
            <div className={isSuccess ? styles.success : styles.error}>{message}</div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Creando proyecto...' : (
              <>
                Crear proyecto <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className={styles.loginLink}>
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </div>

        <div className={styles.footer}>
          &copy; {new Date().getFullYear()} HL Cuts
        </div>
      </div>
    </div>
  );
}
