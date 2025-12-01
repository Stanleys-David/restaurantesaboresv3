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

function getIsAdminFlagFromUser(user = {}) {
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
    const notification = safeGetElement("notification");
    if (notification) {
      notification.textContent = "¡Registro exitoso! Ahora puedes iniciar sesión con tus credenciales.";
      notification.className = "notification success";
      notification.style.display = "block";
    }
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
      alert("Por favor ingresa tu correo y contraseña");
      return;
    }

    setLoginButtonText("Iniciando sesión...");

    try {
      if (typeof ADMIN_CREDENTIALS !== "undefined" && ADMIN_CREDENTIALS &&
          email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
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

        alert("¡Bienvenido Administrador!");
        redirectAfterDelay("admin.html");
        return;
      }

      const userResult = await getUserByEmail(email);

      if (!userResult || !userResult.success || !userResult.user) {
        alert("Email o contraseña incorrectos. Verifica tus datos o regístrate si no tienes cuenta.");
        setLoginButtonText(localStorage.getItem("currentUser") ? "Cambiar Sesión" : "Iniciar Sesión");
        return;
      }

      const storedUser = userResult.user;

      if (storedUser.password !== password) {
        alert("Email o contraseña incorrectos. Verifica tus datos o regístrate si no tienes cuenta.");
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
        alert(`¡Bienvenido Administrador ${storedUser.name}!`);
        redirectAfterDelay("admin.html");
      } else {
        alert(`¡Bienvenido ${storedUser.name}! Has iniciado sesión correctamente`);
        redirectAfterDelay("menu.html");
      }

    } catch (error) {
      console.error("Error en el login:", error);
      alert("Error al iniciar sesión. Intenta nuevamente.");
      setLoginButtonText(localStorage.getItem("currentUser") ? "Cambiar Sesión" : "Iniciar Sesión");
    }
  });
}

/* Manejo de la tecla Enter */
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
