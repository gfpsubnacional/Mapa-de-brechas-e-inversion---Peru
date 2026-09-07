/*
 * Mapa de brechas e inversión pública del Perú.
 * Las dependencias de lectura y la geometría cartográfica están integradas en este recurso.
 */

(() => {
  "use strict";

  const FILES = {
    nbi: "base_distrital_variables_raw_2017_2025.xlsx",
    investment: "cierre_inversiones_limpia_2017_2024.xlsx",
  };
  const MAP_ASSET_FILES = Object.freeze({
    context: "mapa_contexto.json",
    region: "mapa_geometria_region.json",
    province: "mapa_geometria_province.json",
    district: "mapa_geometria_district.json",
  });
  let MAP_CONTEXT = null;

  const YEARS_NBI = [2017, 2025];
  const YEARS_INVESTMENT = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
  const LEVELS = {
    region: { width: 2, singular: "departamento", plural: "departamentos" },
    province: { width: 4, singular: "provincia", plural: "provincias" },
    district: { width: 6, singular: "distrito", plural: "distritos" },
  };
  const INDICATORS = {
    electricity: {
      label: "Electricidad",
      deprivation: "Sin alumbrado eléctrico por red pública",
      percentageLabel: "% de viviendas sin alumbrado eléctrico por red pública",
      theme: "electricity",
      themeLabel: "Electricidad",
      universeLabel: "Viviendas censadas",
    },
    water_coverage: {
      label: "Agua · cobertura",
      deprivation: "Déficit de cobertura de agua",
      percentageLabel: "% de viviendas sin cobertura de agua",
      theme: "water_coverage",
      themeLabel: "Agua · ampliación y cobertura",
      universeLabel: "Viviendas censadas",
    },
    water_continuity: {
      label: "Agua · continuidad diaria",
      deprivation: "Sin agua todos los días",
      percentageLabel: "% de viviendas sin agua todos los días",
      theme: "water_continuity",
      themeLabel: "Agua · continuidad y operación",
      universeLabel: "Viviendas censadas",
    },
    education: {
      label: "Educación",
      deprivation: "No asiste a un centro educativo (3 a 24 años)",
      percentageLabel: "% de la población de 3 a 24 años que no asiste a un centro educativo",
      theme: "education",
      themeLabel: "Educación",
      universeLabel: "Población censada de 3 a 24 años",
    },
    internet: {
      label: "Internet",
      deprivation: "Sin conexión a internet",
      percentageLabel: "% de hogares sin conexión a internet",
      theme: "internet",
      themeLabel: "Conectividad a internet",
      universeLabel: "Hogares censados",
    },
  };
  const THEMES = ["electricity", "water_coverage", "water_continuity", "education", "internet"];
  const THEME_LABELS = {
    electricity: "Acceso a red eléctrica",
    water_coverage: "Agua · ampliación y cobertura",
    water_continuity: "Agua · continuidad y operación",
    education: "Servicios e infraestructura educativa",
    internet: "Conectividad a internet",
  };
  const INVESTMENT_MEASURES = {
    accrued_per_capita: {
      option: "Devengado per cápita",
      short: "Devengado por habitante",
      heading: "devengado por habitante",
      perCapita: true,
      soles: true,
    },
    accrued_total: {
      option: "Devengado asociado",
      short: "Devengado acumulado asociado",
      heading: "devengado acumulado asociado",
      perCapita: false,
      soles: true,
    },
    cost_per_capita: {
      option: "Costo actualizado per cápita",
      short: "Costo actualizado por habitante",
      heading: "costo actualizado por habitante",
      perCapita: true,
      soles: false,
    },
    cost_total: {
      option: "Costo actualizado asociado",
      short: "Costo actualizado asociado",
      heading: "costo actualizado asociado",
      perCapita: false,
      soles: false,
    },
  };
  const LEGACY_CODE_MAP = {
    "160109": "160801",
    "160114": "160803",
    "220110": "220910",
    "220112": "220912",
    "220113": "220913",
  };
  const CUI_CODE_OVERRIDES = {
    "2386916": "220106",
    "2200490": "150805",
  };
  const VIVID_RED = "#e00018";
  const VIVID_YELLOW = "#ffd500";
  const STAGNANT_ORANGE = "#f26a2e";
  const VIVID_GREEN = "#00a83b";
  const SOFT_RED = "#f6b2b8";
  const DARK_RED = "#8e0010";
  const COMPARISON_COLORS = {
    setback: { low: "#ff8a8a", medium: "#f23030", high: "#a80012" },
    stagnant: { low: "#fff27a", medium: "#ffd500", high: "#e09a00" },
    advance: { low: "#1687ff", medium: "#16bd4d", high: "#007f2e" },
  };
  const PROGRESS_LABELS = { advance: "Avance", stagnant: "Estancado", setback: "Retroceso", no_data: "Sin comparación" };
  const TIER_LABELS = { low: "Bajo", medium: "Medio", high: "Alto", no_data: "Sin dato" };
  const TIER_FILTER_VALUES = Object.freeze(["low", "medium", "high"]);
  const PROGRESS_FILTER_VALUES = Object.freeze(["advance", "stagnant", "setback"]);
  const MULTI_NBI_FILTER_VALUES = Object.freeze(["0", "1", "2", "3"]);
  const FILTER_STORAGE_KEY = "gfps-brechas-filtros-v1";
  const MULTI_NBI_INDICATORS = Object.freeze(["water_coverage", "electricity", "education"]);
  const MULTI_NBI_LABELS = Object.freeze({
    water_coverage: "Agua cobertura",
    electricity: "Electricidad",
    education: "Educación",
  });
  const NO_DATA_COLOR = "#d8ddd8";
  const FILTERED_OUT_COLOR = "#b8c0c4";
  // Cambia solo esta línea a true para recuperar "Avance NBI x Inversión".
  const SHOW_COMPARISON_VIEW = false;
  const PNG_EXPORT_WIDTH = 820;
  const PNG_EXPORT_HEIGHT = 988;
  const MAP_ZOOM_MIN = 1;
  const MAP_ZOOM_MAX = 512;
  const MAP_CENTER = { x: 280, y: 360 };
  const HOME_VIEW = { x: 0, y: 0, k: 1 };
  const LABEL_MIN_VISIBLE_AREA = { region: 1100, province: 950, district: 750 };
  const LABEL_FONT_PX = { region: 10.5, province: 9.5, district: 9 };
  const MAX_MAP_LABELS = { region: 25, province: 80, district: 110 };
  const MAP_LABEL_IDLE_DELAY = 120;
  const MAX_TABLE_RENDER_ROWS = 500;

  const state = {
    level: "region",
    indicator: "electricity",
    view: "nbi",
    measure: "change",
    selectedCode: "",
    model: null,
    currentGeometryLevel: "",
    paths: new Map(),
    labels: new Map(),
    labelMeta: new Map(),
    labelUpdateFrame: 0,
    labelUpdateTimer: 0,
    geometryEntries: {},
    geometryPromises: {},
    mapContextPromise: null,
    mapTransform: { ...HOME_VIEW },
    mapTransformFrame: 0,
    mapPointers: new Map(),
    mapGesture: null,
    mapInteracting: false,
    mapInteractionTimer: 0,
    suppressMapClickUntil: 0,
    visibleCodes: new Set(),
    filteredRecordsCache: new Map(),
    renderToken: 0,
    filters: {
      tier: [...TIER_FILTER_VALUES],
      progress: [...PROGRESS_FILTER_VALUES],
      multiNbi: [...MULTI_NBI_FILTER_VALUES],
    },
    tableOpen: false,
    pngOpen: false,
    pngBlob: null,
    pngObjectUrl: "",
    pngFilename: "",
    pngGenerationToken: 0,
    pngPreviewTimer: 0,
    tableLimit: 50,
    tableSort: "",
    tableDirection: "desc",
    tablePanelWidth: null,
    tableColumnWidths: {},
    tableHiddenColumns: [],
    tableRenderTimer: 0,
    territorySearchEntries: [],
    territoryLabelByCode: new Map(),
  };

  const el = {};
  const number0 = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });
  const number1 = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const amount0 = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });
  const amount2 = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateFormat = new Intl.DateTimeFormat("es-PE", { year: "numeric", month: "short", day: "2-digit" });

  function cacheElements() {
    [
      "app", "sourceStatus", "contextButton", "methodButton", "levelToggle", "indicatorSelect", "viewToggle",
      "measureControl", "measureLabel", "measureSelect", "territorySearch", "territoryOptions", "contextKicker",
      "contextTitle", "contextNote", "statUnitsLabel", "statUnits", "statComparable", "statProjects", "mapEyebrow",
      "mapHeading", "mapSubheading", "mapUnitCount", "peruMap", "mapViewport", "neighborLayer", "mapLayer", "mapLabelLayer", "mapOverlayLayer", "tooltip", "legend", "loadingOverlay",
      "loadingTitle", "loadingDetail", "errorPanel", "errorMessage", "detailDialog", "detailHierarchy",
      "detailTitle", "detailBody", "detailClose", "contextDialog", "contextBody", "contextClose", "methodDialog", "methodBody", "methodClose",
      "tierFilterGroup", "progressFilterGroup", "exportButton", "downloadPngButton", "tableButton", "workspace", "tablePanel",
      "pngPanel", "pngPanelTitle", "pngCloseButton", "pngResizeHandle", "pngPreviewStatus", "pngPreviewImage", "pngPreviewMeta", "pngCopyButton", "pngDownloadButton",
      "tableTitle", "tableCloseButton", "tableResizeHandle", "tableLimitInput", "tableSortSelect", "tableDirectionSelect", "tableColumnsMenu",
      "tableColumnsSummary", "tableColumnsOptions", "copyTableButton", "tableCount", "territoryTable", "territoryTableHead", "territoryTableBody",
      "tableNote", "zoomInButton", "zoomOutButton", "resetMapButton",
    ].forEach((id) => { el[id] = document.getElementById(id); });
  }

  function norm(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ");
  }

  function classificationNorm(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .trim();
  }

  function finiteNumber(value, fallback = null) {
    if (value === null || value === undefined || value === "") return fallback;
    const parsed = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function code6(value) {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(Math.trunc(value)).padStart(6, "0").slice(-6);
    }
    const digits = String(value).replace(/\D/g, "");
    return digits ? digits.padStart(6, "0").slice(-6) : "";
  }

  function projectCode(value) {
    if (value === null || value === undefined || value === "") return "";
    const numeric = finiteNumber(value);
    return numeric !== null ? String(Math.trunc(numeric)) : String(value).trim();
  }

  function yearFromValue(value) {
    if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.getFullYear();
    if (typeof value === "number" && Number.isFinite(value)) {
      if (value >= 1900 && value <= 2100) return Math.trunc(value);
      if (typeof XLSX !== "undefined" && XLSX.SSF && XLSX.SSF.parse_date_code) {
        const decoded = XLSX.SSF.parse_date_code(value);
        if (decoded && decoded.y) return decoded.y;
      }
    }
    const text = String(value ?? "").trim();
    const directYear = text.match(/\b(20\d{2})\b/);
    if (directYear) return Number(directYear[1]);
    const date = new Date(text);
    return Number.isNaN(date.valueOf()) ? null : date.getFullYear();
  }

  function cleanCell(value) {
    if (value === null || value === undefined || value === "") return null;
    if (value instanceof Date) return new Date(value.valueOf());
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "boolean") return value;
    return String(value);
  }

  function sleepFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function create(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function svgCreate(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
  }

  function setLoading(title, detail) {
    el.loadingTitle.textContent = title;
    el.loadingDetail.textContent = detail;
    el.loadingOverlay.hidden = false;
    el.errorPanel.hidden = true;
  }

  async function fetchWorkbook(filename, sourceLabel) {
    const response = await fetch(`./${encodeURIComponent(filename)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo cargar ${sourceLabel} (respuesta ${response.status}).`);
    return response.arrayBuffer();
  }

  function workbookRows(buffer, preferredSheet) {
    if (typeof XLSX === "undefined") throw new Error("No se encontró el lector de datos integrado.");
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true, dense: true });
    const sheetName = workbook.SheetNames.includes(preferredSheet) ? preferredSheet : workbook.SheetNames[0];
    if (!sheetName) throw new Error("La fuente de datos no contiene una tabla legible.");
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    });
  }

  function nbiDimension(topicValue, questionValue) {
    const topic = norm(topicValue);
    const question = norm(questionValue);
    if (topic === "AGUA" && question.includes("COBERTURA")) return "water_coverage";
    if (topic === "AGUA" && question.includes("TODOS LOS DIAS")) return "water_continuity";
    if (topic === "ELECTRICIDAD") return "electricity";
    if (topic === "INTERNET") return "internet";
    if (topic === "EDUCACION") return "education";
    return null;
  }

  function isDeprivationAnswer(dimension, answerValue) {
    const answer = norm(answerValue);
    return dimension === "water_coverage" ? answer.includes("DEFICIT") : answer === "NO";
  }

  function expectedNbiAnswers(dimension) {
    return dimension === "water_coverage" ? ["COBERTURA", "DEFICIT"] : ["SI", "NO"];
  }

  function emptyNbiDetail() {
    return { numerator: null, denominator: null, rate: null, universeLabel: null };
  }

  function emptyPopulation() {
    return { population3to24: null, population: null, dwellings: null, households: null };
  }

  function emptyInvestment() {
    const byYear = {};
    YEARS_INVESTMENT.forEach((year) => {
      byYear[year] = {
        cost: 0,
        accrued: 0,
        liquidation: 0,
        allocatedCost: 0,
        allocatedAccrued: 0,
        allocatedLiquidation: 0,
        beneficiaries: 0,
        allocatedBeneficiaries: 0,
        beneficiaryKnownCount: 0,
        count: 0,
      };
    });
    return {
      cost: 0,
      accrued: 0,
      liquidation: 0,
      allocatedCost: 0,
      allocatedAccrued: 0,
      allocatedLiquidation: 0,
      beneficiaries: 0,
      allocatedBeneficiaries: 0,
      beneficiaryKnownCount: 0,
      count: 0,
      byYear,
      costPerCapita: null,
      accruedPerCapita: null,
    };
  }

  function emptyRecord(territory) {
    const nbi = {};
    YEARS_NBI.forEach((year) => {
      nbi[year] = {};
      Object.keys(INDICATORS).forEach((key) => { nbi[year][key] = emptyNbiDetail(); });
    });
    const investment = {};
    THEMES.forEach((theme) => { investment[theme] = emptyInvestment(); });
    return {
      ...territory,
      population: { 2017: emptyPopulation(), 2025: emptyPopulation() },
      nbi,
      delta: Object.fromEntries(Object.keys(INDICATORS).map((key) => [key, null])),
      investment,
    };
  }

  function addAggregate(map, key, numerator, denominator, universeLabel) {
    let value = map.get(key);
    if (!value) {
      value = { numerator: 0, denominator: 0, universeLabels: new Set() };
      map.set(key, value);
    }
    value.numerator += numerator;
    value.denominator += denominator;
    if (universeLabel) value.universeLabels.add(universeLabel);
  }

  function buildNbiModel(rows) {
    if (!Array.isArray(rows) || rows.length < 2) throw new Error("La base distrital NBI está vacía.");
    const indexes = headerIndex(rows[0]);
    const required = ["UBIGEO", "REGION", "PROVINCIA", "DISTRITO", "ANIO", "TEMA", "PREGUNTA", "UNIDAD DETALLE", "RESPUESTA", "VALOR"];
    if (!required.every((field) => indexes.has(field))) {
      throw new Error("La estructura de la fuente de necesidades básicas no coincide con la esperada.");
    }
    const at = (row, field) => row[indexes.get(field)];
    const populationField = ["POBLACION CENSADA", "POBLACION CENSADA TOTAL", "POBLACION"]
      .find((field) => indexes.has(field));

    const catalog = { region: new Map(), province: new Map(), district: new Map() };
    const nbiAgg = { region: new Map(), province: new Map(), district: new Map() };
    const sourceNbi = new Map();
    const populationRows = new Map();

    for (let index = 1; index < rows.length; index += 1) {
      const row = rows[index];
      const districtCode = code6(at(row, "UBIGEO"));
      if (!districtCode) continue;
      const provinceCode = districtCode.slice(0, 4);
      const regionCode = districtCode.slice(0, 2);
      const regionName = String(at(row, "REGION") ?? "").trim();
      const provinceName = String(at(row, "PROVINCIA") ?? "").trim();
      const districtName = String(at(row, "DISTRITO") ?? "").trim();
      const year = yearFromValue(at(row, "ANIO"));
      if (!YEARS_NBI.includes(year)) continue;

      if (!catalog.region.has(regionCode)) {
        catalog.region.set(regionCode, {
          code: regionCode, name: regionName, regionName, provinceName: "", parentCode: "",
        });
      }
      if (!catalog.province.has(provinceCode)) {
        catalog.province.set(provinceCode, {
          code: provinceCode, name: provinceName, regionName, provinceName, parentCode: regionCode,
        });
      }
      if (!catalog.district.has(districtCode)) {
        catalog.district.set(districtCode, {
          code: districtCode, name: districtName, regionName, provinceName, parentCode: provinceCode,
        });
      }

      const populationKey = `${districtCode}|${year}`;
      let populationRow = populationRows.get(populationKey);
      if (!populationRow) {
        populationRow = { code: districtCode, year, population3to24: null, population: null, dwellings: null, households: null };
        populationRows.set(populationKey, populationRow);
      }
      const totalPopulation = populationField ? finiteNumber(at(row, populationField)) : null;
      if (populationRow.population === null && totalPopulation !== null) populationRow.population = totalPopulation;

      const dimension = nbiDimension(at(row, "TEMA"), at(row, "PREGUNTA"));
      if (!dimension) continue;
      const groupKey = `${districtCode}|${year}|${dimension}`;
      let group = sourceNbi.get(groupKey);
      if (!group) {
        group = {
          code: districtCode,
          year,
          dimension,
          numerator: 0,
          denominator: 0,
          answers: new Set(),
          universeLabels: new Set(),
          invalid: false,
        };
        sourceNbi.set(groupKey, group);
      }
      const answer = norm(at(row, "RESPUESTA"));
      const value = finiteNumber(at(row, "VALOR"));
      const universeLabel = String(at(row, "UNIDAD DETALLE") ?? "").trim();
      if (!answer || value === null || value < 0 || group.answers.has(answer)) {
        group.invalid = true;
        continue;
      }
      group.answers.add(answer);
      group.denominator += value;
      if (isDeprivationAnswer(dimension, answer)) group.numerator += value;
      if (universeLabel) group.universeLabels.add(universeLabel);
    }

    sourceNbi.forEach((group) => {
      const expectedAnswers = expectedNbiAnswers(group.dimension);
      const isComplete = !group.invalid
        && group.denominator > 0
        && expectedAnswers.length === group.answers.size
        && expectedAnswers.every((answer) => group.answers.has(answer));
      if (!isComplete) return;
      const universeLabel = group.universeLabels.size === 1 ? [...group.universeLabels][0] : INDICATORS[group.dimension].universeLabel;
      Object.entries(LEVELS).forEach(([level, config]) => {
        const levelCode = group.code.slice(0, config.width);
        addAggregate(nbiAgg[level], `${levelCode}|${group.year}|${group.dimension}`, group.numerator, group.denominator, universeLabel);
      });

      const populationKey = `${group.code}|${group.year}`;
      const populationRow = populationRows.get(populationKey);
      if (!populationRow) return;
      if (group.dimension === "education") populationRow.population3to24 = group.denominator;
      if (group.dimension === "internet") populationRow.households = group.denominator;
      if (group.dimension === "water_coverage") populationRow.dwellings = group.denominator;
      if (group.dimension === "electricity" && populationRow.dwellings === null) populationRow.dwellings = group.denominator;
    });

    const metrics = { region: new Map(), province: new Map(), district: new Map() };
    Object.keys(LEVELS).forEach((level) => {
      catalog[level].forEach((territory, code) => metrics[level].set(code, emptyRecord(territory)));
    });

    populationRows.forEach((populationRow) => {
      Object.entries(LEVELS).forEach(([level, config]) => {
        const levelCode = populationRow.code.slice(0, config.width);
        const record = metrics[level].get(levelCode);
        if (!record) return;
        const bucket = record.population[populationRow.year];
        ["population3to24", "population", "dwellings", "households"].forEach((field) => {
          const value = populationRow[field];
          if (value !== null) bucket[field] = (bucket[field] ?? 0) + value;
        });
      });
    });

    Object.keys(LEVELS).forEach((level) => {
      metrics[level].forEach((record, code) => {
        YEARS_NBI.forEach((year) => {
          Object.keys(INDICATORS).forEach((dimension) => {
            const aggregate = nbiAgg[level].get(`${code}|${year}|${dimension}`);
            if (!aggregate) return;
            record.nbi[year][dimension] = {
              numerator: aggregate.numerator,
              denominator: aggregate.denominator,
              rate: aggregate.denominator > 0 ? aggregate.numerator / aggregate.denominator : null,
              universeLabel: aggregate.universeLabels.size === 1
                ? [...aggregate.universeLabels][0]
                : INDICATORS[dimension].universeLabel,
            };
          });
        });
        Object.keys(INDICATORS).forEach((dimension) => {
          const first = record.nbi[2017][dimension].rate;
          const last = record.nbi[2025][dimension].rate;
          record.delta[dimension] = first !== null && last !== null ? (first - last) * 100 : null;
        });
      });
    });

    const nbiTerciles = { region: {}, province: {}, district: {} };
    Object.keys(LEVELS).forEach((level) => {
      YEARS_NBI.forEach((year) => {
        nbiTerciles[level][year] = {};
        Object.keys(INDICATORS).forEach((dimension) => {
          const values = [];
          metrics[level].forEach((record) => {
            const rate = record.nbi[year][dimension].rate;
            if (rate !== null && Number.isFinite(rate)) values.push(rate * 100);
          });
          nbiTerciles[level][year][dimension] = {
            q1: quantile(values, 1 / 3),
            q2: quantile(values, 2 / 3),
          };
        });
      });
    });

    const hasTotalPopulation2025 = [...populationRows.values()].some((row) => row.year === 2025 && row.population !== null);
    return { catalog, metrics, nbiTerciles, hasTotalPopulation2025 };
  }

  function headerIndex(headers) {
    const result = new Map();
    headers.forEach((value, index) => result.set(norm(value), index));
    return result;
  }

  function classifyInvestmentThemes(row, indexes) {
    const at = (field) => row[indexes.get(field)];
    const func = classificationNorm(at("FUNCION"));
    const program = classificationNorm(at("PROGRAMA"));
    const subprogram = classificationNorm(at("SUBPROGRAMA"));
    const title = classificationNorm(at("NOMBRE_INVERSION"));
    const themes = [];

    const postGraduate = /POST GRADO|EXTENSION UNIVERSITARIA/.test(subprogram);
    const modernEducation = func === "EDUCACION" && !postGraduate;
    const legacyEducationProgram = program === "INFRAESTRUCTURA EDUCATIVA"
      || program === "ASISTENCIA A EDUCANDOS"
      || (program.startsWith("EDUCACION ") && program !== "EDUCACION FISICA Y DEPORTES");
    if (modernEducation || (func === "EDUCACION Y CULTURA" && legacyEducationProgram && !postGraduate)) {
      themes.push("education");
    }

    const internetEvidence = /\b(?:INTERNET|BANDA ANCHA|FIBRA OPTICA|CONECTIVIDAD DIGITAL|RED DORSAL|WIFI|WI FI)\b/;
    if (func === "COMUNICACIONES" && program === "TELECOMUNICACIONES"
      && subprogram === "SERVICIOS DE TELECOMUNICACIONES" && internetEvidence.test(title)) {
      themes.push("internet");
    }

    const electricityPositive = /\b(?:ELECTRIFIC(?:ACION|ACIN)|ELCTRIFICACION|SERVICI(?:O|OS) DE (?:ENERGIA ELECTRICA|ENERGA ELECTRICA|ELECTRICIDAD)|ENERGIA ELECTRICA (?:RURAL|MEDIANTE|EN|PARA)|ENERGA ELECTRICA (?:RURAL|MEDIANTE|EN|PARA)|SUMINISTRO DE (?:ENERGIA|ENERGA) ELECTRICA|SISTEMA(?:S)? (?:DE )?ELECTRIC(?:O|A|OS|AS)|RED(?:ES)? (?:DE )?(?:DISTRIBUCION )?(?:ELECTRICA(?:S)?|PRIMARIA(?:S)?|SECUNDARIA(?:S)?)|RED(?:ES)? DE DISTRIBUCION EN (?:B T|M T)|SUB SISTEMA(?:S)? DE DISTRIBUCION|(?:MEDIA|BAJA) TENSION|CONEXION(?:ES)? DOMICILIARIA(?:S)? (?:DE )?ELECTRIC(?:A|AS))\b/;
    const electricityOffGrid = /\b(?:PANEL(?:ES)? SOLAR(?:ES)?|FOTOVOLTAIC[A-Z]*|MINI CENTRAL|MINICENTRAL|CENTRAL HIDROELECTR[A-Z]*|GENERACION DE ENERGIA|ADQUISICION|EQUIPO DE MEDICION|MEDIDORES? DE ENERGIA|RESPALDO DE ENERGIA)\b/;
    const streetLighting = /\b(?:ALUMBRADO PUBLICO|ILUMINACION)\b/;
    const householdAccess = /\b(?:ELECTRIFIC[A-Z]*|ELCTRIFICACION|RED(?:ES)? (?:PRIMARIA|SECUNDARIA)|CONEXION(?:ES)? DOMICILIARIA(?:S)?|ACOMETIDA(?:S)? DOMICILIARIA(?:S)?)\b/;
    const facilityOnly = /\b(?:BOMBEO|UNIVERSIDAD|INSTITUCION EDUCATIVA|PARQUE|PLAZA|LOSA DEPORTIVA|ESTADIO|MERCADO|MUNICIPALIDAD|COMPLEJO|HOSPITAL|CENTRO DE SALUD)\b/;
    const electricityMatches = func === "ENERGIA" && program === "ENERGIA ELECTRICA"
      && electricityPositive.test(title)
      && !electricityOffGrid.test(title)
      && !(streetLighting.test(title) && !householdAccess.test(title))
      && !facilityOnly.test(title);
    if (electricityMatches) themes.push("electricity");

    const eligibleWater = (func === "SANEAMIENTO" || func === "SALUD Y SANEAMIENTO")
      && program === "SANEAMIENTO" && subprogram !== "LIMPIEZA PUBLICA";
    const waterDirect = /\b(?:AGUA|ACUEDUCT[A-Z]*|CAPTACION|RESERVORIO[A-Z]*|POTABIL[A-Z]*|LINEA[A-Z]* DE (?:CONDUCCION|ADUCCION)|PLANTA DE TRATAMIENTO DE AGUA|POZO[A-Z]* DE AGUA|MEDIDOR[A-Z]* DE AGUA)\b/;
    const waterCoverage1 = /\b(?:CREACION|INSTALACION|INTALACION|AMPLIACION|CONSTRUCCION)\b(?:(?!\b(?:ALCANTARILLADO|DESAGUE|LETRINA[A-Z]*|AGUAS RESIDUALES|AGUAS SERVIDAS)\b).){0,120}\b(?:SERVICI[A-Z]* DE AGUA|SISTEMA[A-Z]* DE AGUA|RED[A-Z]* (?:DE )?(?:DISTRIBUCION DE )?AGUA|ABASTECIMIENTO DE AGUA|AGUA POTABLE|CONEXION[A-Z]* DOMICILIARI[A-Z]*)\b/;
    const waterCoverage2 = /\b(?:COBERTURA|ACCESO AL SERVICIO|CONEXION[A-Z]* DOMICILIARI[A-Z]*)\b(?:(?!\b(?:AGUAS RESIDUALES|AGUAS SERVIDAS)\b).){0,120}\bAGUA\b|\bAGUA\b(?:(?!\b(?:AGUAS RESIDUALES|AGUAS SERVIDAS)\b).){0,120}\b(?:COBERTURA|ACCESO AL SERVICIO|CONEXION[A-Z]* DOMICILIARI[A-Z]*)\b/;
    const waterReliability1 = /\b(?:CONTINUIDAD|MEJORAMIENTO|REHABILITACION|RENOVACION|OPTIMIZACION|RECUPERACION|REPARACION|REPOSICION|ACONDICIONAMIENTO)\b(?:(?!\b(?:ALCANTARILLADO|DESAGUE|LETRINA[A-Z]*|AGUAS RESIDUALES|AGUAS SERVIDAS)\b).){0,120}\b(?:SERVICI[A-Z]* DE AGUA|SISTEMA[A-Z]* DE AGUA|RED[A-Z]* (?:DE )?(?:DISTRIBUCION DE )?AGUA|ABASTECIMIENTO DE AGUA|AGUA POTABLE|CAPTACION|RESERVORIO[A-Z]*|POTABIL[A-Z]*)\b/;
    const waterReliability2 = /\b(?:CONTINUIDAD|CAPTACION|RESERVORIO[A-Z]*|POTABIL[A-Z]*|PLANTA DE TRATAMIENTO DE AGUA|BOMBEO DE AGUA|POZO[A-Z]* DE AGUA|LINEA[A-Z]* DE (?:CONDUCCION|ADUCCION)|PRESION|PERDIDA[A-Z]* DE AGUA|MEDIDOR[A-Z]* DE AGUA|ALMACENAMIENTO DE AGUA|TANQUE[A-Z]* DE (?:ALMACENAMIENTO DE )?AGUA)\b/;
    if (eligibleWater && waterDirect.test(title) && (waterCoverage1.test(title) || waterCoverage2.test(title))) {
      themes.push("water_coverage");
    }
    if (eligibleWater && waterDirect.test(title) && (waterReliability1.test(title) || waterReliability2.test(title))) {
      themes.push("water_continuity");
    }

    // The investment workbook is already a curated universe for these five needs.
    // Keep the precise title-based assignment above whenever the title provides it;
    // when it does not, use its functional classification instead of excluding it.
    if (!themes.length) {
      const isEducation = func === "EDUCACION" || func === "EDUCACION Y CULTURA";
      const isElectricity = func === "ENERGIA" && program === "ENERGIA ELECTRICA";
      const isInternet = func === "COMUNICACIONES" && program === "TELECOMUNICACIONES";
      const isWater = (func === "SANEAMIENTO" || func === "SALUD Y SANEAMIENTO")
        && program === "SANEAMIENTO";
      if (isEducation) themes.push("education");
      else if (isElectricity) themes.push("electricity");
      else if (isInternet) themes.push("internet");
      else if (isWater) themes.push("water_coverage", "water_continuity");
    }

    // The curated source assigns one project to one high-level need. Water is the
    // sole exception: its curated sanitation universe is intentionally shared by
    // the two water indicators, so they always contain the same projects.
    const waterTaxonomy = (func === "SANEAMIENTO" || func === "SALUD Y SANEAMIENTO")
      && program === "SANEAMIENTO";
    const educationTaxonomy = func === "EDUCACION" || func === "EDUCACION Y CULTURA";
    const electricityTaxonomy = func === "ENERGIA" && program === "ENERGIA ELECTRICA";
    const internetTaxonomy = func === "COMUNICACIONES" && program === "TELECOMUNICACIONES";
    const explicitInternetAssignment = /\b(?:INTERNET|BANDA ANCHA|FIBRA OPTICA|CONECTIVIDAD DIGITAL|RED DORSAL|WIFI|WI FI|ROUTER(?:S)?|ENRUTADOR(?:ES)?|RED DE INFORMACION Y COMUNICACION|PARQUE INFORMATICO|CETIC)\b/.test(title);
    if (waterTaxonomy) return ["water_coverage", "water_continuity"];
    if (explicitInternetAssignment || internetTaxonomy) return ["internet"];
    if (electricityTaxonomy) return ["electricity"];
    if (educationTaxonomy) return ["education"];

    return [...new Set(themes)];
  }

  function buildTerritoryIndexes(catalog) {
    const districtByName = new Map();
    const provinceByName = new Map();
    const regionByName = new Map();
    const districtsByProvince = new Map();
    const districtsByRegion = new Map();
    const provincesByRegion = new Map();

    catalog.region.forEach((item, code) => regionByName.set(norm(item.name), code));
    catalog.province.forEach((item, code) => {
      provinceByName.set(`${norm(item.regionName)}|${norm(item.name)}`, code);
      if (!provincesByRegion.has(code.slice(0, 2))) provincesByRegion.set(code.slice(0, 2), []);
      provincesByRegion.get(code.slice(0, 2)).push(code);
    });
    catalog.district.forEach((item, code) => {
      districtByName.set(`${norm(item.regionName)}|${norm(item.provinceName)}|${norm(item.name)}`, code);
      const provinceCode = code.slice(0, 4);
      const regionCode = code.slice(0, 2);
      if (!districtsByProvince.has(provinceCode)) districtsByProvince.set(provinceCode, []);
      if (!districtsByRegion.has(regionCode)) districtsByRegion.set(regionCode, []);
      districtsByProvince.get(provinceCode).push(code);
      districtsByRegion.get(regionCode).push(code);
    });
    [districtsByProvince, districtsByRegion, provincesByRegion].forEach((map) => {
      map.forEach((values) => values.sort());
    });
    return { districtByName, provinceByName, regionByName, districtsByProvince, districtsByRegion, provincesByRegion };
  }

  function makeTargets(row, indexes, catalog, territoryIndexes) {
    const at = (field) => row[indexes.get(field)];
    const empty = () => ({ region: [], province: [], district: [] });
    const departmentName = String(at("DEPARTAMENTO") ?? "");
    const provinceName = String(at("PROVINCIA") ?? "");
    const districtName = String(at("DISTRITO") ?? "");
    const title = norm(at("NOMBRE_INVERSION"));
    const cui = projectCode(at("CODIGO_UNICO"));
    let sourceCode = CUI_CODE_OVERRIDES[cui] || code6(at("UBIGEO"));
    sourceCode = LEGACY_CODE_MAP[sourceCode] || sourceCode;

    if (sourceCode === "990000" && title.includes("AMBITO NACIONAL")) {
      return {
        type: "national",
        targets: {
          region: [...catalog.region.keys()].sort(),
          province: [...catalog.province.keys()].sort(),
          district: [...catalog.district.keys()].sort(),
        },
        note: "Ámbito declarado en el título: nacional. El proyecto y su monto original aparecen en cada territorio cubierto; para la comparación per cápita el monto se distribuye proporcionalmente a la población 2025.",
      };
    }

    if (norm(departmentName).includes("MUL.DEP") || sourceCode === "990000") {
      return {
        type: "multi_department",
        targets: empty(),
        note: "Ámbito multidepartamental sin detalle de los departamentos comprendidos. No se asigna al mapa para evitar una atribución territorial falsa.",
      };
    }

    if (!sourceCode) {
      const districtMatch = title.match(/DISTRITO(?: DE)? ([A-Z0-9Ñ ]+?)(?:,| - |$)/);
      const provinceMatch = title.match(/PROVINCIA(?: DE)? ([A-Z0-9Ñ ]+?)(?: Y DISTRITO|,| - |$)/);
      const regionMatch = title.match(/(?:REGION|DEPARTAMENTO)(?: DE)? ([A-Z0-9Ñ ]+?)(?:,| - | PROVINCIA|$)/);
      const inferredRegion = regionMatch ? norm(regionMatch[1]) : "";
      const inferredProvince = provinceMatch ? norm(provinceMatch[1]) : "";
      const inferredDistrict = districtMatch ? norm(districtMatch[1]) : "";
      const regionCode = territoryIndexes.regionByName.get(inferredRegion) || "";
      const provinceCode = territoryIndexes.provinceByName.get(`${inferredRegion}|${inferredProvince}`) || "";
      const districtCode = territoryIndexes.districtByName.get(`${inferredRegion}|${inferredProvince}|${inferredDistrict}`) || "";
      if (districtCode) {
        const district = catalog.district.get(districtCode);
        return {
          type: "inferred_district",
          targets: { region: [districtCode.slice(0, 2)], province: [districtCode.slice(0, 4)], district: [districtCode] },
          note: `La fila no tiene UBIGEO; el ámbito se infiere de forma única del título: distrito de ${district.name}, provincia de ${district.provinceName}, departamento de ${district.regionName}.`,
        };
      }
      if (provinceCode && regionCode) {
        const districts = territoryIndexes.districtsByProvince.get(provinceCode) || [];
        const province = catalog.province.get(provinceCode);
        return {
          type: "inferred_province",
          targets: { region: [regionCode], province: [provinceCode], district: districts },
          note: `La fila no tiene UBIGEO; el título identifica la provincia de ${province.name} (${province.regionName}). El proyecto y el monto original se muestran en sus ${districts.length} distritos; el indicador per cápita usa una asignación proporcional a la población.`,
        };
      }
      return {
        type: "unlocated", targets: empty(),
        note: "La base no contiene ubicación territorial suficiente. No se asigna al mapa.",
      };
    }

    let regionCode = sourceCode.slice(0, 2);
    let provinceCode = sourceCode.slice(0, 4);
    let districtCode = sourceCode;
    if (!catalog.region.has(regionCode)) regionCode = territoryIndexes.regionByName.get(norm(departmentName)) || "";
    if (!catalog.province.has(provinceCode)) {
      provinceCode = territoryIndexes.provinceByName.get(`${norm(departmentName)}|${norm(provinceName)}`) || "";
    }
    if (!catalog.district.has(districtCode)) {
      districtCode = territoryIndexes.districtByName.get(`${norm(departmentName)}|${norm(provinceName)}|${norm(districtName)}`) || "";
    }

    const allProvinces = norm(provinceName).includes("TODOS") || sourceCode.slice(2) === "0000";
    const allDistricts = norm(districtName).includes("TODOS") || sourceCode.slice(4) === "00";
    if (allProvinces) {
      if (!regionCode || !catalog.region.has(regionCode)) {
        return { type: "unlocated", targets: empty(), note: "Ámbito departamental no reconocido en el catálogo NBI. No se asigna al mapa." };
      }
      const provinces = territoryIndexes.provincesByRegion.get(regionCode) || [];
      const districts = territoryIndexes.districtsByRegion.get(regionCode) || [];
      const region = catalog.region.get(regionCode);
      return {
        type: "department",
        targets: { region: [regionCode], province: provinces, district: districts },
        note: `Ámbito declarado: todo el departamento de ${region.name}. El proyecto y el monto original se duplican en ${provinces.length} provincias y ${districts.length} distritos; el indicador per cápita distribuye el monto proporcionalmente a la población 2025.`,
      };
    }
    if (allDistricts) {
      if (!provinceCode || !catalog.province.has(provinceCode)) {
        return { type: "unlocated", targets: empty(), note: "Ámbito provincial no reconocido en el catálogo NBI. No se asigna al mapa." };
      }
      const districts = territoryIndexes.districtsByProvince.get(provinceCode) || [];
      const province = catalog.province.get(provinceCode);
      return {
        type: "province",
        targets: { region: [provinceCode.slice(0, 2)], province: [provinceCode], district: districts },
        note: `Ámbito declarado: toda la provincia de ${province.name} (${province.regionName}). El proyecto y el monto original se duplican en sus ${districts.length} distritos; el indicador per cápita distribuye el monto proporcionalmente a la población 2025.`,
      };
    }
    if (!districtCode || !catalog.district.has(districtCode)) {
      return { type: "unlocated", targets: empty(), note: "Ámbito distrital no reconocido en el catálogo NBI. No se asigna al mapa." };
    }
    const district = catalog.district.get(districtCode);
    return {
      type: "district",
      targets: { region: [districtCode.slice(0, 2)], province: [districtCode.slice(0, 4)], district: [districtCode] },
      note: `Ámbito declarado: distrito de ${district.name}, provincia de ${district.provinceName}, departamento de ${district.regionName}.`,
    };
  }

  function addInvestment(target, project, share) {
    target.cost += project.cost;
    target.accrued += project.accrued;
    target.liquidation += project.liquidation;
    target.allocatedCost += project.cost * share;
    target.allocatedAccrued += project.accrued * share;
    target.allocatedLiquidation += project.liquidation * share;
    if (project.beneficiaries !== null && Number.isFinite(project.beneficiaries)) {
      target.beneficiaries += project.beneficiaries;
      target.allocatedBeneficiaries += project.beneficiaries * share;
      target.beneficiaryKnownCount += 1;
    }
    target.count += 1;
    if (YEARS_INVESTMENT.includes(project.year)) {
      const bucket = target.byYear[project.year];
      bucket.cost += project.cost;
      bucket.accrued += project.accrued;
      bucket.liquidation += project.liquidation;
      bucket.allocatedCost += project.cost * share;
      bucket.allocatedAccrued += project.accrued * share;
      bucket.allocatedLiquidation += project.liquidation * share;
      if (project.beneficiaries !== null && Number.isFinite(project.beneficiaries)) {
        bucket.beneficiaries += project.beneficiaries;
        bucket.allocatedBeneficiaries += project.beneficiaries * share;
        bucket.beneficiaryKnownCount += 1;
      }
      bucket.count += 1;
    }
  }

  function quantile(values, probability) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const position = (sorted.length - 1) * probability;
    const base = Math.floor(position);
    const fraction = position - base;
    return sorted[base + 1] === undefined
      ? sorted[base]
      : sorted[base] + fraction * (sorted[base + 1] - sorted[base]);
  }

  function buildInvestments(rows, model) {
    if (!Array.isArray(rows) || rows.length < 2) throw new Error("La base de inversiones está vacía.");
    const headers = rows[0].map((value) => String(value ?? "").trim());
    const indexes = headerIndex(headers);
    const beneficiaryIndex = headers.findIndex((header) => {
      const value = classificationNorm(header);
      return /^(?:N|NRO|NUMERO|CANTIDAD)? ?(?:DE )?BENEFICIARIOS?(?: HABITANTES)?$/.test(value);
    });
    const required = ["CODIGO_UNICO", "NOMBRE_INVERSION", "FEC_CIERRE", "COSTO_ACTUALIZADO", "DEVEN_ACUMULADO", "FUNCION", "UBIGEO"];
    if (!required.every((field) => indexes.has(field))) {
      throw new Error("La estructura de la fuente de inversiones no coincide con la esperada.");
    }
    const territoryIndexes = buildTerritoryIndexes(model.catalog);
    const associations = { region: new Map(), province: new Map(), district: new Map() };
    Object.keys(LEVELS).forEach((level) => {
      model.catalog[level].forEach((_item, code) => associations[level].set(code, []));
    });
    const projects = [];
    const themeCounts = Object.fromEntries(THEMES.map((theme) => [theme, 0]));
    const themeCost = Object.fromEntries(THEMES.map((theme) => [theme, 0]));
    let unclassified = 0;
    let inputProjects = 0;

    for (let sourceIndex = 1; sourceIndex < rows.length; sourceIndex += 1) {
      const row = rows[sourceIndex];
      const year = yearFromValue(row[indexes.get("FEC_CIERRE")]);
      if (!YEARS_INVESTMENT.includes(year)) continue;
      inputProjects += 1;
      const themes = classifyInvestmentThemes(row, indexes);
      if (!themes.length) {
        unclassified += 1;
        continue;
      }
      const scope = makeTargets(row, indexes, model.catalog, territoryIndexes);
      const code = projectCode(row[indexes.get("CODIGO_UNICO")]);
      const name = String(row[indexes.get("NOMBRE_INVERSION")] ?? "Inversión sin nombre").trim() || "Inversión sin nombre";
      const project = {
        id: projects.length,
        sourceRow: sourceIndex + 1,
        code,
        name,
        year,
        themes,
        cost: finiteNumber(row[indexes.get("COSTO_ACTUALIZADO")], 0),
        accrued: finiteNumber(row[indexes.get("DEVEN_ACUMULADO")], 0),
        liquidation: finiteNumber(row[indexes.get("TOTAL_LIQUIDACION")], 0),
        beneficiaries: beneficiaryIndex >= 0 ? finiteNumber(row[beneficiaryIndex]) : null,
        sector: String(row[indexes.get("SECTOR")] ?? "").trim(),
        function: String(row[indexes.get("FUNCION")] ?? "").trim(),
        entity: String(row[indexes.get("ENTIDAD")] ?? "").trim(),
        department: String(row[indexes.get("DEPARTAMENTO")] ?? "").trim(),
        province: String(row[indexes.get("PROVINCIA")] ?? "").trim(),
        district: String(row[indexes.get("DISTRITO")] ?? "").trim(),
        scopeType: scope.type,
        scopeNote: scope.note,
        targetCounts: Object.fromEntries(Object.entries(scope.targets).map(([level, codes]) => [level, codes.length])),
        targetPopulationTotals: Object.fromEntries(Object.keys(LEVELS).map((level) => [level, 0])),
        fields: headers.map((label, fieldIndex) => [label || `Campo ${fieldIndex + 1}`, cleanCell(row[fieldIndex])]),
      };
      project.searchText = norm([code, name, project.entity, project.department, project.province, project.district].join(" "));
      projects.push(project);
      themes.forEach((theme) => {
        themeCounts[theme] += 1;
        themeCost[theme] += project.cost;
      });

      Object.keys(LEVELS).forEach((level) => {
        const targetCodes = [...new Set(scope.targets[level])].filter((targetCode) => model.metrics[level].has(targetCode));
        if (!targetCodes.length) return;
        const populations = targetCodes.map((targetCode) => finiteNumber(model.metrics[level].get(targetCode).population[2025].population, 0));
        const populationTotal = populations.reduce((sum, value) => sum + value, 0);
        project.targetCounts[level] = targetCodes.length;
        project.targetPopulationTotals[level] = populationTotal;
        targetCodes.forEach((targetCode, targetIndex) => {
          const share = populationTotal > 0 ? populations[targetIndex] / populationTotal : 1 / targetCodes.length;
          const record = model.metrics[level].get(targetCode);
          themes.forEach((theme) => addInvestment(record.investment[theme], project, share));
          associations[level].get(targetCode).push(project.id);
        });
      });
    }

    const terciles = { region: {}, province: {}, district: {} };
    const investmentTerciles = { region: {}, province: {}, district: {} };
    const investmentRanges = { region: {}, province: {}, district: {} };
    Object.keys(LEVELS).forEach((level) => {
      THEMES.forEach((theme) => {
        const accruedPerCapitaValues = [];
        const costs = [];
        const accruedValues = [];
        const costPerCapitaValues = [];
        model.metrics[level].forEach((record) => {
          const investment = record.investment[theme];
          const population = finiteNumber(record.population[2025].population, 0);
          investment.costPerCapita = population > 0 ? investment.allocatedCost / population : null;
          investment.accruedPerCapita = population > 0 ? investment.allocatedAccrued / population : null;
          if (investment.accruedPerCapita !== null && investment.accruedPerCapita > 0) {
            accruedPerCapitaValues.push(investment.accruedPerCapita);
          }
          if (investment.cost > 0) costs.push(investment.cost);
          if (investment.accrued > 0) accruedValues.push(investment.accrued);
          if (investment.costPerCapita !== null && investment.costPerCapita > 0) {
            costPerCapitaValues.push(investment.costPerCapita);
          }
        });
        terciles[level][theme] = {
          q1: quantile(accruedPerCapitaValues, 1 / 3),
          q2: quantile(accruedPerCapitaValues, 2 / 3),
        };
        investmentTerciles[level][theme] = {
          accrued_per_capita: {
            q1: quantile(accruedPerCapitaValues, 1 / 3),
            q2: quantile(accruedPerCapitaValues, 2 / 3),
          },
          accrued_total: {
            q1: quantile(accruedValues, 1 / 3),
            q2: quantile(accruedValues, 2 / 3),
          },
          cost_per_capita: {
            q1: quantile(costPerCapitaValues, 1 / 3),
            q2: quantile(costPerCapitaValues, 2 / 3),
          },
          cost_total: {
            q1: quantile(costs, 1 / 3),
            q2: quantile(costs, 2 / 3),
          },
        };
        investmentRanges[level][theme] = {
          costMax: costs.length ? Math.max(...costs) : 0,
          accruedMax: accruedValues.length ? Math.max(...accruedValues) : 0,
          costPerCapitaMax: costPerCapitaValues.length ? Math.max(...costPerCapitaValues) : 0,
          accruedPerCapitaMax: accruedPerCapitaValues.length ? Math.max(...accruedPerCapitaValues) : 0,
        };
      });
    });
    return { projects, associations, terciles, investmentTerciles, investmentRanges, themeCounts, themeCost, unclassified, inputProjects };
  }

  function buildModel(nbiRows, investmentRows) {
    const model = buildNbiModel(nbiRows);
    Object.assign(model, buildInvestments(investmentRows, model));
    return model;
  }

  async function fetchJsonAsset(filename, description) {
    const response = await fetch(filename, { cache: "force-cache" });
    if (!response.ok) throw new Error(`No se pudo cargar ${description} (${response.status}).`);
    return response.json();
  }

  async function ensureMapContext() {
    if (MAP_CONTEXT) return MAP_CONTEXT;
    if (!state.mapContextPromise) {
      state.mapContextPromise = fetchJsonAsset(MAP_ASSET_FILES.context, "el contexto cartográfico")
        .then((context) => {
          MAP_CONTEXT = context;
          return context;
        })
        .catch((error) => {
          state.mapContextPromise = null;
          throw error;
        });
    }
    return state.mapContextPromise;
  }

  function normalizeEmbeddedPathEntries(level, embeddedPaths) {
    const width = LEVELS[level].width;
    return embeddedPaths
      .map((item) => ({
        code: String(item[0]).padStart(width, "0"),
        path: item[1],
        center: Number.isFinite(Number(item[2])) && Number.isFinite(Number(item[3]))
          ? { x: Number(item[2]), y: Number(item[3]) }
          : null,
        area: finiteNumber(item[4], 0),
        bounds: {
          width: finiteNumber(item[5], 0),
          height: finiteNumber(item[6], 0),
        },
      }))
      .filter((entry) => entry.code && entry.path);
  }

  async function ensureGeometryLevel(level) {
    if (state.geometryEntries[level]?.length) return state.geometryEntries[level];
    if (!state.geometryPromises[level]) {
      state.geometryPromises[level] = fetchJsonAsset(MAP_ASSET_FILES[level], `la geometría de ${LEVELS[level].plural}`)
        .then((embeddedPaths) => {
          const entries = normalizeEmbeddedPathEntries(level, embeddedPaths);
          state.geometryEntries[level] = entries;
          return entries;
        })
        .catch((error) => {
          delete state.geometryPromises[level];
          throw error;
        });
    }
    return state.geometryPromises[level];
  }

  async function ensureMapAssets(level) {
    await ensureGeometryLevel(level);
  }

  function normalizeGeoEntries(level) {
    if (state.geometryEntries[level]?.length) return state.geometryEntries[level];
    const width = LEVELS[level].width;
    const source = typeof PERU_GEO !== "undefined" ? PERU_GEO[level] : null;
    let entries = [];
    if (Array.isArray(source)) {
      entries = source.map((item) => {
        if (Array.isArray(item)) return { code: String(item[0]).padStart(width, "0"), geometry: item[1] };
        const properties = item.properties || {};
        return {
          code: String(item.code ?? item.ubigeo ?? properties.ubigeo ?? "").padStart(width, "0"),
          geometry: item.geometry,
        };
      });
    } else if (source && Array.isArray(source.features)) {
      entries = source.features.map((feature) => ({
        code: String(feature.properties?.ubigeo ?? feature.code ?? "").padStart(width, "0"),
        geometry: feature.geometry,
      }));
    } else if (source && typeof source === "object") {
      entries = Object.entries(source).map(([code, geometry]) => ({ code: String(code).padStart(width, "0"), geometry }));
    }
    state.geometryEntries[level] = entries.filter((entry) => entry.code && entry.geometry);
    return state.geometryEntries[level];
  }

  function walkCoordinates(value, visitor) {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      visitor(value[0], value[1]);
      return;
    }
    value.forEach((child) => walkCoordinates(child, visitor));
  }

  function geometryProjector(entries) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    entries.forEach((entry) => {
      walkCoordinates(entry.geometry.coordinates, (x, y) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });
    });
    if (![minX, maxX, minY, maxY].every(Number.isFinite)) return () => [0, 0];
    const availableWidth = 516;
    const availableHeight = 656;
    const scale = Math.min(availableWidth / Math.max(maxX - minX, 0.0001), availableHeight / Math.max(maxY - minY, 0.0001));
    const usedWidth = (maxX - minX) * scale;
    const usedHeight = (maxY - minY) * scale;
    const offsetX = 22 + (availableWidth - usedWidth) / 2;
    const offsetY = 38 + (availableHeight - usedHeight) / 2;
    return (longitude, latitude) => [
      offsetX + (longitude - minX) * scale,
      offsetY + (maxY - latitude) * scale,
    ];
  }

  function ringPath(ring, project) {
    if (!Array.isArray(ring) || !ring.length) return "";
    return ring.map((coordinate, index) => {
      const [x, y] = project(coordinate[0], coordinate[1]);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join("") + "Z";
  }

  function geometryPath(geometry, project) {
    if (!geometry || !geometry.coordinates) return "";
    if (geometry.type === "Polygon") return geometry.coordinates.map((ring) => ringPath(ring, project)).join("");
    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates.map((polygon) => polygon.map((ring) => ringPath(ring, project)).join("")).join("");
    }
    return "";
  }

  function rootSvgPoint(clientX, clientY) {
    const matrix = el.peruMap.getScreenCTM();
    if (!matrix) return { ...MAP_CENTER };
    const point = el.peruMap.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  function flushMapTransform() {
    state.mapTransformFrame = 0;
    if (!el.mapViewport) return;
    const { x, y, k } = state.mapTransform;
    el.mapViewport.setAttribute("transform", `translate(${x} ${y}) scale(${k})`);
  }

  function applyMapTransform() {
    if (state.mapTransformFrame) return;
    state.mapTransformFrame = requestAnimationFrame(flushMapTransform);
  }

  function beginMapInteraction() {
    state.mapInteracting = true;
    if (state.mapInteractionTimer) clearTimeout(state.mapInteractionTimer);
    state.mapInteractionTimer = 0;
    if (state.labelUpdateTimer) clearTimeout(state.labelUpdateTimer);
    state.labelUpdateTimer = 0;
    if (state.labelUpdateFrame) cancelAnimationFrame(state.labelUpdateFrame);
    state.labelUpdateFrame = 0;
    if (el.mapLabelLayer) el.mapLabelLayer.style.visibility = "hidden";
  }

  function finishMapInteractionSoon(delay = MAP_LABEL_IDLE_DELAY) {
    if (state.mapInteractionTimer) clearTimeout(state.mapInteractionTimer);
    state.mapInteractionTimer = setTimeout(() => {
      state.mapInteractionTimer = 0;
      state.mapInteracting = false;
      if (el.mapLabelLayer) el.mapLabelLayer.style.visibility = "visible";
      scheduleMapLabels(0);
    }, delay);
  }

  function setMapTransform(next) {
    state.mapTransform = {
      x: Number.isFinite(next.x) ? next.x : state.mapTransform.x,
      y: Number.isFinite(next.y) ? next.y : state.mapTransform.y,
      k: clamp(Number.isFinite(next.k) ? next.k : state.mapTransform.k, MAP_ZOOM_MIN, MAP_ZOOM_MAX),
    };
    applyMapTransform();
  }

  function resetMapTransform() {
    beginMapInteraction();
    state.mapTransform = { ...HOME_VIEW };
    if (el.mapViewport) applyMapTransform();
    finishMapInteractionSoon(80);
  }

  function zoomMap(factor, anchor = MAP_CENTER) {
    beginMapInteraction();
    const current = state.mapTransform;
    const nextK = clamp(current.k * factor, MAP_ZOOM_MIN, MAP_ZOOM_MAX);
    if (nextK <= MAP_ZOOM_MIN + 1e-8) {
      setMapTransform(HOME_VIEW);
      finishMapInteractionSoon();
      return;
    }
    const ratio = nextK / current.k;
    setMapTransform({
      k: nextK,
      x: anchor.x - (anchor.x - current.x) * ratio,
      y: anchor.y - (anchor.y - current.y) * ratio,
    });
    finishMapInteractionSoon();
  }

  function beginPanGesture() {
    const first = state.mapPointers.values().next().value;
    if (!first) return;
    state.mapGesture = {
      mode: "pan",
      startPoint: { ...first },
      startTransform: { ...state.mapTransform },
      moved: false,
    };
  }

  function beginPinchGesture() {
    const points = [...state.mapPointers.values()].slice(0, 2);
    if (points.length < 2) return;
    const [first, second] = points;
    state.mapGesture = {
      mode: "pinch",
      startMidpoint: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
      startDistance: Math.max(Math.hypot(second.x - first.x, second.y - first.y), 0.001),
      startTransform: { ...state.mapTransform },
      moved: false,
    };
  }

  function handleMapPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    hideTooltip();
    beginMapInteraction();
    state.mapPointers.set(event.pointerId, rootSvgPoint(event.clientX, event.clientY));
    try { event.target.setPointerCapture?.(event.pointerId); } catch (_error) { /* optional */ }
    el.peruMap.classList.add("is-panning");
    if (state.mapPointers.size >= 2) beginPinchGesture();
    else beginPanGesture();
  }

  function handleMapPointerMove(event) {
    if (!state.mapPointers.has(event.pointerId)) return;
    event.preventDefault();
    hideTooltip();
    state.mapPointers.set(event.pointerId, rootSvgPoint(event.clientX, event.clientY));
    if (state.mapPointers.size >= 2) {
      if (!state.mapGesture || state.mapGesture.mode !== "pinch") beginPinchGesture();
      const points = [...state.mapPointers.values()].slice(0, 2);
      const [first, second] = points;
      const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      const distance = Math.max(Math.hypot(second.x - first.x, second.y - first.y), 0.001);
      const gesture = state.mapGesture;
      const nextK = clamp(gesture.startTransform.k * (distance / gesture.startDistance), MAP_ZOOM_MIN, MAP_ZOOM_MAX);
      const contentX = (gesture.startMidpoint.x - gesture.startTransform.x) / gesture.startTransform.k;
      const contentY = (gesture.startMidpoint.y - gesture.startTransform.y) / gesture.startTransform.k;
      if (Math.abs(distance - gesture.startDistance) > 1
        || Math.hypot(midpoint.x - gesture.startMidpoint.x, midpoint.y - gesture.startMidpoint.y) > 2) {
        gesture.moved = true;
      }
      if (nextK <= MAP_ZOOM_MIN + 1e-8) setMapTransform(HOME_VIEW);
      else setMapTransform({ x: midpoint.x - contentX * nextK, y: midpoint.y - contentY * nextK, k: nextK });
      return;
    }

    if (!state.mapGesture || state.mapGesture.mode !== "pan") beginPanGesture();
    const currentPoint = state.mapPointers.values().next().value;
    const gesture = state.mapGesture;
    const dx = currentPoint.x - gesture.startPoint.x;
    const dy = currentPoint.y - gesture.startPoint.y;
    if (Math.hypot(dx, dy) > 2) gesture.moved = true;
    setMapTransform({
      x: gesture.startTransform.x + dx,
      y: gesture.startTransform.y + dy,
      k: gesture.startTransform.k,
    });
  }

  function finishMapPointer(event) {
    if (!state.mapPointers.has(event.pointerId)) return;
    if (state.mapGesture?.moved) state.suppressMapClickUntil = performance.now() + 350;
    state.mapPointers.delete(event.pointerId);
    if (state.mapPointers.size >= 2) beginPinchGesture();
    else if (state.mapPointers.size === 1) beginPanGesture();
    else {
      state.mapGesture = null;
      el.peruMap.classList.remove("is-panning");
      finishMapInteractionSoon(90);
    }
  }

  function bindMapNavigation() {
    el.peruMap.addEventListener("wheel", (event) => {
      event.preventDefault();
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      zoomMap(Math.exp(-delta * 0.0015), rootSvgPoint(event.clientX, event.clientY));
    }, { passive: false });
    el.peruMap.addEventListener("dblclick", (event) => {
      event.preventDefault();
      zoomMap(1.75, rootSvgPoint(event.clientX, event.clientY));
    });
    el.peruMap.addEventListener("pointerdown", handleMapPointerDown);
    el.peruMap.addEventListener("pointermove", handleMapPointerMove);
    el.peruMap.addEventListener("pointerup", finishMapPointer);
    el.peruMap.addEventListener("pointercancel", finishMapPointer);
    el.mapLayer.addEventListener("pointerover", (event) => {
      const shape = mapShapeFromEvent(event);
      if (!shape || event.relatedTarget === shape) return;
      showTooltip(event, shape);
    });
    el.mapLayer.addEventListener("pointermove", (event) => {
      if (mapShapeFromEvent(event)) positionTooltip(event);
    });
    el.mapLayer.addEventListener("pointerout", (event) => {
      const shape = mapShapeFromEvent(event);
      if (!shape) return;
      const relatedShape = event.relatedTarget?.closest?.(".map-shape");
      if (relatedShape === shape) return;
      hideTooltip();
    });
    el.mapLayer.addEventListener("focusin", (event) => {
      const shape = mapShapeFromEvent(event);
      if (shape) showTooltip(event, shape);
    });
    el.mapLayer.addEventListener("focusout", (event) => {
      if (mapShapeFromEvent(event)) hideTooltip();
    });
    el.mapLayer.addEventListener("click", (event) => {
      const shape = mapShapeFromEvent(event);
      if (!shape) return;
      if (event.detail !== 0 && performance.now() < state.suppressMapClickUntil) return;
      if (event.detail !== 0) shape.blur();
      openDetail(shape.dataset.code);
    });
    el.mapLayer.addEventListener("keydown", (event) => {
      const shape = mapShapeFromEvent(event);
      if (!shape || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      openDetail(shape.dataset.code);
    });
    el.peruMap.addEventListener("keydown", (event) => {
      const panStep = 28;
      if (["+", "="].includes(event.key)) { event.preventDefault(); zoomMap(1.5); }
      else if (event.key === "-") { event.preventDefault(); zoomMap(1 / 1.5); }
      else if (event.key === "0") { event.preventDefault(); resetMapTransform(); }
      else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        beginMapInteraction();
        const next = { ...state.mapTransform };
        if (event.key === "ArrowLeft") next.x += panStep;
        if (event.key === "ArrowRight") next.x -= panStep;
        if (event.key === "ArrowUp") next.y += panStep;
        if (event.key === "ArrowDown") next.y -= panStep;
        setMapTransform(next);
        finishMapInteractionSoon(80);
      }
    });
    el.zoomInButton.addEventListener("click", () => zoomMap(1.5));
    el.zoomOutButton.addEventListener("click", () => zoomMap(1 / 1.5));
    el.resetMapButton.addEventListener("click", resetMapTransform);
    window.addEventListener("resize", scheduleMapLabels, { passive: true });
  }

  function buildMapContext() {
    el.neighborLayer.replaceChildren();
    el.mapOverlayLayer.replaceChildren();
  }

  function buildMapGeometry() {
    if (state.currentGeometryLevel === state.level && state.paths.size) return;
    const entries = normalizeGeoEntries(state.level);
    if (!entries.length) throw new Error(`No se encontró la geometría embebida para ${LEVELS[state.level].plural}.`);
    const project = entries.some((entry) => entry.geometry) ? geometryProjector(entries) : null;
    buildMapContext();
    el.mapLayer.replaceChildren();
    el.mapLabelLayer.replaceChildren();
    state.paths = new Map();
    state.labels = new Map();
    state.labelMeta = new Map();
    const fragment = document.createDocumentFragment();
    const labelFragment = document.createDocumentFragment();
    entries.forEach((entry) => {
      const pathData = entry.path || geometryPath(entry.geometry, project);
      if (!pathData) return;
      const path = svgCreate("path");
      path.setAttribute("d", pathData);
      path.setAttribute("class", "map-shape");
      path.setAttribute("fill-rule", "evenodd");
      path.setAttribute("tabindex", "0");
      path.setAttribute("role", "button");
      path.dataset.code = entry.code;
      fragment.appendChild(path);
      state.paths.set(entry.code, path);

      const record = state.model.metrics[state.level].get(entry.code);
      if (record && entry.center) {
        const label = svgCreate("text");
        label.setAttribute("class", "map-label");
        label.setAttribute("x", entry.center.x);
        label.setAttribute("y", entry.center.y);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "central");
        label.setAttribute("aria-hidden", "true");
        label.dataset.code = entry.code;
        label.textContent = record.name;
        label.style.display = "none";
        labelFragment.appendChild(label);
        state.labels.set(entry.code, label);
        state.labelMeta.set(entry.code, {
          center: entry.center,
          area: Math.max(finiteNumber(entry.area, 0), 0),
          bounds: entry.bounds,
        });
      }
    });
    el.mapLayer.appendChild(fragment);
    el.mapLabelLayer.appendChild(labelFragment);
    applyMapTransform();
    state.currentGeometryLevel = state.level;
    scheduleMapLabels(40);
  }

  function scheduleMapLabels(delay = MAP_LABEL_IDLE_DELAY) {
    if (!el.mapLabelLayer || !state.model || state.mapInteracting) return;
    if (state.labelUpdateTimer) clearTimeout(state.labelUpdateTimer);
    if (state.labelUpdateFrame) cancelAnimationFrame(state.labelUpdateFrame);
    state.labelUpdateTimer = setTimeout(() => {
      state.labelUpdateTimer = 0;
      state.labelUpdateFrame = requestAnimationFrame(() => {
        state.labelUpdateFrame = 0;
        renderMapLabels();
      });
    }, Math.max(0, delay));
  }

  function rectanglesOverlap(first, second) {
    return first.left < second.right
      && first.right > second.left
      && first.top < second.bottom
      && first.bottom > second.top;
  }

  function renderMapLabels() {
    if (!state.labels.size || !el.mapViewport) {
      state.labels.forEach((label) => { label.style.display = "none"; });
      return;
    }

    const isCenteredView = Math.abs(state.mapTransform.k - HOME_VIEW.k) < 0.001
      && Math.abs(state.mapTransform.x - HOME_VIEW.x) < 0.001
      && Math.abs(state.mapTransform.y - HOME_VIEW.y) < 0.001;
    if (isCenteredView && state.level !== "region") {
      state.labels.forEach((label) => { label.style.display = "none"; });
      return;
    }

    const rootMatrix = el.peruMap.getScreenCTM();
    const mapMatrix = el.mapViewport.getScreenCTM();
    if (!rootMatrix || !mapMatrix) return;
    const rootRect = el.peruMap.getBoundingClientRect();
    const rootAreaScale = Math.max(Math.abs(rootMatrix.a * rootMatrix.d - rootMatrix.b * rootMatrix.c), 1e-8);
    const rootLinearScale = Math.sqrt(rootAreaScale);
    const zoom = state.mapTransform.k;
    const fontPixels = LABEL_FONT_PX[state.level];
    const localFontSize = fontPixels / Math.max(rootLinearScale * zoom, 1e-6);
    const metrics = state.model.metrics[state.level];
    const candidates = [];

    state.labels.forEach((label, code) => {
      label.style.display = "none";
      const record = metrics.get(code);
      const meta = state.labelMeta.get(code);
      if (!record || !meta || !state.visibleCodes.has(code)) return;

      const projectedArea = meta.area * rootAreaScale * zoom * zoom;
      if (projectedArea < LABEL_MIN_VISIBLE_AREA[state.level]) return;

      const point = el.peruMap.createSVGPoint();
      point.x = meta.center.x;
      point.y = meta.center.y;
      const screenPoint = point.matrixTransform(mapMatrix);
      if (screenPoint.x < rootRect.left || screenPoint.x > rootRect.right
        || screenPoint.y < rootRect.top || screenPoint.y > rootRect.bottom) return;

      const screenWidth = Math.max(finiteNumber(meta.bounds?.width, 0) * rootLinearScale * zoom, 1);
      const screenHeight = Math.max(finiteNumber(meta.bounds?.height, 0) * rootLinearScale * zoom, 1);
      const estimatedLeft = screenPoint.x - screenWidth / 2;
      const estimatedRight = screenPoint.x + screenWidth / 2;
      const estimatedTop = screenPoint.y - screenHeight / 2;
      const estimatedBottom = screenPoint.y + screenHeight / 2;
      const visibleWidth = Math.max(0, Math.min(estimatedRight, rootRect.right) - Math.max(estimatedLeft, rootRect.left));
      const visibleHeight = Math.max(0, Math.min(estimatedBottom, rootRect.bottom) - Math.max(estimatedTop, rootRect.top));
      const visibleFraction = Math.min(1, (visibleWidth * visibleHeight) / Math.max(screenWidth * screenHeight, 1));
      const visibleArea = projectedArea * visibleFraction;
      if (visibleArea < LABEL_MIN_VISIBLE_AREA[state.level]) return;

      const textWidth = Math.min(178, Math.max(30, record.name.length * fontPixels * 0.54));
      if (visibleWidth < Math.min(textWidth + 6, 68) || visibleHeight < fontPixels + 7) return;
      candidates.push({ label, screenPoint, textWidth, visibleArea, name: record.name });
    });

    candidates.sort((first, second) => second.visibleArea - first.visibleArea || first.name.localeCompare(second.name, "es"));
    const occupied = [];
    candidates.slice(0, MAX_MAP_LABELS[state.level]).forEach((candidate) => {
      const padding = 3;
      const labelRect = {
        left: candidate.screenPoint.x - candidate.textWidth / 2 - padding,
        right: candidate.screenPoint.x + candidate.textWidth / 2 + padding,
        top: candidate.screenPoint.y - fontPixels / 2 - padding,
        bottom: candidate.screenPoint.y + fontPixels / 2 + padding,
      };
      if (occupied.some((other) => rectanglesOverlap(labelRect, other))) return;
      candidate.label.setAttribute("font-size", localFontSize);
      candidate.label.removeAttribute("stroke-width");
      candidate.label.style.display = "block";
      occupied.push(labelRect);
    });
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    return [0, 2, 4].map((index) => Number.parseInt(clean.slice(index, index + 2), 16));
  }

  function rgbToHex(rgb) {
    return `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
  }

  function mixColor(first, second, amount) {
    const a = hexToRgb(first);
    const b = hexToRgb(second);
    return rgbToHex(a.map((value, index) => value + (b[index] - value) * amount));
  }

  function threePointColor(value, low, center, high, lowColor, centerColor, highColor) {
    if (value <= center) {
      const amount = clamp((value - low) / Math.max(center - low, 0.0001), 0, 1);
      return mixColor(lowColor, centerColor, amount);
    }
    const amount = clamp((value - center) / Math.max(high - center, 0.0001), 0, 1);
    return mixColor(centerColor, highColor, amount);
  }

  function progressClass(delta) {
    if (delta === null || !Number.isFinite(delta)) return "no_data";
    if (delta < -5) return "setback";
    if (delta > 5) return "advance";
    return "stagnant";
  }

  function investmentTier(perCapita, level, theme) {
    if (perCapita === null || !Number.isFinite(perCapita)) return "no_data";
    if (perCapita <= 0) return "low";
    const thresholds = state.model.terciles[level][theme];
    if (perCapita <= thresholds.q1) return "low";
    if (perCapita <= thresholds.q2) return "medium";
    return "high";
  }

  function comparisonForRecord(record, level = state.level, indicatorKey = state.indicator) {
    const indicator = INDICATORS[indicatorKey];
    const investment = record.investment[indicator.theme];
    return {
      delta: record.delta[indicatorKey],
      perCapita: investment.accruedPerCapita,
      progress: progressClass(record.delta[indicatorKey]),
      tier: investmentTier(investment.accruedPerCapita, level, indicator.theme),
    };
  }

  function normalizeFilterSelection(value, allowed) {
    if (value === "all" || value === undefined || value === null) return [...allowed];
    const values = Array.isArray(value) ? value : [value];
    return [...new Set(values.filter((item) => allowed.includes(item)))];
  }

  function selectionIsAll(selection, allowed) {
    return allowed.every((item) => selection.includes(item));
  }

  function selectionMatchesValue(selection, value, allowed) {
    // With every option selected, retain units without a comparable value too.
    // This preserves the meaning of the former “Todos” option.
    return selectionIsAll(selection, allowed) || selection.includes(value);
  }

  function comparisonMatchesFilters(comparison, filters = state.filters) {
    return selectionMatchesValue(filters.tier, comparison.tier, TIER_FILTER_VALUES)
      && selectionMatchesValue(filters.progress, comparison.progress, PROGRESS_FILTER_VALUES);
  }

  function filterSelectionLabel(selection, labels, allowed) {
    if (selectionIsAll(selection, allowed)) return "Todos";
    if (!selection.length) return "Ninguno";
    return selection.map((item) => labels[item]).join(" + ");
  }

  function filterSelectionToken(selection, allowed) {
    if (selectionIsAll(selection, allowed)) return "todos";
    return selection.length ? selection.join("-") : "ninguno";
  }

  function filterChoices(group, inputName) {
    return [...group.querySelectorAll(`input[name="${inputName}"]`)];
  }

  function renderProgressFilterChoices() {
    const label = el.progressFilterGroup.querySelector(".multi-filter-label");
    const options = el.progressFilterGroup.querySelector(".multi-filter-options");
    if (!label || !options) return;

    options.replaceChildren();

    if (state.view === "multi_nbi") {
      label.textContent = "N° de NBI";
      [
        ["0", "0", "filter-choice--green"],
        ["1", "1", "filter-choice--red-light"],
        ["2", "2", "filter-choice--red"],
        ["3", "3", "filter-choice--red-dark"],
      ].forEach(([value, text, colorClass]) => {
        const choice = create("label", `filter-choice ${colorClass}`);
        const input = create("input");
        input.type = "checkbox";
        input.name = "multiNbiFilter";
        input.value = value;
        input.checked = state.filters.multiNbi.includes(value);
        choice.append(input, create("span", "", text));
        options.appendChild(choice);
      });
      return;
    }

    label.textContent = "Avance";
    [
      ["setback", "Retroceso", "filter-choice--red"],
      ["stagnant", "Estancado", "filter-choice--orange"],
      ["advance", "Avance", "filter-choice--green"],
    ].forEach(([value, text, colorClass]) => {
      const choice = create("label", `filter-choice ${colorClass}`);
      const input = create("input");
      input.type = "checkbox";
      input.name = "progressFilter";
      input.value = value;
      input.checked = state.filters.progress.includes(value);
      choice.append(input, create("span", "", text));
      options.appendChild(choice);
    });
  }

  function syncFilterControls() {
    filterChoices(el.tierFilterGroup, "tierFilter").forEach((input) => {
      input.checked = state.filters.tier.includes(input.value);
    });
    renderProgressFilterChoices();
  }

  function readFilterChoices(filterName) {
    if (filterName === "progress" && state.view === "multi_nbi") {
      state.filters.multiNbi = normalizeFilterSelection(
        filterChoices(el.progressFilterGroup, "multiNbiFilter")
          .filter((input) => input.checked)
          .map((input) => input.value),
        MULTI_NBI_FILTER_VALUES,
      );
    } else {
      const isTier = filterName === "tier";
      const allowed = isTier ? TIER_FILTER_VALUES : PROGRESS_FILTER_VALUES;
      const group = isTier ? el.tierFilterGroup : el.progressFilterGroup;
      const inputName = isTier ? "tierFilter" : "progressFilter";
      state.filters[filterName] = normalizeFilterSelection(
        filterChoices(group, inputName)
          .filter((input) => input.checked)
          .map((input) => input.value),
        allowed,
      );
    }
    saveFilters();
    invalidateFilteredRecordsCache();
    renderFilteredView();
  }

  function multiNbiIssueCount(record) {
    const deltas = MULTI_NBI_INDICATORS
      .map((indicatorKey) => finiteNumber(record?.delta?.[indicatorKey]))
      .filter((value) => value !== null && Number.isFinite(value));
    if (!deltas.length) return null;
    return deltas.reduce((count, delta) => count + (progressClass(delta) !== "advance" ? 1 : 0), 0);
  }

  function multiNbiStatusDetails(record) {
    return MULTI_NBI_INDICATORS.map((indicatorKey) => {
      const delta = finiteNumber(record?.delta?.[indicatorKey]);
      const progress = delta === null || !Number.isFinite(delta) ? "no_data" : progressClass(delta);
      return {
        key: indicatorKey,
        label: MULTI_NBI_LABELS[indicatorKey],
        delta,
        progress,
      };
    });
  }

  function recordMatchesFilters(record, level = state.level) {
    const comparison = comparisonForRecord(record, level);

    if (state.view === "multi_nbi") {
      const tierMatches = selectionMatchesValue(
        state.filters.tier,
        comparison.tier,
        TIER_FILTER_VALUES,
      );
      const issueCount = multiNbiIssueCount(record);
      const countMatches = selectionIsAll(state.filters.multiNbi, MULTI_NBI_FILTER_VALUES)
        || (issueCount !== null && state.filters.multiNbi.includes(String(issueCount)));
      return tierMatches && countMatches;
    }

    return comparisonMatchesFilters(comparison);
  }

  function filteredRecordsCacheKey(level = state.level) {
    return [
      level, state.view, state.indicator, state.measure,
      state.filters.tier.join(","), state.filters.progress.join(","), state.filters.multiNbi.join(","),
    ].join("|");
  }

  function invalidateFilteredRecordsCache() {
    state.filteredRecordsCache.clear();
  }

  function filteredRecords(level = state.level) {
    const key = filteredRecordsCacheKey(level);
    if (!state.filteredRecordsCache.has(key)) {
      state.filteredRecordsCache.set(
        key,
        [...state.model.metrics[level].values()].filter((record) => recordMatchesFilters(record, level)),
      );
    }
    return state.filteredRecordsCache.get(key);
  }

  function loadFilters() {
    try {
      const saved = JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY) || "{}");
      if (saved.tier !== undefined) state.filters.tier = normalizeFilterSelection(saved.tier, TIER_FILTER_VALUES);
      if (saved.progress !== undefined) state.filters.progress = normalizeFilterSelection(saved.progress, PROGRESS_FILTER_VALUES);
      if (saved.multiNbi !== undefined) state.filters.multiNbi = normalizeFilterSelection(saved.multiNbi, MULTI_NBI_FILTER_VALUES);
    } catch (_error) { /* Local storage is optional. */ }
    syncFilterControls();
  }

  function saveFilters() {
    try { localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(state.filters)); } catch (_error) { /* optional */ }
  }

  function valueForRecord(record) {
    const indicator = INDICATORS[state.indicator];
    const investment = record.investment[indicator.theme];
    if (state.view === "nbi") {
      if (state.measure === "2017" || state.measure === "2025") {
        const rate = record.nbi[Number(state.measure)][state.indicator].rate;
        return rate === null ? null : rate * 100;
      }
      return record.delta[state.indicator];
    }
    if (state.view === "multi_nbi") {
      return multiNbiIssueCount(record);
    }
    if (state.view === "investment") {
      if (state.measure === "accrued_total") return investment.accrued;
      if (state.measure === "cost_per_capita") return investment.costPerCapita;
      if (state.measure === "cost_total") return investment.cost;
      return investment.accruedPerCapita;
    }
    return comparisonForRecord(record, state.level);
  }

  function investmentRangeMaximum(range, measure = state.measure) {
    if (measure === "accrued_total") return range.accruedMax;
    if (measure === "cost_per_capita") return range.costPerCapitaMax;
    if (measure === "cost_total") return range.costMax;
    return range.accruedPerCapitaMax;
  }

  function investmentMeasureTerciles(level = state.level, indicatorKey = state.indicator, measure = state.measure) {
    const theme = INDICATORS[indicatorKey].theme;
    return state.model.investmentTerciles?.[level]?.[theme]?.[measure] || null;
  }

  function formatInvestmentMeasureValue(value, measureKey = state.measure, compact = false) {
    if (value === null || !Number.isFinite(value)) return "Sin dato";
    const measure = INVESTMENT_MEASURES[measureKey] || INVESTMENT_MEASURES.accrued_per_capita;
    if (measure.perCapita) {
      return measure.soles ? formatSoles(value, true) : formatMoney(value, true);
    }
    if (compact) return measure.soles ? compactSoles(value) : compactMoney(value);
    return measure.soles ? formatSoles(value, true) : formatMoney(value, true);
  }

  function fillForRecord(record) {
    const value = valueForRecord(record);
    if (state.view === "nbi") {
      if (value === null || !Number.isFinite(value)) return NO_DATA_COLOR;
      if (state.measure === "change") {
        const progress = progressClass(value);
        if (progress === "setback") return VIVID_RED;
        if (progress === "stagnant") return STAGNANT_ORANGE;
        if (progress === "advance") return VIVID_GREEN;
        return NO_DATA_COLOR;
      }
      const thresholds = state.model.nbiTerciles?.[state.level]?.[Number(state.measure)]?.[state.indicator];
      if (!thresholds || !Number.isFinite(thresholds.q1) || !Number.isFinite(thresholds.q2)) return NO_DATA_COLOR;
      if (value <= thresholds.q1) return VIVID_GREEN;
      if (value <= thresholds.q2) return VIVID_YELLOW;
      return VIVID_RED;
    }
    if (state.view === "multi_nbi") {
      if (value === null || !Number.isFinite(value)) return NO_DATA_COLOR;
      if (value <= 0) return VIVID_GREEN;
      if (value === 1) return SOFT_RED;
      if (value === 2) return VIVID_RED;
      return DARK_RED;
    }
    if (state.view === "investment") {
      if (value === null || !Number.isFinite(value)) return NO_DATA_COLOR;
      if (value <= 0) return VIVID_RED;
      const thresholds = investmentMeasureTerciles();
      if (!thresholds || !Number.isFinite(thresholds.q1) || !Number.isFinite(thresholds.q2)) return NO_DATA_COLOR;
      if (value <= thresholds.q1) return VIVID_RED;
      if (value <= thresholds.q2) return VIVID_YELLOW;
      return VIVID_GREEN;
    }
    if (!value || value.progress === "no_data" || value.tier === "no_data") return NO_DATA_COLOR;
    return COMPARISON_COLORS[value.progress][value.tier];
  }

  function formatPercent(rate) {
    return rate === null || !Number.isFinite(rate) ? "Sin dato" : `${number1.format(rate * 100)} %`;
  }

  function formatDelta(delta) {
    if (delta === null || !Number.isFinite(delta)) return "Sin comparación";
    const sign = delta > 0 ? "+" : "";
    return `${sign}${number1.format(delta)} pp`;
  }

  function formatMoney(value, decimals = false) {
    if (value === null || !Number.isFinite(value)) return "Sin dato";
    return (decimals ? amount2 : amount0).format(value);
  }

  function compactMoney(value) {
    if (value === null || !Number.isFinite(value)) return "Sin dato";
    const absolute = Math.abs(value);
    if (absolute >= 1e9) return `${number1.format(value / 1e9)} mil mill.`;
    if (absolute >= 1e6) return `${number1.format(value / 1e6)} mill.`;
    if (absolute >= 1e3) return `${number1.format(value / 1e3)} mil`;
    return number1.format(value);
  }

  function formatSoles(value, decimals = false) {
    const formatted = formatMoney(value, decimals);
    return formatted === "Sin dato" ? formatted : `S/ ${formatted}`;
  }

  function compactSoles(value) {
    const formatted = compactMoney(value);
    return formatted === "Sin dato" ? formatted : `S/ ${formatted}`;
  }

  function applyWorksheetPresentation(sheet, headers, widths, numberFormats = {}) {
    if (!sheet["!ref"]) return;
    const lastColumn = XLSX.utils.encode_col(Math.max(headers.length - 1, 0));
    sheet["!autofilter"] = { ref: `A1:${lastColumn}1` };
    sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    sheet["!cols"] = headers.map((header, index) => ({ wch: widths[index] || Math.min(Math.max(String(header).length + 2, 12), 34) }));
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    Object.entries(numberFormats).forEach(([header, format]) => {
      const column = headers.indexOf(header);
      if (column < 0) return;
      for (let row = 1; row <= range.e.r; row += 1) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
        if (cell && (cell.t === "n" || cell.t === "d")) cell.z = format;
      }
    });
  }

  function projectShareForLevel(project, record, level) {
    const population = finiteNumber(record.population[2025].population, 0);
    const populationTotal = finiteNumber(project.targetPopulationTotals?.[level], 0);
    if (populationTotal > 0) return population / populationTotal;
    const targetCount = finiteNumber(project.targetCounts?.[level], 0);
    return targetCount > 0 ? 1 / targetCount : 0;
  }

  function exportTerritoryFields(record, level, prefix = "") {
    const fields = {};
    const add = (name, value) => { fields[`${prefix}${name}`] = value; };
    if (level === "region") {
      add("UBIGEO_DEPARTAMENTO", record.code);
      add("DEPARTAMENTO", record.name);
    } else if (level === "province") {
      add("UBIGEO_PROVINCIA", record.code);
      add("DEPARTAMENTO", record.regionName);
      add("PROVINCIA", record.name);
    } else {
      add("UBIGEO_DISTRITO", record.code);
      add("DEPARTAMENTO", record.regionName);
      add("PROVINCIA", record.provinceName);
      add("DISTRITO", record.name);
    }
    return fields;
  }

  async function exportFilteredWorkbook() {
    if (!state.model || typeof XLSX === "undefined") return;
    const exportLevel = state.level;
    const levelConfig = LEVELS[exportLevel];
    const indicatorKey = state.indicator;
    const indicator = INDICATORS[indicatorKey];
    const exportFilters = {
      tier: [...state.filters.tier],
      progress: [...state.filters.progress],
    };
    const records = [...state.model.metrics[exportLevel].values()]
      .filter((record) => {
        const comparison = comparisonForRecord(record, exportLevel, indicatorKey);
        return comparisonMatchesFilters(comparison, exportFilters);
      })
      .sort((a, b) => a.code.localeCompare(b.code));
    if (!records.length) {
      window.alert(`No hay ${levelConfig.plural} que cumplan la combinación de filtros.`);
      return;
    }

    const previousStatus = el.sourceStatus.textContent;
    el.exportButton.disabled = true;
    el.exportButton.setAttribute("aria-busy", "true");
    el.exportButton.textContent = "…";
    el.sourceStatus.textContent = "Preparando descarga…";
    await sleepFrame();

    try {
      const geographyHeaders = {
        region: ["UBIGEO_DEPARTAMENTO", "DEPARTAMENTO"],
        province: ["UBIGEO_PROVINCIA", "DEPARTAMENTO", "PROVINCIA"],
        district: ["UBIGEO_DISTRITO", "DEPARTAMENTO", "PROVINCIA", "DISTRITO"],
      }[exportLevel];
      const summaryHeaders = [
        ...geographyHeaders, "INDICADOR", "NECESIDAD_INSATISFECHA",
        "POBLACION_2025", "CASOS_NECESIDAD_INSATISFECHA_2017", "UNIVERSO_2017", "UNIVERSO_2017_DESCRIPCION", "NECESIDAD_INSATISFECHA_2017",
        "CASOS_NECESIDAD_INSATISFECHA_2025", "UNIVERSO_2025", "UNIVERSO_2025_DESCRIPCION", "NECESIDAD_INSATISFECHA_2025", "AVANCE_CIERRE_BRECHA_PP",
        "ESTADO_AVANCE", "INVERSIONES_CERRADAS", "DEVENGADO_ASOCIADO_S", "DEVENGADO_ASIGNADO_S",
        "DEVENGADO_POR_PERSONA_S", "TERCIL_DEVENGADO", "FILTRO_DEVENGADO", "FILTRO_AVANCE",
      ];
      const summaryRows = records.map((record) => {
        const investment = record.investment[indicator.theme];
        const comparison = comparisonForRecord(record, exportLevel, indicatorKey);
        const nbi2017 = record.nbi[2017][indicatorKey];
        const nbi2025 = record.nbi[2025][indicatorKey];
        return {
          ...exportTerritoryFields(record, exportLevel),
          INDICADOR: indicator.label,
          NECESIDAD_INSATISFECHA: indicator.deprivation,
          POBLACION_2025: record.population[2025].population,
          CASOS_NECESIDAD_INSATISFECHA_2017: nbi2017.numerator,
          UNIVERSO_2017: nbi2017.denominator,
          UNIVERSO_2017_DESCRIPCION: nbi2017.universeLabel,
          NECESIDAD_INSATISFECHA_2017: nbi2017.rate,
          CASOS_NECESIDAD_INSATISFECHA_2025: nbi2025.numerator,
          UNIVERSO_2025: nbi2025.denominator,
          UNIVERSO_2025_DESCRIPCION: nbi2025.universeLabel,
          NECESIDAD_INSATISFECHA_2025: nbi2025.rate,
          AVANCE_CIERRE_BRECHA_PP: comparison.delta,
          ESTADO_AVANCE: PROGRESS_LABELS[comparison.progress],
          INVERSIONES_CERRADAS: investment.count,
          DEVENGADO_ASOCIADO_S: investment.accrued,
          DEVENGADO_ASIGNADO_S: investment.allocatedAccrued,
          DEVENGADO_POR_PERSONA_S: investment.accruedPerCapita,
          TERCIL_DEVENGADO: TIER_LABELS[comparison.tier],
          FILTRO_DEVENGADO: filterSelectionLabel(exportFilters.tier, TIER_LABELS, TIER_FILTER_VALUES),
          FILTRO_AVANCE: filterSelectionLabel(exportFilters.progress, PROGRESS_LABELS, PROGRESS_FILTER_VALUES),
        };
      });

      const rawHeaders = state.model.projects[0]?.fields.map(([label]) => label) || [];
      const detailPrefixHeaders = [
        ...geographyHeaders.map((header) => `MAPA_${header}`),
        "MAPA_INDICADOR", "MAPA_ESTADO_AVANCE", "MAPA_TERCIL_DEVENGADO", "MAPA_AVANCE_PP",
        "MAPA_DEVENGADO_POR_PERSONA_S", "MAPA_DEVENGADO_ASIGNADO_S",
        "MAPA_TIPO_ALCANCE", "MAPA_NOTA_ALCANCE",
      ];
      const detailHeaders = [...detailPrefixHeaders, ...rawHeaders];
      const detailRows = [];
      records.forEach((record) => {
        const comparison = comparisonForRecord(record, exportLevel, indicatorKey);
        const projectIds = state.model.associations[exportLevel].get(record.code) || [];
        projectIds.forEach((projectId) => {
          const project = state.model.projects[projectId];
          if (!project || !project.themes.includes(indicator.theme)) return;
          const row = {
            ...exportTerritoryFields(record, exportLevel, "MAPA_"),
            MAPA_INDICADOR: indicator.label,
            MAPA_ESTADO_AVANCE: PROGRESS_LABELS[comparison.progress],
            MAPA_TERCIL_DEVENGADO: TIER_LABELS[comparison.tier],
            MAPA_AVANCE_PP: comparison.delta,
            MAPA_DEVENGADO_POR_PERSONA_S: comparison.perCapita,
            MAPA_DEVENGADO_ASIGNADO_S: project.accrued * projectShareForLevel(project, record, exportLevel),
            MAPA_TIPO_ALCANCE: project.scopeType,
            MAPA_NOTA_ALCANCE: project.scopeNote,
          };
          project.fields.forEach(([label, value]) => { row[label] = value; });
          detailRows.push(row);
        });
      });

      const workbook = XLSX.utils.book_new();
      workbook.Props = {
        Title: `Brechas e inversión · ${indicator.label}`,
        Subject: `Exportación por ${levelConfig.singular} restringida a la necesidad básica y filtros activos`,
        Author: "Programa GFP Subnacional · Basel Institute on Governance",
        Comments: "Fuentes: Censos 2017 y 2025; inversiones cerradas de Invierte.pe 2017–2024.",
      };
      const summarySheet = XLSX.utils.json_to_sheet(summaryRows, { header: summaryHeaders, cellDates: true, dateNF: "yyyy-mm-dd" });
      applyWorksheetPresentation(
        summarySheet,
        summaryHeaders,
        summaryHeaders.map((header) => {
          if (/UBIGEO/.test(header)) return 20;
          if (/DEPARTAMENTO|PROVINCIA|DISTRITO/.test(header)) return 22;
          if (header === "NECESIDAD_INSATISFECHA" || /UNIVERSO_\d+_DESCRIPCION/.test(header)) return 44;
          if (/INDICADOR|ESTADO|TERCIL|FILTRO/.test(header)) return 18;
          return 20;
        }),
        {
          POBLACION_2025: "#,##0",
          CASOS_NECESIDAD_INSATISFECHA_2017: "#,##0",
          UNIVERSO_2017: "#,##0",
          NECESIDAD_INSATISFECHA_2017: "0.0%",
          CASOS_NECESIDAD_INSATISFECHA_2025: "#,##0",
          UNIVERSO_2025: "#,##0",
          NECESIDAD_INSATISFECHA_2025: "0.0%",
          AVANCE_CIERRE_BRECHA_PP: "0.0",
          INVERSIONES_CERRADAS: "#,##0",
          DEVENGADO_ASOCIADO_S: '"S/ "#,##0.00',
          DEVENGADO_ASIGNADO_S: '"S/ "#,##0.00',
          DEVENGADO_POR_PERSONA_S: '"S/ "#,##0.00',
        },
      );
      const detailSheet = XLSX.utils.json_to_sheet(detailRows, { header: detailHeaders, cellDates: true, dateNF: "yyyy-mm-dd" });
      const detailWidths = detailHeaders.map((header) => {
        if (/NOMBRE_INVERSION|NOTA_ALCANCE/.test(header)) return 58;
        if (/DEPARTAMENTO|PROVINCIA|DISTRITO|ENTIDAD/.test(header)) return 24;
        if (/UBIGEO|CODIGO_UNICO/.test(header)) return 15;
        return Math.min(Math.max(header.length + 2, 12), 28);
      });
      const detailFormats = {
        MAPA_AVANCE_PP: "0.0",
        MAPA_DEVENGADO_POR_PERSONA_S: '"S/ "#,##0.00',
        MAPA_DEVENGADO_ASIGNADO_S: '"S/ "#,##0.00',
        DEVEN_ACUMULADO: '"S/ "#,##0.00',
        FEC_CIERRE: "yyyy-mm-dd",
      };
      applyWorksheetPresentation(detailSheet, detailHeaders, detailWidths, detailFormats);
      XLSX.utils.book_append_sheet(workbook, summarySheet, `Resumen ${levelConfig.plural}`);
      XLSX.utils.book_append_sheet(workbook, detailSheet, "Inversiones cerradas");

      const date = new Date().toISOString().slice(0, 10);
      const filename = `brechas_${exportLevel}_${indicatorKey}_${filterSelectionToken(exportFilters.tier, TIER_FILTER_VALUES)}_${filterSelectionToken(exportFilters.progress, PROGRESS_FILTER_VALUES)}_${date}.xlsx`;
      XLSX.writeFile(workbook, filename, { compression: true, cellDates: true });
      el.sourceStatus.textContent = `${number0.format(records.length)} ${levelConfig.plural} exportados · ${number0.format(detailRows.length)} registros de inversión en ${indicator.label.toLowerCase()}`;
    } catch (error) {
      console.error(error);
      window.alert(`No se pudo generar la descarga: ${error instanceof Error ? error.message : String(error)}`);
      el.sourceStatus.textContent = previousStatus;
    } finally {
      el.exportButton.removeAttribute("aria-busy");
      el.exportButton.textContent = "Exportar";
      el.exportButton.disabled = filteredRecords(state.level).length === 0;
    }
  }

  function territoryHierarchy(record, level = state.level) {
    if (level === "region") return `Departamento · UBIGEO ${record.code}`;
    if (level === "province") return `${record.regionName} · Provincia · UBIGEO ${record.code}`;
    return `${record.regionName} · ${record.provinceName} · Distrito · UBIGEO ${record.code}`;
  }

  function tooltipLines(record) {
    const indicator = INDICATORS[state.indicator];
    const investment = record.investment[indicator.theme];
    if (state.view === "nbi") {
      if (state.measure === "change") return [`Avance: ${formatDelta(record.delta[state.indicator])}`, `${formatPercent(record.nbi[2017][state.indicator].rate)} → ${formatPercent(record.nbi[2025][state.indicator].rate)}`];
      return [`Necesidad insatisfecha ${state.measure}: ${formatPercent(record.nbi[Number(state.measure)][state.indicator].rate)}`];
    }
    if (state.view === "multi_nbi") {
      const count = multiNbiIssueCount(record);
      const details = multiNbiStatusDetails(record);
      const labels = { setback: "Retroceso", stagnant: "Estancado", advance: "Avance", no_data: "Sin dato" };
      return [
        `NBI con estancamiento o retroceso: ${count === null ? "Sin dato" : `${count} de 3`}`,
        ...details.map((detail) => {
          const first = record.nbi[2017][detail.key]?.rate;
          const last = record.nbi[2025][detail.key]?.rate;
          const rates = first !== null && Number.isFinite(first) && last !== null && Number.isFinite(last)
            ? `${formatPercent(first)} → ${formatPercent(last)}`
            : "Sin comparación 2017–2025";
          return `${detail.label}: ${rates} · ${labels[detail.progress]}${detail.progress === "no_data" ? "" : ` (${formatDelta(detail.delta)})`}`;
        }),
      ];
    }
    if (state.view === "investment") {
      const measure = INVESTMENT_MEASURES[state.measure] || INVESTMENT_MEASURES.accrued_per_capita;
      const value = valueForRecord(record);
      const formattedValue = measure.perCapita
        ? (measure.soles ? formatSoles(value, true) : formatMoney(value, true))
        : (measure.soles ? compactSoles(value) : compactMoney(value));
      return [
        `${measure.short}: ${formattedValue}`,
        `${number0.format(investment.count)} inversiones en ${indicator.themeLabel.toLowerCase()}`,
      ];
    }
    const comparison = valueForRecord(record);
    const progressLabels = { setback: "Retroceso", stagnant: "Estancamiento", advance: "Avance", no_data: "Sin comparación" };
    const tierLabels = { low: "tercil bajo", medium: "tercil medio", high: "tercil alto", no_data: "sin dato de inversión" };
    return [`${progressLabels[comparison.progress]} (${formatDelta(comparison.delta)})`, `Devengado per cápita: ${tierLabels[comparison.tier]} · ${formatSoles(comparison.perCapita, true)}`];
  }

  function mapShapeFromEvent(event) {
    const shape = event.target?.closest?.(".map-shape");
    return shape && el.mapLayer.contains(shape) ? shape : null;
  }

  function showTooltip(event, shape = mapShapeFromEvent(event)) {
    if (!shape || (event.pointerType === "touch") || (state.mapPointers.size && event.type.startsWith("pointer"))) return;
    const code = shape.dataset.code;
    const record = state.model.metrics[state.level].get(code);
    if (!record) return;
    el.tooltip.replaceChildren();
    el.tooltip.appendChild(create("strong", "", record.name));
    tooltipLines(record).forEach((line) => el.tooltip.appendChild(create("div", "", line)));
    el.tooltip.hidden = false;
    if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY) && (event.clientX || event.clientY)) {
      positionTooltip(event);
    } else {
      const bounds = shape.getBoundingClientRect();
      positionTooltip({ clientX: bounds.left + bounds.width / 2, clientY: bounds.top + bounds.height / 2 });
    }
  }

  function positionTooltip(event) {
    if (state.mapPointers.size) {
      hideTooltip();
      return;
    }
    if (el.tooltip.hidden || event.clientX === undefined) return;
    const margin = 12;
    const width = el.tooltip.offsetWidth || 220;
    const height = el.tooltip.offsetHeight || 60;
    const left = Math.min(event.clientX + 14, window.innerWidth - width - margin);
    const top = Math.min(event.clientY + 14, window.innerHeight - height - margin);
    el.tooltip.style.left = `${Math.max(margin, left)}px`;
    el.tooltip.style.top = `${Math.max(margin, top)}px`;
  }

  function hideTooltip() {
    el.tooltip.hidden = true;
  }

  function measureOptions() {
    if (state.view === "nbi") {
      return [
        ["change", "Avance 2017–2025 (pp)"],
        ["2017", "Necesidad insatisfecha 2017 (%)"],
        ["2025", "Necesidad insatisfecha 2025 (%)"],
      ];
    }
    if (state.view === "investment") {
      return Object.entries(INVESTMENT_MEASURES).map(([value, item]) => [value, item.option]);
    }
    if (state.view === "multi_nbi") {
      return [["priority_services", "Conteo de servicios priorizados con estancamiento o retroceso"]];
    }
    return [["matrix", "Matriz de 9 categorías"]];
  }

  function syncViewControl() {
    el.viewToggle.classList.toggle("comparison-hidden", !SHOW_COMPARISON_VIEW);
    el.viewToggle.querySelectorAll("button[data-view]").forEach((button) => {
      const isComparison = button.dataset.view === "comparison";
      button.hidden = isComparison && !SHOW_COMPARISON_VIEW;
      const isActive = button.dataset.view === state.view;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function syncLevelControl() {
    el.levelToggle.querySelectorAll("button[data-level]").forEach((button) => {
      const isActive = button.dataset.level === state.level;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function setMapView(view) {
    if (!["nbi", "investment", "comparison", "multi_nbi"].includes(view)) return;
    state.view = view;
    syncViewControl();
    updateMeasureControl();
    syncFilterControls();
    invalidateFilteredRecordsCache();
    renderFilteredView();
  }

  function updateMeasureControl(preferred) {
    const options = measureOptions();
    const permitted = new Set(options.map(([value]) => value));
    const next = permitted.has(preferred) ? preferred : options[0][0];
    el.measureSelect.replaceChildren();
    options.forEach(([value, label]) => {
      const option = create("option", "", label);
      option.value = value;
      el.measureSelect.appendChild(option);
    });
    state.measure = next;
    el.measureSelect.value = next;
    el.measureSelect.disabled = options.length === 1;
    el.measureLabel.textContent = state.view === "investment" ? "Devengado / costo" : "Medida";
    el.measureControl.hidden = state.view === "multi_nbi";
    const indicatorControl = el.indicatorSelect.closest(".control");
    if (indicatorControl) indicatorControl.hidden = state.view === "multi_nbi";
    el.indicatorSelect.disabled = state.view === "multi_nbi";
  }

  function populateTerritorySearch() {
    el.territoryOptions.replaceChildren();
    state.territorySearchEntries = [];
    state.territoryLabelByCode = new Map();
    const records = [...state.model.metrics[state.level].values()].sort((a, b) => {
      const firstName = state.level === "district" ? `${a.regionName} ${a.provinceName} ${a.name}` : `${a.regionName} ${a.name}`;
      const secondName = state.level === "district" ? `${b.regionName} ${b.provinceName} ${b.name}` : `${b.regionName} ${b.name}`;
      return firstName.localeCompare(secondName, "es");
    });
    const fragment = document.createDocumentFragment();
    records.forEach((record) => {
      const context = state.level === "province"
        ? `${record.name} · ${record.regionName}`
        : state.level === "district"
          ? `${record.name} · ${record.provinceName}, ${record.regionName}`
          : record.name;
      const label = `${context} · UBIGEO ${record.code}`;
      const option = create("option");
      option.value = label;
      fragment.appendChild(option);
      state.territorySearchEntries.push({ code: record.code, label, normalized: norm(label) });
      state.territoryLabelByCode.set(record.code, label);
    });
    el.territoryOptions.appendChild(fragment);
    el.territorySearch.value = state.territoryLabelByCode.get(state.selectedCode) || "";
  }

  function territoryCodeFromSearch(value, allowFirstMatch = false) {
    const query = norm(value);
    if (!query) return "";
    const exact = state.territorySearchEntries.find((entry) => entry.normalized === query || entry.code === query);
    if (exact) return exact.code;
    if (!allowFirstMatch) return "";
    return state.territorySearchEntries.find((entry) => entry.normalized.includes(query))?.code || "";
  }

  function setTerritorySearchValue(code) {
    el.territorySearch.value = state.territoryLabelByCode.get(code) || "";
  }

  function renderContext() {
    const indicator = INDICATORS[state.indicator];
    const levelConfig = LEVELS[state.level];
    const allRecords = [...state.model.metrics[state.level].values()];
    const records = filteredRecords(state.level);
    const projectIds = new Set();
    records.forEach((record) => {
      (state.model.associations[state.level].get(record.code) || []).forEach((projectId) => {
        const project = state.model.projects[projectId];
        if (project?.themes.includes(indicator.theme)) projectIds.add(projectId);
      });
    });
    const totalAccrued = [...projectIds].reduce((sum, projectId) => {
      const project = state.model.projects[projectId];
      return sum + finiteNumber(project?.accrued, 0);
    }, 0);
    const tierFilterIsAll = selectionIsAll(state.filters.tier, TIER_FILTER_VALUES);
    const progressFilterIsAll = selectionIsAll(state.filters.progress, PROGRESS_FILTER_VALUES);
    const multiNbiFilterIsAll = selectionIsAll(state.filters.multiNbi, MULTI_NBI_FILTER_VALUES);
    const filtersActive = state.view === "multi_nbi"
      ? !tierFilterIsAll || !multiNbiFilterIsAll
      : !tierFilterIsAll || !progressFilterIsAll;
    el.statUnitsLabel.textContent = {
      region: "Dptos.",
      province: "Provincias",
      district: "Distritos",
    }[state.level] || levelConfig.plural;
    el.statUnits.textContent = `${number0.format(records.length)} de ${number0.format(allRecords.length)}`;
    el.statComparable.textContent = number0.format(projectIds.size);
    el.statProjects.textContent = compactSoles(totalAccrued);
    el.mapUnitCount.textContent = `${number0.format(records.length)} de ${number0.format(allRecords.length)} ${levelConfig.plural}`;

    if (state.view === "nbi") {
      el.contextKicker.textContent = state.measure === "change" ? "REDUCCIÓN DE LA NECESIDAD INSATISFECHA" : `NECESIDAD INSATISFECHA ${state.measure}`;
      el.contextTitle.textContent = indicator.deprivation;
      el.contextNote.textContent = state.measure === "change"
        ? "Avance = porcentaje 2017 menos porcentaje 2025. Un valor positivo indica que la necesidad insatisfecha disminuyó."
        : "El color representa la proporción de la población, hogares o viviendas del universo aplicable que presenta la necesidad insatisfecha.";
      el.mapEyebrow.textContent = state.measure === "change" ? "AVANCE EN PUNTOS PORCENTUALES" : "PORCENTAJE CON NECESIDAD INSATISFECHA";
      el.mapHeading.textContent = state.measure === "change"
        ? `${indicator.label}: avance 2017–2025 por ${levelConfig.singular}`
        : `${indicator.label}: necesidad insatisfecha ${state.measure} por ${levelConfig.singular}`;
      el.mapSubheading.textContent = state.measure === "change"
        ? `(reducción de ${indicator.percentageLabel})`
        : `(${indicator.percentageLabel})`;
      el.mapSubheading.hidden = false;
    } else if (state.view === "multi_nbi") {
      el.contextKicker.textContent = "SERVICIOS PRIORIZADOS";
      el.contextTitle.textContent = "Varias NBI con estancamiento o retroceso";
      el.contextNote.textContent = "Cuenta cuántos de los servicios priorizados —agua cobertura, electricidad y educación— presentan estancamiento o retroceso entre 2017 y 2025 en cada territorio. Verde: 0; rojo claro: 1; rojo: 2; rojo oscuro: 3.";
      el.mapEyebrow.textContent = "CONTEO DE SERVICIOS CON REZAGO";
      el.mapHeading.textContent = `Varias NBI: servicios priorizados con estancamiento o retroceso por ${levelConfig.singular}`;
      el.mapSubheading.textContent = "(agua cobertura, electricidad y educación · conteo de 0 a 3)";
      el.mapSubheading.hidden = false;
    } else if (state.view === "investment") {
      const measure = INVESTMENT_MEASURES[state.measure] || INVESTMENT_MEASURES.accrued_per_capita;
      el.contextKicker.textContent = `INVERSIÓN EN ${indicator.label.toUpperCase()}`;
      el.contextTitle.textContent = measure.short;
      el.contextNote.textContent = measure.perCapita && state.model.hasTotalPopulation2025 === false
        ? "La base vigente no contiene población censada total 2025. Para no usar un sustituto inadecuado, el devengado por persona no se calcula."
        : measure.perCapita
        ? "El monto se asigna proporcionalmente cuando una inversión abarca varias unidades y se divide entre la población 2025. Sin inversión, el valor es 0."
        : "Un proyecto de ámbito amplio aparece con el monto completo en cada territorio que abarca; la ficha muestra la nota de alcance.";
      el.mapEyebrow.textContent = measure.short.toUpperCase();
      el.mapHeading.textContent = `${indicator.themeLabel}: ${measure.heading} por ${levelConfig.singular}`;
      el.mapSubheading.textContent = "";
      el.mapSubheading.hidden = true;
    } else {
      el.contextKicker.textContent = "MATRIZ DE 9 CATEGORÍAS";
      el.contextTitle.textContent = `${indicator.deprivation} × ${indicator.themeLabel}`;
      el.contextNote.textContent = state.model.hasTotalPopulation2025 === false
        ? "La base vigente no contiene población censada total 2025. El cruce con devengado por persona no se clasifica para evitar una comparación incorrecta."
        : "Compara retroceso, estancamiento o avance de la necesidad insatisfecha con los terciles del devengado asignado por habitante. El valor 0 se clasifica como bajo.";
      el.mapEyebrow.textContent = "BRECHA × DEVENGADO PER CÁPITA";
      el.mapHeading.textContent = `${indicator.label}: avance de brecha y devengado per cápita por ${levelConfig.singular}`;
      el.mapSubheading.textContent = `(reducción de ${indicator.percentageLabel})`;
      el.mapSubheading.hidden = false;
    }

    const filterParts = [];
    if (!tierFilterIsAll) {
      filterParts.push(`devengado ${filterSelectionLabel(state.filters.tier, TIER_LABELS, TIER_FILTER_VALUES).toLowerCase()}`);
    }
    if (state.view === "multi_nbi") {
      if (!multiNbiFilterIsAll) {
        const selectedCounts = MULTI_NBI_FILTER_VALUES.filter((value) => state.filters.multiNbi.includes(value));
        filterParts.push(selectedCounts.length
          ? `N° de NBI: ${selectedCounts.join(", ")}`
          : "sin números de NBI seleccionados");
      }
    } else if (!progressFilterIsAll) {
      filterParts.push(filterSelectionLabel(state.filters.progress, PROGRESS_LABELS, PROGRESS_FILTER_VALUES).toLowerCase());
    }
    if (filterParts.length) el.contextNote.textContent += ` Filtro activo: ${filterParts.join(" + ")}.`;
    const exportCount = filteredRecords(state.level).length;
    if (state.view === "multi_nbi") {
      el.exportButton.disabled = true;
      el.exportButton.title = "La exportación Excel no está habilitada en la vista Varias NBI";
    } else {
      el.exportButton.disabled = exportCount === 0;
      el.exportButton.title = exportCount
        ? `Exportar ${number0.format(exportCount)} ${LEVELS[state.level].plural} filtrados · ${INDICATORS[state.indicator].label}`
        : `No hay ${LEVELS[state.level].plural} que cumplan los filtros`;
    }
  }

  function legendScale(title, colors, lowLabel, highLabel, note) {
    el.legend.replaceChildren();
    el.legend.appendChild(create("h3", "", title));
    const scale = create("div", "legend-scale");
    scale.style.background = `linear-gradient(90deg, ${colors.join(", ")})`;
    scale.setAttribute("role", "img");
    scale.setAttribute("aria-label", `${lowLabel} a ${highLabel}`);
    el.legend.appendChild(scale);
    const labels = create("div", "legend-labels");
    labels.append(create("span", "", lowLabel), create("span", "", highLabel));
    el.legend.appendChild(labels);
    el.legend.appendChild(create("p", "", note));
  }

  function legendNbiTerciles(title, thresholds) {
    el.legend.replaceChildren();
    el.legend.appendChild(create("h3", "", title));

    const scale = create("div", "legend-scale");
    scale.style.gridTemplateColumns = "repeat(3, 1fr)";
    scale.style.background = "none";
    [VIVID_GREEN, VIVID_YELLOW, VIVID_RED].forEach((color) => {
      const segment = create("span", "");
      segment.style.background = color;
      scale.appendChild(segment);
    });
    scale.setAttribute("role", "img");
    scale.setAttribute("aria-label", "Tercil bajo, tercil medio y tercil alto de necesidad insatisfecha");
    el.legend.appendChild(scale);

    const labels = create("div", "legend-labels");
    labels.append(
      create("span", "", "Bajo"),
      create("span", "", "Medio"),
      create("span", "", "Alto"),
    );
    el.legend.appendChild(labels);

    const q1 = thresholds?.q1;
    const q2 = thresholds?.q2;
    const cuts = Number.isFinite(q1) && Number.isFinite(q2)
      ? ` Cortes: ${number1.format(q1)} % y ${number1.format(q2)} %.`
      : "";
    el.legend.appendChild(create("p", "", `Colores por terciles del porcentaje de necesidad insatisfecha para el nivel territorial, indicador y año seleccionados.${cuts} Verde: tercil bajo; amarillo: medio; rojo: alto. Gris: sin dato.`));
  }

  function renderLegend() {
    const indicator = INDICATORS[state.indicator];
    el.legend.classList.toggle("is-comparison", state.view === "comparison");
    if (state.view === "nbi") {
      if (state.measure === "change") {
        el.legend.replaceChildren();
        el.legend.appendChild(create("h3", "", "Avance 2017–2025 (puntos porcentuales)"));

        const scale = create("div", "legend-scale");
        scale.style.gridTemplateColumns = "repeat(3, 1fr)";
        [
          [VIVID_RED, "Retroceso"],
          [STAGNANT_ORANGE, "Estancado"],
          [VIVID_GREEN, "Avance"],
        ].forEach(([color, label]) => {
          const segment = create("span", "");
          segment.style.background = color;
          segment.title = label;
          scale.appendChild(segment);
        });
        el.legend.appendChild(scale);

        const labels = create("div", "legend-labels");
        labels.style.display = "grid";
        labels.style.gridTemplateColumns = "repeat(3, 1fr)";
        [
          ["< −5 pp", "Retroceso"],
          ["−5 a +5 pp", "Estancado"],
          ["> +5 pp", "Avance"],
        ].forEach(([range, label]) => {
          const item = create("span", "", `${label}: ${range}`);
          item.style.textAlign = "center";
          labels.appendChild(item);
        });
        el.legend.appendChild(labels);
        el.legend.appendChild(create(
          "p",
          "",
          "Retroceso: menos de −5 pp. Estancado: entre −5 y +5 pp, inclusive. Avance: más de +5 pp. Gris: no comparable.",
        ));
      } else {
        const thresholds = state.model.nbiTerciles?.[state.level]?.[Number(state.measure)]?.[state.indicator];
        legendNbiTerciles(`Necesidad insatisfecha ${state.measure} (%)`, thresholds);
      }
      return;
    }
    if (state.view === "multi_nbi") {
      el.legend.replaceChildren();
      el.legend.appendChild(create("h3", "", "Servicios priorizados con estancamiento o retroceso"));
      const scale = create("div", "legend-scale");
      scale.style.gridTemplateColumns = "repeat(4, 1fr)";
      scale.style.background = "none";
      [
        [VIVID_GREEN, "0 servicios"],
        [SOFT_RED, "1 servicio"],
        [VIVID_RED, "2 servicios"],
        [DARK_RED, "3 servicios"],
      ].forEach(([color, label]) => {
        const segment = create("span", "");
        segment.style.background = color;
        segment.title = label;
        scale.appendChild(segment);
      });
      el.legend.appendChild(scale);
      const labels = create("div", "legend-labels");
      labels.style.display = "grid";
      labels.style.gridTemplateColumns = "repeat(4, 1fr)";
      ["0", "1", "2", "3"].forEach((value) => {
        const item = create("span", "", value);
        item.style.textAlign = "center";
        labels.appendChild(item);
      });
      el.legend.appendChild(labels);
      el.legend.appendChild(create("p", "", "Se cuentan los servicios priorizados agua cobertura, electricidad y educación. Un servicio suma cuando entre 2017 y 2025 presenta estancamiento (−5 a +5 pp) o retroceso (< −5 pp). Gris: sin dato comparable."));
      return;
    }
    if (state.view === "investment") {
      const measure = INVESTMENT_MEASURES[state.measure] || INVESTMENT_MEASURES.accrued_per_capita;
      if (measure.perCapita && state.model.hasTotalPopulation2025 === false) {
        legendScale(
          "Devengado por persona no disponible",
          [NO_DATA_COLOR, NO_DATA_COLOR],
          "Sin población total 2025",
          "Sin población total 2025",
          "La fuente vigente permite calcular las necesidades básicas, pero no incluye población censada total para calcular montos por persona.",
        );
        return;
      }

      const thresholds = investmentMeasureTerciles();
      const q1 = thresholds?.q1;
      const q2 = thresholds?.q2;
      el.legend.replaceChildren();
      el.legend.appendChild(create("h3", "", measure.short));

      const scale = create("div", "legend-scale");
      scale.style.gridTemplateColumns = "repeat(3, 1fr)";
      scale.style.background = "none";
      [
        [VIVID_RED, "Tercil bajo"],
        [VIVID_YELLOW, "Tercil medio"],
        [VIVID_GREEN, "Tercil alto"],
      ].forEach(([color, label]) => {
        const segment = create("span", "");
        segment.style.background = color;
        segment.title = label;
        scale.appendChild(segment);
      });
      scale.setAttribute("role", "img");
      scale.setAttribute("aria-label", "Tercil bajo, medio y alto de inversión");
      el.legend.appendChild(scale);

      const low = Number.isFinite(q1)
        ? `Bajo: ≤ ${formatInvestmentMeasureValue(q1, state.measure, true)}`
        : "Tercil bajo";
      const medium = Number.isFinite(q1) && Number.isFinite(q2)
        ? `Medio: ${formatInvestmentMeasureValue(q1, state.measure, true)}–${formatInvestmentMeasureValue(q2, state.measure, true)}`
        : "Tercil medio";
      const high = Number.isFinite(q2)
        ? `Alto: > ${formatInvestmentMeasureValue(q2, state.measure, true)}`
        : "Tercil alto";

      const labels = create("div", "legend-labels");
      labels.style.display = "grid";
      labels.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
      [low, medium, high].forEach((label) => {
        const item = create("span", "", label);
        item.style.textAlign = "center";
        item.style.lineHeight = "1.2";
        labels.appendChild(item);
      });
      el.legend.appendChild(labels);

      el.legend.appendChild(create(
        "p",
        "",
        `Terciles calculados para el nivel territorial y sector seleccionados. El valor 0 se clasifica como bajo. Gris: sin dato.`,
      ));
      return;
    }

    if (state.model.hasTotalPopulation2025 === false) {
      legendScale(
        "Medida no disponible",
        [NO_DATA_COLOR, NO_DATA_COLOR],
        "Sin población total 2025",
        "Sin población total 2025",
        "El cruce requiere población censada total 2025 para calcular el devengado por persona sin usar una aproximación inadecuada.",
      );
      return;
    }

    el.legend.replaceChildren();
    el.legend.appendChild(create("h3", "", "Medida de brecha e inversión"));
    const matrixWrap = create("div", "legend-matrix-wrap");
    matrixWrap.setAttribute("role", "group");
    matrixWrap.setAttribute("aria-label", "Avance de cierre de brecha por devengado por persona");
    const matrixBody = create("div", "legend-matrix-body");
    const axisHeadings = create("div", "legend-axis-headings");
    axisHeadings.appendChild(create("div", "legend-axis-y", "Avance de cierre de brecha"));
    axisHeadings.appendChild(create("div", "legend-axis-x", "Devengado por persona"));
    matrixBody.appendChild(axisHeadings);
    const grid = create("div", "legend-grid");
    grid.appendChild(create("span"));
    [["Bajo", "low"], ["Medio", "medium"], ["Alto", "high"]].forEach(([label]) => grid.appendChild(create("span", "legend-col", label)));
    [
      ["Avance", "advance"],
      ["Estancado", "stagnant"],
      ["Retroceso", "setback"],
    ].forEach(([label, progress]) => {
      grid.appendChild(create("span", "legend-row", label));
      ["low", "medium", "high"].forEach((tier) => {
        const cell = create("span", "legend-cell");
        cell.style.background = COMPARISON_COLORS[progress][tier];
        cell.title = `${label} · tercil ${tier === "low" ? "bajo" : tier === "medium" ? "medio" : "alto"}`;
        grid.appendChild(cell);
      });
    });
    matrixBody.appendChild(grid);
    matrixWrap.appendChild(matrixBody);
    el.legend.appendChild(matrixWrap);
    el.legend.appendChild(create("p", "", "Avance: > +5 pp; estancado: −5 a +5 pp; retroceso: < −5 pp. Columnas: terciles del devengado asignado por habitante. Cero inversión = bajo; gris solo cuando falta la comparación de la brecha."));
  }

  function pngSafeFilenamePart(value) {
    return String(value || "mapa")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "mapa";
  }

  function appendPngText(parent, text, x, y, { size = 24, weight = 600, anchor = "middle" } = {}) {
    const node = svgCreate("text");
    node.setAttribute("x", x);
    node.setAttribute("y", y);
    node.setAttribute("text-anchor", anchor);
    node.setAttribute("font-family", '"Segoe UI", Arial, sans-serif');
    node.setAttribute("font-size", size);
    node.setAttribute("font-weight", weight);
    node.setAttribute("fill", "#171717");
    node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  function pngTitleLines(text, maxWidth, { size = 34, weight = 760 } = {}) {
    const words = String(text || "Mapa").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return ["Mapa"];

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return [String(text || "Mapa")];
    context.font = `${weight} ${size}px "Segoe UI", Arial, sans-serif`;

    const lines = [];
    let current = "";
    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (current && context.measureText(candidate).width > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });
    if (current) lines.push(current);
    return lines;
  }

  function appendPngDiscreteLegend(svg, y, items, title, width) {
    appendPngText(svg, title, width / 2, y, { size: 17, weight: 750 });
    const horizontalPadding = 40;
    const gap = 14;
    const itemWidth = (width - horizontalPadding * 2 - gap * Math.max(items.length - 1, 0)) / Math.max(items.length, 1);
    const startX = horizontalPadding;

    items.forEach((item, index) => {
      const x = startX + index * (itemWidth + gap);
      const swatch = svgCreate("rect");
      swatch.setAttribute("x", x);
      swatch.setAttribute("y", y + 17);
      swatch.setAttribute("width", itemWidth);
      swatch.setAttribute("height", 20);
      swatch.setAttribute("rx", 3);
      swatch.setAttribute("fill", item.color);
      svg.appendChild(swatch);
      appendPngText(svg, item.label, x + itemWidth / 2, y + 55, { size: 13, weight: 700 });
    });
    return y + 62;
  }

  function appendPngLegend(svg, startY, width) {
    const indicator = INDICATORS[state.indicator];
    if (state.view === "nbi" && state.measure === "change") {
      return appendPngDiscreteLegend(svg, startY, [
        { color: VIVID_RED, label: "Retroceso: < −5 pp" },
        { color: STAGNANT_ORANGE, label: "Estancado: −5 a +5 pp" },
        { color: VIVID_GREEN, label: "Avance: > +5 pp" },
      ], "Avance 2017–2025", width);
    }

    if (state.view === "nbi") {
      const thresholds = state.model.nbiTerciles?.[state.level]?.[Number(state.measure)]?.[state.indicator];
      const q1 = thresholds?.q1;
      const q2 = thresholds?.q2;
      const low = Number.isFinite(q1) ? `Bajo: ≤ ${number1.format(q1)} %` : "Tercil bajo";
      const medium = Number.isFinite(q1) && Number.isFinite(q2)
        ? `Medio: ${number1.format(q1)}–${number1.format(q2)} %`
        : "Tercil medio";
      const high = Number.isFinite(q2) ? `Alto: > ${number1.format(q2)} %` : "Tercil alto";
      return appendPngDiscreteLegend(svg, startY, [
        { color: VIVID_GREEN, label: low },
        { color: VIVID_YELLOW, label: medium },
        { color: VIVID_RED, label: high },
      ], `Necesidad insatisfecha ${state.measure} (%)`, width);
    }

    if (state.view === "multi_nbi") {
      return appendPngDiscreteLegend(svg, startY, [
        { color: VIVID_GREEN, label: "0" },
        { color: SOFT_RED, label: "1" },
        { color: VIVID_RED, label: "2" },
        { color: DARK_RED, label: "3" },
      ], "Servicios priorizados con estancamiento o retroceso", width);
    }

    if (state.view === "comparison") {
      appendPngText(svg, "Avance de brecha × devengado por persona", width / 2, startY, { size: 17, weight: 750 });
      const cellWidth = 112;
      const cellHeight = 22;
      const labelWidth = 118;
      const totalWidth = labelWidth + cellWidth * 3;
      const x0 = (width - totalWidth) / 2;
      ["Bajo", "Medio", "Alto"].forEach((label, column) => {
        appendPngText(svg, label, x0 + labelWidth + cellWidth * (column + 0.5), startY + 24, { size: 13, weight: 700 });
      });
      [
        ["Retroceso", "setback"],
        ["Estancado", "stagnant"],
        ["Avance", "advance"],
      ].forEach(([label, progress], row) => {
        appendPngText(svg, label, x0 + labelWidth - 10, startY + 45 + row * 28, { size: 13, weight: 700, anchor: "end" });
        ["low", "medium", "high"].forEach((tier, column) => {
          const cell = svgCreate("rect");
          cell.setAttribute("x", x0 + labelWidth + column * cellWidth + 4);
          cell.setAttribute("y", startY + 30 + row * 28);
          cell.setAttribute("width", cellWidth - 8);
          cell.setAttribute("height", cellHeight);
          cell.setAttribute("rx", 3);
          cell.setAttribute("fill", COMPARISON_COLORS[progress][tier]);
          svg.appendChild(cell);
        });
      });
      return startY + 118;
    }

    const measure = INVESTMENT_MEASURES[state.measure] || INVESTMENT_MEASURES.accrued_per_capita;
    const thresholds = investmentMeasureTerciles();
    const q1 = thresholds?.q1;
    const q2 = thresholds?.q2;
    const low = Number.isFinite(q1)
      ? `Bajo: ≤ ${formatInvestmentMeasureValue(q1, state.measure, true)}`
      : "Tercil bajo";
    const medium = Number.isFinite(q1) && Number.isFinite(q2)
      ? `Medio: ${formatInvestmentMeasureValue(q1, state.measure, true)}–${formatInvestmentMeasureValue(q2, state.measure, true)}`
      : "Tercil medio";
    const high = Number.isFinite(q2)
      ? `Alto: > ${formatInvestmentMeasureValue(q2, state.measure, true)}`
      : "Tercil alto";
    return appendPngDiscreteLegend(svg, startY, [
      { color: VIVID_RED, label: low },
      { color: VIVID_YELLOW, label: medium },
      { color: VIVID_GREEN, label: high },
    ], measure.short, width);
  }

  function pngJoinWithOr(items) {
    if (!items.length) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} o ${items[1]}`;
    return `${items.slice(0, -1).join(", ")} o ${items[items.length - 1]}`;
  }

  function multiNbiIssues(record) {
    return multiNbiStatusDetails(record)
      .filter((detail) => detail.progress === "stagnant" || detail.progress === "setback");
  }

  function multiNbiIssueServicesText(record) {
    const issues = multiNbiIssues(record);
    return issues.length
      ? issues.map((detail) => detail.label).join("\n")
      : "Ninguna";
  }

  function multiNbiIssueMagnitudeText(record) {
    const issues = multiNbiIssues(record);
    return issues.length
      ? issues
        .map((detail) => `${detail.label}: ${PROGRESS_LABELS[detail.progress]} (${formatDelta(detail.delta)})`)
        .join("\n")
      : "Ninguna";
  }

  function multiNbiAverageSetbackMagnitude(record) {
    const setbacks = multiNbiStatusDetails(record)
      .filter((detail) => detail.progress === "setback" && Number.isFinite(detail.delta))
      .map((detail) => Math.abs(detail.delta));
    if (!setbacks.length) return null;
    return setbacks.reduce((sum, value) => sum + value, 0) / setbacks.length;
  }

  function pngFilteredMapTitle() {
    const indicator = INDICATORS[state.indicator];
    const levelPlural = LEVELS[state.level].plural;
    const territory = levelPlural.charAt(0).toUpperCase() + levelPlural.slice(1);

    if (state.view === "multi_nbi") {
      const multiParts = [];

      if (!selectionIsAll(state.filters.tier, TIER_FILTER_VALUES)) {
        const tierAdjectives = { low: "bajo", medium: "medio", high: "alto" };
        const selectedTiers = TIER_FILTER_VALUES
          .filter((tier) => state.filters.tier.includes(tier))
          .map((tier) => tierAdjectives[tier]);
        multiParts.push(selectedTiers.length
          ? `devengado ${pngJoinWithOr(selectedTiers)}`
          : "sin categorías de devengado seleccionadas");
      }

      if (!selectionIsAll(state.filters.multiNbi, MULTI_NBI_FILTER_VALUES)) {
        const selectedCounts = MULTI_NBI_FILTER_VALUES.filter((value) => state.filters.multiNbi.includes(value));
        multiParts.push(selectedCounts.length
          ? `${pngJoinWithOr(selectedCounts)} NBI con estancamiento o retroceso`
          : "sin números de NBI seleccionados");
      }

      return multiParts.length
        ? `Varias NBI: ${territory} con ${multiParts.join(" y ")}`
        : `Varias NBI: ${territory} según número de servicios priorizados con estancamiento o retroceso`;
    }

    const parts = [];

    if (!selectionIsAll(state.filters.tier, TIER_FILTER_VALUES)) {
      const tierAdjectives = { low: "baja", medium: "media", high: "alta" };
      const selectedTiers = TIER_FILTER_VALUES
        .filter((tier) => state.filters.tier.includes(tier))
        .map((tier) => tierAdjectives[tier]);
      parts.push(selectedTiers.length
        ? `inversión sectorial ${pngJoinWithOr(selectedTiers)}`
        : "sin categorías de inversión sectorial seleccionadas");
    }

    if (!selectionIsAll(state.filters.progress, PROGRESS_FILTER_VALUES)) {
      const progressNouns = { setback: "retroceso", stagnant: "estancamiento", advance: "avance" };
      const selectedProgress = ["setback", "stagnant", "advance"]
        .filter((progress) => state.filters.progress.includes(progress))
        .map((progress) => progressNouns[progress]);
      parts.push(selectedProgress.length
        ? `cierre de brecha con ${pngJoinWithOr(selectedProgress)}`
        : "sin estados de cierre de brecha seleccionados");
    }

    return parts.length
      ? `${indicator.label}: ${territory} con ${parts.join(" y ")}`
      : el.mapHeading.textContent;
  }

  function tableShowsAdvance() {
    return state.view === "comparison" || (state.view === "nbi" && state.measure === "change");
  }

  function tableGeographyColumns() {
    if (state.level === "region") return [{ key: "department", label: "Departamento" }];
    if (state.level === "province") return [
      { key: "department", label: "Departamento" },
      { key: "province", label: "Provincia" },
    ];
    return [
      { key: "department", label: "Departamento" },
      { key: "province", label: "Provincia" },
      { key: "district", label: "Distrito" },
    ];
  }

  function tableGeographyValue(record, key) {
    if (key === "department") return state.level === "region" ? record.name : record.regionName;
    if (key === "province") return state.level === "province" ? record.name : record.provinceName;
    if (key === "district") return record.name;
    return "";
  }

  function tableNbiValue(record, year) {
    return record.nbi[year][state.indicator];
  }

  function formatTableNbi(detail) {
    if (!detail || detail.rate === null || !Number.isFinite(detail.rate)) return "Sin dato";
    const numerator = Number.isFinite(detail.numerator) ? number0.format(detail.numerator) : "—";
    const denominator = Number.isFinite(detail.denominator) ? number0.format(detail.denominator) : "—";
    return `${number1.format(detail.rate * 100)} %\n(${numerator}/${denominator})`;
  }

  function tableSortDefinitions() {
    if (state.view === "multi_nbi") {
      return [
        {
          value: "multiNbiCountThenSetback",
          label: "N° NBI + mayor retroceso promedio",
          compare: (first, second, direction) => {
            const firstCount = multiNbiIssueCount(first);
            const secondCount = multiNbiIssueCount(second);
            const firstValid = firstCount !== null && Number.isFinite(firstCount);
            const secondValid = secondCount !== null && Number.isFinite(secondCount);

            if (firstValid !== secondValid) return firstValid ? -1 : 1;
            if (firstValid && secondValid && firstCount !== secondCount) {
              return (firstCount - secondCount) * direction;
            }

            const firstAverage = multiNbiAverageSetbackMagnitude(first) ?? 0;
            const secondAverage = multiNbiAverageSetbackMagnitude(second) ?? 0;
            if (firstAverage !== secondAverage) return (firstAverage - secondAverage) * direction;
            return 0;
          },
        },
        {
          value: "averageSetback",
          label: "Mayor retroceso promedio (pp)",
          number: (record) => multiNbiAverageSetbackMagnitude(record),
        },
        {
          value: "multiNbiCount",
          label: "N° de NBI con estancamiento o retroceso",
          number: (record) => multiNbiIssueCount(record),
        },
        {
          value: "waterCoverageDelta",
          label: "Agua cobertura · avance 2017–2025 (pp)",
          number: (record) => record.delta.water_coverage,
        },
        {
          value: "electricityDelta",
          label: "Electricidad · avance 2017–2025 (pp)",
          number: (record) => record.delta.electricity,
        },
        {
          value: "educationDelta",
          label: "Educación · avance 2017–2025 (pp)",
          number: (record) => record.delta.education,
        },
      ];
    }

    return [
      {
        value: "nbi2017",
        label: "Brecha 2017 · del sector",
        number: (record) => tableNbiValue(record, 2017)?.rate,
      },
      {
        value: "nbi2025",
        label: "Brecha 2025 · del sector",
        number: (record) => tableNbiValue(record, 2025)?.rate,
      },
      {
        value: "advance",
        label: "Avance 2017–2025 · del sector",
        number: (record) => record.delta[state.indicator],
      },
      {
        value: "accruedPerCapita",
        label: "Devengado per cápita · del sector",
        number: (record) => record.investment[INDICATORS[state.indicator].theme].accruedPerCapita,
      },
    ];
  }

  function defaultTableSort() {
    if (state.view === "multi_nbi") return "multiNbiCount";
    if (state.view === "nbi" && state.measure === "2017") return "nbi2017";
    if (state.view === "nbi" && state.measure === "2025") return "nbi2025";
    if (state.view === "nbi" && state.measure === "change") return "advance";
    return "accruedPerCapita";
  }

  function syncTableSortControl() {
    const definitions = tableSortDefinitions();
    const allowed = definitions.map((definition) => definition.value);
    if (!allowed.includes(state.tableSort)) state.tableSort = defaultTableSort();
    if (!allowed.includes(state.tableSort)) state.tableSort = allowed[0] || "nbi2025";
    el.tableSortSelect.replaceChildren();
    definitions.forEach((definition) => {
      const option = create("option", "", definition.label);
      option.value = definition.value;
      el.tableSortSelect.appendChild(option);
    });
    el.tableSortSelect.value = state.tableSort;
    el.tableDirectionSelect.value = state.tableDirection;
    el.tableLimitInput.value = state.tableLimit;
  }

  function tableColumnSelectorLabel(column) {
    const sectorLabels = {
      nbi2017: "Brecha 2017 · del sector",
      nbi2025: "Brecha 2025 · del sector",
      advance: "Avance de brecha · del sector",
      progress: "Condición de avance · del sector",
      accruedPerCapita: "Devengado per cápita · del sector",
      tier: "Condición de inversión · del sector",
      beneficiaries: "Beneficiarios · del sector",
    };
    return sectorLabels[column.key] || column.label;
  }

  function tableColumns() {
    if (state.view === "multi_nbi") {
      return [
        ...tableGeographyColumns().map((column) => ({
          ...column,
          cell: (record) => ({ text: tableGeographyValue(record, column.key) }),
        })),
        {
          key: "population2017",
          label: "Población censada 2017",
          cell: (record) => {
            const value = record.population[2017].population;
            return { text: Number.isFinite(value) ? number0.format(value) : "Sin dato" };
          },
        },
        {
          key: "population2025",
          label: "Población censada 2025",
          cell: (record) => {
            const value = record.population[2025].population;
            return { text: Number.isFinite(value) ? number0.format(value) : "Sin dato" };
          },
        },
        {
          key: "multiNbiCount",
          label: "N° de NBI con estancamiento o retroceso",
          cell: (record) => {
            const value = multiNbiIssueCount(record);
            return { text: value === null ? "Sin dato" : number0.format(value) };
          },
        },
        {
          key: "multiNbiAffected",
          label: "NBI con estancamiento o retroceso",
          cell: (record) => ({ text: multiNbiIssueServicesText(record) }),
        },
        {
          key: "multiNbiMagnitude",
          label: "Condición y cuantía 2017–2025",
          cell: (record) => ({ text: multiNbiIssueMagnitudeText(record) }),
        },
      ];
    }

    const indicator = INDICATORS[state.indicator];
    return [
      ...tableGeographyColumns().map((column) => ({
        ...column,
        cell: (record) => ({ text: tableGeographyValue(record, column.key) }),
      })),
      {
        key: "population2017",
        label: "Población censada 2017",
        cell: (record) => {
          const value = record.population[2017].population;
          return { text: Number.isFinite(value) ? number0.format(value) : "Sin dato", className: "table-number" };
        },
      },
      {
        key: "population2025",
        label: "Población censada 2025",
        cell: (record) => {
          const value = record.population[2025].population;
          return { text: Number.isFinite(value) ? number0.format(value) : "Sin dato", className: "table-number" };
        },
      },
      {
        key: "nbi2017",
        label: `${indicator.label} 2017`,
        cell: (record) => ({ text: formatTableNbi(tableNbiValue(record, 2017)), className: "table-number" }),
      },
      {
        key: "nbi2025",
        label: `${indicator.label} 2025`,
        cell: (record) => ({ text: formatTableNbi(tableNbiValue(record, 2025)), className: "table-number" }),
      },
      {
        key: "advance",
        label: "Avance 2017–2025 (pp)",
        cell: (record) => ({ text: formatDelta(record.delta[state.indicator]), className: "table-number" }),
      },
      {
        key: "progress",
        label: "Condición de avance",
        cell: (record) => {
          const progress = progressClass(record.delta[state.indicator]);
          return { text: PROGRESS_LABELS[progress], className: `table-condition table-progress-${progress}` };
        },
      },
      {
        key: "accruedPerCapita",
        label: `Devengado per cápita · ${indicator.themeLabel}`,
        cell: (record) => {
          const value = record.investment[indicator.theme].accruedPerCapita;
          return { text: formatSoles(value, true), className: "table-number" };
        },
      },
      {
        key: "tier",
        label: "Condición de inversión",
        cell: (record) => {
          const tier = investmentTier(record.investment[indicator.theme].accruedPerCapita, state.level, indicator.theme);
          return { text: TIER_LABELS[tier], className: `table-condition table-tier-${tier}` };
        },
      },
      {
        key: "beneficiaries",
        label: `Beneficiarios asignados · ${indicator.themeLabel}`,
        cell: (record) => {
          const investment = record.investment[indicator.theme];
          if (!investment.beneficiaryKnownCount) return { text: "Sin dato", className: "table-number" };
          const value = investment.allocatedBeneficiaries;
          const suffix = investment.beneficiaryKnownCount < investment.count ? " (parcial)" : "";
          return { text: `${number0.format(value)}${suffix}`, className: "table-number" };
        },
      },
    ];
  }

  function visibleTableColumns(allColumns = tableColumns()) {
    const hidden = new Set(state.tableHiddenColumns);
    const visible = allColumns.filter((column) => !hidden.has(column.key));
    return visible.length ? visible : allColumns.slice(0, 1);
  }

  function syncTableColumnsControl(allColumns = tableColumns()) {
    const hidden = new Set(state.tableHiddenColumns);
    el.tableColumnsOptions.replaceChildren();
    allColumns.forEach((column) => {
      const choice = create("label", "table-column-choice");
      const checkbox = create("input");
      checkbox.type = "checkbox";
      checkbox.value = column.key;
      checkbox.checked = !hidden.has(column.key);
      choice.append(checkbox, create("span", "", tableColumnSelectorLabel(column)));
      el.tableColumnsOptions.appendChild(choice);
    });
    const visibleCount = allColumns.filter((column) => !hidden.has(column.key)).length;
    el.tableColumnsSummary.textContent = `Columnas (${visibleCount}/${allColumns.length})`;
  }

  function tableSortedRecords() {
    const definitions = tableSortDefinitions();
    const sortDefinition = definitions.find((definition) => definition.value === state.tableSort) || definitions[0];
    const direction = state.tableDirection === "asc" ? 1 : -1;
    const records = [...filteredRecords(state.level)];
    records.sort((first, second) => {
      if (typeof sortDefinition?.compare === "function") {
        const compared = sortDefinition.compare(first, second, direction);
        if (compared !== 0) return compared;
      }

      const a = sortDefinition?.number?.(first);
      const b = sortDefinition?.number?.(second);
      const aValid = a !== null && a !== undefined && Number.isFinite(a);
      const bValid = b !== null && b !== undefined && Number.isFinite(b);
      if (aValid && bValid && a !== b) return (a - b) * direction;
      if (aValid !== bValid) return aValid ? -1 : 1;
      const firstName = `${first.regionName || ""} ${first.provinceName || ""} ${first.name || ""}`;
      const secondName = `${second.regionName || ""} ${second.provinceName || ""} ${second.name || ""}`;
      return firstName.localeCompare(secondName, "es", { sensitivity: "base" });
    });
    return records;
  }

  function renderTableNote() {
    if (state.view === "multi_nbi") {
      el.tableNote.replaceChildren();
      el.tableNote.append(
        create("p", "", "Servicios priorizados: agua cobertura, electricidad y educación."),
        create("p", "", "La columna “NBI con estancamiento o retroceso” identifica únicamente los servicios que no muestran un avance superior a +5 pp."),
        create("p", "", "La cuantía se expresa en puntos porcentuales de avance, calculados como porcentaje 2017 menos porcentaje 2025. Retroceso: < −5 pp; estancado: −5 a +5 pp, inclusive; avance: > +5 pp."),
      );
      return;
    }

    const indicator = INDICATORS[state.indicator];
    const thresholds = state.model.terciles[state.level][indicator.theme];
    const q1 = thresholds?.q1;
    const q2 = thresholds?.q2;
    const tierMeaning = Number.isFinite(q1) && Number.isFinite(q2)
      ? `Bajo: hasta ${formatSoles(q1, true)} por persona; medio: más de ${formatSoles(q1, true)} y hasta ${formatSoles(q2, true)}; alto: más de ${formatSoles(q2, true)}. El valor 0 se clasifica como bajo.`
      : "Bajo, medio y alto corresponden a los terciles del devengado sectorial por persona del nivel territorial seleccionado; el valor 0 se clasifica como bajo.";
    el.tableNote.replaceChildren();
    el.tableNote.append(
      create("p", "", "Indicadores 2017 y 2025: porcentaje de necesidad insatisfecha; debajo se muestran casos/universo."),
      create("p", "", `Condición de inversión — ${tierMeaning}`),
      create("p", "", "Condición de avance — Retroceso: menos de −5 pp; estancado: entre −5 y +5 pp, inclusive; avance: más de +5 pp. Avance = porcentaje 2017 menos porcentaje 2025."),
      create("p", "", "Beneficiarios: suma de los beneficiarios reportados por las inversiones cerradas del sector relacionadas con el territorio. Cuando una inversión abarca varias unidades, se prorratea proporcionalmente a la población censada 2025; si faltan beneficiarios en alguna inversión se indica como parcial."),
    );
  }

  function clampTablePanelWidth(width) {
    const workspaceWidth = el.workspace?.getBoundingClientRect().width || window.innerWidth;
    const controlWidth = el.workspace?.querySelector(".control-panel")?.getBoundingClientRect().width || 0;
    const maximum = Math.max(360, workspaceWidth - controlWidth - 340);
    return clamp(width, 360, maximum);
  }

  function setTablePanelWidth(width) {
    if (!Number.isFinite(width)) {
      state.tablePanelWidth = null;
      el.workspace.style.removeProperty("--table-panel-width");
      return;
    }
    const next = clampTablePanelWidth(width);
    state.tablePanelWidth = next;
    el.workspace.style.setProperty("--table-panel-width", `${Math.round(next)}px`);
    scheduleMapLabels();
  }

  function applyTableColumnWidth(index, key, width) {
    const next = clamp(width, 72, 520);
    state.tableColumnWidths[key] = next;
    el.territoryTable.querySelectorAll("tr").forEach((row) => {
      const cell = row.children[index];
      if (!cell) return;
      cell.style.width = `${Math.round(next)}px`;
      cell.style.minWidth = `${Math.round(next)}px`;
      cell.style.maxWidth = `${Math.round(next)}px`;
    });
  }

  function attachTableColumnResizer(th, index, key) {
    const handle = create("span", "table-column-resizer");
    handle.setAttribute("aria-hidden", "true");
    handle.title = "Arrastra para cambiar el ancho de la columna";
    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startWidth = th.getBoundingClientRect().width;
      handle.setPointerCapture?.(event.pointerId);

      const onMove = (moveEvent) => {
        applyTableColumnWidth(index, key, startWidth + moveEvent.clientX - startX);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    });
    th.appendChild(handle);
  }

  function renderTablePanel() {
    if (!state.tableOpen || !state.model) return;
    syncTableSortControl();
    const allRecords = tableSortedRecords();
    const requestedLimit = Math.max(1, Math.min(MAX_TABLE_RENDER_ROWS, Math.trunc(finiteNumber(state.tableLimit, 50))));
    state.tableLimit = requestedLimit;
    const records = allRecords.slice(0, requestedLimit);
    const allColumns = tableColumns();
    syncTableColumnsControl(allColumns);
    const columns = visibleTableColumns(allColumns);

    el.tableTitle.textContent = pngFilteredMapTitle();
    el.territoryTableHead.replaceChildren();
    el.territoryTableBody.replaceChildren();

    const headRow = create("tr");
    columns.forEach((column, index) => {
      const th = create("th", "", column.label);
      attachTableColumnResizer(th, index, column.key);
      headRow.appendChild(th);
    });
    el.territoryTableHead.appendChild(headRow);

    const bodyFragment = document.createDocumentFragment();
    records.forEach((record) => {
      const row = create("tr");
      columns.forEach((column) => {
        const cellValue = column.cell(record);
        const cell = create("td", cellValue.className || "", cellValue.text);
        row.appendChild(cell);
      });
      bodyFragment.appendChild(row);
    });
    el.territoryTableBody.appendChild(bodyFragment);

    columns.forEach((column, index) => {
      const savedWidth = state.tableColumnWidths[column.key];
      if (Number.isFinite(savedWidth)) applyTableColumnWidth(index, column.key, savedWidth);
    });

    const sortLabel = tableSortDefinitions().find((definition) => definition.value === state.tableSort)?.label || "indicador";
    const directionLabel = state.tableDirection === "asc" ? "menor a mayor" : "mayor a menor";
    el.tableCount.textContent = state.view === "multi_nbi"
      ? `Mostrando ${number0.format(records.length)} de ${number0.format(allRecords.length)} ${LEVELS[state.level].plural} · orden: ${sortLabel}, ${directionLabel}.`
      : `Mostrando ${number0.format(records.length)} de ${number0.format(allRecords.length)} ${LEVELS[state.level].plural} filtrados · orden: ${sortLabel}, ${directionLabel}.`;
    renderTableNote();
  }

  function syncRightPanelLayout() {
    el.workspace.classList.toggle("has-table", state.tableOpen || state.pngOpen);
    requestAnimationFrame(() => scheduleMapLabels());
  }

  function setTableOpen(open) {
    state.tableOpen = Boolean(open);
    if (state.tableOpen && state.pngOpen) {
      state.pngOpen = false;
      el.pngPanel.hidden = true;
      el.downloadPngButton.setAttribute("aria-pressed", "false");
      el.downloadPngButton.title = "Abrir vista previa PNG";
    }
    el.tablePanel.hidden = !state.tableOpen;
    el.tableButton.setAttribute("aria-pressed", state.tableOpen ? "true" : "false");
    el.tableButton.textContent = state.tableOpen ? "Ocultar tabla" : "Tabla";
    if (state.tableOpen && Number.isFinite(state.tablePanelWidth)) setTablePanelWidth(state.tablePanelWidth);
    if (state.tableOpen) renderTablePanel();
    syncRightPanelLayout();
  }

  function setPngOpen(open) {
    state.pngOpen = Boolean(open);
    if (state.pngOpen && state.tableOpen) {
      state.tableOpen = false;
      el.tablePanel.hidden = true;
      el.tableButton.setAttribute("aria-pressed", "false");
      el.tableButton.textContent = "Tabla";
    }
    el.pngPanel.hidden = !state.pngOpen;
    el.downloadPngButton.setAttribute("aria-pressed", state.pngOpen ? "true" : "false");
    el.downloadPngButton.title = state.pngOpen ? "Ocultar vista previa PNG" : "Abrir vista previa PNG";
    if (state.pngOpen && Number.isFinite(state.tablePanelWidth)) setTablePanelWidth(state.tablePanelWidth);
    syncRightPanelLayout();
  }

  function clearPngObjectUrl() {
    if (state.pngObjectUrl) URL.revokeObjectURL(state.pngObjectUrl);
    state.pngObjectUrl = "";
    state.pngBlob = null;
    state.pngFilename = "";
  }

  function clipboardEscapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function inlineComputedTableStyles(source, clone) {
    const properties = [
      "background-color", "color", "font-family", "font-size", "font-weight", "font-style",
      "font-variant-numeric", "line-height", "letter-spacing", "text-align", "vertical-align",
      "white-space", "overflow-wrap", "word-break", "padding-top", "padding-right",
      "padding-bottom", "padding-left", "border-top-width", "border-top-style",
      "border-top-color", "border-right-width", "border-right-style", "border-right-color",
      "border-bottom-width", "border-bottom-style", "border-bottom-color", "border-left-width",
      "border-left-style", "border-left-color", "width", "min-width", "max-width",
    ];
    const sourceNodes = [source, ...source.querySelectorAll("*")];
    const cloneNodes = [clone, ...clone.querySelectorAll("*")];

    sourceNodes.forEach((node, index) => {
      const target = cloneNodes[index];
      if (!target || !(node instanceof Element)) return;
      const computed = getComputedStyle(node);
      const style = properties
        .map((property) => `${property}:${computed.getPropertyValue(property)}`)
        .join(";");
      target.setAttribute("style", style);

      if (target.classList.contains("table-column-resizer")) target.remove();
    });

    clone.style.borderCollapse = "separate";
    clone.style.borderSpacing = "0";
    clone.style.userSelect = "text";
  }

  function tableHtmlForClipboard() {
    const clone = el.territoryTable.cloneNode(true);
    inlineComputedTableStyles(el.territoryTable, clone);

    const titleStyle = getComputedStyle(el.tableTitle);
    const title = `<h2 style="margin:0 0 8px;color:${titleStyle.color};font-family:${titleStyle.fontFamily};font-size:${titleStyle.fontSize};font-weight:${titleStyle.fontWeight};line-height:${titleStyle.lineHeight};">${clipboardEscapeHtml(el.tableTitle.textContent)}</h2>`;

    const noteClone = el.tableNote.cloneNode(true);
    inlineComputedTableStyles(el.tableNote, noteClone);
    noteClone.style.marginTop = "8px";
    noteClone.style.maxHeight = "none";
    noteClone.style.overflow = "visible";

    return `<div>${title}${clone.outerHTML}${noteClone.outerHTML}</div>`;
  }

  async function copyTerritoryTable() {
    const rows = [...el.territoryTable.querySelectorAll("tr")];
    const plain = rows.map((row) => [...row.children].map((cell) => cell.textContent.trim()).join("\t")).join("\n");
    const html = tableHtmlForClipboard();
    try {
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        })]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(plain);
      } else {
        throw new Error("El navegador no ofrece acceso al portapapeles.");
      }
      const previous = el.copyTableButton.textContent;
      el.copyTableButton.textContent = "Copiada";
      setTimeout(() => { el.copyTableButton.textContent = previous; }, 1200);
    } catch (error) {
      console.error("No se pudo copiar la tabla:", error);
      window.alert("No se pudo copiar automáticamente. Puedes seleccionar las celdas de la tabla y copiarlas con Ctrl+C.");
    }
  }

  function pngLegendHeight() {
    if (state.view === "comparison") return 128;
    return 72;
  }

  async function generateTransparentMapPng() {
    if (!state.model || !el.mapLayer || !el.mapLayer.children.length) {
      throw new Error("El mapa todavía no está listo.");
    }
    const sourceSvgUrl = { value: "" };
    try {
      const bounds = el.mapLayer.getBBox();
      if (!(bounds.width > 0) || !(bounds.height > 0)) throw new Error("El mapa no tiene una geometría exportable.");

      const width = PNG_EXPORT_WIDTH;
      const height = PNG_EXPORT_HEIGHT;
      const sidePadding = 58;
      const bottomPadding = 8;
      const legendHeight = pngLegendHeight();
      const legendY = height - bottomPadding - legendHeight + 10;
      const titleFontSize = 34;
      const titleFontWeight = 760;
      const titleLines = pngTitleLines(
        pngFilteredMapTitle(),
        width - sidePadding * 2,
        { size: titleFontSize, weight: titleFontWeight },
      );
      const exportSvg = svgCreate("svg");
      exportSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      exportSvg.setAttribute("width", width);
      exportSvg.setAttribute("height", height);
      exportSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      const defs = svgCreate("defs");
      exportSvg.appendChild(defs);

      let y = 36;
      titleLines.forEach((line) => {
        appendPngText(exportSvg, line, width / 2, y, { size: titleFontSize, weight: titleFontWeight });
        y += 37;
      });
      if (!el.mapSubheading.hidden && el.mapSubheading.textContent.trim()) {
        const subheadingLines = pngTitleLines(
          el.mapSubheading.textContent.trim(),
          width - sidePadding * 2,
          { size: 20, weight: 600 },
        );
        subheadingLines.forEach((line) => {
          appendPngText(exportSvg, line, width / 2, y + 1, { size: 20, weight: 600 });
          y += 24;
        });
      }
      y += 3;

      const maxMapWidth = width - sidePadding * 2;
      const maxMapHeight = Math.max(200, legendY - y - 12);
      const mapScale = Math.min(maxMapWidth / bounds.width, maxMapHeight / bounds.height);
      const mapWidth = bounds.width * mapScale;
      const mapHeight = bounds.height * mapScale;
      const mapX = (width - mapWidth) / 2;
      const mapY = y + Math.max(0, (maxMapHeight - mapHeight) / 2);
      const mapGroup = svgCreate("g");
      mapGroup.setAttribute(
        "transform",
        `translate(${mapX - bounds.x * mapScale} ${mapY - bounds.y * mapScale}) scale(${mapScale})`,
      );

      state.paths.forEach((path) => {
        const clone = path.cloneNode(false);
        const fill = path.style.fill || getComputedStyle(path).fill || NO_DATA_COLOR;
        clone.removeAttribute("class");
        clone.removeAttribute("style");
        clone.removeAttribute("tabindex");
        clone.removeAttribute("aria-label");
        clone.removeAttribute("aria-hidden");
        clone.setAttribute("fill", fill);
        clone.setAttribute("fill-opacity", "1");
        clone.setAttribute("stroke", "#fff");
        clone.setAttribute("stroke-width", ".5");
        clone.setAttribute("stroke-linecap", "round");
        clone.setAttribute("stroke-linejoin", "round");
        clone.setAttribute("vector-effect", "non-scaling-stroke");
        mapGroup.appendChild(clone);
      });
      exportSvg.appendChild(mapGroup);

      const visibleCount = filteredRecords(state.level).length;
      const totalCount = state.model.metrics[state.level].size;
      const countLabel = `${number0.format(visibleCount)} de ${number0.format(totalCount)} ${LEVELS[state.level].plural}`;
      appendPngText(exportSvg, countLabel, sidePadding, mapY + 18, {
        size: 14,
        weight: 750,
        anchor: "start",
      });

      appendPngLegend(exportSvg, legendY, width);

      const serialized = new XMLSerializer().serializeToString(exportSvg);
      const sourceBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
      sourceSvgUrl.value = URL.createObjectURL(sourceBlob);
      const image = await new Promise((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error("No se pudo rasterizar el mapa."));
        nextImage.src = sourceSvgUrl.value;
      });

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No se pudo crear el lienzo PNG.");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, width, height);
      const pngBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo generar el PNG.")), "image/png");
      });

      const indicatorPart = state.view === "multi_nbi"
        ? "varias-nbi"
        : pngSafeFilenamePart(INDICATORS[state.indicator].label);
      const measurePart = state.view === "multi_nbi"
        ? "servicios-priorizados"
        : pngSafeFilenamePart(state.measure);
      return {
        blob: pngBlob,
        filename: `mapa-${state.level}-${indicatorPart}-${measurePart}.png`,
      };
    } finally {
      if (sourceSvgUrl.value) URL.revokeObjectURL(sourceSvgUrl.value);
    }
  }

  async function renderPngPreview() {
    if (!state.pngOpen || !state.model || !el.mapLayer.children.length) return;
    const token = ++state.pngGenerationToken;
    if (state.pngPreviewTimer) {
      clearTimeout(state.pngPreviewTimer);
      state.pngPreviewTimer = 0;
    }

    el.pngPreviewImage.hidden = true;
    el.pngPreviewStatus.hidden = false;
    el.pngPreviewStatus.textContent = "Generando vista previa…";
    el.pngCopyButton.disabled = true;
    el.pngDownloadButton.disabled = true;
    el.pngPanelTitle.textContent = pngFilteredMapTitle();
    el.pngPreviewMeta.textContent = "Vista previa sobre fondo blanco; el archivo mantiene transparencia.";

    try {
      const result = await generateTransparentMapPng();
      if (token !== state.pngGenerationToken || !state.pngOpen) return;

      clearPngObjectUrl();
      state.pngBlob = result.blob;
      state.pngFilename = result.filename;
      state.pngObjectUrl = URL.createObjectURL(result.blob);

      el.pngPreviewImage.src = state.pngObjectUrl;
      el.pngPreviewImage.alt = `Vista previa PNG: ${pngFilteredMapTitle()}`;
      el.pngPreviewImage.hidden = false;
      el.pngPreviewStatus.hidden = true;
      el.pngCopyButton.disabled = false;
      el.pngDownloadButton.disabled = false;

      const visibleCount = filteredRecords(state.level).length;
      const totalCount = state.model.metrics[state.level].size;
      el.pngPreviewMeta.textContent =
        `${number0.format(visibleCount)} de ${number0.format(totalCount)} ${LEVELS[state.level].plural} · PNG transparente · ${PNG_EXPORT_WIDTH} × ${PNG_EXPORT_HEIGHT} px.`;
    } catch (error) {
      if (token !== state.pngGenerationToken) return;
      console.error("No se pudo generar la vista previa PNG:", error);
      el.pngPreviewStatus.hidden = false;
      el.pngPreviewStatus.textContent = `No se pudo generar el PNG. ${error.message || error}`;
      el.pngCopyButton.disabled = true;
      el.pngDownloadButton.disabled = true;
    }
  }

  function schedulePngPreviewRefresh() {
    if (!state.pngOpen) return;
    if (state.pngPreviewTimer) clearTimeout(state.pngPreviewTimer);
    state.pngPreviewTimer = setTimeout(() => {
      state.pngPreviewTimer = 0;
      renderPngPreview();
    }, 220);
  }

  function togglePngPreview() {
    if (state.pngOpen) {
      ++state.pngGenerationToken;
      setPngOpen(false);
      return;
    }
    setPngOpen(true);
    renderPngPreview();
  }

  async function copyPngPreview() {
    if (!state.pngBlob) return;
    const previous = el.pngCopyButton.textContent;
    el.pngCopyButton.disabled = true;
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        throw new Error("El navegador no permite copiar imágenes directamente.");
      }
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": state.pngBlob }),
      ]);
      el.pngCopyButton.textContent = "Imagen copiada";
      el.pngPreviewMeta.textContent = "Imagen copiada al portapapeles.";
      setTimeout(() => {
        el.pngCopyButton.textContent = previous;
        if (state.pngOpen && state.pngBlob) {
          const visibleCount = filteredRecords(state.level).length;
          const totalCount = state.model.metrics[state.level].size;
          el.pngPreviewMeta.textContent = `${number0.format(visibleCount)} de ${number0.format(totalCount)} ${LEVELS[state.level].plural} · PNG transparente · ${PNG_EXPORT_WIDTH} × ${PNG_EXPORT_HEIGHT} px.`;
        }
      }, 1400);
    } catch (error) {
      console.error("No se pudo copiar la imagen PNG:", error);
      window.alert("No se pudo copiar la imagen automáticamente. Esta función requiere permiso de portapapeles y un sitio seguro (HTTPS o localhost).");
    } finally {
      if (state.pngBlob) el.pngCopyButton.disabled = false;
    }
  }

  function downloadPngPreview() {
    if (!state.pngBlob || !state.pngFilename) return;
    const url = URL.createObjectURL(state.pngBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = state.pngFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function renderMapColors() {
    const metrics = state.model.metrics[state.level];
    const visibleRecords = filteredRecords(state.level);
    state.visibleCodes = new Set(visibleRecords.map((record) => record.code));

    state.paths.forEach((path, code) => {
      const record = metrics.get(code);
      const matches = Boolean(record && state.visibleCodes.has(code));
      const fill = !record ? NO_DATA_COLOR : matches ? fillForRecord(record) : FILTERED_OUT_COLOR;
      if (path.style.fill !== fill) path.style.fill = fill;
      path.classList.toggle("is-selected", code === state.selectedCode);
      path.classList.toggle("is-filtered-out", !matches);
      const nextTabIndex = matches ? "0" : "-1";
      if (path.getAttribute("tabindex") !== nextTabIndex) path.setAttribute("tabindex", nextTabIndex);
      if (matches) {
        if (path.hasAttribute("aria-hidden")) path.removeAttribute("aria-hidden");
        const ariaLabel = `${record.name}. Abrir ficha territorial.`;
        if (path.getAttribute("aria-label") !== ariaLabel) path.setAttribute("aria-label", ariaLabel);
      } else {
        if (path.getAttribute("aria-hidden") !== "true") path.setAttribute("aria-hidden", "true");
        const ariaLabel = record ? `${record.name}, fuera de los filtros activos.` : `UBIGEO ${code}, sin datos.`;
        if (path.getAttribute("aria-label") !== ariaLabel) path.setAttribute("aria-label", ariaLabel);
      }
    });
    scheduleMapLabels();
  }

  function renderFilteredView() {
    if (!state.model || !state.paths.size) return;
    const selectedRecord = state.selectedCode ? state.model.metrics[state.level].get(state.selectedCode) : null;
    if (selectedRecord && !recordMatchesFilters(selectedRecord, state.level)) {
      state.selectedCode = "";
      if (el.detailDialog.open) el.detailDialog.close();
    }
    renderContext();
    renderLegend();
    renderMapColors();
    el.downloadPngButton.disabled = false;
    setTerritorySearchValue(state.selectedCode);
    if (state.tableOpen) renderTablePanel();
    if (state.pngOpen) schedulePngPreviewRefresh();
  }

  async function renderAll({ rebuildGeometry = false } = {}) {
    const renderToken = ++state.renderToken;
    const level = state.level;
    if (rebuildGeometry) {
      state.currentGeometryLevel = "";
      state.selectedCode = "";
      resetMapTransform();
    }

    await ensureMapAssets(level);
    if (renderToken !== state.renderToken || level !== state.level) return;

    buildMapGeometry();
    if (!state.territorySearchEntries.length || rebuildGeometry) populateTerritorySearch();
    invalidateFilteredRecordsCache();
    renderFilteredView();
  }

  function metricCard(label, value, note) {
    const card = create("div", "metric-card");
    card.append(create("span", "", label), create("strong", "", value));
    if (note) {
      const detail = create("span", "", note);
      detail.style.marginTop = "4px";
      card.appendChild(detail);
    }
    return card;
  }

  function buildNbiTable(record) {
    const section = create("section", "detail-section");
    section.appendChild(create("h3", "", "Necesidad básica por año"));
    section.appendChild(create("p", "", INDICATORS[state.indicator].deprivation));
    const table = create("table", "data-table");
    const head = create("thead");
    const headRow = create("tr");
    ["Año", "Necesidad insatisfecha", "Casos", "Universo"].forEach((label) => headRow.appendChild(create("th", "", label)));
    head.appendChild(headRow);
    table.appendChild(head);
    const body = create("tbody");
    YEARS_NBI.forEach((year) => {
      const detail = record.nbi[year][state.indicator];
      const row = create("tr");
      row.append(
        create("td", "", year),
        create("td", "", formatPercent(detail.rate)),
        create("td", "", detail.numerator === null ? "—" : number0.format(detail.numerator)),
        create("td", "", detail.denominator === null ? "—" : number0.format(detail.denominator)),
      );
      body.appendChild(row);
    });
    table.appendChild(body);
    section.appendChild(table);
    const universeLabels = [...new Set(
      YEARS_NBI.map((year) => record.nbi[year][state.indicator].universeLabel).filter(Boolean),
    )];
    const universeLabel = universeLabels.length === 1
      ? universeLabels[0]
      : (universeLabels.join(" / ") || INDICATORS[state.indicator].universeLabel);
    section.appendChild(create("p", "", `Universo: ${universeLabel}. El universo numérico es la suma de las frecuencias de todas las respuestas disponibles; la tasa provincial o departamental suma casos y universos, no promedia porcentajes distritales.`));
    return section;
  }

  function buildMultiNbiDetailTable(record) {
    const section = create("section", "detail-section");
    section.appendChild(create("h3", "", "Servicios priorizados · Varias NBI"));
    section.appendChild(create(
      "p",
      "",
      "La vista combina exclusivamente agua cobertura, electricidad y educación. Avance = porcentaje 2017 menos porcentaje 2025.",
    ));

    const table = create("table", "data-table");
    const head = create("thead");
    const headRow = create("tr");
    ["Servicio", "2017", "2025", "Avance (pp)", "Situación"].forEach((label) => {
      headRow.appendChild(create("th", "", label));
    });
    head.appendChild(headRow);
    table.appendChild(head);

    const body = create("tbody");
    multiNbiStatusDetails(record).forEach((detail) => {
      const first = record.nbi[2017][detail.key];
      const last = record.nbi[2025][detail.key];
      const row = create("tr");
      const status = PROGRESS_LABELS[detail.progress] || "Sin dato";
      row.append(
        create("td", "", detail.label),
        create("td", "", formatPercent(first?.rate)),
        create("td", "", formatPercent(last?.rate)),
        create("td", "", formatDelta(detail.delta)),
        create("td", "", status),
      );
      body.appendChild(row);
    });
    table.appendChild(body);
    section.appendChild(table);
    section.appendChild(create(
      "p",
      "",
      "Retroceso: < −5 pp; estancado: −5 a +5 pp, inclusive; avance: > +5 pp.",
    ));
    return section;
  }

  function buildMultiNbiInvestmentTable(record) {
    const section = create("section", "detail-section");
    section.appendChild(create("h3", "", "Inversión cerrada por servicio priorizado"));
    section.appendChild(create(
      "p",
      "",
      "Resumen de inversiones cerradas 2017–2024 asociadas a cada uno de los tres servicios de esta vista.",
    ));

    const table = create("table", "data-table");
    const head = create("thead");
    const headRow = create("tr");
    ["Servicio", "Inversiones", "Devengado asociado", "Devengado asignado", "Devengado per cápita"].forEach((label) => {
      headRow.appendChild(create("th", "", label));
    });
    head.appendChild(headRow);
    table.appendChild(head);

    const body = create("tbody");
    MULTI_NBI_INDICATORS.forEach((indicatorKey) => {
      const item = INDICATORS[indicatorKey];
      const investment = record.investment[item.theme];
      const row = create("tr");
      row.append(
        create("td", "", MULTI_NBI_LABELS[indicatorKey]),
        create("td", "", number0.format(investment.count)),
        create("td", "", formatSoles(investment.accrued, true)),
        create("td", "", formatSoles(investment.allocatedAccrued, true)),
        create("td", "", formatSoles(investment.accruedPerCapita, true)),
      );
      body.appendChild(row);
    });
    table.appendChild(body);
    section.appendChild(table);
    return section;
  }

  function buildInvestmentBars(record) {
    const indicator = INDICATORS[state.indicator];
    const investment = record.investment[indicator.theme];
    const section = create("section", "detail-section");
    section.appendChild(create("h3", "", `Inversión cerrada · ${indicator.themeLabel}`));
    section.appendChild(create("p", "", "DEVEN_ACUMULADO asociado, agrupado por el año de FEC_CIERRE. Es el devengado acumulado de las inversiones cerradas en cada año, no una serie de ejecución anual."));
    const maximum = Math.max(...YEARS_INVESTMENT.map((year) => investment.byYear[year].accrued), 0);
    const bars = create("div", "bars");
    YEARS_INVESTMENT.forEach((year) => {
      const value = investment.byYear[year].accrued;
      const row = create("div", "bar-row");
      const track = create("div", "bar-track");
      const fill = create("div", "bar-fill");
      fill.style.width = `${maximum > 0 ? (value / maximum) * 100 : 0}%`;
      track.appendChild(fill);
      row.append(create("span", "", year), track, create("span", "bar-value", compactSoles(value)));
      bars.appendChild(row);
    });
    section.appendChild(bars);
    section.appendChild(create("p", "", `Devengado asociado: ${formatSoles(investment.accrued, true)} · devengado asignado: ${formatSoles(investment.allocatedAccrued, true)} · devengado por habitante: ${formatSoles(investment.accruedPerCapita, true)}. Como referencia secundaria, costo actualizado asociado: ${formatMoney(investment.cost, true)} · costo actualizado por habitante: ${formatMoney(investment.costPerCapita, true)} · liquidación asociada: ${formatMoney(investment.liquidation, true)}.`));
    return section;
  }

  function formatFieldValue(label, value) {
    if (value === null || value === undefined || value === "") return "—";
    if (value instanceof Date && !Number.isNaN(value.valueOf())) return dateFormat.format(value);
    if (norm(label) === "UBIGEO") return code6(value);
    if (norm(label) === "DEVEN_ACUMULADO") {
      const devengado = finiteNumber(value);
      return devengado === null ? String(value) : formatSoles(devengado, true);
    }
    if (typeof value === "number") return Number.isInteger(value) ? number0.format(value) : new Intl.NumberFormat("es-PE", { maximumFractionDigits: 4 }).format(value);
    if (typeof value === "boolean") return value ? "Sí" : "No";
    return String(value);
  }

  function populateProjectContent(details, project) {
    if (details.dataset.populated === "true") return;
    details.dataset.populated = "true";
    const content = create("div", "project-content");
    content.appendChild(create("p", "scope-note", project.scopeNote));
    const fields = create("dl", "field-grid");
    project.fields.forEach(([label, value]) => {
      const wrapper = create("div");
      wrapper.append(create("dt", "", label.replace(/_/g, " ")), create("dd", "", formatFieldValue(label, value)));
      fields.appendChild(wrapper);
    });
    content.appendChild(fields);
    details.appendChild(content);
  }

  function projectItem(project) {
    const details = create("details", "project-item");
    const summary = create("summary");
    summary.appendChild(create("strong", "", `${project.code ? `CUI ${project.code} · ` : ""}${project.name}`));
    const meta = create("div", "project-meta");
    meta.append(
      create("span", "", String(project.year)),
      create("span", "", `Dev. ${compactSoles(project.accrued)}`),
      create("span", "", project.entity || project.function || project.themes.map((theme) => THEME_LABELS[theme]).join(" · ")),
    );
    summary.appendChild(meta);
    details.appendChild(summary);
    details.addEventListener("toggle", () => {
      if (details.open) populateProjectContent(details, project);
    }, { once: true });
    return details;
  }

  function buildProjectsSection(record) {
    const indicator = INDICATORS[state.indicator];
    const projectIds = state.model.associations[state.level].get(record.code) || [];
    const projects = projectIds
      .map((id) => state.model.projects[id])
      .filter((project) => project && project.themes.includes(indicator.theme))
      .sort((a, b) => b.accrued - a.accrued || b.year - a.year || a.name.localeCompare(b.name, "es"));

    const section = create("section");
    section.style.marginTop = "14px";
    const heading = create("h3", "", `Detalle de inversiones en ${indicator.themeLabel.toLowerCase()} (${number0.format(projects.length)})`);
    heading.style.margin = "0";
    heading.style.fontSize = "14px";
    section.appendChild(heading);
    section.appendChild(create("p", "", "Se listan únicamente las inversiones que corresponden a la brecha seleccionada. Abre cada fila para ver los 42 campos originales y la nota de alcance territorial."));

    if (!projects.length) {
      section.appendChild(create("div", "empty-state", `No hay inversiones de ${indicator.themeLabel.toLowerCase()} asociadas a este territorio.`));
      return section;
    }

    const toolbar = create("div", "project-toolbar");
    const search = create("input");
    search.type = "search";
    search.placeholder = "Buscar CUI, nombre o entidad…";
    search.setAttribute("aria-label", "Buscar inversiones en la ficha");
    const yearSelect = create("select");
    yearSelect.setAttribute("aria-label", "Filtrar inversiones por año de cierre");
    const allYears = create("option", "", "Todos los años");
    allYears.value = "";
    yearSelect.appendChild(allYears);
    YEARS_INVESTMENT.forEach((year) => {
      const option = create("option", "", year);
      option.value = String(year);
      yearSelect.appendChild(option);
    });
    toolbar.append(search, yearSelect);
    section.appendChild(toolbar);

    const countNote = create("p");
    countNote.style.margin = "0 0 7px";
    countNote.style.fontSize = "10px";
    countNote.style.color = "var(--muted)";
    const list = create("div", "project-list");
    const moreButton = create("button", "", "Mostrar más");
    moreButton.type = "button";
    moreButton.style.cssText = "margin:10px auto 0;display:block;padding:7px 12px;border:1px solid var(--line);border-radius:8px;background:#fff;cursor:pointer;color:var(--ink)";
    section.append(countNote, list, moreButton);

    let limit = 150;
    const render = () => {
      const query = norm(search.value);
      const year = finiteNumber(yearSelect.value);
      const filtered = projects.filter((project) => (!query || project.searchText.includes(query)) && (year === null || project.year === year));
      const visible = filtered.slice(0, limit);
      list.replaceChildren(...visible.map(projectItem));
      countNote.textContent = `Mostrando ${number0.format(visible.length)} de ${number0.format(filtered.length)} coincidencias.`;
      moreButton.hidden = visible.length >= filtered.length;
      moreButton.textContent = `Mostrar ${number0.format(Math.min(150, filtered.length - visible.length))} más`;
    };
    search.addEventListener("input", () => { limit = 150; render(); });
    yearSelect.addEventListener("change", () => { limit = 150; render(); });
    moreButton.addEventListener("click", () => { limit += 150; render(); });
    render();
    return section;
  }

  function openDetail(code) {
    const record = state.model.metrics[state.level].get(code);
    if (!record || !recordMatchesFilters(record, state.level)) return;
    state.selectedCode = code;
    setTerritorySearchValue(code);
    renderMapColors();
    hideTooltip();
    el.detailHierarchy.textContent = territoryHierarchy(record);
    el.detailTitle.textContent = record.name;
    el.detailBody.replaceChildren();

    if (state.view === "multi_nbi") {
      const details = multiNbiStatusDetails(record);
      const issueCount = multiNbiIssueCount(record);
      const setbackCount = details.filter((detail) => detail.progress === "setback").length;
      const stagnantCount = details.filter((detail) => detail.progress === "stagnant").length;
      const advanceCount = details.filter((detail) => detail.progress === "advance").length;
      const averageSetback = multiNbiAverageSetbackMagnitude(record);

      const summary = create("div", "detail-summary");
      summary.append(
        metricCard(
          "NBI con estancamiento o retroceso",
          issueCount === null ? "Sin dato" : `${number0.format(issueCount)} de 3`,
          "Agua cobertura · Electricidad · Educación",
        ),
        metricCard("Retrocesos", number0.format(setbackCount), "< −5 pp"),
        metricCard("Estancamientos", number0.format(stagnantCount), "−5 a +5 pp"),
        metricCard(
          "Retroceso promedio",
          averageSetback === null ? "—" : `${number1.format(averageSetback)} pp`,
          `${number0.format(advanceCount)} NBI en avance`,
        ),
      );
      el.detailBody.appendChild(summary);

      const grid = create("div", "detail-grid");
      grid.append(buildMultiNbiDetailTable(record), buildMultiNbiInvestmentTable(record));
      el.detailBody.appendChild(grid);

      if (!el.detailDialog.open) el.detailDialog.showModal();
      el.detailBody.scrollTop = 0;
      return;
    }

    const indicator = INDICATORS[state.indicator];
    const investment = record.investment[indicator.theme];
    const summary = create("div", "detail-summary");
    summary.append(
      metricCard("Necesidad insatisfecha 2017", formatPercent(record.nbi[2017][state.indicator].rate), indicator.label),
      metricCard("Necesidad insatisfecha 2025", formatPercent(record.nbi[2025][state.indicator].rate), indicator.label),
      metricCard("Avance 2017–2025", formatDelta(record.delta[state.indicator]), "positivo = reducción"),
      metricCard("Devengado per cápita", formatSoles(investment.accruedPerCapita, true), `${number0.format(investment.count)} inversiones · devengado asociado ${compactSoles(investment.accrued)}`),
    );
    el.detailBody.appendChild(summary);
    const grid = create("div", "detail-grid");
    grid.append(buildNbiTable(record), buildInvestmentBars(record));
    el.detailBody.appendChild(grid);
    el.detailBody.appendChild(buildProjectsSection(record));
    if (!el.detailDialog.open) el.detailDialog.showModal();
    el.detailBody.scrollTop = 0;
  }

  function contextInvestmentGroups() {
    const definitions = [
      ["Electricidad", (project) => project.themes.includes("electricity")],
      ["Agua y saneamiento", (project) => project.themes.includes("water_coverage") || project.themes.includes("water_continuity")],
      ["Educación", (project) => project.themes.includes("education")],
      ["Conectividad a internet", (project) => project.themes.includes("internet")],
    ];

    return definitions.map(([label, matches]) => {
      const projects = state.model.projects.filter(matches);
      return {
        label,
        projects: projects.length,
        accrued: projects.reduce((sum, project) => sum + finiteNumber(project.accrued, 0), 0),
      };
    });
  }

  function nationalNbiIndicator(indicatorKey) {
    const result = {
      indicatorKey,
      label: INDICATORS[indicatorKey].label,
      deprivation: INDICATORS[indicatorKey].deprivation,
      2017: { numerator: 0, denominator: 0, rate: null },
      2025: { numerator: 0, denominator: 0, rate: null },
      delta: null,
      progress: "no_data",
    };

    YEARS_NBI.forEach((year) => {
      state.model.metrics.district.forEach((record) => {
        const detail = record.nbi[year][indicatorKey];
        if (!detail || detail.numerator === null || detail.denominator === null || detail.denominator <= 0) return;
        result[year].numerator += detail.numerator;
        result[year].denominator += detail.denominator;
      });
      result[year].rate = result[year].denominator > 0
        ? result[year].numerator / result[year].denominator
        : null;
    });

    const first = result[2017].rate;
    const last = result[2025].rate;
    result.delta = first !== null && last !== null ? (first - last) * 100 : null;
    result.progress = progressClass(result.delta);
    return result;
  }

  function contextNationalNbi() {
    return Object.keys(INDICATORS).map(nationalNbiIndicator);
  }

  function contextRateText(item) {
    if (!item || item.rate === null || !Number.isFinite(item.rate)) return "Sin dato";
    return `${number1.format(item.rate * 100)} % (${number0.format(item.numerator)} / ${number0.format(item.denominator)})`;
  }

  function appendContextTable(section, headers, rows, options = {}) {
    const wrap = create("div", "context-table-wrap");
    const table = create("table", "context-table");
    const thead = create("thead");
    const headRow = create("tr");
    headers.forEach((header) => headRow.appendChild(create("th", "", header)));
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = create("tbody");
    rows.forEach((row, rowIndex) => {
      const tr = create("tr", options.totalIndex === rowIndex ? "context-total" : "");
      row.forEach((value) => {
        const td = create("td");
        if (value instanceof Node) td.appendChild(value);
        else td.textContent = value ?? "";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    section.appendChild(wrap);
  }

  function populateContext() {
    if (!state.model) return;
    el.contextBody.replaceChildren();

    const investmentGroups = contextInvestmentGroups();
    const totalProjects = state.model.projects.length;
    const totalAccrued = state.model.projects.reduce((sum, project) => sum + finiteNumber(project.accrued, 0), 0);
    const national = contextNationalNbi();

    const progressCounts = { advance: 0, stagnant: 0, setback: 0, no_data: 0 };
    national.forEach((item) => { progressCounts[item.progress] += 1; });
    const comparable = national.filter((item) => Number.isFinite(item.delta));
    const best = comparable.length ? [...comparable].sort((a, b) => b.delta - a.delta)[0] : null;
    const worst = comparable.length ? [...comparable].sort((a, b) => a.delta - b.delta)[0] : null;

    const intro = create("section", "context-intro");
    const p1 = create("p");
    p1.innerHTML = `Entre <strong>2017 y 2024</strong>, la base analizada reúne <strong>${number0.format(totalProjects)} inversiones cerradas</strong> vinculadas a servicios básicos, con un devengado acumulado de <strong>${formatSoles(totalAccrued)}</strong>. La distribución sectorial permite dimensionar dónde se concentraron los proyectos y los recursos ejecutados.`;
    intro.appendChild(p1);

    const p2 = create("p");
    p2.innerHTML = `Entre <strong>2017 y 2025</strong>, considerando los cinco indicadores nacionales de necesidad insatisfecha, <strong>${progressCounts.advance}</strong> muestran avance superior a 5 puntos porcentuales, <strong>${progressCounts.stagnant}</strong> se mantienen dentro del rango de estancamiento y <strong>${progressCounts.setback}</strong> registran retroceso.`;
    intro.appendChild(p2);

    if (best) {
      const p3 = create("p");
      const bestText = `La mayor reducción nacional de la necesidad insatisfecha se observa en <strong>${best.label}</strong>, con ${formatDelta(best.delta)}.`;
      const worstText = worst && worst.indicatorKey !== best.indicatorKey
        ? ` El menor resultado corresponde a <strong>${worst.label}</strong>, con ${formatDelta(worst.delta)}.`
        : "";
      p3.innerHTML = bestText + worstText;
      intro.appendChild(p3);
    }
    el.contextBody.appendChild(intro);

    const investmentSection = create("section", "context-section");
    investmentSection.appendChild(create("h3", "", "Inversiones cerradas por sector · 2017–2024"));
    investmentSection.appendChild(create("p", "", "Número de proyectos clasificados y devengado acumulado (DEVEN_ACUMULADO) de las inversiones cerradas en el periodo."));
    const investmentRows = investmentGroups.map((item) => [
      item.label,
      number0.format(item.projects),
      formatSoles(item.accrued),
    ]);
    investmentRows.push(["Total de inversiones únicas", number0.format(totalProjects), formatSoles(totalAccrued)]);
    appendContextTable(
      investmentSection,
      ["Sector", "Proyectos cerrados", "Devengado acumulado"],
      investmentRows,
      { totalIndex: investmentRows.length - 1 },
    );
    investmentSection.appendChild(create(
      "p",
      "context-note",
      "Nota: Agua y saneamiento se cuenta una sola vez en este resumen. En el mapa, ese mismo universo de inversiones se utiliza para las dos medidas de agua: cobertura y continuidad diaria. El total corresponde a inversiones únicas clasificadas, por lo que no duplica proyectos entre esas dos medidas.",
    ));
    el.contextBody.appendChild(investmentSection);

    const nbiSection = create("section", "context-section");
    nbiSection.appendChild(create("h3", "", "Evolución nacional de las brechas de acceso · 2017–2025"));
    nbiSection.appendChild(create(
      "p",
      "",
      "Los porcentajes nacionales se obtienen agregando los casos y universos válidos de los distritos, en lugar de promediar porcentajes territoriales.",
    ));

    const nbiRows = national.map((item) => {
      const badge = create("span", `context-status context-status--${item.progress}`, PROGRESS_LABELS[item.progress]);
      return [
        item.deprivation,
        contextRateText(item[2017]),
        contextRateText(item[2025]),
        formatDelta(item.delta),
        badge,
      ];
    });
    appendContextTable(
      nbiSection,
      ["Necesidad insatisfecha", "2017", "2025", "Cierre de brecha", "Situación"],
      nbiRows,
    );
    nbiSection.appendChild(create(
      "p",
      "context-note",
      "Lectura del avance: más de +5 pp = avance; entre −5 y +5 pp, inclusive = estancamiento; menos de −5 pp = retroceso. Un valor positivo del cierre de brecha significa que la proporción con necesidad insatisfecha disminuyó entre 2017 y 2025.",
    ));
    el.contextBody.appendChild(nbiSection);

    const sourceSection = create("section", "context-section");
    sourceSection.appendChild(create("h3", "", "Fuentes"));
    sourceSection.appendChild(create(
      "p",
      "",
      "Indicadores de brechas: Censos Nacionales 2017 y 2025. Inversiones: proyectos con cierre 2017–2024 de Invierte.pe. Elaboración: Programa GFP Subnacional, implementado por Basel Institute on Governance.",
    ));
    el.contextBody.appendChild(sourceSection);
  }

  function populateMethodology() {
    el.methodBody.replaceChildren();
    const sections = [
      [
        "Necesidades básicas",
        "Se muestran cinco necesidades insatisfechas separadas: falta de electricidad de red, déficit de cobertura de agua, falta de agua todos los días, no asistencia educativa entre 3 y 24 años y falta de internet. Para cada territorio, año y necesidad básica, el universo numérico se reconstruye sumando las frecuencias de todas las respuestas válidas del indicador. El nombre del universo se toma de la columna «Unidad detalle». El porcentaje se calcula como casos de necesidad insatisfecha entre ese universo reconstruido.",
      ],
      [
        "Cobertura de agua en ambos censos",
        "La variable «Tipo de procedencia del agua» se agrupa de la siguiente manera:",
        [
          ["Con cobertura de agua", ["Red pública", "Pilón o pileta de uso público", "Pozo (agua subterránea)"]],
          ["Déficit de cobertura de agua", ["Camión-cisterna u otro similar", "Manantial o puquio", "Río, acequía, lago o laguna", "Otro"]],
        ],
      ],
      [
        "Agregación territorial",
        "En provincias y departamentos se suman los casos y los universos de sus distritos y luego se calcula el cociente. No se promedian porcentajes distritales. Avance = porcentaje 2017 menos porcentaje 2025, en puntos porcentuales: más de +5 es avance; de −5 a +5 es estancamiento; menos de −5 es retroceso.",
      ],
      [
        "Correspondencia entre necesidad básica e inversión",
        "La base de inversiones ya fue preseleccionada para estas necesidades básicas: ningún proyecto con cierre entre 2017 y 2024 se descarta. Cada inversión se asigna a un solo grupo sectorial: Educación, Electricidad o Internet. La taxonomía FUNCION/PROGRAMA/SUBPROGRAMA determina el grupo; títulos con evidencia explícita de conectividad se asignan a Internet. No se solapan inversiones entre estos sectores.",
      ],
      [
        "Dos medidas de agua",
        "Las dos medidas de agua comparten exactamente el mismo universo de inversiones: todo proyecto de saneamiento se incorpora tanto a cobertura como a continuidad diaria. Lo que cambia entre ambas vistas es únicamente la necesidad insatisfecha censal con la que se compara esa misma inversión.",
      ],
      [
        "Monto y alcance de las inversiones",
        "La vista prioriza DEVEN_ACUMULADO para las inversiones con FEC_CIERRE entre 2017 y 2024; COSTO_ACTUALIZADO permanece disponible como referencia secundaria. Por convención de esta visualización, todos los devengados se rotulan en soles (S/). Si una inversión abarca una provincia, un departamento o el país, el proyecto y el monto asociado completo aparecen en cada unidad cubierta y la ficha lo advierte explícitamente.",
      ],
      [
        "Inversión per cápita y comparación",
        "Para no multiplicar artificialmente un proyecto de ámbito amplio, el devengado usado en el indicador per cápita se distribuye entre las unidades cubiertas en proporción a su población censada 2025 y luego se divide entre esa población. El costo actualizado queda como medida secundaria. Los terciles bajo, medio y alto se recalculan por nivel y tipo de brecha usando valores positivos; cero inversión se conserva como 0 y se pinta en el grupo bajo.",
      ],
      [
        "Filtros y exportación",
        "Los filtros de tercil de devengado y estado del avance se aplican de forma combinada. La descarga conserva exactamente el nivel territorial y la necesidad básica seleccionados: genera un resumen únicamente de departamentos, provincias o distritos, según corresponda, y otra pestaña solo con las inversiones cerradas vinculadas a esa necesidad básica y a las unidades filtradas. Los proyectos de ámbito amplio se repiten con su nota de alcance y un devengado asignado proporcionalmente.",
      ],
      [
        "Fuentes y mapa",
        "Indicadores: Censos Nacionales 2017 y 2025. Inversiones: cierres 2017–2024 de Invierte.pe. Elaboración: Programa GFP Subnacional, implementado por Basel Institute on Governance. La geometría territorial solo sirve para dibujar los límites del Perú; no aporta valores de indicadores o inversión.",
      ],
    ];
    sections.forEach(([heading, paragraph, groups]) => {
      el.methodBody.append(create("h3", "", heading), create("p", "", paragraph));
      groups?.forEach(([groupTitle, items]) => {
        const list = create("ul", "method-list");
        items.forEach((item) => list.appendChild(create("li", "", item)));
        el.methodBody.append(create("h4", "", groupTitle), list);
      });
    });
  }

  function bindDialog(dialog, closeButton) {
    closeButton.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  function bindControls() {
    el.levelToggle.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-level]");
      if (!button || !el.levelToggle.contains(button) || button.dataset.level === state.level) return;
      state.level = button.dataset.level;
      syncLevelControl();
      state.selectedCode = "";
      el.territorySearch.value = "";
      state.territorySearchEntries = [];
      invalidateFilteredRecordsCache();
      await renderAll({ rebuildGeometry: true });
    });
    el.indicatorSelect.addEventListener("change", () => {
      state.indicator = el.indicatorSelect.value;
      state.selectedCode = "";
      el.territorySearch.value = "";
      invalidateFilteredRecordsCache();
      renderFilteredView();
    });
    el.viewToggle.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-view]");
      if (!button || !el.viewToggle.contains(button)) return;
      setMapView(button.dataset.view);
    });
    el.measureSelect.addEventListener("change", () => {
      state.measure = el.measureSelect.value;
      invalidateFilteredRecordsCache();
      renderFilteredView();
    });
    el.tierFilterGroup.addEventListener("change", () => readFilterChoices("tier"));
    el.progressFilterGroup.addEventListener("change", () => readFilterChoices("progress"));
    el.exportButton.addEventListener("click", exportFilteredWorkbook);
    el.downloadPngButton.addEventListener("click", togglePngPreview);
    el.pngCloseButton.addEventListener("click", () => setPngOpen(false));
    el.pngCopyButton.addEventListener("click", copyPngPreview);
    el.pngDownloadButton.addEventListener("click", downloadPngPreview);
    el.pngResizeHandle.addEventListener("pointerdown", (event) => {
      if (window.matchMedia("(max-width: 840px)").matches) return;
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = el.pngPanel.getBoundingClientRect().width;
      el.pngResizeHandle.setPointerCapture?.(event.pointerId);

      const onMove = (moveEvent) => {
        setTablePanelWidth(startWidth + startX - moveEvent.clientX);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    });
    el.pngResizeHandle.addEventListener("dblclick", () => setTablePanelWidth(null));
    el.pngResizeHandle.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Home") {
        setTablePanelWidth(null);
        return;
      }
      const current = el.pngPanel.getBoundingClientRect().width;
      setTablePanelWidth(current + (event.key === "ArrowLeft" ? 24 : -24));
    });
    el.tableButton.addEventListener("click", () => setTableOpen(!state.tableOpen));
    el.tableCloseButton.addEventListener("click", () => setTableOpen(false));
    el.tableResizeHandle.addEventListener("pointerdown", (event) => {
      if (window.matchMedia("(max-width: 840px)").matches) return;
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = el.tablePanel.getBoundingClientRect().width;
      el.tableResizeHandle.setPointerCapture?.(event.pointerId);

      const onMove = (moveEvent) => {
        setTablePanelWidth(startWidth + startX - moveEvent.clientX);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    });
    el.tableResizeHandle.addEventListener("dblclick", () => setTablePanelWidth(null));
    el.tableResizeHandle.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Home") {
        setTablePanelWidth(null);
        return;
      }
      const current = el.tablePanel.getBoundingClientRect().width;
      setTablePanelWidth(current + (event.key === "ArrowLeft" ? 24 : -24));
    });
    el.tableLimitInput.addEventListener("input", () => {
      const next = finiteNumber(el.tableLimitInput.value, state.tableLimit);
      state.tableLimit = Math.max(1, Math.min(MAX_TABLE_RENDER_ROWS, Math.trunc(next)));
      if (state.tableRenderTimer) clearTimeout(state.tableRenderTimer);
      state.tableRenderTimer = setTimeout(() => {
        state.tableRenderTimer = 0;
        renderTablePanel();
      }, 100);
    });
    el.tableSortSelect.addEventListener("change", () => {
      state.tableSort = el.tableSortSelect.value;
      renderTablePanel();
    });
    el.tableDirectionSelect.addEventListener("change", () => {
      state.tableDirection = el.tableDirectionSelect.value === "asc" ? "asc" : "desc";
      renderTablePanel();
    });
    el.tableColumnsOptions.addEventListener("change", (event) => {
      const checkbox = event.target.closest('input[type="checkbox"]');
      if (!checkbox) return;
      const hidden = new Set(state.tableHiddenColumns);
      if (checkbox.checked) hidden.delete(checkbox.value);
      else hidden.add(checkbox.value);
      const allColumns = tableColumns();
      if (allColumns.every((column) => hidden.has(column.key))) {
        checkbox.checked = true;
        hidden.delete(checkbox.value);
        return;
      }
      state.tableHiddenColumns = [...hidden];
      renderTablePanel();
    });
    el.copyTableButton.addEventListener("click", copyTerritoryTable);
    window.addEventListener("beforeunload", clearPngObjectUrl);
    el.territorySearch.addEventListener("change", () => {
      const code = territoryCodeFromSearch(el.territorySearch.value);
      if (code) openDetail(code);
    });
    el.territorySearch.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const code = territoryCodeFromSearch(el.territorySearch.value, true);
      if (!code) return;
      event.preventDefault();
      openDetail(code);
    });
    el.contextButton.addEventListener("click", () => {
      if (!state.model) return;
      populateContext();
      if (!el.contextDialog.open) el.contextDialog.showModal();
    });
    el.methodButton.addEventListener("click", () => {
      populateMethodology();
      if (!el.methodDialog.open) el.methodDialog.showModal();
    });
    bindDialog(el.detailDialog, el.detailClose);
    bindDialog(el.contextDialog, el.contextClose);
    bindDialog(el.methodDialog, el.methodClose);
  }

  function registerWebMcp() {
    const context = document.modelContext;
    if (!context || typeof context.registerTool !== "function") return;
    try {
      context.registerTool({
        name: "configure_brechas_map",
        description: "Configura el nivel, el tipo de brecha y la vista del mapa de brechas e inversión del Perú.",
        inputSchema: {
          type: "object",
          properties: {
            level: { type: "string", enum: Object.keys(LEVELS), description: "Nivel territorial." },
            indicator: { type: "string", enum: Object.keys(INDICATORS), description: "Tipo de brecha." },
            view: { type: "string", enum: ["nbi", "investment", "comparison", "multi_nbi"], description: "Tipo de mapa." },
            measure: { type: "string", enum: ["change", "2017", "2025", "accrued_per_capita", "accrued_total", "cost_per_capita", "cost_total", "matrix"], description: "Medida dentro de la vista." },
            tierFilter: {
              anyOf: [
                { type: "string", enum: ["all", "low", "medium", "high"] },
                { type: "array", items: { type: "string", enum: ["low", "medium", "high"] }, uniqueItems: true },
              ],
              description: "Uno o varios terciles de devengado por persona.",
            },
            progressFilter: {
              anyOf: [
                { type: "string", enum: ["all", "advance", "stagnant", "setback"] },
                { type: "array", items: { type: "string", enum: ["advance", "stagnant", "setback"] }, uniqueItems: true },
              ],
              description: "Uno o varios estados de avance.",
            },
            territoryCode: { type: "string", description: "UBIGEO del nivel seleccionado; abre la ficha si existe." },
          },
          additionalProperties: false,
        },
        execute: async (args = {}) => {
          if (!state.model) throw new Error("Los datos todavía se están cargando.");
          if (args.level && Object.hasOwn(LEVELS, args.level)) state.level = args.level;
          if (args.indicator && Object.hasOwn(INDICATORS, args.indicator)) state.indicator = args.indicator;
          if (args.view && ["nbi", "investment", "comparison", "multi_nbi"].includes(args.view)) state.view = args.view;
          if (args.tierFilter !== undefined) state.filters.tier = normalizeFilterSelection(args.tierFilter, TIER_FILTER_VALUES);
          if (args.progressFilter !== undefined) state.filters.progress = normalizeFilterSelection(args.progressFilter, PROGRESS_FILTER_VALUES);
          el.indicatorSelect.value = state.indicator;
          syncLevelControl();
          syncViewControl();
          syncFilterControls();
          saveFilters();
          updateMeasureControl(args.measure);
          state.territorySearchEntries = [];
          invalidateFilteredRecordsCache();
          await renderAll({ rebuildGeometry: true });
          if (args.territoryCode && state.model.metrics[state.level].has(String(args.territoryCode))) {
            openDetail(String(args.territoryCode));
          }
          return {
            content: [{ type: "text", text: `Mapa configurado: ${LEVELS[state.level].singular}, ${INDICATORS[state.indicator].label}, ${state.view}.` }],
          };
        },
      });
    } catch (error) {
      // WebMCP is optional; an experimental implementation must never block the page.
      console.debug("WebMCP no disponible:", error);
    }
  }

  async function init() {
    cacheElements();
    loadFilters();
    syncLevelControl();
    syncViewControl();
    bindControls();
    bindMapNavigation();
    populateMethodology();
    try {
      setLoading("Cargando los datos", "Preparando indicadores territoriales e inversiones…");
      const [nbiBuffer, investmentBuffer] = await Promise.all([
        fetchWorkbook(FILES.nbi, "los indicadores censales"),
        fetchWorkbook(FILES.investment, "las inversiones"),
        ensureMapAssets("region"),
      ]);
      setLoading("Procesando necesidades básicas", "Recalculando tasas y agregados para departamentos, provincias y distritos…");
      await sleepFrame();
      const nbiRows = workbookRows(nbiBuffer, "datos_distritales");
      const nbiModel = buildNbiModel(nbiRows);
      setLoading("Clasificando inversiones por tema", "Relacionando cada inversión con su ámbito territorial sin mezclar electricidad, agua, educación e internet…");
      await sleepFrame();
      const investmentRows = workbookRows(investmentBuffer, "inversiones_limpias");
      Object.assign(nbiModel, buildInvestments(investmentRows, nbiModel));
      state.model = nbiModel;
      updateMeasureControl("change");
      await renderAll({ rebuildGeometry: true });
      el.loadingOverlay.hidden = true;
      el.contextButton.disabled = false;
      el.sourceStatus.textContent = `Datos actualizados · ${number0.format(state.model.projects.length)} inversiones clasificadas`;
      el.app.setAttribute("aria-busy", "false");
      registerWebMcp();
    } catch (error) {
      console.error(error);
      el.loadingOverlay.hidden = true;
      el.errorPanel.hidden = false;
      el.errorMessage.textContent = error instanceof Error ? error.message : String(error);
      el.sourceStatus.textContent = "Error al cargar los datos";
      el.app.setAttribute("aria-busy", "false");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();

