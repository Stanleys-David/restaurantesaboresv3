/**
 * @jest-environment jsdom
 */

import { showNotification, validateEmail } from "../js/inicioSesion.js";

describe("Pruebas del formulario de inicio de sesión", () => {

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="notification"></div>
      <form id="loginForm"></form>
      <span id="loginText"></span>
    `;
  });

  test("validateEmail retorna true para un email válido", () => {
    expect(validateEmail("usuario@correo.com")).toBe(true);
  });

  test("validateEmail retorna false para email inválido", () => {
    expect(validateEmail("correo-invalido")).toBe(false);
  });

  test("showNotification muestra el mensaje correctamente", () => {
    const result = showNotification("Hola mundo", "success");
    const notification = document.getElementById("notification");

    expect(result).toBe(true);
    expect(notification.textContent).toBe("Hola mundo");
    expect(notification.className).toContain("success");
    expect(notification.style.display).toBe("block");
  });

  test("showNotification retorna false si no existe el elemento", () => {
    document.body.innerHTML = ""; // sin notification
    expect(showNotification("x", "info")).toBe(false);
  });
});
