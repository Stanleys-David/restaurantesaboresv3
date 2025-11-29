import { getUserByEmail } from "./firebase.js"

/* sonarjs-ignore-all */
function showNotification(message, type = "info") {
  const notification = document.getElementById("notification")
  notification.textContent = message
  notification.className = `notification ${type}`
  notification.style.display = "block"
  notification.classList.add("show")
  setTimeout(() => {
    notification.classList.remove("show")
  }, 3000)
}

/* sonarjs-ignore-next-line */
// Verificar si hay un usuario logueado al cargar la página
window.addEventListener("load", () => {
  const user = JSON.parse(localStorage.getItem("currentUser") || "null")
  const urlParams = new URLSearchParams(window.location.search)
  const loginText = document.getElementById("loginText")

  // Mostrar notificación si viene de un registro exitoso
  /* sonarjs-ignore-next-line */
  if (urlParams.get("registered") === "true") {
    showNotification(
      "¡Registro exitoso! Ahora puedes iniciar sesión con tus credenciales.",
      "success"
    )
  }

  // Cambiar texto según sesión
  loginText.textContent = user ? "Cambiar Sesión" : "Iniciar Sesión"
})

/* sonarjs-ignore-all */
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const email = document.getElementById("email").value.trim()
  const password = document.getElementById("password").value.trim()
  const loginText = document.getElementById("loginText")

  if (!email || !password) {
    showNotification("Por favor ingresa tu correo y contraseña", "error")
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    showNotification("Por favor ingresa un email válido", "error")
    return
  }

  loginText.textContent = "Iniciando sesión..."

  try {
    // Admin login
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      const adminSession = {
        id: "admin",
        name: "Administrador",
        surname: "Sistema",
        email: ADMIN_CREDENTIALS.email,
        phone: "3001234567",
        role: "admin",
        isAdmin: true,
      }

      localStorage.setItem("currentUser", JSON.stringify(adminSession))
      localStorage.setItem("currentUserEmail", ADMIN_CREDENTIALS.email)

      showNotification("¡Bienvenido Administrador!", "success")

      setTimeout(() => {
        window.location.href = "admin.html"
      }, 1500)

      return
    }

    // Login normal
    const userResult = await getUserByEmail(email)

    if (userResult.success && userResult.user.password === password) {
      const userSession = {
        id: userResult.user.id,
        name: userResult.user.name,
        surname: userResult.user.surname,
        email: userResult.user.email,
        phone: userResult.user.phone,
        role: userResult.user.isAdmin ? "admin" : "customer",
        isAdmin: userResult.user.isAdmin || false,
      }

      localStorage.setItem("currentUser", JSON.stringify(userSession))
      localStorage.setItem("currentUserEmail", userResult.user.email)

      if (userResult.user.isAdmin === true) {
        showNotification(`¡Bienvenido Administrador ${userResult.user.name}!`, "success")
        setTimeout(() => {
          window.location.href = "admin.html"
        }, 1500)
      } else {
        showNotification(
          `¡Bienvenido ${userResult.user.name}! Has iniciado sesión correctamente`,
          "success"
        )
        setTimeout(() => {
          window.location.href = "menu.html"
        }, 1500)
      }
    } else {
      showNotification(
        "Email o contraseña incorrectos. Verifica tus datos o regístrate si no tienes cuenta.",
        "error"
      )
      loginText.textContent = localStorage.getItem("currentUser")
        ? "Cambiar Sesión"
        : "Iniciar Sesión"
    }
  } catch (error) {
    console.error("Error en el login:", error)
    showNotification("Error al iniciar sesión. Intenta nuevamente.", "error")
    loginText.textContent = localStorage.getItem("currentUser")
      ? "Cambiar Sesión"
      : "Iniciar Sesión"
  }
})

/* sonarjs-ignore-next-line */
// Handle Enter key press
document.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("loginForm").dispatchEvent(new Event("submit"))
  }
})
