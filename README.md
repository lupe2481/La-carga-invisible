# La carga invisible

Landing page interactiva sobre carga académica y malestar emocional en 102 estudiantes de la Universidad La Salle México, con EUROSTUDENT 8 como contexto europeo.

HTML + CSS + JavaScript vanilla y D3.js v7 (SVG). Sin frameworks ni paso de compilación.

## Cómo correrlo

La página carga los JSON con `fetch`, así que necesita un servidor local (abrir `index.html` con doble clic no funciona):

```bash
python3 -m http.server 8765
```

Luego abre <http://localhost:8765>. Sirve cualquier servidor estático (`npx serve`, Netlify, GitHub Pages…).

## Estructura

```
index.html          7 secciones, tablas ocultas para lectores de pantalla, patrones SVG compartidos
styles.css          sistema visual, mobile-first (768 tablet, 1024 escritorio)
main.js             gráficas D3, interacción, progreso, descarga CSV
data/survey.json    agregados de la encuesta (no incluye respuestas individuales)
data/eurostudent.json  EUROSTUDENT 8 · happiness_5 por campo de estudio
```

### survey.json

| Clave | Contenido |
|---|---|
| `meta` | n = 102, 6 facultades, fecha de levantamiento |
| `distress.categories` | malestar principal: estrés 40, ansiedad 33, síntomas depresivos 10, sin malestar 16, sin respuesta válida 3 |
| `faculties[]` | por facultad: `n`, `estres`, `ansiedad`, `depresivos`, `sin`, `nr` |
| `load` | carga percibida (n = 18): baja 3, moderada 9, alta 4, muy alta 2 |
| `distress2w` | malestar últimas 2 semanas (n = 18): 4, 6, 5, 2, 1 |
| `hours` | horas fuera de clase (n = 12): mediana 5, rango 0–20, y los 12 valores |
| `frequency.items[]` | frecuencia de 6 síntomas, escala nunca → siempre |
| `gender`, `age` | composición de la muestra |

Todos los porcentajes se calculan en `main.js` a partir de estos conteos y se muestran con un decimal (`83 / 102 = 81.4%`).

### eurostudent.json

`fields.<campo>` → `{ label, chip, faculty, relation, majors[], es8, countries[] }`, con `countries[]` = `{ country, happy, unhappy, n, counts[5] }`.

- `happy` = % niveles 1 + 2 ("Extremely happy" + 2)
- `unhappy` = % niveles 4 + 5 (4 + "Extremely unhappy")
- `counts` = conteos de los 5 niveles publicados por la base
- `faculty` = facultad de La Salle con la que se compara (tarjeta "La Salle · …")
- `relation` = `directo` (el campo incluye licenciaturas de la muestra, listadas en `majors`) o `afín` (campo relacionado sin estudiantes de la muestra; en la interfaz va con contorno punteado)

## De dónde sale cada número

### Encuesta La Salle
Archivo fuente: `Carga académica y malestar emocional en estudiantes de La Salle.xlsx` (Microsoft Forms, 102 filas, 14 oct 2026 en adelante). Todos los valores del brief se verificaron contra el Excel y **coinciden**:

| Cifra en la página | Columna del Excel | Cálculo |
|---|---|---|
| 83 / 102, 81.4% | "¿Cuál de las siguientes formas de malestar…?" | estrés + ansiedad + síntomas depresivos = 40 + 33 + 10 |
| Sin malestar 16 | "Durante tu carrera… ¿has experimentado algún tipo de malestar…?" = "No" | conteo |
| Sin respuesta válida 3 | misma pregunta vacía (2) o con valor inválido "i" (1) | conteo |
| Barras por facultad, 92.6% … 53.3% | "¿A qué facultad o escuela perteneces?" × tipo de malestar | (estrés + ansiedad + depresivos) / n facultad |
| 39.3 pts | idem | 92.59 − 53.33 (FAMADyC − Negocios) |
| Carga 16.7 / 50.0 / 22.2 / 11.1% | "¿Cómo consideras tu carga académica…?" (n = 18) | conteo / 18 |
| 18 puntos de frecuencia | "…con qué frecuencia has experimentado malestar emocional…" (n = 18) | conteo |
| 5 h | "…¿cuántas horas dedicas fuera de clase…?" (n = 12) | mediana |
| Líneas de la sección 6 | 6 preguntas "Durante las últimas dos semanas, ¿con qué frecuencia…?" | conteo / n de cada pregunta |
| 48.2 / 39.8 / 12.0%, 40/83 | malestar principal | conteo / 83 |
| Ficha técnica | edad y género | conteo |

