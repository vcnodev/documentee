export function renderPlaygroundScript(): string {
  return `<script>
(() => {
  const forms = document.querySelectorAll("[data-documentee-playground]");

  for (const form of forms) {
    const environment = form.querySelector('[name="environment"]');
    const baseUrl = form.querySelector('[name="baseUrl"]');
    if (environment && baseUrl) {
      environment.addEventListener("change", () => {
        baseUrl.value = environment.value;
        renderPreview(form);
      });
    }

    form.addEventListener("input", () => renderPreview(form));
    form.addEventListener("change", () => renderPreview(form));
    renderPreview(form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const result = form.querySelector("[data-playground-result]");
      const responseHeadersOutput = form.querySelector("[data-playground-response-headers]");
      const responseBodyOutput = form.querySelector("[data-playground-response-body]");
      const submit = form.querySelector("[data-playground-submit]");
      if (!result) return;

      result.textContent = "Sending request...";
      result.dataset.state = "loading";
      if (responseHeadersOutput) responseHeadersOutput.textContent = "";
      if (responseBodyOutput) responseBodyOutput.textContent = "";
      if (submit) submit.setAttribute("disabled", "true");

      try {
        const request = buildRequest(form, false);
        const init = { method: request.method, headers: request.headers };
        if (request.body) init.body = request.body;

        const response = await fetch(request.url, init);
        const responseHeaders = [];
        response.headers.forEach((value, key) => responseHeaders.push(key + ": " + value));
        const text = await response.text();
        result.dataset.state = response.ok ? "success" : "error";
        result.textContent = "Status: " + response.status + " " + response.statusText;
        if (responseHeadersOutput) responseHeadersOutput.textContent = responseHeaders.join("\\n") || "No response headers.";
        if (responseBodyOutput) responseBodyOutput.textContent = text || "No response body.";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.dataset.state = "error";
        result.textContent = "Network, CORS, or authentication error: " + message;
        if (responseHeadersOutput) responseHeadersOutput.textContent = "No headers received.";
        if (responseBodyOutput) responseBodyOutput.textContent = "The browser could not complete the request. Check CORS, network access, and authentication values.";
      } finally {
        if (submit) submit.removeAttribute("disabled");
      }
    });
  }

  function renderPreview(form) {
    const preview = form.querySelector("[data-playground-preview]");
    if (!preview) return;

    try {
      const request = buildRequest(form, true);
      const headerLines = [];
      request.headers.forEach((value, key) => headerLines.push(key + ": " + value));
      preview.textContent = [
        request.method + " " + request.url,
        headerLines.length > 0 ? headerLines.join("\\n") : "No headers",
        request.body ? "\\n" + request.body : ""
      ].filter(Boolean).join("\\n");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      preview.textContent = "Request preview updates as you edit. " + message;
    }
  }

  function buildRequest(form, maskSecrets) {
    const method = form.getAttribute("data-method") || "GET";
    const pathTemplate = form.getAttribute("data-path") || "/";
    const baseUrlValue = valueOf(form, "baseUrl");
    const url = new URL(resolvePath(pathTemplate, form), baseUrlValue);
    const query = new URLSearchParams(url.search);
    const headers = new Headers();

    for (const input of form.querySelectorAll("[data-param-location]")) {
      const location = input.getAttribute("data-param-location");
      const name = input.getAttribute("name");
      const value = input.value;
      if (!name || !value || location === "path") continue;
      if (location === "query") query.set(name, value);
      if (location === "header") headers.set(name, value);
    }

    const auth = form.getAttribute("data-auth") || "none";
    const apiKeyName = form.getAttribute("data-api-key-name") || "";
    const apiKeyLocation = form.getAttribute("data-api-key-location") || "header";
    const authValue = valueOf(form, "documenteeAuth");
    const safeAuthValue = maskSecrets && authValue ? "******" : authValue;
    if (auth === "bearer" && authValue) headers.set("Authorization", "Bearer " + safeAuthValue);
    if (auth === "apiKey" && authValue && apiKeyName) {
      if (apiKeyLocation === "query") query.set(apiKeyName, safeAuthValue);
      else headers.set(apiKeyName, safeAuthValue);
    }

    url.search = query.toString();

    const body = valueOf(form, "body");
    const mediaType = valueOf(form, "mediaType");
    let requestBody = "";
    if (body && method !== "GET" && method !== "HEAD") {
      requestBody = body;
      if (mediaType) headers.set("Content-Type", mediaType);
    }

    return { method, url, headers, body: requestBody };
  }

  function resolvePath(pathTemplate, form) {
    return pathTemplate.replace(/\\{([^}]+)\\}/g, (_match, name) => {
      return encodeURIComponent(valueOf(form, name));
    });
  }

  function valueOf(form, name) {
    const field = form.querySelector('[name="' + cssEscape(name) + '"]');
    return field && "value" in field ? field.value : "";
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replace(/"/g, "\\\\\\"");
  }
})();
</script>`;
}
