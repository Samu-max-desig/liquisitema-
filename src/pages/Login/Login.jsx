import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
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
console.log("USUARIO LOGIN:", usuario);
localStorage.setItem(
  "usuario",
  JSON.stringify(usuario)
);
console.log("GUARDADO:", usuario);
console.log("LOCALSTORAGE:", localStorage.getItem("usuario"));
Swal.fire({
  icon: "success",
  title: "Bienvenido",
  text: `Hola ${usuario.nombre}`,
  timer: 1200,
  showConfirmButton: false,
});

if (usuario.rol === "admin") {
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
      <div className={styles.loginLeft}>
        <div className={styles.loginIllustration}>
          <h1>Liquisistema</h1>

          <img src={logo} alt="Logo" className={styles.loginBackgroundLogo} />
          <p>
            Plataforma inteligente para la gestión de domicilios, seguimiento de
            entregas y control operativo.
          </p>
        </div>
      </div>

      <div className={styles.loginRight}>
        <div className={styles.loginCard}>
          <img src={logo} alt="Liquisistema" className={styles.loginLogo} />

          <h2 className={styles.loginTitle}>Iniciar Sesión</h2>

          <p className={styles.loginSubtitle}>Ingresa tus credenciales</p>

          <form className={styles.loginForm} onSubmit={handleLogin}>
            <div className={styles.loginInputContainer}>
              <UserIcon className={styles.loginInputIcon} />

              <input
                type="text"
                placeholder="Documento"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                className={styles.loginInput}
              />
            </div>

            <div className={styles.loginInputContainer}>
              <LockClosedIcon className={styles.loginInputIcon} />

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.loginInput}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.loginPasswordButton}
              >
                {showPassword ? (
                  <EyeSlashIcon className={styles.loginEyeIcon} />
                ) : (
                  <EyeIcon className={styles.loginEyeIcon} />
                )}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className={styles.loginButton}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
