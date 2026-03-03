// Versión de la aplicación. Incrementar este número cuando haya un cambio en la estructura de datos.
const APP_VERSION = "1.1";

// Recarga para obtener código nuevo sin borrar datos (estructura compatible)
function reloadForCodeUpdate() {
    localStorage.setItem("appVersion", APP_VERSION);
    location.reload();
}

// Función para limpiar el localStorage cuando hay cambio de estructura de datos
function cleanLocalStorageAndReload() {
    if (confirm("Se ha detectado una nueva versión. Para continuar, los datos guardados localmente se borrarán y la página se recargará.")) {
        localStorage.removeItem("planillaAPPA");
        localStorage.setItem("appVersion", APP_VERSION);
        location.reload();
    } else {
        alert("La aplicación no puede funcionar con la versión de datos actual. Por favor, recarga la página para borrar los datos o utiliza una versión anterior del código.");
    }
}

let defaultAlumnos = [];
let defaultManiobras = [
    "Briefing Prevuelo", "Inspección Prevuelo", "Puesta en marcha y calentamiento", "Procedimiento radioeléctrico", "Rodaje",
    "Verificación previa al despegue", "Despegue normal/campo corto/campo blando", "Uso de los flaps", "Reconocimiento visual de la zona",
    "Ascenso mejor régimen VY", "Ascenso mejor ángulo VX", "Salida del circuito de tránsito", "Viraje en ascenso", "Vuelo recto y nivelado",
    "A- Virajes suaves", "B- Virajes Medios", "C- Virajes escarpados", "\u201CS\u201D a través de caminos", "Giros alrededor de un punto", "\u201C8\u201D alrededor de pilones",
    "Espirales descendentes de 720°", "Ejercicios de coordinación nivelados en ascensos y descensos", "Cambios de velocidades en línea de vuelo", "Vuelo lento",
    "Aproximación a la perdida recta con potencia", "Aproximación a la perdida recta sin potencia", "Aproximación a la perdida en viraje con potencia",
    "Aproximación a la perdida en viraje sin potencia", "Perdida recta con potencia", "Perdida recta sin potencia", "Perdida recta en viraje con potencia",
    "Perdida recta en viraje en viraje sin potencia", "Recuperación de posiciones anormales", "Radioayudas VOR entradas y salidas",
    "Descensos a regimes prefijados (Flaps) - A", "Descensos a regimes prefijados (Flaps) - B", "Descensos a regimes prefijados (Flaps) - C",
    "Emergencias simuladas en vuelo, en circuito, en despegue", "Reconocimiento e incorporación de tránsito en aeropuertos cercanos con aterrizajes",
    "Incorporación al circuito", "Aproximación estándar (Normal) y aterrizaje", "Aproximación 90", "Aproximación 180", "Aproximación 360",
    "Deslizamientos", "Aterrizajes con/sin potencia, con y sin viento cruzado", "Aterrizajes de emergencia (sobre la pista)",
    "Detención del motor", "Uso de la lista de chequeo", "Briefing post-vuelo"
];
let defaultAeronaves = [];

let data = {
    alumnos: [],
    maniobras: [],
    aeronaves: [],
    registros: {},
    ultimoAlumno: null
};

let alumnoSelect, leccionSelect, aeronaveSelect, maniobrasList;
let dcInput, vsInput, attInput, fechaInput, observacionesInput;
let copiarLeccionBtn, listaAlumnos, listaManiobras, listaAeronaves, sortableManiobras;

function fechaHoy() {
    return new Date().toISOString().split('T')[0];
}

function fechaToDDMMYYYY(fecha) {
    if (!fecha) return "";
    const m = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return fecha;
}

