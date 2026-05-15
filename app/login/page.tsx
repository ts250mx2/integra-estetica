'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, ArrowRight, Scissors } from 'lucide-react';
import styles from './login.module.css';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('ie-user', JSON.stringify(data.user));
        router.push('/');
      } else {
        setError(data.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error de conexión');
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
          <h1>Integra Estética</h1>
          <p>Sistema de Gestión & POS</p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <User size={18} className={styles.icon} />
            <input 
              type="text" 
              placeholder="Usuario" 
              value={login} 
              onChange={(e) => setLogin(e.target.value)} 
              required
              autoFocus
            />
          </div>
          <div className={styles.inputGroup}>
            <Lock size={18} className={styles.icon} />
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.loginBtn} disabled={loading}>
            {loading ? 'Iniciando...' : (
              <>
                Entrar <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className={styles.footer}>
          &copy; {new Date().getFullYear()} Integra Estética
        </div>
      </div>
    </div>
  );
}
