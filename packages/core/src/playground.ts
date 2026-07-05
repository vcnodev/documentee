export function renderPlaygroundScript(): string {
  return `<script>
(() => {
  const forms = document.querySelectorAll("[data-documentee-playground]");

  for (const form of forms) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const result = form.querySelector("[data-playground-result]");
      const submit = form.querySelector("[data-playground-submit]");
      if (!result) return;

      result.textContent = "Sending request...";
      result.dataset.state = "loading";
      if (submit) submit.setAttribute("disabled", "true");

      try {
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
        if (auth === "bearer" && authValue) headers.set("Authorization", "Bearer " + authValue);
        if (auth === "apiKey" && authValue && apiKeyName) {
          if (apiKeyLocation === "query") query.set(apiKeyName, authValue);
          else headers.set(apiKeyName, authValue);
        }

        url.search = query.toString();

        const body = valueOf(form, "body");
        const mediaType = valueOf(form, "mediaType");
        const init = { method, headers };
        if (body && method !== "GET" && method !== "HEAD") {
          init.body = body;
          if (mediaType) headers.set("Content-Type", mediaType);
        }

        const response = await fetch(url, init);
        const responseHeaders = [];
        response.headers.forEach((value, key) => responseHeaders.push(key + ": " + value));
        const text = await response.text();
        result.dataset.state = response.ok ? "success" : "error";
        result.textContent = [
          "Status: " + response.status + " " + response.statusText,
          "",
          responseHeaders.join("\\n"),
          "",
          text
        ].join("\\n");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.dataset.state = "error";
        result.textContent = "Network or CORS error: " + message;
      } finally {
        if (submit) submit.removeAttribute("disabled");
      }
    });
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
