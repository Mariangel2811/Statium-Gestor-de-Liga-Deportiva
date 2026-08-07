# Statium

## Descripción
Statium es un gestor web de ligas y torneos deportivos (fútbol, básquet y vóley) que permite crear ligas, registrar equipos y jugadores, programar partidos y llevar el control de resultados. A partir de los partidos jugados, calcula automáticamente tablas de posiciones o brackets de eliminación directa, rankings de goleadores/anotadores y estadísticas con gráficos. Todos los datos se guardan localmente en el navegador mediante IndexedDB, e incluye funciones para exportar e importar ligas completas en formato JSON.

## Integrantes y división del trabajo

* Integrante 1: Mariangel Campos
  * Registro de resultados, cómputo de estadísticas de equipos/jugadores y función de deshacer partido. 
  * Modelado y persistencia de datos en IndexedDB: ligas, equipos, jugadores, partidos y eventos
* Integrante 2: Adrian Monroy
  * Diseño de la interfaz y structura HTML
  * Componentes reutilizables de UI: tarjetas, tablas, navbar, footer y formulario de eventos
## Deportes implementados

* `futbol`
* `basquet`
* `voley`

## Modalidades de torneo

* Liga
   * Modo todos contra todos, con tabla de posiciones y opción de ida y vuelta.
* Eliminación directa
   * Modo bracket con avance automático de los equipos ganadores.

## Funcionalidades principales

* Gestión de ligas
   * Creación, edición y eliminación (en cascada) de ligas, con selección de liga activa.
* Equipos y jugadores
   * Registro de equipos con colores y ciudad, y de jugadores con posición y número.
* Partidos
   * Programación, registro de resultados, eventos de anotación por jugador y opción de deshacer un partido finalizado.
* Estadísticas
   * Tabla de posiciones o bracket, ranking de goleadores/anotadores y gráficos de rendimiento generados con Chart.js.
* Datos de ejemplo
   * Generación de ligas de prueba precargadas con equipos y jugadores para cada deporte.
* Exportar / Importar
   * Exportación de una liga completa a JSON y su posterior importación, remapeando identificadores para evitar colisiones.
## Capturas de pantalla de las vistas

<img width="1885" height="903" alt="{01D5CB37-F321-42C8-A23D-7650481F8C68}" src="https://github.com/user-attachments/assets/e902ad91-736d-4e0a-b465-ac8c04494a40" />
<img width="1901" height="906" alt="{E76871EC-3DD6-4910-BAEB-65075C131848}" src="https://github.com/user-attachments/assets/a0628607-8816-4952-899e-d1ff61eaa356" />
<img width="1878" height="899" alt="{A35137AE-8086-4BFA-8B7C-EC3F46009D26}" src="https://github.com/user-attachments/assets/bd84f7f1-7c1c-40a0-a190-08766ae7d095" />
<img width="1898" height="906" alt="{F355D4FA-3807-404B-A081-6585C164D9F1}" src="https://github.com/user-attachments/assets/8545fdea-5634-44df-a521-6bc5d5278de1" />
<img width="1878" height="898" alt="{95EAB12B-DD7B-4B48-BF22-C9ECA51A665A}" src="https://github.com/user-attachments/assets/2d9d6396-d6dd-4ba1-8aea-b3dbd0c50e6e" />
<img width="1876" height="909" alt="{8910EE1F-A620-435B-8E06-3F2B3E1F26D6}" src="https://github.com/user-attachments/assets/7683ae39-0523-459a-be2e-5681aa18a334" />
<img width="1884" height="904" alt="{02457284-1C90-4A4A-8607-35C80862FC5A}" src="https://github.com/user-attachments/assets/b310c46f-1bbb-41fc-9526-540a4ab1bae2" />
<img width="1867" height="894" alt="{C4D019B1-9E36-450F-92A1-ACC0B6A66F23}" src="https://github.com/user-attachments/assets/0c4fed3e-7ec3-4bb4-8651-2e1dc688911e" />










