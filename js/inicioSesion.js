/* ------------- FUNCIONES TESTEABLES ------------- */

// Validación del email (cubierta por test)
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Notificación (cubierta por test)
export function showNotification(message, type = "info") {
  const notification = document.getElementById("notification");
  if (!notification) return false;

  notification.textContent = message; // textContent evita inyección HTML
  notification.className = `notification ${type}`;
  notification.style.display = "block";
  notification.classList.add("show");

  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);

  return true;
}

/* ------------- LÓGICA DEL LOGIN (REFORMA) ------------- */

import { getUserByEmail } from "./firebase.js";

/* Helpers internos */

function safeGetElement(id) {
  return document.getElementById(id) || null;
}

function setLoginButtonText(text) {
  const loginText = safeGetElement("loginText");
  if (loginText) loginText.textContent = text;
}

function redirectAfterDelay(href, delay = 1500) {
  setTimeout(() => {
    window.location.href = href;
  }, delay);
}

/**
 * Normaliza distintos nombres de campo que indiquen rol admin.
 * Devuelve true si cualquiera de las variantes está presente y es truthy.
 */
function getIsAdminFlagFromUser(user = {}) {
  // Añade aquí otras variantes si en la base de datos hay nombres distintos
  return Boolean(
    user.isAdmin === true ||
    user.IsAdmin === true ||
    user.is_admin === true ||
    user.admin === true
  );
}

/* Inicialización en carga */
window.addEventListener("load", () => {
  const user = JSON.parse(localStorage.getItem("currentUser") || "null");
  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.get("registered") === "true") {
    showNotification("¡Registro exitoso! Ahora puedes iniciar sesión con tus credenciales.", "success");
  }

  setLoginButtonText(user ? "Cambiar Sesión" : "Iniciar Sesión");
});

/* Manejo del formulario de login */
const loginForm = safeGetElement("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailInput = safeGetElement("email");
    const passwordInput = safeGetElement("password");

    const email = (emailInput && emailInput.value) ? emailInput.value.trim() : "";
    const password = (passwordInput && passwordInput.value) ? passwordInput.value.trim() : "";

    if (!email || !password) {
      showNotification("Por favor ingresa tu correo y contraseña", "error");
      return;
    }

    if (!validateEmail(email)) {
      showNotification("Por favor ingresa un email válido", "error");
      return;
    }

    setLoginButtonText("Iniciando sesión...");

    try {
      // Credenciales admin en entorno (si se usan)
      if (typeof ADMIN_CREDENTIALS !== "undefined" && ADMIN_CREDENTIALS && email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        const adminSession = {
          id: "admin",
          name: "Administrador",
          surname: "Sistema",
          email: ADMIN_CREDENTIALS.email,
          phone: ADMIN_CREDENTIALS.phone || "3001234567",
          role: "admin",
          isAdmin: true,
        };

        localStorage.setItem("currentUser", JSON.stringify(adminSession));
        localStorage.setItem("currentUserEmail", ADMIN_CREDENTIALS.email);

        showNotification("¡Bienvenido Administrador!", "success");
        redirectAfterDelay("admin.html");
        return;
      }

      // Llamada a la capa de datos
      const userResult = await getUserByEmail(email);

      // Validaciones seguras del resultado
      if (!userResult || !userResult.success || !userResult.user) {
        showNotification("Email o contraseña incorrectos. Verifica tus datos o regístrate si no tienes cuenta.", "error");
        setLoginButtonText(localStorage.getItem("currentUser") ? "Cambiar Sesión" : "Iniciar Sesión");
        return;
      }

      const storedUser = userResult.user;

      // Comprobar contraseña (nota: idealmente aquí se compara un token/hashed en backend)
      if (storedUser.password !== password) {
        showNotification("Email o contraseña incorrectos. Verifica tus datos o regístrate si no tienes cuenta.", "error");
        setLoginButtonText(localStorage.getItem("currentUser") ? "Cambiar Sesión" : "Iniciar Sesión");
        return;
      }

      const isAdmin = getIsAdminFlagFromUser(storedUser);

      const userSession = {
        id: storedUser.id,
        name: storedUser.name,
        surname: storedUser.surname,
        email: storedUser.email,
        phone: storedUser.phone,
        role: isAdmin ? "admin" : "customer",
        isAdmin,
      };

      localStorage.setItem("currentUser", JSON.stringify(userSession));
      localStorage.setItem("currentUserEmail", storedUser.email);

      if (isAdmin) {
        showNotification(`¡Bienvenido Administrador ${storedUser.name}!`, "success");
        redirectAfterDelay("admin.html");
      } else {
        showNotification(`¡Bienvenido ${storedUser.name}! Has iniciado sesión correctamente`, "success");
        redirectAfterDelay("menu.html");
      }

    } catch (error) {
      console.error("Error en el login:", error);
      showNotification("Error al iniciar sesión. Intenta nuevamente.", "error");
      setLoginButtonText(localStorage.getItem("currentUser") ? "Cambiar Sesión" : "Iniciar Sesión");
    }
  });
}

/* Manejo de la tecla Enter de forma segura */
document.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const form = safeGetElement("loginForm");
    if (!form) return;
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
    } else {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
  }
});

// Necesario para Jest
export {};