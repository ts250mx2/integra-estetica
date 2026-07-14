'use client';

import { useRouter } from 'next/navigation';
import { Sun, Moon, LogOut, User, Scissors } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import styles from './Header.module.css';
import { useEffect, useState } from 'react';

const PUESTOS: Record<number, string> = {
  1: 'Administrador',
  2: 'Cajero',
  3: 'Estilista',
};

export default function Header() {
  const { theme, toggle: toggleTheme } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('ie-user');
    if (savedUser) setUser(JSON.parse(savedUser));

    fetch('/api/config/ticket')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setConfig(d); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('ie-user');
    router.push('/login');
  };

  const isAdmin = user?.IdPuesto === 1;
  const roleName = user?.IdPuesto ? PUESTOS[user.IdPuesto] || 'Usuario' : 'Usuario';
  const appTitle = config?.AppTitle || 'HL Cuts';
  const logoSrc  = config?.LogoPath || '/logo.png';

  return (
    <header className={`${styles.header} glass`}>
      <div className={styles.left}>
        {config?.LogoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.LogoPath} alt={appTitle} className={styles.logo} />
        ) : (
          <div className={styles.iconWrap}>
            <Scissors size={20} color="var(--gold)" />
          </div>
        )}
        <span className={styles.brandName}>{appTitle}</span>
      </div>

      <div className={styles.right}>
        <button className={styles.themeBtn} onClick={toggleTheme} title="Cambiar tema">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <span className={`${styles.userName} ${isAdmin ? styles.adminHighlight : ''}`}>
              {user?.Usuario || 'Usuario'} <span className={styles.userRole}>({roleName})</span>
            </span>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              <LogOut size={14} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
          <div className={styles.avatar}>
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
}
