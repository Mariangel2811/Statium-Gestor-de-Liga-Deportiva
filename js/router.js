/**
 * router.js — Router de hash minimalista (script clásico).
 * Registra rutas con parámetros (":id") y ejecuta el handler
 * correspondiente cada vez que cambia el hash, sin recargar la página.
 */
(function () {
  'use strict';

  const routes = [];

  function registerRoute(pattern, handler) {
    const paramNames = [];
    const regexStr = pattern
      .split('/')
      .map((segment) => {
        if (segment.startsWith(':')) {
          paramNames.push(segment.slice(1));
          return '([^/]+)';
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    const regex = new RegExp(`^${regexStr}$`);
    routes.push({ regex, paramNames, handler });
  }

  function currentHash() {
    return window.location.hash.replace(/^#/, '') || 'leagues';
  }

  async function handleRouteChange() {
    const path = currentHash();
    for (const route of routes) {
      const match = path.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => (params[name] = match[i + 1]));
        await route.handler(params);
        highlightActiveNav(path);
        document.body.dataset.view = path.split('/')[0];
        return;
      }
    }
    // Ruta desconocida: volver a Ligas (ventana inicial de la app).
    window.location.hash = '#leagues';
  }

  function highlightActiveNav(path) {
    const base = path.split('/')[0];
    document.querySelectorAll('.navbar__link').forEach((link) => {
      const linkPath = link.getAttribute('href').replace(/^#/, '').split('/')[0];
      link.classList.toggle('is-active', linkPath === base);
    });
  }

  function navigate(hash) {
    window.location.hash = hash;
  }

  function startRouter() {
    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange();
  }

  window.Statium = window.Statium || {};
  window.Statium.Router = { registerRoute, navigate, startRouter, handleRouteChange };
})();
