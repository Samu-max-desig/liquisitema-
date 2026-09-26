import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  TruckIcon,
  ChartBarIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";

import { login } from "../../services/authService";
import logo from "../../assets/images/logo-liquisistema.png";

import styles from "./Login.module.css";

function Login() {
  const navigate = useNavigate();

  const [documento, setDocumento] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!documento || !password) {
      Swal.fire({
        icon: "warning",
        title: "Campos incompletos",
        text: "Debes ingresar documento y contraseña",
      });

      return;
    }

    try {
      setLoading(true);

      const { usuario } = await login(documento, password);

      sessionStorage.setItem("usuario", JSON.stringify(usuario));

      Swal.fire({
        icon: "success",
        title: "Bienvenido",
        text: `Hola ${usuario.nombre}`,
        timer: 1200,
        showConfirmButton: false,
      });

      if (usuario.rol === "admin" || usuario.rol === "super_admin") {
        navigate("/admin");
      } else {
        navigate("/domiciliario");
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      {/* =====================================================
          LADO IZQUIERDO
      ===================================================== */}

      <section className={styles.loginHero}>
        <div className={styles.heroOverlay}></div>

        <div className={styles.heroContent}>
          {/* LOGO */}

          {/* TEXTO */}

          <div className={styles.heroText}>
            <h1>
              Todo tu negocio
              <br />
              en un <span>solo lugar</span>
            </h1>

            <p>
              Controla tus domicilios, clientes, inventario y reportes de forma
              fácil, rápida y segura.
            </p>
          </div>

          {/* CARACTERÍSTICAS */}

          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <TruckIcon />
              </div>

              <div className={styles.featureText}>
                <strong>Gestión de domicilios</strong>
                <span>Control de cada entrega</span>
              </div>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <ChartBarIcon />
              </div>

              <div className={styles.featureText}>
                <strong>Control operativo</strong>
                <span>Estadísticas y reportes</span>
              </div>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <UserGroupIcon />
              </div>

              <div className={styles.featureText}>
                <strong>Administración total</strong>
                <span>Clientes, usuarios e inventario</span>
              </div>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <ShieldCheckIcon />
              </div>

              <div className={styles.featureText}>
                <strong>Seguro y confiable</strong>
                <span>Tu información siempre protegida</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.heroGlow}></div>
      </section>

      {/* =====================================================
          LADO DERECHO
      ===================================================== */}

      <section className={styles.loginSide}>
        <div className={styles.loginCard}>
          {/* LOGO */}

          <div className={styles.cardLogoContainer}>
            <img src={logo} alt="Liquisistema" className={styles.cardLogo} />
          </div>

          {/* ENCABEZADO */}

          <div className={styles.loginHeader}>
            <h2>Bienvenido de nuevo</h2>

            <p>Ingresa tus credenciales para acceder al sistema</p>
          </div>

          {/* FORMULARIO */}

          <form className={styles.loginForm} onSubmit={handleLogin}>
            {/* DOCUMENTO */}

            <div className={styles.fieldGroup}>
              <div className={styles.inputContainer}>
                <UserIcon className={styles.inputIcon} />

                <input
                  type="text"
                  placeholder="Documento"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  className={styles.loginInput}
                  autoComplete="username"
                />
              </div>

              <span className={styles.fieldHint}>
                Ingresa tu número de documento
              </span>
            </div>

            {/* CONTRASEÑA */}

            <div className={styles.fieldGroup}>
              <div className={styles.inputContainer}>
                <LockClosedIcon className={styles.inputIcon} />

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${styles.loginInput} ${styles.passwordInput}`}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordButton}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? (
                    <EyeSlashIcon className={styles.eyeIcon} />
                  ) : (
                    <EyeIcon className={styles.eyeIcon} />
                  )}
                </button>
              </div>

              <span className={styles.fieldHint}>Ingresa tu contraseña</span>
            </div>

            {/* BOTÓN */}

            <button
              type="submit"
              disabled={loading}
              className={styles.loginButton}
            >
              {loading ? (
                <span className={styles.loadingContent}>
                  <span className={styles.spinner}></span>
                  Ingresando...
                </span>
              ) : (
                <>
                  <ArrowRightOnRectangleIcon />
                  Ingresar
                </>
              )}
            </button>
          </form>

          {/* PIE */}

          <div className={styles.cardFooter}>
            <span>Liquisistema</span>

            <span className={styles.footerDivider}>|</span>

            <span>Gestión inteligente de domicilios</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Login;
