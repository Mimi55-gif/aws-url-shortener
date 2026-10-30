/**
 * URL por defecto del backend desplegado en Amazon EC2.
 * Reemplaza <ip-publica-ec2> por la dirección IPv4 pública de tu instancia EC2
 * antes de subir este archivo al bucket de Amazon S3.
 */
const DEFAULT_API_BASE_URL = "http://localhost:8000";

// Referencias a elementos del DOM
const apiBaseUrlInput = document.getElementById("apiBaseUrl");
const checkApiBtn = document.getElementById("checkApiBtn");
const apiStatusBadge = document.getElementById("apiStatusBadge");

const shortenForm = document.getElementById("shortenForm");
const originalUrlInput = document.getElementById("originalUrl");
const shortenBtn = document.getElementById("shortenBtn");
const errorAlert = document.getElementById("errorAlert");
const resultBox = document.getElementById("resultBox");
const resultUuid = document.getElementById("resultUuid");
const shortUrlLink = document.getElementById("shortUrlLink");
const originalUrlPreview = document.getElementById("originalUrlPreview");
const copyBtn = document.getElementById("copyBtn");

const lookupForm = document.getElementById("lookupForm");
const lookupCodeInput = document.getElementById("lookupCode");
const lookupBtn = document.getElementById("lookupBtn");
const lookupError = document.getElementById("lookupError");
const lookupResult = document.getElementById("lookupResult");
const metaShortCode = document.getElementById("metaShortCode");
const metaOriginalUrl = document.getElementById("metaOriginalUrl");
const metaCreatedAt = document.getElementById("metaCreatedAt");

// Inicializar la URL del API desde localStorage o el valor por defecto
function initApiBaseUrl() {
  const savedUrl = localStorage.getItem("aws_shortener_api_url");
  apiBaseUrlInput.value = savedUrl || DEFAULT_API_BASE_URL;
}

function getApiBaseUrl() {
  const raw = apiBaseUrlInput.value.trim().replace(/\/+$/, "");
  if (raw) {
    localStorage.setItem("aws_shortener_api_url", raw);
  }
  return raw;
}

/**
 * Valida en el cliente que la cadena ingresada sea una URL HTTP o HTTPS válida.
 */
function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function showError(element, message) {
  element.textContent = message;
  element.classList.remove("hidden");
}

function hideElement(element) {
  element.classList.add("hidden");
}

/**
 * Verifica conectividad con el backend en EC2 (GET /health).
 */
async function checkBackendConnection() {
  const baseUrl = getApiBaseUrl();
  if (!isValidHttpUrl(baseUrl)) {
    apiStatusBadge.textContent = "URL de API inválida";
    apiStatusBadge.className = "status-pill status-fail";
    return;
  }

  apiStatusBadge.textContent = "Verificando...";
  apiStatusBadge.className = "status-pill status-neutral";

  try {
    const response = await fetch(`${baseUrl}/health`, { method: "GET" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    apiStatusBadge.textContent = "Conectado a EC2";
    apiStatusBadge.className = "status-pill status-ok";
  } catch (err) {
    apiStatusBadge.textContent = "Sin respuesta";
    apiStatusBadge.className = "status-pill status-fail";
  }
}

/**
 * Envía la URL original al backend mediante fetch() -> POST /shorten
 */
shortenForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideElement(errorAlert);
  hideElement(resultBox);

  const originalUrl = originalUrlInput.value.trim();
  const baseUrl = getApiBaseUrl();

  if (!isValidHttpUrl(baseUrl)) {
    showError(
      errorAlert,
      "Configura una URL válida para el backend en EC2 (por ejemplo: http://54.123.45.67:8000)."
    );
    return;
  }

  if (!originalUrl || !isValidHttpUrl(originalUrl)) {
    showError(
      errorAlert,
      "Por favor ingresa una URL válida que comience con http:// o https://."
    );
    return;
  }

  shortenBtn.disabled = true;
  shortenBtn.textContent = "Acortando...";

  try {
    const response = await fetch(`${baseUrl}/shorten`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ original_url: originalUrl }),
    });

    if (!response.ok) {
      let detail = `Error del servidor (HTTP ${response.status})`;
      try {
        const errData = await response.json();
        if (errData.detail) {
          detail =
            typeof errData.detail === "string"
              ? errData.detail
              : "La URL enviada no tiene un formato válido.";
        }
      } catch {
        // Ignorar si no es JSON
      }
      throw new Error(detail);
    }

    const data = await response.json();

    // Mostrar enlace corto devuelto por el backend
    resultUuid.textContent = `UUID: ${data.short_code}`;
    shortUrlLink.href = data.short_url;
    shortUrlLink.textContent = data.short_url;
    originalUrlPreview.textContent = data.original_url;
    lookupCodeInput.value = data.short_code;

    resultBox.classList.remove("hidden");
    apiStatusBadge.textContent = "Conectado a EC2";
    apiStatusBadge.className = "status-pill status-ok";
  } catch (error) {
    if (error instanceof TypeError) {
      showError(
        errorAlert,
        "No se pudo conectar con el backend en EC2. Verifica que el servidor Uvicorn esté activo en el puerto 8000, el Security Group permita tráfico y CORS esté habilitado."
      );
    } else {
      showError(errorAlert, error.message || "Ocurrió un error inesperado.");
    }
  } finally {
    shortenBtn.disabled = false;
    shortenBtn.textContent = "Acortar URL";
  }
});

/**
 * Permite copiar el enlace corto generado al portapapeles.
 */
copyBtn.addEventListener("click", async () => {
  const urlToCopy = shortUrlLink.textContent;
  if (!urlToCopy) return;

  try {
    await navigator.clipboard.writeText(urlToCopy);
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "¡Copiado!";
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 1800);
  } catch {
    // Fallback para contextos HTTP (como sitio estático de S3 sin HTTPS)
    const tempInput = document.createElement("textarea");
    tempInput.value = urlToCopy;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);

    const originalText = copyBtn.textContent;
    copyBtn.textContent = "¡Copiado!";
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 1800);
  }
});

/**
 * Consulta información de un enlace existente mediante GET /urls/{short_code}
 */
lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideElement(lookupError);
  hideElement(lookupResult);

  const shortCode = lookupCodeInput.value.trim();
  const baseUrl = getApiBaseUrl();

  if (!shortCode) {
    showError(lookupError, "Ingresa un código UUID (short_code) para consultar.");
    return;
  }

  lookupBtn.disabled = true;
  lookupBtn.textContent = "Consultando...";

  try {
    const response = await fetch(`${baseUrl}/urls/${encodeURIComponent(shortCode)}`, {
      method: "GET",
    });

    if (response.status === 404) {
      throw new Error(`404 Not Found: No existe ningún enlace con el UUID "${shortCode}".`);
    }

    if (!response.ok) {
      throw new Error(`Error al consultar el enlace (HTTP ${response.status}).`);
    }

    const data = await response.json();
    metaShortCode.textContent = data.short_code;
    metaOriginalUrl.href = data.original_url;
    metaOriginalUrl.textContent = data.original_url;
    metaCreatedAt.textContent = data.created_at;

    lookupResult.classList.remove("hidden");
  } catch (error) {
    if (error instanceof TypeError) {
      showError(
        lookupError,
        "No se pudo conectar con el backend en EC2. Verifica la URL del API y el estado del servidor."
      );
    } else {
      showError(lookupError, error.message);
    }
  } finally {
    lookupBtn.disabled = false;
    lookupBtn.textContent = "Consultar";
  }
});

checkApiBtn.addEventListener("click", checkBackendConnection);

// Inicialización al cargar la página
initApiBaseUrl();