Observaciones del Excel (no cambian ninguna cifra):
- Las preguntas de frecuencia siguen el tipo de malestar elegido, pero no siempre de forma limpia: los ítems de estrés (n = 40) los contestaron 39 personas de "Estrés" y 1 de "Ansiedad"; los de desánimo (n = 12), 10 de "Síntomas depresivos" y 2 de "Ansiedad".
- De las 18 respuestas de carga, 16 son de quien respondió "No" a malestar, 1 de "Ansiedad" y 1 con respuesta inválida.
- En la fila 2 la facultad es FAMADyC pero la licenciatura es Ingeniería Ambiental. Se respeta la facultad declarada.

### EUROSTUDENT 8
Fuente: [database.eurostudent.eu](https://database.eurostudent.eu/drm/?eust_nr=8&e=happiness_5&fg=e_field&country_list=AT%2CAZ%2CCH%2CCZ%2CDE%2CDK%2CEE%2CFI%2CFR%2CGE%2CHR%2CHU%2CIE%2CIS%2CLT%2CLV%2CMT%2CNL%2CNO%2CPL%2CPT%2CRO%2CSE%2CSK&Curr=NCU), indicador `happiness_5` (ítem M1.1), agrupado por `e_field`, consultado el 16 nov 2026.

- CH, DE y FR no publican datos ("n. a."). Algunos países tienen "t. f. c." (muestra insuficiente) en ciertos campos y se omiten, así que cada campo tiene entre 14 (Farmacia) y 21 países.
- Cada campo es un campo ES8 individual: se suman los % publicados, sin combinar campos. Ingeniería coincide exactamente con los valores del brief.

Emparejamiento (se avisa en la interfaz). Lo hice a partir de las licenciaturas que aparecen en el Excel:

| Facultad La Salle | Campo EUROSTUDENT 8 | Relación | Licenciaturas de la muestra |
|---|---|---|---|
| FAMADyC | Arts [3] | directo | Diseño Gráfico Digital, Diseño de Ambientes |
| FAMADyC | Architecture and town planning [13] | directo | Arquitectura |
| FAMADyC | Social sciences, journalism and information [6] | directo | Comunicación |
| Humanidades y C. Sociales | Psychology [7] | directo | Psicología |
| Humanidades y C. Sociales | Education Science [1] | directo | Pedagogía |
| Humanidades y C. Sociales | Teacher Training [2] | afín | — |
| Humanidades y C. Sociales | Humanities [4] | afín | — |
| Humanidades y C. Sociales | Languages [5] | afín | — |
| Ciencias Químicas | Natural sciences, mathematics and statistics [10] | directo | Química de Alimentos |
| Ciencias Químicas | Pharmacy [17] | directo | Químico Farmacéutico Biólogo |
| Ciencias Químicas | Health [16] | afín | — |
| Ciencias Químicas | Medicine, Dental Studies [15] | afín | — |
| Ingeniería | Engineering, manufacturing, construction [12] | directo | Industrial, Mecánica, Mecatrónica, Civil |
| Ingeniería | ICT [11] | directo | Ingeniería Cibernética (IA, Ciberseguridad, Ciencia de Datos) |
| Derecho | Law [9] | directo | Derecho |
| Negocios | Business and administration [8] | directo | Mercadotecnia, Contaduría, Administración, Comercio, Transformación Digital |

No se incluyeron los campos sin relación con ninguna facultad de la muestra: Generic programmes [0], Agriculture/veterinary [14], Welfare [18] y Services [19]. Actuaría (Negocios) entraría en matemáticas y estadística [10], pero se dejó en Negocios.

Para regenerar `eurostudent.json`: abre la URL de arriba y guarda la página como HTML (trae una tabla por campo de estudio con "Value %" y "Count" por nivel). Luego aplica las reglas anteriores. Si un campo no tuviera datos, `main.js` muestra "Datos pendientes para este campo" en lugar de estimar.

## Sistema visual (v2 · "trendbook")

- Fondo negro #0B0B0B en todas las secciones; los contenidos se agrupan en paneles: claro #E9E9E6, amarillo, verde, rosa o negro.
- Tipografías: **Unbounded** 500/700/800 para títulos, cifras y números de tarjeta (siempre en mayúsculas), **Space Grotesk** para texto y **JetBrains Mono** para etiquetas y ejes.
- Codificación de los tipos de malestar sin cambios: estrés amarillo sólido, ansiedad rosa con rayas, síntomas depresivos azul con puntos, sin malestar gris y sin respuesta con contorno punteado.

Componentes reutilizables (en `styles.css`, salvo el polígono de la insignia, que dibuja `main.js`):

| Componente | Uso |
|---|---|
| Panel con esquina recortada | `<div class="panel panel--light" data-cut="br">`. `data-cut` = `tl` · `tr` · `br` · `bl`; variantes `panel--light/yellow/green/pink/dark`; tamaño del corte en `--cut`. El fondo va en `::before` con `clip-path`, así el contenido (insignias, foco) puede sobresalir. |
| Insignia de estrella | `<div class="badge badge--lg badge--pink" data-points="14"><p class="badge__t"><b>83</b><small>de 102</small></p></div>`. Tamaños `badge--lg` (160–170 px en escritorio, 90 px en móvil), `badge--sm` (50 px) y `badge--xs`. |
| Etiqueta punteada inclinada | `<li class="tag" style="--r:-8deg">Estrés</li>`, variantes `tag--green` y `tag--white`. |
| Burbuja de diálogo | `<div class="bubble">…</div>` |
| Botón de contorno | `<a class="btn-line">Ver sección</a>` |
| Tarjeta numerada | `<article class="panel panel--yellow ncard" data-cut="br">` con `ncard__n`, `ncard__h`, `ncard__v`, `ncard__t` y un `btn-line`. |

Ajustes de contraste (AA) respecto a las capturas:
- Números grandes de tarjeta sobre panel claro: #7E7E79 en lugar de #A3A39E. #A3A39E da 2.1:1 y no llega al 3:1 que pide AA para texto grande.
- Texto secundario sobre panel claro: #5E5E5E (5.3:1 sobre #E9E9E6).
- Números 01–05 de la lista de la sección 02: #7A7A7A (4.5:1 sobre negro).
- Círculo "Felicidad general" de la tarjeta rosa: azul relleno con texto negro, porque el azul oscuro sobre rosa no alcanza AA.

## Notas de accesibilidad e interacción
- Además del color, las líneas se distinguen por tipo de trazo, marcador y etiqueta directa.
- Cada gráfica es `role="img"` con `aria-label` dinámico y una tabla de datos visualmente oculta.
- Tooltips, selección de facultades, chips y slider funcionan con mouse, toque y teclado (Tab, Enter/Espacio, flechas).
- `prefers-reduced-motion`: sin animaciones, todo visible desde el inicio.
- "Descargar datos abiertos" genera un CSV (UTF-8 con BOM) a partir de `survey.json`.

## Verificación hecha
- Los 16 campos se probaron uno por uno (dispersión, histograma, título y tarjeta La Salle).
- Sin desborde horizontal en 320, 360, 390, 414, 600, 768, 900, 1023, 1024, 1280, 1440 y 1920 px.
- Lighthouse 12.6 (servidor local), versión v2: accesibilidad 100 y rendimiento 100, en móvil y en escritorio.
- Datos e interacciones comprobados tras el cambio de estilo: base 102/83, selección de facultades, los 16 campos de EUROSTUDENT, mostrar y ocultar líneas, slider y descarga.