function fechaFromCSV(str) {
    if (!str) return "";
    const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2,'0')}-${ddmmyyyy[1].padStart(2,'0')}`;
    const yyyymmdd = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyymmdd) return str;
    return str;
}

function inicializarDatos() {
    if (!data.alumnos.length) data.alumnos = [...defaultAlumnos];
    if (!data.maniobras.length) data.maniobras = [...new Set(defaultManiobras)];
    if (!data.aeronaves.length) data.aeronaves = [...defaultAeronaves];
}

function getRegistroKey() {
    const alumno = alumnoSelect.value;
    const leccion = leccionSelect.value;
    const selectedAeronave = aeronaveSelect.options[aeronaveSelect.selectedIndex]?.value || "";
    const selectedMatricula = aeronaveSelect.options[aeronaveSelect.selectedIndex]?.getAttribute('data-matricula') || "";
    return `${alumno}|${leccion}|${selectedAeronave}|${selectedMatricula}`;
}

function cargarDatosIniciales() {
    const storedVersion = localStorage.getItem("appVersion");
    if (storedVersion !== APP_VERSION) {
        reloadForCodeUpdate();
        return;
    }

    const stored = localStorage.getItem("planillaAPPA");
    if (stored) {
        try {
            data = JSON.parse(stored);
        } catch (e) {
            console.warn("JSON corrupto, se procede a limpiar datos.", e);
            cleanLocalStorageAndReload();
            return;
        }
    } else {
        inicializarDatos();
    }

    if (!data.registros) data.registros = {};

    data.alumnos.forEach(a => {
        if (!data.registros[a]) {
            data.registros[a] = { ultimaLeccion: 1, ultimaFecha: fechaHoy(), ultimaAeronave: null, sesiones: {} };
        }
    });

    renderSelectores();
    onHeaderChange();
    renderListaAlumnos();
    renderListaManiobras();
    renderListaAeronaves();
    actualizarAlertaFaltantes();
}

function actualizarAlertaFaltantes() {
    const faltantes = [];
    if (!data.alumnos.length) faltantes.push('al menos un alumno');
    if (!data.aeronaves.length) faltantes.push('al menos una aeronave');
    if (!data.maniobras.length) faltantes.push('al menos una maniobra');
    const el = document.getElementById('alertaFaltantes');
    const texto = document.getElementById('alertaFaltantesTexto');
    if (!el || !texto) return;
    if (faltantes.length) {
        texto.textContent = 'Para habilitar la planilla, cargue ' + faltantes.join(', ') + '.';
        el.classList.remove('d-none');
    } else {
        el.classList.add('d-none');
    }
}

function renderSelectores() {
    alumnoSelect.innerHTML = '<option value="" selected>Seleccionar Alumno...</option>';
    data.alumnos.forEach(a => {
        const o = document.createElement("option");
        o.value = a;
        o.textContent = a;
        alumnoSelect.appendChild(o);
    });
    if (data.ultimoAlumno) {
        alumnoSelect.value = data.ultimoAlumno;
    }

    const selectedAlumno = alumnoSelect.value;
    const currentAlumnoData = data.registros[selectedAlumno];

    leccionSelect.innerHTML = '<option value="" selected>Seleccionar Lección...</option>';
    for (let i = 1; i <= 50; i++) {
        const o = document.createElement("option");
        o.value = i;
        o.textContent = i;
        leccionSelect.appendChild(o);
    }

    aeronaveSelect.innerHTML = '<option value="" selected>Seleccionar Aeronave...</option>';
    data.aeronaves.forEach(aero => {
        const o = document.createElement("option");
        o.value = aero.nombre;
        o.textContent = `${aero.nombre} (${aero.matricula})`;
        o.setAttribute('data-matricula', aero.matricula);
        aeronaveSelect.appendChild(o);
    });

    if (currentAlumnoData) {
        const lastAeronave = currentAlumnoData.ultimaAeronave;
        const aeronaveOpt = lastAeronave ? aeronaveSelect.querySelector(`option[data-matricula="${lastAeronave.matricula}"]`) : null;
        if (aeronaveOpt) {
            aeronaveOpt.selected = true;
            const hasExistingData = Object.keys(currentAlumnoData.sesiones || {}).length > 0;
            leccionSelect.value = hasExistingData ? (currentAlumnoData.ultimaLeccion || 1) : 1;
        } else {
            leccionSelect.value = "";
        }
    } else {
        leccionSelect.value = "";
    }

    actualizarAlertaFaltantes();
}

function renderManiobrasList() {
    maniobrasList.innerHTML = "";
    const registroKey = getRegistroKey();
    const sessionData = data.registros[alumnoSelect.value]?.sesiones[registroKey] || {};
    const maniobrasCompletadas = sessionData.maniobras || [];

    const isEnabled = alumnoSelect.value && leccionSelect.value && aeronaveSelect.value;

    data.maniobras.forEach((m, i) => {
        const item = document.createElement("div");
        item.classList.add('maniobras-item');

        item.addEventListener('mouseover', () => item.style.backgroundColor = '#f8f9fa');
        item.addEventListener('mouseout', () => item.style.backgroundColor = 'transparent');

        const formCheckDiv = document.createElement("div");
        formCheckDiv.classList.add('form-check');

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = `chk_${i}`;
        cb.classList.add('form-check-input');
        cb.checked = maniobrasCompletadas.includes(i);
        cb.disabled = !isEnabled;

        const label = document.createElement("label");
        label.htmlFor = `chk_${i}`;
        label.classList.add('form-check-label');
        label.textContent = m;

        formCheckDiv.appendChild(cb);
        formCheckDiv.appendChild(label);
        item.appendChild(formCheckDiv);

        cb.addEventListener("change", () => {
            const currentKey = getRegistroKey();
            const currentSession = data.registros[alumnoSelect.value].sesiones[currentKey] || { maniobras: [], dc: '', vs: '', att: '', fecha: '', observaciones: '' };
            data.registros[alumnoSelect.value].sesiones[currentKey] = currentSession;

            if (cb.checked) {
                if (!currentSession.maniobras.includes(i)) {
                    currentSession.maniobras.push(i);
                }
            } else {
                const index = currentSession.maniobras.indexOf(i);
                if (index > -1) {
                    currentSession.maniobras.splice(index, 1);
                }
            }

            guardarDatos();
            item.classList.add('saved');
            setTimeout(() => item.classList.remove('saved'), 500);
        });

        maniobrasList.appendChild(item);
    });
}

function showSavedFeedback(element) {
    element.classList.add('saved');
    setTimeout(() => {
        element.classList.remove('saved');
    }, 500);
}

function guardarDatos() {
    const alumno = alumnoSelect.value;
    const currentKey = getRegistroKey();

    if (!data.registros[alumno]) {
        data.registros[alumno] = { sesiones: {}, ultimaLeccion: 1, ultimaFecha: fechaHoy(), ultimaAeronave: null };
    }

    const currentSession = data.registros[alumno].sesiones[currentKey] || { maniobras: [], dc: '', vs: '', att: '', fecha: '', observaciones: '' };

    if (currentSession.dc !== dcInput.value) {
        currentSession.dc = dcInput.value;
        showSavedFeedback(dcInput);
    }
    if (currentSession.vs !== vsInput.value) {
        currentSession.vs = vsInput.value;
        showSavedFeedback(vsInput);
    }
    if (currentSession.att !== attInput.value) {
        currentSession.att = attInput.value;
        showSavedFeedback(attInput);
    }
    if (currentSession.fecha !== fechaInput.value) {
        currentSession.fecha = fechaInput.value;
        showSavedFeedback(fechaInput);
    }
    const obsVal = observacionesInput.value.trim();
    if (currentSession.observaciones !== obsVal) {
        currentSession.observaciones = obsVal;
    }

    data.registros[alumno].sesiones[currentKey] = currentSession;

    data.registros[alumno].ultimaLeccion = parseInt(leccionSelect.value);
    data.registros[alumno].ultimaFecha = fechaInput.value;

    const selectedAeronave = aeronaveSelect.options[aeronaveSelect.selectedIndex];
    if (selectedAeronave && selectedAeronave.value !== "") {
        data.registros[alumno].ultimaAeronave = {
            nombre: selectedAeronave.value,
            matricula: selectedAeronave.getAttribute('data-matricula')
        };
    } else {
        data.registros[alumno].ultimaAeronave = null;
    }

    localStorage.setItem("planillaAPPA", JSON.stringify(data));
    localStorage.setItem("appVersion", APP_VERSION);
}

function onHeaderChange(event) {
    const currentAlumno = alumnoSelect.value;
    const currentLeccion = leccionSelect.value;
    const currentAeronave = aeronaveSelect.value;

    data.ultimoAlumno = currentAlumno || null;

    if (!currentAlumno || !currentAeronave) {
        leccionSelect.value = "";
    }

    const isComplete = currentAlumno && currentLeccion && currentAeronave;

    fechaInput.disabled = !isComplete;
    dcInput.disabled = !isComplete;
    vsInput.disabled = !isComplete;
    attInput.disabled = !isComplete;
    observacionesInput.disabled = !isComplete;

    copiarLeccionBtn.classList.toggle('d-none', !isComplete || parseInt(currentLeccion) <= 1);

    const currentAlumnoData = data.registros[currentAlumno];

    if (event && event.target.id === 'alumnoSelect' && currentAlumnoData) {
        const lastAeronave = currentAlumnoData.ultimaAeronave;
        if (lastAeronave) {
            const lastAeroOption = aeronaveSelect.querySelector(`option[data-matricula="${lastAeronave.matricula}"]`);
            if (lastAeroOption) {
                aeronaveSelect.value = lastAeronave.nombre;
                const hasExistingData = Object.keys(currentAlumnoData.sesiones).length > 0;
                leccionSelect.value = hasExistingData ? (currentAlumnoData.ultimaLeccion || 1) : 1;
            } else {
                aeronaveSelect.value = "";
                leccionSelect.value = "";
            }
        } else {
            aeronaveSelect.value = "";
            leccionSelect.value = "";
        }
    }

    const currentKey = getRegistroKey();
    const sessionData = currentAlumnoData?.sesiones[currentKey];

    if (sessionData) {
        dcInput.value = sessionData.dc || '';
        vsInput.value = sessionData.vs || '';
        attInput.value = sessionData.att || '';
        fechaInput.value = sessionData.fecha || fechaHoy();
        observacionesInput.value = sessionData.observaciones || '';
    } else {
        dcInput.value = '';
        vsInput.value = '';
        attInput.value = '';
        fechaInput.value = fechaHoy();
        observacionesInput.value = '';
    }

    if (isComplete) {
        guardarDatos();
    }

    renderManiobrasList();
}

function copiarManiobrasLeccionAnterior() {
    const alumno = alumnoSelect.value;
    const leccionActual = parseInt(leccionSelect.value);
    const leccionAnterior = leccionActual - 1;

    const aeronaveSelectEl = document.getElementById("aeronaveSelect");
    const aeronaveActual = aeronaveSelectEl.options[aeronaveSelectEl.selectedIndex]?.value;
    const matriculaActual = aeronaveSelectEl.options[aeronaveSelectEl.selectedIndex]?.getAttribute('data-matricula');

    if (leccionActual <= 1 || !aeronaveActual || !matriculaActual) return;

    if (confirm(`Esto sobrescribirá cualquier selección existente`)) {
        const registroAnteriorKey = `${alumno}|${leccionAnterior}|${aeronaveActual}|${matriculaActual}`;
        const maniobrasAnteriores = data.registros[alumno]?.sesiones[registroAnteriorKey]?.maniobras || [];

        const registroActualKey = getRegistroKey();
        if (!data.registros[alumno].sesiones) data.registros[alumno].sesiones = {};

        const sessionAnterior = data.registros[alumno]?.sesiones[registroAnteriorKey] || {};
        data.registros[alumno].sesiones[registroActualKey] = {
            maniobras: [...maniobrasAnteriores],
            dc: sessionAnterior.dc || '',
            vs: sessionAnterior.vs || '',
            att: sessionAnterior.att || '',
            fecha: sessionAnterior.fecha || '',
            observaciones: sessionAnterior.observaciones || ''
        };

        guardarDatos();
        onHeaderChange();
    }
}

function descargarCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function exportarDetallado() {
    let csvContent = "Alumno,Leccion,Fecha,Aeronave,Matricula,DC,VS,ATT,Maniobra,Observaciones\n";
    data.alumnos.forEach(alumno => {
        const alumnoData = data.registros[alumno];
        if (alumnoData && alumnoData.sesiones) {
            for (const key in alumnoData.sesiones) {
                const partes = key.split('|');
                const leccion = partes[1];
                const aeronave = partes[2];
                const matricula = partes[3];
                const sessionData = alumnoData.sesiones[key];
                const fecha = fechaToDDMMYYYY(sessionData.fecha || "");
                const dc = sessionData.dc || "";
                const vs = sessionData.vs || "";
                const att = sessionData.att || "";
                const observaciones = (sessionData.observaciones || "").replace(/"/g, '""');
                const maniobrasCompletadas = sessionData.maniobras || [];
                maniobrasCompletadas.forEach(maniobraIndex => {
                    const maniobra = (data.maniobras[maniobraIndex] || "").replace(/"/g, '""');
                    csvContent += `"${alumno}",${leccion},"${fecha}","${aeronave}","${matricula}","${dc}","${vs}","${att}","${maniobra}","${observaciones}"\n`;
                });
            }
        }
    });
    descargarCSV(csvContent, "lecciones_detallado.csv");
}

function exportarCompacto() {
    let csvContent = "Alumno,Leccion,Fecha,Aeronave,Matricula,DC,VS,ATT,Observaciones,Cantidad de maniobras\n";
    data.alumnos.forEach(alumno => {
        const alumnoData = data.registros[alumno];
        if (alumnoData && alumnoData.sesiones) {
            for (const key in alumnoData.sesiones) {
                const sessionData = alumnoData.sesiones[key];
                const maniobrasCompletadas = sessionData.maniobras || [];
                const obsTrim = (sessionData.observaciones || "").trim();
                if (maniobrasCompletadas.length === 0 && obsTrim.length === 0) continue;
                const partes = key.split('|');
                const leccion = partes[1];
                const aeronave = partes[2];
                const matricula = partes[3];
                const fecha = fechaToDDMMYYYY(sessionData.fecha || "");
                const dc = sessionData.dc || "";
                const vs = sessionData.vs || "";
                const att = sessionData.att || "";
                const observaciones = obsTrim.replace(/"/g, '""');
                const cantidad = maniobrasCompletadas.length;
                csvContent += `"${alumno}",${leccion},"${fecha}","${aeronave}","${matricula}","${dc}","${vs}","${att}","${observaciones}",${cantidad}\n`;
            }
        }
    });
    descargarCSV(csvContent, "lecciones_compacto.csv");
}

function remapIndicesAfterReorder(oldIndex, newIndex, indices) {
    return indices.map(idx => {
        if (idx === oldIndex) return newIndex;
        if (oldIndex < newIndex) {
            if (idx > oldIndex && idx <= newIndex) return idx - 1;
        } else {
            if (idx >= newIndex && idx < oldIndex) return idx + 1;
        }
        return idx;
    });
}

function reordenarManiobras(oldIndex, newIndex) {
    if (oldIndex === newIndex) return;
    const [removed] = data.maniobras.splice(oldIndex, 1);
    data.maniobras.splice(newIndex, 0, removed);
    for (const alumno in data.registros) {
        for (const key in data.registros[alumno].sesiones) {
            const arr = data.registros[alumno].sesiones[key].maniobras || [];
            data.registros[alumno].sesiones[key].maniobras = remapIndicesAfterReorder(oldIndex, newIndex, arr);
        }
    }
    guardarDatos();
    renderListaManiobras();
    renderManiobrasList();
}

function renderListaAlumnos() {
    listaAlumnos.innerHTML = "";
    data.alumnos.forEach((a, i) => {
        const li = document.createElement("li");
        li.className = "list-group-item";
        const span = document.createElement("span");
        span.textContent = a;
        span.contentEditable = true;
        span.addEventListener("blur", () => {
            const old = data.alumnos[i];
            const newName = span.textContent.trim();
            if (newName && newName !== old) {
                data.alumnos[i] = newName;
                data.registros[newName] = data.registros[old];
                delete data.registros[old];
                if (data.ultimoAlumno === old) {
                    data.ultimoAlumno = newName;
                }
                renderSelectores();
                onHeaderChange();
                renderListaAlumnos();
                showSavedFeedback(span);
            }
        });
        const del = document.createElement("i");
        del.className = "bi bi-x-circle text-danger";
        del.style.cursor = "pointer";
        del.addEventListener("click", () => {
            if (confirm(`Se eliminará el alumno "${a}" y todos sus registros`)) {
                data.alumnos.splice(i, 1);
                        delete data.registros[a];
                        data.ultimoAlumno = null;
                        renderSelectores();
                onHeaderChange();
                renderListaAlumnos();
            }
        });
        li.appendChild(span);
        li.appendChild(del);
        listaAlumnos.appendChild(li);
    });
    actualizarAlertaFaltantes();
}

function renderListaManiobras() {
    listaManiobras.innerHTML = "";
    data.maniobras.forEach((m, i) => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-center";
        li.setAttribute("data-index", i);

        const handle = document.createElement("span");
        handle.className = "maniobras-drag-handle";
        handle.innerHTML = '<i class="bi bi-grip-vertical"></i>';
        handle.setAttribute("aria-label", "Arrastrar para reordenar");

        const span = document.createElement("span");
        span.style.flexGrow = "1";
        span.textContent = m;
        span.contentEditable = true;
        span.addEventListener("blur", () => {
            const newManeuver = span.textContent.trim();
            if (!newManeuver || newManeuver === data.maniobras[i]) return;
            const yaExiste = data.maniobras.some((m, idx) => idx !== i && m === newManeuver);
            if (yaExiste) {
                alert(`La maniobra "${newManeuver}" ya existe.`);
                span.textContent = data.maniobras[i];
                return;
            }
            data.maniobras[i] = newManeuver;
            renderManiobrasList();
            renderListaManiobras();
            guardarDatos();
            showSavedFeedback(span);
        });

        const del = document.createElement("i");
        del.className = "bi bi-x-circle text-danger";
        del.style.cursor = "pointer";
        del.addEventListener("click", () => {
            if (confirm(`Se eliminará la maniobra "${m}" y todos sus registros`)) {
                data.maniobras.splice(i, 1);
                for (const alumno in data.registros) {
                    for (const key in data.registros[alumno].sesiones) {
                        const arr = data.registros[alumno].sesiones[key].maniobras || [];
                        const newArr = arr
                            .filter(idx => idx !== i)
                            .map(idx => idx > i ? idx - 1 : idx);
                        data.registros[alumno].sesiones[key].maniobras = newArr;
                    }
                }
                renderManiobrasList();
                renderListaManiobras();
                guardarDatos();
            }
        });

        li.appendChild(handle);
        li.appendChild(span);
        li.appendChild(del);

        listaManiobras.appendChild(li);
    });

    if (sortableManiobras) sortableManiobras.destroy();
    sortableManiobras = new Sortable(listaManiobras, {
        handle: ".maniobras-drag-handle",
        animation: 200,
        ghostClass: "sortable-ghost",
        chosenClass: "sortable-chosen",
        delay: 100,
        delayOnTouchOnly: true,
        fallbackTolerance: 5,
        onEnd: function(evt) {
            const oldIndex = evt.oldIndex;
            const newIndex = evt.newIndex;
            if (oldIndex !== newIndex) {
                reordenarManiobras(oldIndex, newIndex);
            }
        }
    });
    actualizarAlertaFaltantes();
}

function renderListaAeronaves() {
    listaAeronaves.innerHTML = "";
    data.aeronaves.forEach((a, i) => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-center";

        const contentDiv = document.createElement("div");
        contentDiv.className = "aeronave-item-content";

        const spanNombre = document.createElement("span");
        spanNombre.textContent = a.nombre;
        spanNombre.contentEditable = true;
        spanNombre.style.fontWeight = "bold";
        spanNombre.addEventListener("blur", () => {
            const newNombre = spanNombre.textContent.trim();
            if (newNombre && newNombre !== data.aeronaves[i].nombre) {
                data.aeronaves[i].nombre = newNombre;
                guardarDatos();
                renderSelectores();
                onHeaderChange();
                showSavedFeedback(spanNombre);
            }
        });

        const spanMatricula = document.createElement("span");
        spanMatricula.textContent = `(${a.matricula})`;
        spanMatricula.contentEditable = true;
        spanMatricula.style.marginLeft = "10px";
        spanMatricula.addEventListener("blur", () => {
            const newMatricula = spanMatricula.textContent.trim().replace(/^\(|\)$/g, '');
            if (newMatricula && newMatricula !== data.aeronaves[i].matricula) {
                data.aeronaves[i].matricula = newMatricula;
                guardarDatos();
                renderSelectores();
                onHeaderChange();
                showSavedFeedback(spanMatricula);
            }
        });

        contentDiv.appendChild(spanNombre);
        contentDiv.appendChild(spanMatricula);

        const del = document.createElement("i");
        del.className = "bi bi-x-circle text-danger";
        del.style.cursor = "pointer";
        del.addEventListener("click", () => {
            if (confirm(`Se eliminará la aeronave "${a.nombre} (${a.matricula})" y todos sus registros`)) {
                data.aeronaves.splice(i, 1);
                renderSelectores();
                renderListaAeronaves();
                guardarDatos();
                onHeaderChange();
            }
        });
        li.appendChild(contentDiv);
        li.appendChild(del);
        listaAeronaves.appendChild(li);
    });
    actualizarAlertaFaltantes();
}

// Inicialización (main.js se carga dinámicamente, DOMContentLoaded puede haber pasado ya)
function init() {
    copiarLeccionBtn = document.getElementById("copiarLeccionBtn");
    dcInput = document.getElementById("dcInput");
    vsInput = document.getElementById("vsInput");
    attInput = document.getElementById("attInput");
    fechaInput = document.getElementById("fechaInput");
    observacionesInput = document.getElementById("observacionesInput");
    alumnoSelect = document.getElementById("alumnoSelect");
    leccionSelect = document.getElementById("leccionSelect");
    aeronaveSelect = document.getElementById("aeronaveSelect");
    maniobrasList = document.getElementById("maniobrasList");
    listaAlumnos = document.getElementById("listaAlumnos");
    listaManiobras = document.getElementById("listaManiobras");
    listaAeronaves = document.getElementById("listaAeronaves");

    alumnoSelect.addEventListener("change", onHeaderChange);
    leccionSelect.addEventListener("change", onHeaderChange);
    fechaInput.addEventListener("change", guardarDatos);
    aeronaveSelect.addEventListener("change", onHeaderChange);
    dcInput.addEventListener("input", guardarDatos);
    vsInput.addEventListener("input", guardarDatos);
    attInput.addEventListener("input", guardarDatos);
    observacionesInput.addEventListener("input", guardarDatos);

    copiarLeccionBtn.addEventListener('click', copiarManiobrasLeccionAnterior);

    document.querySelectorAll(".nav-link[data-seccion]").forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault();
            document.querySelectorAll(".seccion").forEach(s => s.style.display = "none");
            document.getElementById(link.dataset.seccion).style.display = "block";
            document.querySelectorAll(".nav-link[data-seccion]").forEach(l => l.classList.remove("active"));
            link.classList.add("active");
            if (window.innerWidth < 768) {
                const navbarCollapse = document.getElementById("navbarNav");
                const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
                if (bsCollapse && navbarCollapse.classList.contains("show")) {
                    bsCollapse.hide();
                }
            }
        });
    });

    document.getElementById("agregarAlumno").addEventListener("click", () => {
        const val = document.getElementById("nuevoAlumno").value.trim();
        if (val && !data.alumnos.includes(val)) {
            data.alumnos.push(val);
            data.registros[val] = {
                sesiones: {},
                ultimaLeccion: 1,
                ultimaFecha: fechaHoy(),
                ultimaAeronave: null
            };
            data.ultimoAlumno = null;
            renderSelectores();
            onHeaderChange();
            renderListaAlumnos();
            guardarDatos();
            document.getElementById("nuevoAlumno").value = "";
        }
    });

    document.getElementById("agregarManiobra").addEventListener("click", () => {
        const val = document.getElementById("nuevaManiobra").value.trim();
        if (val) {
            if (data.maniobras.includes(val)) {
                alert(`La maniobra "${val}" ya existe.`);
                return;
            }
            data.maniobras.push(val);
            renderManiobrasList();
            renderListaManiobras();
            guardarDatos();
            document.getElementById("nuevaManiobra").value = "";
        }
    });

    document.getElementById("agregarAeronave").addEventListener("click", () => {
        const nombre = document.getElementById("nuevaAeronaveNombre").value.trim();
        const matricula = document.getElementById("nuevaAeronaveMatricula").value.trim();
        if (nombre && matricula) {
            data.aeronaves.push({ nombre, matricula });
            renderSelectores();
            onHeaderChange();
            renderListaAeronaves();
            guardarDatos();
            document.getElementById("nuevaAeronaveNombre").value = "";
            document.getElementById("nuevaAeronaveMatricula").value = "";
        }
    });

    document.getElementById("exportarDetallado").addEventListener("click", (e) => {
        e.preventDefault();
        exportarDetallado();
    });
    document.getElementById("exportarCompacto").addEventListener("click", (e) => {
        e.preventDefault();
        exportarCompacto();
    });

    document.getElementById("cargarArchivoBtn").addEventListener("click", async () => {
        try {
            let [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: "CSV",
                    accept: { "text/csv": [".csv"] }
                }]
            });
            const file = await fileHandle.getFile();
            const text = await file.text();

            const lineas = text.trim().split("\n").map(l => l.replace(/\r$/, ''));
            const header = lineas[0] || '';
            const esCompacto = header.includes('Cantidad de maniobras') || header.includes('Maniobras');
            lineas.shift();

            const msgCompacto = "Formato compacto detectado. Se actualizarán cabecera y observaciones; las maniobras marcadas se conservarán.\n\n¿Continuar?";
            const msgDetallado = "Formato detallado detectado. Se reemplazarán todos los datos.\n\n¿Continuar?";
            if (!confirm(esCompacto ? msgCompacto : msgDetallado)) {
                return;
            }

            const registrosImportados = {};
            const alumnosImportados = new Set();
            const maniobrasImportadas = new Set();
            const aeronavesImportadas = new Set();

            function parsearLinea(linea) {
                return linea.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.trim().replace(/^"|"$/g, ''));
            }

            if (esCompacto) {
                lineas.forEach(linea => {
                    if (!linea.trim()) return;
                    const partes = parsearLinea(linea);
                    const [alumno, leccion, fecha, aeronave, matricula, dc, vs, att, observaciones] = partes;
                    if (!alumno) return;
                    alumnosImportados.add(alumno);
                    aeronavesImportadas.add(`${aeronave}|${matricula}`);
                    const key = `${alumno}|${leccion}|${aeronave}|${matricula}`;
                    registrosImportados[key] = { dc: dc || '', vs: vs || '', att: att || '', fecha: fechaFromCSV(fecha || ''), observaciones: (observaciones || '').trim() };
                });
            } else {
                lineas.forEach(linea => {
                    if (!linea.trim()) return;
                    const partes = parsearLinea(linea);
                    const [alumno, leccion, fecha, aeronave, matricula, dc, vs, att, maniobra, observaciones] = partes;
                    if (!alumno) return;
                    alumnosImportados.add(alumno);
                    maniobrasImportadas.add(maniobra);
                    aeronavesImportadas.add(`${aeronave}|${matricula}`);
                    const key = `${alumno}|${leccion}|${aeronave}|${matricula}`;
                    if (!registrosImportados[key]) {
                        registrosImportados[key] = { maniobras: [], dc, vs, att, fecha: fechaFromCSV(fecha || ''), observaciones: (observaciones || '').trim() };
                    }
                    registrosImportados[key].maniobras.push(maniobra);
                    if (observaciones !== undefined && observaciones !== '') {
                        registrosImportados[key].observaciones = (observaciones || '').trim();
                    }
                });
            }

            if (esCompacto) {
                aeronavesImportadas.forEach(item => {
                    const [nombre, matricula] = item.split('|');
                    if (!data.aeronaves.some(a => a.nombre === nombre && a.matricula === matricula)) {
                        data.aeronaves.push({ nombre, matricula });
                    }
                });
                alumnosImportados.forEach(a => {
                    if (!data.alumnos.includes(a)) {
                        data.alumnos.push(a);
                        data.registros[a] = { sesiones: {}, ultimaLeccion: 1, ultimaFecha: fechaHoy() };
                    }
                });
                for (const key in registrosImportados) {
                    const reg = registrosImportados[key];
                    const partes = key.split('|');
                    const alumno = partes[0];
                    const existing = data.registros[alumno]?.sesiones[key];
                    const maniobrasPreservadas = existing ? (existing.maniobras || []) : [];
                    data.registros[alumno].sesiones[key] = {
                        maniobras: maniobrasPreservadas,
                        dc: reg.dc,
                        vs: reg.vs,
                        att: reg.att,
                        fecha: reg.fecha,
                        observaciones: reg.observaciones || ''
                    };
                }
            } else {
                data.aeronaves = Array.from(aeronavesImportadas).map(item => {
                    const [nombre, matricula] = item.split('|');
                    return { nombre, matricula };
                });
                const nuevaListaManiobras = [...data.maniobras];
                maniobrasImportadas.forEach(m => {
                    if (!nuevaListaManiobras.includes(m)) {
                        nuevaListaManiobras.push(m);
                    }
                });
                data.maniobras = nuevaListaManiobras;
                data.alumnos = Array.from(alumnosImportados);
                data.registros = {};
                data.alumnos.forEach(a => {
                    data.registros[a] = {
                        sesiones: {},
                        ultimaLeccion: 1,
                        ultimaFecha: fechaHoy()
                    };
                });
                for (const key in registrosImportados) {
                    const reg = registrosImportados[key];
                    const partes = key.split('|');
                    const alumno = partes[0];
                    const maniobrasNombres = reg.maniobras;
                    const maniobrasIndices = maniobrasNombres.map(m => data.maniobras.indexOf(m)).filter(i => i !== -1);
                    data.registros[alumno].sesiones[key] = {
                        maniobras: maniobrasIndices,
                        dc: reg.dc,
                        vs: reg.vs,
                        att: reg.att,
                        fecha: reg.fecha,
                        observaciones: reg.observaciones || ''
                    };
                }
            }

            guardarDatos();
            renderSelectores();
            onHeaderChange();
            renderListaAlumnos();
            renderListaManiobras();
            renderListaAeronaves();

            alert("Importación CSV exitosa.");

        } catch (e) {
            if (e.name === 'AbortError') return;
            console.warn("Error importando CSV", e);
            alert("Ocurrió un error al importar el archivo CSV. Asegúrate de que el formato sea correcto.");
        }
    });

    cargarDatosIniciales();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
