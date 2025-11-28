import { saveUser, getUserByEmail } from "./firebase.js"

function showNotification(message, type = "info") {
  const notification = document.getElementById("notification")
  notification.textContent = message
  notification.className = `notification ${type}`
  notification.classList.add("show")

  setTimeout(() => {
    notification.classList.remove("show")
  }, 3000)
}

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const formData = {
    name: document.getElementById("name").value.trim(),
    surname: document.getElementById("surname").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value.trim(),
  }

  if (!formData.name || !formData.surname || !formData.phone || !formData.email || !formData.password) {
    showNotification("Por favor completa todos los campos obligatorios", "error")
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formData.email)) {
    showNotification("Por favor ingresa un email válido", "error")
    return
  }

  if (formData.password.length < 6) {
    showNotification("La contraseña debe tener al menos 6 caracteres", "error")
    return
  }

  const phoneRegex = /^[\d\s\-+()]+$/
  if (!phoneRegex.test(formData.phone)) {
    showNotification("Por favor ingresa un número de teléfono válido", "error")
    return
  }

  const registerText = document.getElementById("registerText")
  registerText.textContent = "Registrando..."

  try {
    // Verificar si el usuario ya existe
    const existingUser = await getUserByEmail(formData.email)

    if (existingUser.success) {
      showNotification("Este email ya está registrado. Intenta con otro email o inicia sesión.", "error")
      registerText.textContent = "Registrarse"
      return
    }

    // Guardar nuevo usuario en Firebase
    const result = await saveUser(formData)

    if (result.success) {
      showNotification("¡Registro exitoso! Tu cuenta ha sido creada correctamente", "success")
      document.getElementById("registerForm").reset()

      setTimeout(() => {
        window.location.href = "inicioSesion.html?registered=true"
      }, 1500)
    } else {
      showNotification("Error al registrar usuario: " + result.error, "error")
      registerText.textContent = "Registrarse"
    }
  } catch (error) {
    console.error("Error en el registro:", error)
    showNotification("Error al registrar usuario. Intenta nuevamente.", "error")
    registerText.textContent = "Registrarse"
  }
})

document.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("registerForm").dispatchEvent(new Event("submit"))
  }
})
