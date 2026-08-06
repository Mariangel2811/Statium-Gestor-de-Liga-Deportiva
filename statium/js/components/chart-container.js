
(function () {
  'use strict';

class ChartContainer extends HTMLElement {
  set config(cfg) {
    this._cfg = cfg;
    this.render();
  }

  disconnectedCallback() {
    this._chart?.destroy();
  }

  render() {
    const cfg = this._cfg;
    if (!cfg) return;
    this._chart?.destroy();

    const isEmpty = cfg.empty || !cfg.data || (cfg.data.datasets || []).every((ds) => (ds.data || []).every((v) => !v));

    this.innerHTML = `
      <div class="chart-title">${cfg.title}</div>
      ${isEmpty ? `<div class="empty-state" style="padding:28px"><p>No hay datos suficientes</p></div>` : `<canvas></canvas>`}
    `;

    if (isEmpty) return;

    const canvas = this.querySelector('canvas');
    // eslint-disable-next-line no-undef
    this._chart = new Chart(canvas.getContext('2d'), {
      type: cfg.type,
      data: cfg.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#9aa4ad', font: { family: 'Inter', size: 11 } },
          },
        },
        scales: cfg.type === 'pie' || cfg.type === 'doughnut' ? {} : {
          x: { ticks: { color: '#9aa4ad' }, grid: { color: '#2c333a' } },
          y: { ticks: { color: '#9aa4ad' }, grid: { color: '#2c333a' } },
        },
        ...cfg.options,
      },
    });
  }
}
customElements.define('chart-container', ChartContainer);

})();
