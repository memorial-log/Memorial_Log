(function () {
  "use strict";

  var DESIGN_VERSION = 38;
  /* Keep design migrations stable while isolating documents that contain
     logical inline text ranges from older cached editor tabs. */
  var STORAGE_KEY = "log-ticket-standalone-v40";
  var LEGACY_STORAGE_KEYS = ["log-ticket-standalone-v39", "log-ticket-standalone-v38", "log-ticket-standalone-v37", "log-ticket-standalone-v36", "log-ticket-standalone-v35", "log-ticket-standalone-v34", "log-ticket-standalone-v33", "log-ticket-standalone-v32", "log-ticket-standalone-v31", "log-ticket-standalone-v30", "log-ticket-standalone-v29", "log-ticket-standalone-v28", "log-ticket-standalone-v27", "log-ticket-standalone-v26", "log-ticket-standalone-v25", "log-ticket-standalone-v24", "log-ticket-standalone-v23", "log-ticket-standalone-v22", "log-ticket-standalone-v21", "log-ticket-standalone-v20", "log-ticket-standalone-v19", "log-ticket-standalone-v18", "log-ticket-standalone-v17", "log-ticket-standalone-v16", "log-ticket-standalone-v15", "log-ticket-standalone-v14", "log-ticket-standalone-v13", "log-ticket-standalone-v9", "log-ticket-standalone-v8", "log-ticket-standalone-v7", "log-ticket-standalone-v6"];
  var INLINE_TEXT_STYLE_VERSION = 1;
  var COMPOSITE_TEXT_LAYER_VERSION = 1;
  var CINEMA_PAIR_TITLE_VERSION = 1;
  var CINEMA_RATING_LAYER_VERSION = 1;
  var TRAIN_LOGO_VERSION = 3;
  var TRAIN_GEOMETRY_VERSION = 42;
  var TRAIN_HANDWRITING_VERSION = 1;
  var POSTCARD_LAYOUT_VERSION = 6;
  var POLAROID_REVERSE_VERSION = 1;
  var FACE_VIEW_VERSION = 1;
  var POSTCARD_WRITING_LINES = ["오늘의 온도를 오래 기억해.", "멀리 있어도 마음은 가까이.", "다시 만날 날을 기다리며.", "언제나 네 편인 내가."];
  var POSTCARD_WRITING_SAMPLE = POSTCARD_WRITING_LINES.join("\n");
  var TEMPLATE_IDS = ["train", "cinema", "postcard", "polaroid"];
  var LAYOUT_PRESETS = Array.isArray(window.LOG_TICKET_LAYOUT_PRESETS) ? window.LOG_TICKET_LAYOUT_PRESETS : [];
  var TEMPLATE_CONFIG = {
    train: {
      documentName: "TRAIN TICKET", resetName: "열차", templateId: "train-ticket-v10", templateVersion: 10,
      sourceLabel: "FARE / ROUTE",
      sideLabels: { front: "FRONT", back: "BACK", both: "BOTH" },
      preview: { width: 960, height: 480 }, export: { width: 3200, height: 1600 },
      silhouette: "train", textureTone: "paper", textureSeed: 7261,
      features: { perforation: true, mainImageOpeningMask: true, differenceQuote: true }
    },
    cinema: {
      documentName: "CINEMA TICKET", resetName: "영화", templateId: "cinema-ticket-v10", templateVersion: 10,
      sourceLabel: "SOURCE",
      sideLabels: { front: "FRONT", back: "BACK", both: "BOTH" },
      preview: { width: 520, height: 900 }, export: { width: 2080, height: 3600 },
      silhouette: "cinema", textureTone: "cinema", textureSeed: 9137,
      features: { perforation: false, mainImageOpeningMask: false, differenceQuote: true }, autoPairTitle: true
    },
    postcard: {
      documentName: "POSTCARD & STAMP", resetName: "우표·포스트카드", templateId: "postcard-stamp-v2", templateVersion: 2,
      sourceLabel: "REFERENCE",
      sideLabels: { front: "FRONT", back: "BACK", both: "BOTH" },
      preview: { width: 900, height: 600 }, export: { width: 3000, height: 2000 },
      silhouette: "rectangle", textureTone: "paper", textureSeed: 4813,
      features: { perforation: false, mainImageOpeningMask: false, differenceQuote: true }, autoPairTitle: true
    },
    polaroid: {
      documentName: "POLAROID MEMORY", resetName: "폴라로이드", templateId: "polaroid-memory-v1", templateVersion: 2,
      sourceLabel: "REFERENCE",
      sideLabels: { front: "FRONT", back: "BACK", both: "BOTH" },
      preview: { width: 600, height: 732 }, export: { width: 2460, height: 3000 },
      silhouette: "rectangle", textureTone: "paper", textureSeed: 8243,
      features: { perforation: false, mainImageOpeningMask: false, differenceQuote: true }, autoPairTitle: true
    }
  };
  /* Both always projects the real front/back DOM faces. Each template keeps a
     geometry tuned to its own aspect ratio while sharing the same interaction
     and sequential, memory-bounded export path. */
  var TEMPLATE_BOTH_GEOMETRY = {
    train: {
      front: { x: .033, y: .066, scale: .64, rotation: -2.8 },
      back: { x: .329, y: .301, scale: .64, rotation: 2.2 }
    },
    cinema: {
      front: { x: .05, y: .035, scale: .66, rotation: -3 },
      back: { x: .295, y: .308, scale: .66, rotation: 2.5 }
    },
    postcard: {
      front: { x: .05, y: .08, scale: .58, rotation: -3.2 },
      back: { x: .35, y: .32, scale: .58, rotation: 2.5 }
    },
    polaroid: {
      front: { x: .047, y: .04, scale: .66, rotation: -3.2 },
      back: { x: .298, y: .304, scale: .66, rotation: 2.5 }
    }
  };
  var TEMPLATE_BOTH_EXPORT_PROJECTION = {
    train: { scale: .81, offsetX: .095, offsetY: .078 },
    cinema: { scale: .89, offsetX: .055, offsetY: .037 },
    postcard: { scale: .94, offsetX: .0404, offsetY: .0056 },
    polaroid: { scale: .89, offsetX: .055, offsetY: .037 }
  };
  function trainSilhouetteShape() {
    return [
      [.018, 0], [.708, 0], [.728, .017], [.748, 0], [.982, 0], [1, .044],
      [1, .956], [.982, 1], [.748, 1], [.728, .983], [.708, 1], [.018, 1],
      [0, .956], [0, .044]
    ];
  }
  function normalizedShapePolygon(points) {
    return "polygon(" + points.map(function (point) {
      return (point[0] * 100).toFixed(4) + "% " + (point[1] * 100).toFixed(4) + "%";
    }).join(",") + ")";
  }
  function trainSilhouettePolygon() {
    return normalizedShapePolygon(trainSilhouetteShape());
  }
  function bothGeometryFor(template, side) {
    var set = TEMPLATE_BOTH_GEOMETRY[safeTemplateId(template)] || TEMPLATE_BOTH_GEOMETRY.postcard;
    return set[side === "back" ? "back" : "front"];
  }
  function bothProjectionFor(template) {
    return TEMPLATE_BOTH_EXPORT_PROJECTION[safeTemplateId(template)] || TEMPLATE_BOTH_EXPORT_PROJECTION.postcard;
  }
  function projectedBothGeometryFor(template, side) {
    var geometry = bothGeometryFor(template, side);
    var projection = bothProjectionFor(template);
    return {
      x: projection.offsetX + projection.scale * geometry.x,
      y: projection.offsetY + projection.scale * geometry.y,
      scale: projection.scale * geometry.scale,
      rotation: geometry.rotation
    };
  }
  function bothVisualBounds(template, width, height) {
    var bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    ["front", "back"].forEach(function (side) {
      var geometry = projectedBothGeometryFor(template, side);
      var faceWidth = width * geometry.scale;
      var faceHeight = height * geometry.scale;
      var radians = geometry.rotation * Math.PI / 180;
      var rotatedWidth = Math.abs(faceWidth * Math.cos(radians)) + Math.abs(faceHeight * Math.sin(radians));
      var rotatedHeight = Math.abs(faceWidth * Math.sin(radians)) + Math.abs(faceHeight * Math.cos(radians));
      var centerX = width * (geometry.x + geometry.scale / 2);
      var centerY = height * (geometry.y + geometry.scale / 2);
      bounds.left = Math.min(bounds.left, centerX - rotatedWidth / 2);
      bounds.right = Math.max(bounds.right, centerX + rotatedWidth / 2);
      bounds.top = Math.min(bounds.top, centerY - rotatedHeight / 2);
      bounds.bottom = Math.max(bounds.bottom, centerY + rotatedHeight / 2);
    });
    bounds.centerX = (bounds.left + bounds.right) / 2;
    bounds.centerY = (bounds.top + bounds.bottom) / 2;
    bounds.width = bounds.right - bounds.left;
    bounds.height = bounds.bottom - bounds.top;
    return bounds;
  }
  function attributionBasePosition(template, width, height, both) {
    if (both) {
      var bounds = bothVisualBounds(template, width, height);
      return { x: bounds.centerX, y: bounds.bottom };
    }
    return { x: width / 2, y: height };
  }
  function isBothView(documentState) {
    var source = documentState || state;
    return source && source.postcardViewMode === "both";
  }
  function applyBothGeometryVariables(template) {
    ["front", "back"].forEach(function (side) {
      var geometry = projectedBothGeometryFor(template, side);
      var layoutOffset = (1 - geometry.scale) / 2;
      ticket.style.setProperty("--both-" + side + "-left", (geometry.x - layoutOffset) * 100 + "%");
      ticket.style.setProperty("--both-" + side + "-top", (geometry.y - layoutOffset) * 100 + "%");
      ticket.style.setProperty("--both-" + side + "-scale", geometry.scale);
      ticket.style.setProperty("--both-" + side + "-rotation", geometry.rotation + "deg");
    });
  }
  function isTemplateId(value) { return TEMPLATE_IDS.indexOf(value) >= 0; }
  function safeTemplateId(value) { return isTemplateId(value) ? value : "train"; }
  function templateConfig(value) { return TEMPLATE_CONFIG[safeTemplateId(value)]; }
  function customShapeSizeToDesignPx(shape, template) {
    var preview = templateConfig(template).preview;
    return {
      width: finiteNumber(shape && shape.w, 0) / 100 * preview.width,
      height: finiteNumber(shape && shape.h, 0) / 100 * preview.height
    };
  }
  function customShapeSizeFromDesignPx(axis, value, template) {
    var preview = templateConfig(template).preview;
    var basis = axis === "width" ? preview.width : preview.height;
    return finiteNumber(value, 0) / Math.max(1, basis) * 100;
  }
  function fitCustomImageFrameToSource(layer, naturalWidth, naturalHeight, template, preserveFootprint) {
    if (!layer) return layer;
    var preview = templateConfig(template).preview;
    var imageWidth = Math.max(1, finiteNumber(naturalWidth, 1));
    var imageHeight = Math.max(1, finiteNumber(naturalHeight, 1));
    var currentWidth = Math.max(.01, finiteNumber(layer.w, 30)) / 100 * preview.width;
    var currentHeight = Math.max(.01, finiteNumber(layer.h, 30)) / 100 * preview.height;
    var centerX = finiteNumber(layer.x, 12) + finiteNumber(layer.w, 30) / 2;
    var centerY = finiteNumber(layer.y, 12) + finiteNumber(layer.h, 30) / 2;
    /* New images retain their natural design-pixel size whenever possible.
       Replacements fit inside the current footprint, but both paths make the
       layer box itself match the source ratio so its selection never drifts. */
    var scale = preserveFootprint
      ? Math.min(1, currentWidth / imageWidth, currentHeight / imageHeight)
      : Math.min(1, preview.width * .3 / imageWidth, preview.height * .3 / imageHeight);
    var width = imageWidth * scale / preview.width * 100;
    var height = imageHeight * scale / preview.height * 100;
    layer.x = centerX - width / 2;
    layer.y = centerY - height / 2;
    layer.w = width;
    layer.h = height;
    resetImagePlacementToOriginal(layer);
    return layer;
  }
  function fitNewCustomImageFrame(layer, naturalWidth, naturalHeight, template) {
    return fitCustomImageFrameToSource(layer, naturalWidth, naturalHeight, template, false);
  }
  function resetImagePlacementToOriginal(config) {
    if (!config) return config;
    config.fit = "contain";
    config.zoom = 1;
    config.panX = 0;
    config.panY = 0;
    return config;
  }
  function roundedDesignMetric(value) { return Math.round(finiteNumber(value, 0) * 10) / 10; }
  function templateHasFeature(value, feature) {
    var config = templateConfig(value);
    return Boolean(config.features && config.features[feature]);
  }
  var LAYER_DEFS = [
    { key: "face-shadow", icon: "S", group: "SURFACE", front: ["Shadow", "FACE SHADOW"], back: ["Shadow", "FACE SHADOW"], visibilityOnly: true },
    { key: "block-main", icon: "■", group: "SURFACE", front: ["Main Fill", "COLOR"], back: ["Main Fill", "COLOR"] },
    { key: "block-stub", icon: "▥", group: "SURFACE", front: ["Stub Fill", "COLOR"], back: ["Stub Fill", "COLOR"], cinemaSides: [] },
    { key: "image-main", icon: "▧", group: "IMAGE", front: ["Main Image", "IMAGE"], back: ["Archive Image", "IMAGE"], cinemaSides: ["front", "back"] },
    { key: "image-stub", icon: "◇", group: "IMAGE", front: ["Railway Logo", "REPLACEABLE IMAGE"], back: ["Railway Logo", "REPLACEABLE IMAGE"], cinemaSides: [], templates: ["train"] },
    { key: "frame", icon: "□", group: "STRUCTURE", front: ["Cinema Frame", "FULL TICKET"], back: ["Cinema Frame", "FULL TICKET"], sides: [], cinemaSides: ["front", "back"] },
    { key: "main-frame", icon: "▣", group: "STRUCTURE", front: ["Illustration Frame", "MAIN TICKET"], back: ["Record Frame", "MAIN TICKET"], sides: ["front"], templates: ["train"] },
    { key: "back-image-frame", icon: "▣", group: "STRUCTURE", front: ["Image Frame", "BACK ORNAMENT FRAME"], back: ["Image Frame", "BACK ORNAMENT FRAME"], sides: ["back"], templates: ["train"] },
    { key: "record-divider-top", icon: "—", group: "STRUCTURE", front: ["Record Divider 01", "ORNAMENT RULE"], back: ["Record Divider 01", "ORNAMENT RULE"], sides: ["back"], templates: ["train"] },
    { key: "stub-frame", icon: "▥", group: "STRUCTURE", front: ["Stub Frame", "DETACHABLE STUB"], back: ["Stub Frame", "DETACHABLE STUB"], templates: ["train"] },
    { key: "stub-divider", icon: "—", group: "STRUCTURE", front: ["Stub Divider", "ORNAMENT RULE"], back: ["Stub Divider", "ORNAMENT RULE"], templates: ["train"] },
    { key: "coupon-meta-rules", icon: "╋", group: "STRUCTURE", front: ["Table Rules", "COUPON TABLE RULES"], back: ["Table Rules", "COUPON TABLE RULES"], templates: ["train"] },
    { key: "route-art", icon: "┊", group: "STRUCTURE", front: ["Perforation", "STRUCTURE"], back: ["Perforation", "STRUCTURE"], cinemaSides: [] },
    { key: "seal", icon: "◎", group: "ROUTE", front: ["Railway Stamp", "EDITABLE MARK"], back: ["Railway Stamp", "EDITABLE MARK"], sides: [], cinemaSides: [] },
    { key: "coach", icon: "07", group: "STUB", front: ["Coach / Screen", "TEXT"], back: ["Coach / Screen", "TEXT"], cinemaSides: [] },
    { key: "stub-topline", icon: "T", group: "STUB", front: ["Conductor Label", "TEXT"], back: ["Conductor Label", "TEXT"], cinemaSides: [] },
    { key: "admit-copy", icon: "A", group: "STUB", front: ["Admission Copy", "TEXT"], back: ["Admission Copy", "TEXT"], cinemaSides: [] },
    { key: "stub-title", icon: "N", group: "STUB", front: ["Stub Journey Name", "TEXT"], back: ["Stub Journey Name", "TEXT"], cinemaSides: [] },
    { key: "platform", icon: "P", group: "STUB", front: ["Class / Platform", "TEXT"], back: ["Class / Platform", "TEXT"], cinemaSides: [] },
    { key: "validation", icon: "V", group: "STUB", front: ["Validation", "TEXT"], back: ["Validation Stamp", "TEXT"], sides: [], cinemaSides: [] },
    { key: "kicker", icon: "K", group: "HEADING", front: ["Kicker", "TEXT"], back: ["Reverse Kicker", "TEXT"], cinemaSides: ["back"] },
    { key: "title", icon: "H", group: "HEADING", front: ["Pair Title", "BOT × PERSONA"], back: ["Reverse Heading", "TEXT"], cinemaSides: ["front", "back"] },
    { key: "subtitle", icon: "S", group: "HEADING", front: ["Subtitle", "TEXT"], back: ["Subtitle", "TEXT"], cinemaSides: [] },
    { key: "meta-bot-label", icon: "1", group: "META", front: ["Metadata 01 Label", "TEXT"], back: ["Metadata 01 Label", "TEXT"], cinemaSides: ["back"] },
    { key: "meta-bot", icon: "1", group: "META", front: ["Metadata 01 Value", "TEXT"], back: ["Metadata 01 Value", "TEXT"], cinemaSides: ["back"] },
    { key: "meta-persona-label", icon: "2", group: "META", front: ["Metadata 02 Label", "TEXT"], back: ["Metadata 02 Label", "TEXT"], cinemaSides: ["back"] },
    { key: "meta-persona", icon: "2", group: "META", front: ["Metadata 02 Value", "TEXT"], back: ["Metadata 02 Value", "TEXT"], cinemaSides: ["back"] },
    { key: "meta-date-label", icon: "3", group: "META", front: ["Date Label", "TEXT"], back: ["Date Label", "TEXT"], cinemaSides: ["back"] },
    { key: "meta-date", icon: "3", group: "META", front: ["Date Value", "TEXT"], back: ["Date Value", "TEXT"], cinemaSides: ["back"] },
    { key: "postcard-model", icon: "M", group: "META", front: ["Model", "LABEL + VALUE"], back: ["Model", "LABEL + VALUE"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-prompt", icon: "P", group: "META", front: ["Prompt", "LABEL + VALUE"], back: ["Prompt", "LABEL + VALUE"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-center-rule", icon: "│", group: "STRUCTURE", front: ["Center Divider", "LINE"], back: ["Center Divider", "LINE"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-writing-rule-1", icon: "—", group: "STRUCTURE", front: ["Writing Rule 01", "LINE"], back: ["Writing Rule 01", "LINE"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-writing-rule-2", icon: "—", group: "STRUCTURE", front: ["Writing Rule 02", "LINE"], back: ["Writing Rule 02", "LINE"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-writing-rule-3", icon: "—", group: "STRUCTURE", front: ["Writing Rule 03", "LINE"], back: ["Writing Rule 03", "LINE"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-writing-rule-4", icon: "—", group: "STRUCTURE", front: ["Writing Rule 04", "LINE"], back: ["Writing Rule 04", "LINE"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-card-title", icon: "H", group: "HEADING", front: ["Post Card", "TEXT"], back: ["Post Card", "TEXT"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-card-subtitle", icon: "S", group: "HEADING", front: ["Memorial Log", "TEXT"], back: ["Memorial Log", "TEXT"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-from-label", icon: "F", group: "META", front: ["From Label", "TEXT"], back: ["From Label", "TEXT"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-from-value", icon: "F", group: "META", front: ["From Name", "TEXT"], back: ["From Name", "TEXT"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-to-label", icon: "T", group: "META", front: ["To Label", "TEXT"], back: ["To Label", "TEXT"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-to-value", icon: "T", group: "META", front: ["To Name", "TEXT"], back: ["To Name", "TEXT"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-date-label", icon: "D", group: "META", front: ["Date Label", "TEXT"], back: ["Date Label", "TEXT"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-date-value", icon: "D", group: "META", front: ["Date Value", "TEXT"], back: ["Date Value", "TEXT"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-model-label", icon: "M", group: "META", front: ["Model Label", "TEXT"], back: ["Model Label", "TEXT"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-model-value", icon: "M", group: "META", front: ["Model Value", "TEXT"], back: ["Model Value", "TEXT"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-prompt-label", icon: "P", group: "META", front: ["Prompt Label", "TEXT"], back: ["Prompt Label", "TEXT"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-prompt-value", icon: "P", group: "META", front: ["Prompt Value", "TEXT"], back: ["Prompt Value", "TEXT"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-writing-1", icon: "1", group: "COPY", front: ["Writing Line 01", "TEXT"], back: ["Writing Line 01", "TEXT"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-writing-2", icon: "2", group: "COPY", front: ["Writing Line 02", "TEXT"], back: ["Writing Line 02", "TEXT"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-writing-3", icon: "3", group: "COPY", front: ["Writing Line 03", "TEXT"], back: ["Writing Line 03", "TEXT"], sides: ["back"], templates: ["postcard"] },
    { key: "postcard-writing-4", icon: "4", group: "COPY", front: ["Writing Line 04", "TEXT"], back: ["Writing Line 04", "TEXT"], sides: ["back"], templates: ["postcard"] },
    { key: "record-meta-bot-label", icon: "1", group: "META", front: ["Record Departure Label", "TEXT"], back: ["Record Departure Label", "TEXT"], sides: ["back"], templates: ["train"] },
    { key: "record-meta-bot", icon: "1", group: "META", front: ["Record Departure Value", "TEXT"], back: ["Record Departure Value", "TEXT"], sides: ["back"], templates: ["train"] },
    { key: "record-meta-persona-label", icon: "2", group: "META", front: ["Record Arrival Label", "TEXT"], back: ["Record Arrival Label", "TEXT"], sides: ["back"], templates: ["train"] },
    { key: "record-meta-persona", icon: "2", group: "META", front: ["Record Arrival Value", "TEXT"], back: ["Record Arrival Value", "TEXT"], sides: ["back"], templates: ["train"] },
    { key: "record-meta-date-label", icon: "3", group: "META", front: ["Record Date Label", "TEXT"], back: ["Record Date Label", "TEXT"], sides: ["back"], templates: ["train"] },
    { key: "record-meta-date", icon: "3", group: "META", front: ["Record Date Value", "TEXT"], back: ["Record Date Value", "TEXT"], sides: ["back"], templates: ["train"] },
    { key: "quote", icon: "T", group: "COPY", front: ["Main Quote", "TEXT"], back: ["Archive Title", "TEXT"] },
    { key: "speaker", icon: "—", group: "COPY", front: ["Speaker", "TEXT"], back: ["Speaker", "TEXT"], sides: ["front"], cinemaSides: [] },
    { key: "handwritten-note", icon: "T", group: "COPY", front: ["Handwritten Note", "DECORATIVE TEXT"], back: ["Handwritten Note", "DECORATIVE TEXT"], sides: ["front"], templates: ["train"] },
    { key: "copy-label", icon: "L", group: "COPY", front: ["Copy Label", "TEXT"], back: ["Copy Label", "TEXT"], sides: ["back"] },
    { key: "body", icon: "¶", group: "COPY", front: ["Body", "TEXT"], back: ["Archive Body", "TEXT"], sides: ["back"] },
    { key: "source-label", icon: "A", group: "DETAIL", front: ["Seat Label", "TEXT"], back: ["Seat Label", "TEXT"], sides: [], cinemaSides: ["back"] },
    { key: "source", icon: "A", group: "DETAIL", front: ["Fare / Route", "LINKED LABEL + VALUE"], back: ["Fare / Route", "LINKED LABEL + VALUE"], cinemaSides: ["back"] },
    { key: "back-note-label", icon: "T", group: "COPY", front: ["Theater Label", "TEXT"], back: ["Theater Label", "TEXT"], sides: [], cinemaSides: ["back"] },
    { key: "back-note", icon: "T", group: "COPY", front: ["Reverse Note", "TEXT"], back: ["Reverse Note", "TEXT"], sides: ["back"], cinemaSides: ["back"] },
    { key: "serial-label", icon: "#", group: "DETAIL", front: ["Main Serial Label", "TEXT"], back: ["Serial Label", "TEXT"], sides: ["front"], cinemaSides: ["back"] },
    { key: "serial", icon: "#", group: "DETAIL", front: ["Main Serial Value", "TEXT"], back: ["Serial Value", "TEXT"], cinemaSides: ["back"] },
    { key: "serial-copy", icon: "#", group: "STUB", front: ["Stub Serial", "MIRRORS MAIN SERIAL"], back: ["Stub Serial", "MIRRORS MAIN SERIAL"], cinemaSides: [], templates: ["train"] },
    { key: "rating-label", icon: "R", group: "DETAIL", front: ["Rating Label", "TEXT"], back: ["Rating Label", "TEXT"], sides: ["back"], templates: ["cinema"] },
    { key: "rating-marks", icon: "☆", group: "DETAIL", front: ["Rating Marks", "5 MARKS"], back: ["Rating Marks", "5 MARKS"], sides: ["back"], templates: ["cinema"] },
    { key: "rating-score", icon: "/", group: "DETAIL", front: ["Rating Score", "TEXT"], back: ["Rating Score", "TEXT"], sides: ["back"], templates: ["cinema"] },
    { key: "cinema-etc-label", icon: "E", group: "DETAIL", front: ["Etc. Label", "TEXT"], back: ["Etc. Label", "TEXT"], sides: ["back"], templates: ["cinema"] },
    { key: "cinema-etc", icon: "E", group: "DETAIL", front: ["Etc. Value", "TEXT"], back: ["Etc. Value", "TEXT"], sides: ["back"], templates: ["cinema"] },
    { key: "texture", icon: "≋", group: "SURFACE", front: ["Paper Texture", "MATERIAL"], back: ["Paper Texture", "MATERIAL"], cinemaSides: [] },
    { key: "attribution", icon: "©", group: "CREDIT", front: ["Memorial Log Credit", "PROTECTED · COLOR + POSITION"], back: ["Memorial Log Credit", "PROTECTED · COLOR + POSITION"], protectedLayer: true }
  ];
  var ATTRIBUTION_LAYER_KEY = "attribution";
  var ATTRIBUTION_TEXT = "Memorial Log · by gim";
  var LAYER_ORDER = LAYER_DEFS.map(function (item) { return item.key; });
  var TEMPLATE_LAYER_SIDES = {
    postcard: {
      "face-shadow": ["front", "back"],
      "block-main": ["front", "back"], "image-main": ["front", "back"], "image-stub": ["back"], texture: ["back"],
      "postcard-center-rule": ["back"],
      "postcard-writing-rule-1": ["back"], "postcard-writing-rule-2": ["back"], "postcard-writing-rule-3": ["back"], "postcard-writing-rule-4": ["back"],
      "postcard-card-title": ["back"], "postcard-card-subtitle": ["back"],
      "postcard-from-label": ["back"], "postcard-from-value": ["back"], "postcard-to-label": ["back"], "postcard-to-value": ["back"],
      "postcard-date-label": ["back"], "postcard-date-value": ["back"], "postcard-model-label": ["back"], "postcard-model-value": ["back"],
      "postcard-prompt-label": ["back"], "postcard-prompt-value": ["back"],
      "postcard-writing-1": ["back"], "postcard-writing-2": ["back"], "postcard-writing-3": ["back"], "postcard-writing-4": ["back"],
      attribution: ["front", "back"]
    },
    polaroid: {
      "face-shadow": ["front", "back"],
      "block-main": ["front", "back"], "image-main": ["front"], frame: ["front", "back"],
      "meta-bot": ["back"], "meta-persona": ["back"], quote: ["front"], attribution: ["front", "back"]
    }
  };
  var TEMPLATE_LAYER_LABELS = {
    postcard: {
      "block-main": { front: ["Front Card", "COLOR"], back: ["Reverse Card", "COLOR"] },
      "image-main": { front: ["Front Illustration", "FULL BLEED IMAGE"], back: ["Back Illustration", "FULL BLEED IMAGE"] }, "image-stub": ["Postage Stamp", "IMAGE"],
      texture: ["Paper Texture", "MATERIAL"]
    },
    polaroid: {
      "block-main": { front: ["Polaroid Paper", "COLOR"], back: ["Film Surface", "COLOR"] },
      "image-main": ["Photograph", "IMAGE"],
      frame: { front: ["Photo Frame", "FRAME"], back: ["Film Rails", "TOP + BOTTOM BANDS"] },
      "meta-bot": ["Top Repeat", "BOT NAME"], "meta-persona": ["Bottom Repeat", "PERSONA NAME"],
      quote: ["Handwritten Phrase", "TEXT"]
    }
  };
  var TRAIN_BACK_LAYER_LABELS = {
    "back-image-frame": ["Image Frame", "BACK ORNAMENT FRAME"],
    "record-divider-top": ["Record Divider 01", "ORNAMENT RULE"],
    "record-meta-bot-label": ["Departure Label", "TEXT"],
    "record-meta-bot": ["Departure Value", "TEXT"],
    "record-meta-persona-label": ["Arrival Label", "TEXT"],
    "record-meta-persona": ["Arrival Value", "TEXT"],
    "record-meta-date-label": ["Date Issued Label", "TEXT"],
    "record-meta-date": ["Date Issued Value", "TEXT"],
    "stub-frame": ["Coupon Frame", "MIRRORS FRONT"],
    "stub-divider": ["Coupon Divider", "MIRRORS FRONT"],
    "image-stub": ["Railway Logo", "MIRRORS FRONT"],
    kicker: ["Railway Header", "MIRRORS FRONT"],
    title: ["Pair Title", "MIRRORS FRONT"],
  };
  /* The reverse conductor coupon is not a second design. Every visual and
     editor state below is backed by the front coupon's single source of truth. */
  var TRAIN_MIRRORED_COUPON_LAYERS = [
    "block-stub", "image-stub", "stub-frame", "stub-divider", "route-art",
    "kicker", "title", "subtitle", "meta-bot-label", "meta-bot", "meta-persona-label", "meta-persona", "meta-date-label", "meta-date",
    "coach", "stub-topline", "admit-copy", "stub-title", "platform",
    "validation", "source", "serial-copy"
  ];
  function canonicalTrainCouponSide(side, key, documentState) {
    var source = documentState || state;
    return source && source.template === "train" && side === "back"
      && TRAIN_MIRRORED_COUPON_LAYERS.indexOf(key) >= 0 ? "front" : side;
  }
  var CINEMA_BACK_LAYER_LABELS = {
    "block-main": ["Full Background", "SOLID COLOR"],
    "image-main": ["Full Image", "FULL BLEED IMAGE"],
    frame: ["Table Rules", "GRID / STRUCTURE"],
    "meta-date-label": ["Date Label", "TEXT"],
    "meta-date": ["Date Value", "TEXT"],
    "meta-bot-label": ["Director Label", "TEXT"],
    "meta-bot": ["Director Value", "TEXT"],
    "meta-persona-label": ["Cast Label", "TEXT"],
    "meta-persona": ["Cast Value", "TEXT"],
    "back-note-label": ["Theater Label", "TEXT"],
    "back-note": ["Theater Value", "TEXT"],
    "serial-label": ["Screen Label", "TEXT"],
    serial: ["Screen Value", "TEXT"],
    "source-label": ["Seat Label", "TEXT"],
    source: ["Seat Value", "TEXT"]
  };
  function templateLayerOrder(template) {
    var nativeMap = TEMPLATE_LAYER_SIDES[template];
    if (!nativeMap) {
      return LAYER_ORDER.filter(function (key) {
        var definition = LAYER_DEFS.find(function (item) { return item.key === key; });
        if (definition && definition.templates && definition.templates.indexOf(template) < 0) return false;
        return template === "train" ? key !== "frame" : ["image-stub", "main-frame", "stub-frame", "stub-divider", "serial-copy", "stub-topline", "admit-copy", "stub-title", "platform", "texture"].indexOf(key) < 0;
      });
    }
    return LAYER_ORDER.filter(function (key) { return Array.isArray(nativeMap[key]) && nativeMap[key].length > 0; });
  }
  var POSTCARD_TEXT_LAYER_KEYS = ["postcard-card-title", "postcard-card-subtitle", "postcard-from-label", "postcard-from-value", "postcard-to-label", "postcard-to-value", "postcard-date-label", "postcard-date-value", "postcard-model-label", "postcard-model-value", "postcard-prompt-label", "postcard-prompt-value", "postcard-writing-1", "postcard-writing-2", "postcard-writing-3", "postcard-writing-4"];
  var POSTCARD_RULE_LAYER_KEYS = ["postcard-center-rule", "postcard-writing-rule-1", "postcard-writing-rule-2", "postcard-writing-rule-3", "postcard-writing-rule-4"];
  var TEXT_LAYER_KEYS = ["coach", "stub-topline", "admit-copy", "stub-title", "platform", "validation", "kicker", "title", "subtitle", "meta-bot-label", "meta-bot", "meta-persona-label", "meta-persona", "meta-date-label", "meta-date", "postcard-model", "postcard-prompt", "record-meta-bot-label", "record-meta-bot", "record-meta-persona-label", "record-meta-persona", "record-meta-date-label", "record-meta-date", "quote", "speaker", "handwritten-note", "copy-label", "body", "source-label", "source", "back-note-label", "back-note", "serial-label", "serial", "serial-copy", "rating-label", "rating-marks", "rating-score", "cinema-etc-label", "cinema-etc", "seal"].concat(POSTCARD_TEXT_LAYER_KEYS);
  var TEXT_COLOR_MODES = ["difference", "solid"];
  var FONT_FAMILY_MAP = {
    "noto-serif": "'Noto Serif KR', serif", pretendard: "Pretendard, sans-serif",
    "gowun-batang": "'Gowun Batang', serif", "song-myung": "'Song Myung', serif",
    "gowun-dodum": "'Gowun Dodum', sans-serif", "gothic-a1": "'Gothic A1', sans-serif",
    "noto-serif-jp": "'Noto Serif JP', serif", "m-plus-rounded-1c": "'M PLUS Rounded 1c', sans-serif",
    "zen-kurenaido": "'Zen Kurenaido', cursive",
    cinzel: "Cinzel, serif", "nanum-brush": "'Nanum Brush Script', cursive",
    "nanum-pen": "'Nanum Pen Script', cursive",
    italianno: "Italianno, cursive"
  };
  var FONT_FAMILY_KEYS = Object.keys(FONT_FAMILY_MAP);
  var SYSTEM_FONT_KEY_PATTERN = /^system:[A-Za-z0-9_-]{8,2048}$/;
  var LEGACY_LOCAL_FONT_KEY_PATTERN = /^local:[0-9a-f]{16,64}$/;
  function isSystemFontKey(key) { return SYSTEM_FONT_KEY_PATTERN.test(String(key || "")); }
  function isLegacyLocalFontKey(key) { return LEGACY_LOCAL_FONT_KEY_PATTERN.test(String(key || "")); }
  function fontKeyAllowed(key) { return FONT_FAMILY_KEYS.indexOf(key) >= 0 || isSystemFontKey(key) || isLegacyLocalFontKey(key); }
  function systemFontHash(value) {
    var hash = 2166136261;
    String(value || "").split("").forEach(function (character) {
      hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
    });
    return hash.toString(16).padStart(8, "0");
  }
  function systemFontAlias(key) { return isSystemFontKey(key) ? "LTSystem_" + systemFontHash(key) : ""; }
  function fontFamilyForKey(key) {
    if (FONT_FAMILY_MAP[key]) return FONT_FAMILY_MAP[key];
    var alias = systemFontAlias(key);
    return alias ? '"' + alias + '", sans-serif' : "'Noto Serif KR', serif";
  }
  var COLOR_LAYER_KEYS = TEXT_LAYER_KEYS.concat(["frame", "main-frame", "back-image-frame", "record-divider-top", "stub-frame", "stub-divider", "coupon-meta-rules", "route-art", "image-stub", ATTRIBUTION_LAYER_KEY]).concat(POSTCARD_RULE_LAYER_KEYS);
  var FRAME_COLOR_LAYER_KEYS = ["frame", "main-frame", "back-image-frame", "record-divider-top", "stub-frame", "stub-divider", "coupon-meta-rules", "route-art", "image-stub"].concat(POSTCARD_RULE_LAYER_KEYS);
  var CINEMA_FRONT_FRAME_DEFAULT_COLOR = "#f7e7c8";
  var POSTCARD_STAMP_BORDER_DEFAULT_COLOR = "#ffffff";
  var LAYER_FOLDER_ORDER = ["SURFACES", "IMAGES", "FRAMES", "TEXT", "CUSTOM"];
  var LAYER_FOLDER_LABELS = { SURFACES: "표면", IMAGES: "이미지", FRAMES: "프레임 · 장식", TEXT: "텍스트", CUSTOM: "사용자 레이어" };
  var LAYER_TYPE_ICONS = { SURFACES: "■", IMAGES: "▧", FRAMES: "□", TEXT: "T", CUSTOM_TEXT: "T", CUSTOM_IMAGE: "▧", CUSTOM_SHAPE: "◇", EFFECT: "FX" };
  var MOVABLE_LAYERS = LAYER_ORDER.filter(function (key) { return ["face-shadow", "block-main", "block-stub", "texture", "effects", "route-art"].indexOf(key) < 0; });
  var LEGACY_LAYER_MEMBERS = {
    heading: ["kicker", "title", "subtitle"],
    metadata: ["meta-bot-label", "meta-bot", "meta-persona-label", "meta-persona", "meta-date-label", "meta-date"],
    route: ["route-art", "seal"],
    "stub-print": ["coach", "stub-topline", "admit-copy", "stub-title", "platform", "validation", "barcode"],
    "stub-copy": ["stub-topline", "admit-copy", "stub-title", "platform"],
    quote: ["quote", "speaker", "copy-label", "body"],
    details: ["source-label", "source", "serial-label", "serial"]
  };
  var LEGACY_PARENT_BY_LAYER = {};
  Object.keys(LEGACY_LAYER_MEMBERS).forEach(function (parent) {
    LEGACY_LAYER_MEMBERS[parent].forEach(function (key) { LEGACY_PARENT_BY_LAYER[key] = parent; });
  });
  var defaultEffect = function () {
    return {
      blur: 0, brightness: 100, saturation: 100, contrast: 100, hue: 0,
      sepia: 0, grayscale: 0, vignette: 0, overlay: 0,
      overlayColor: "#6f3f43", overlayBlend: "multiply", vignetteSignedVersion: 1
    };
  };
  var defaultBlock = function (color) {
    return { color: color, imageData: "", imageName: "", imageType: "", fit: "contain", zoom: 1, panX: 0, panY: 0, tintMode: "none", effect: defaultEffect() };
  };
  var defaultTrainLogoBlock = function (color) {
    var block = defaultBlock(color);
    block.imageData = window.LOG_TICKET_TRAIN_LOGO_ASSET || "";
    block.imageName = "train-travel-logo-v4.png";
    block.imageType = "image/png";
    block.fit = "contain";
    block.tintMode = "accent";
    return block;
  };
  function defaultPlacements() { return { front: {}, back: {} }; }
  function defaultLayerStyles() { return { front: {}, back: {} }; }
  function defaultLayerFolders() { return { SURFACES: false, IMAGES: false, FRAMES: false, TEXT: false, CUSTOM: false }; }
  var defaultShadow = function () {
    return { enabled: false, color: "#22160f", opacity: 35, angle: 90, distance: 8, blur: 18, spread: 0 };
  };
  var cinemaTitleShadow = function () {
    return { enabled: false, color: "#190d0a", opacity: 55, angle: 90, distance: 2, blur: 10, spread: 0 };
  };
  function isLegacyCinemaTitleShadow(value) {
    return Boolean(value && value.enabled && value.color === "#190d0a"
      && Number(value.opacity) === 55 && Number(value.angle) === 90
      && Number(value.distance) === 2 && Number(value.blur) === 10
      && Number(value.spread) === 0);
  }
  var trainTitleShadow = function () {
    return { enabled: true, color: "#211411", opacity: 32, angle: 90, distance: 2, blur: 8, spread: 0 };
  };
  function defaultShadows() {
    var shadows = {};
    LAYER_ORDER.forEach(function (key) { shadows[key] = defaultShadow(); });
    return shadows;
  }
  var defaults = {
    designVersion: DESIGN_VERSION,
    trainLogoVersion: TRAIN_LOGO_VERSION,
    trainGeometryVersion: TRAIN_GEOMETRY_VERSION,
    trainHandwritingVersion: TRAIN_HANDWRITING_VERSION,
    template: "train",
    theme: "light",
    uiTheme: "light",
    side: "front",
    postcardFaceModelVersion: 1,
    postcardLayoutVersion: POSTCARD_LAYOUT_VERSION,
    polaroidReverseVersion: POLAROID_REVERSE_VERSION,
    faceViewVersion: FACE_VIEW_VERSION,
    cinemaPairTitleVersion: CINEMA_PAIR_TITLE_VERSION,
    cinemaRatingLayerVersion: CINEMA_RATING_LAYER_VERSION,
    compositeTextLayerVersion: COMPOSITE_TEXT_LAYER_VERSION,
    legacyCompositeTransforms: { front: {}, back: {} },
    postcardViewMode: "front",
    postcardTopSide: "front",
    title: "MIDNIGHT PASSAGE",
    subtitle: "SINGLE JOURNEY · FIRST CLASS",
    kicker: "THE GRAND NIGHT RAILWAY\nPASSENGER DEPT.",
    backKicker: "JOURNEY RECORD / SIDE B",
    backHeading: "MIDNIGHT PASSAGE",
    botName: "HAEON",
    personaName: "MIRA",
    botLabel: "DEPARTURE",
    personaLabel: "ARRIVAL",
    dateLabel: "DATE ISSUED",
    date: new Date().toISOString().slice(0, 10),
    postcardModelLabel: "MODEL",
    postcardModel: "AI",
    postcardPromptLabel: "PROMPT",
    postcardPrompt: "PR",
    postcardCardTitle: "POST CARD",
    postcardCardSubtitle: "MEMORIAL LOG",
    postcardWriting1: POSTCARD_WRITING_LINES[0],
    postcardWriting2: POSTCARD_WRITING_LINES[1],
    postcardWriting3: POSTCARD_WRITING_LINES[2],
    postcardWriting4: POSTCARD_WRITING_LINES[3],
    quote: "우리가 지나온 모든 밤은\n사라진 게 아니라 길이 되었다.",
    speaker: "해온",
    handwrittenNote: "Every quiet mile leaves a little light.\nWhat fades from view still travels with us.\nSome journeys remain long after arrival.",
    source: "FARE 32.50 · ROUTE NL-07",
    sourceLabel: "FARE / ROUTE",
    serial: "LT 0719 · 23:48",
    serialLabel: "SERIAL / MAIN TICKET",
    serialCopyLabel: "STUB SERIAL",
    backNoteLabel: "THEATER",
    cinemaEtcLabel: "ETC.",
    ratingScore: "(   / 5 )",
    backTitle: "기억은 도착지가 아니라,\n계속 이어지는 노선이다.",
    backBody: "밤이 깊어질수록 창밖의 풍경은 이름을 잃고, 오래 남은 문장만이 작은 불빛처럼 또렷해집니다. 이 기록면에는 그날의 대화와 표정, 다시 꺼내 보고 싶은 한순간을 천천히 적어 두세요. 어디에서 출발했는지보다 무엇을 마음에 남겼는지, 누구와 같은 장면을 바라보았는지가 더 오래 기억될지도 모릅니다.\n\n열차가 다음 역으로 사라진 뒤에도 이 표는 한동안 당신의 문장을 품고 있습니다. 시간이 흐른 뒤 다시 펼쳤을 때 그날의 온도와 목소리가 조용히 돌아올 수 있도록, 빈칸을 서두르지 말고 당신만의 기록으로 채워 주세요.",
    backNote: "",
    backCopyLabel: "JOURNEY NOTES / REVERSE",
    routeFrom: "",
    routeTo: "",
    routeIndex: "TICKET NO. LT–0719",
    backRouteFrom: "",
    backRouteTo: "",
    sealText: "LT",
    coachLabel: "CAR / SEAT",
    coachNumber: "07 · 18",
    stubTopline: "CONDUCTOR'S COUPON",
    admitText: "ADMIT\nONE",
    stubTitle: "NIGHT EXPRESS",
    platformText: "SINGLE · CLASS A",
    validationText: "PUNCH\nHERE",
    barcode: "LT07192348",
    backIndex: "PASSENGER\nCOPY",
    backStamp: "PASSAGE\nVALIDATED",
    backBarcode: "LT07192348",
    ratingLabel: "MY RATING",
    ratingMark: "☆",
    quoteEffect: "solid",
    font: "noto-serif",
    quoteColor: "#272a29",
    accent: "#355a58",
    muted: "#5f615c",
    texture: true,
    textureStrength: 80,
    texturePresetVersion: 1,
    blocks: {
      frontMain: defaultBlock("#f3ede2"),
      frontStub: defaultTrainLogoBlock("#e7ddcc"),
      backMain: defaultBlock("#f3ede2"),
      backStub: defaultBlock("#e7ddcc")
    },
    customLayers: { front: [], back: [] },
    layouts: {
      front: { quoteX: 3.36, quoteY: 74.2, quoteW: 66.04, quoteSize: 29, detailsX: 0, detailsY: 0, detailsW: 100 },
      back: { quoteX: 28.85, quoteY: 17.2, quoteW: 39.75, quoteSize: 32, detailsX: 76.1, detailsY: 52.5, detailsW: 19.4 }
    },
    placements: defaultPlacements(),
    layerStyles: defaultLayerStyles(),
    inlineTextStyleVersion: INLINE_TEXT_STYLE_VERSION,
    inlineTextStyles: { front: {}, back: {} },
    textTypingStyles: { front: {}, back: {} },
    layerFolders: defaultLayerFolders(),
    shadowPresetVersion: 2,
    freeform: false,
    snapToGrid: true,
    snapToObjects: false,
    snapToCanvasCenter: false,
    viewZoom: 1,
    viewRotation: 0,
    motion: "flip",
    duration: 800,
    hidden: [],
    removedLayers: [],
    locked: [],
    clipping: [],
    layerOrder: LAYER_ORDER.slice(),
    layerOrders: { front: [], back: [] },
    shadows: defaultShadows(),
    sideShadows: { front: {}, back: {} },
    selectedLayer: ""
  };

  function createTemplateDefaults(template) {
    template = safeTemplateId(template);
    var next = clone(defaults);
    next.template = template;
    next.layerOrder = templateLayerOrder(template);
    if (template === "cinema") {
      next.shadows.title = cinemaTitleShadow();
      next.theme = "light";
      next.quoteEffect = "difference";
      next.title = "HAEON × MIRA";
      next.subtitle = "";
      next.kicker = "";
      next.backKicker = "ORIGINAL CINEMA TICKET · RECORD 0248";
      next.backHeading = "AFTERIMAGE";
      next.botLabel = "DIRECTOR";
      next.botName = "HAEON";
      next.personaLabel = "CAST";
      next.personaName = "MIRA";
      next.dateLabel = "DATE";
      next.quote = "빛이 꺼진 뒤에도\n그 장면은 오래 남았다.";
      next.speaker = "NOCTURNE CINEMA";
      next.source = "G-12";
      next.sourceLabel = "SEAT";
      next.serial = "02";
      next.serialLabel = "SCREEN";
      next.backNoteLabel = "THEATER";
      next.cinemaEtcLabel = "ETC.";
      next.ratingScore = "(   / 5 )";
      next.backTitle = "마지막 장면 이후에도\n오래 남은 것들";
      next.backBody = "상영관의 불이 천천히 켜졌지만 우리는 한동안 자리에서 일어나지 못했다. 마지막 장면의 빛과 음악, 서로에게 건넨 짧은 말이 아직 어둠 속에 남아 있는 것 같았다. 화면에서 사라진 인물의 표정과 유난히 마음에 걸렸던 대사, 음악이 멈춘 뒤에도 계속 이어지던 감정처럼 설명하기 어려운 조각도 괜찮다.\n\n돌아오는 길에는 결말보다 그 순간의 표정이 더 오래 떠올랐다. 시간이 지나 줄거리를 잊더라도, 그날 마음을 움직인 장면과 다시 꺼내 읽고 싶은 문장은 이 티켓 안에 조용히 남겨 둔다. 이것은 줄거리를 정리하는 칸이라기보다 내가 그 장면을 어떻게 바라보았는지 기록하는 작은 관람 노트다.";
      next.backNote = "NOCTURNE";
      next.backCopyLabel = "REVIEW";
      next.postcardModel = "model";
      next.postcardPrompt = "prompt";
      next.routeFrom = "DOORS 23:20";
      next.routeTo = "ENDS 01:48";
      next.routeIndex = "FEATURE / 118 MIN / 2D";
      next.backRouteFrom = "THEATER 02";
      next.backRouteTo = "SEAT G-12";
      next.sealText = "NC";
      next.coachLabel = "SCREEN";
      next.coachNumber = "02";
      next.stubTopline = "ADMISSION STUB";
      next.admitText = "ADMIT\nONE";
      next.stubTitle = "ROW G / SEAT 12";
      next.platformText = "SHOW 23:40";
      next.validationText = "02\nVALID";
      next.backIndex = "STUB\n0248";
      next.backStamp = "CHECKED\n23:40";
      next.ratingLabel = "RATING";
      next.accent = "#8e4e3f";
      next.quoteColor = "#3e2925";
      next.muted = "#71564c";
      next.texture = false;
      next.textureStrength = 0;
      delete next.shadows.texture;
      next.blocks.frontMain = defaultBlock("#b98a68");
      next.blocks.frontStub = defaultBlock("#b98a68");
      next.blocks.backMain = defaultBlock("#d7ba91");
      next.blocks.backStub = defaultBlock("#d7ba91");
      next.layouts.front = { quoteX: 10, quoteY: 70.5, quoteW: 80, quoteSize: 33, detailsX: 8, detailsY: 92, detailsW: 84 };
      next.layouts.back = { quoteX: 12, quoteY: 39.1, quoteW: 76, quoteSize: 34, detailsX: 12, detailsY: 83.5, detailsW: 76 };
    } else if (template === "postcard") {
      next.theme = "light";
      next.side = "front";
      next.postcardFaceModelVersion = 1;
      next.postcardLayoutVersion = POSTCARD_LAYOUT_VERSION;
      next.postcardViewMode = "both";
      next.postcardTopSide = "front";
      next.motion = "none";
      next.quoteEffect = "solid";
      next.title = "";
      next.subtitle = "POSTCARD FROM A QUIET AFTERNOON";
      next.kicker = "MEMORY POST · LETTER No. 0317";
      next.backKicker = "POSTCARD / REVERSE";
      next.backHeading = "A NOTE TO REMEMBER";
      next.botLabel = "FROM";
      next.botName = "Bot";
      next.personaLabel = "TO";
      next.personaName = "Persona";
      next.dateLabel = "DATE";
      next.postcardModelLabel = "MODEL";
      next.postcardModel = "ai";
      next.postcardPromptLabel = "PROMPT";
      next.postcardPrompt = "pr";
      next.postcardCardTitle = "POST CARD";
      next.postcardCardSubtitle = "MEMORIAL LOG";
      next.postcardWriting1 = POSTCARD_WRITING_LINES[0];
      next.postcardWriting2 = POSTCARD_WRITING_LINES[1];
      next.postcardWriting3 = POSTCARD_WRITING_LINES[2];
      next.postcardWriting4 = POSTCARD_WRITING_LINES[3];
      next.quote = "네가 건넨 한 문장이\n오늘의 풍경을 오래 남겼다.";
      next.speaker = "해온";
      next.source = "ROUTE / AFTERNOON WALK";
      next.serial = "POST 0317 · 16:20";
      next.backTitle = "";
      next.backBody = POSTCARD_WRITING_SAMPLE;
      next.backNote = "OPTIONAL NOTE · LEAVE BLANK IF UNUSED";
      next.backCopyLabel = "";
      next.routeIndex = "POSTCARD No. 0317";
      next.accent = "#8a4f46";
      next.quoteColor = "#2c2926";
      next.muted = "#6f675e";
      next.textureStrength = 80;
      next.blocks.frontMain = defaultBlock("#b87977");
      next.blocks.frontStub = defaultBlock("#fffdf8");
      next.blocks.backMain = defaultBlock("#f6f4ef");
      next.blocks.backStub = defaultBlock("#e8d8c2");
      next.layouts.front = { quoteX: 10, quoteY: 27, quoteW: 45, quoteSize: 38, detailsX: 10, detailsY: 52, detailsW: 42 };
      next.layouts.back = { quoteX: 8.2, quoteY: 20.73, quoteW: 44.69, quoteSize: 17, detailsX: 0, detailsY: 0, detailsW: 100 };
    } else if (template === "polaroid") {
      next.polaroidReverseVersion = POLAROID_REVERSE_VERSION;
      next.theme = "light";
      next.quoteEffect = "solid";
      next.title = "";
      next.subtitle = "AUGUST 10 · 23:48";
      next.kicker = "";
      next.backKicker = "POLAROID / REVERSE";
      next.backHeading = "THE MOMENT REMAINS";
      next.botLabel = "BOT";
      next.botName = "Bot name";
      next.personaLabel = "PERSONA";
      next.personaName = "Persona name";
      next.dateLabel = "CAPTURED";
      next.quote = "이 순간은 오래도록\n우리의 빛으로 남을 거야.";
      next.speaker = "";
      next.source = "FRAME / SUMMER NIGHT";
      next.serial = "";
      next.backTitle = "사진 밖에 남은 이야기";
      next.backBody = "";
      next.backNote = "OPTIONAL NOTE · ARCHIVE COPY";
      next.backCopyLabel = "MEMORY NOTE / REVERSE";
      next.accent = "#747570";
      next.quoteColor = "#282625";
      next.muted = "#746f68";
      next.texture = false;
      next.textureStrength = 0;
      next.blocks.frontMain = defaultBlock("#fffdfa");
      next.blocks.frontStub = defaultBlock("#fffdfa");
      next.blocks.backMain = defaultBlock("#1c1b1a");
      next.blocks.backStub = defaultBlock("#fffdfa");
      next.layerStyles.back["meta-bot"] = { color: "#f4f1ea", fontFamily: "gothic-a1", fontSize: 9, fontWeight: "600", letterSpacing: .35, lineHeight: 1 };
      next.layerStyles.back["meta-persona"] = { color: "#f4f1ea", fontFamily: "gothic-a1", fontSize: 15, fontWeight: "600", letterSpacing: .15, lineHeight: 1 };
      next.layouts.front = { quoteX: 7.4, quoteY: 76.5, quoteW: 85, quoteSize: 34, detailsX: 70, detailsY: 95.5, detailsW: 22.6 };
      next.layouts.back = { quoteX: 10, quoteY: 40, quoteW: 80, quoteSize: 22, detailsX: 10, detailsY: 80, detailsW: 80 };
    }
    next.layerOrders = createSideLayerOrders(next.layerOrder, next);
    syncFlatLayerOrder(next);
    next.sideShadows = createSideShadows(null, next.shadows, next);
    return next;
  }

  var templateDocuments = {};
  TEMPLATE_IDS.forEach(function (template) { templateDocuments[template] = createTemplateDefaults(template); });
  var migratedLegacyStorageKey = "";
  var state = loadState();
  var multiSelectedLayerKeys = [];
  var multiSelectionSide = state.side;
  var multiSelectionStateRef = state;
  var history = [];
  var future = [];
  var editSnapshot = null;
  var suppressFinishEditRender = false;
  var saveTimer = 0;
  var saveRequestId = 0;
  var suspendAutoSave = false;
  var postcardExportSide = "";
  var toastTimer = 0;
  var drag = null;
  var activeSnapGuides = { x: null, y: null };
  var panDrag = null;
  var spacePressed = false;
  var flipPhase = "";
  var animateFade = false;
  var trainFrameRenderPromise = Promise.resolve();
  var trainLogoRenderPromise = Promise.resolve();
  var imageAssetDbPromise = null;
  var imageAssetDbOpenError = null;
  var imageAssetHydrationPromise = Promise.resolve();
  var imageAssetsReady = !window.indexedDB;
  var imageAssetHydrationError = null;
  var exportInProgress = false;
  var exportButtonIds = ["importJsonBtn", "jsonBtn", "pngBtn", "allPngBtn", "zipBtn"];
  var systemFontRecords = {};
  var systemFontPermissionLoaded = false;
  var renderedTrainLogos = {
    front: { source: window.LOG_TICKET_TRAIN_LOGO_ASSET || "", base: window.LOG_TICKET_TRAIN_LOGO_ASSET || "", color: "" },
    back: { source: window.LOG_TICKET_TRAIN_LOGO_ASSET || "", base: window.LOG_TICKET_TRAIN_LOGO_ASSET || "", color: "" }
  };
  var layerClipboard = null;
  var trackedTextSelection = null;
  var customIdSequence = 0;
  var $ = function (selector) { return document.querySelector(selector); };
  var $$ = function (selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); };

  function syncMultiSelectionToPrimary() {
    var stateChanged = multiSelectionStateRef !== state;
    var sideChanged = multiSelectionSide !== state.side;
    multiSelectionStateRef = state;
    multiSelectionSide = state.side;
    if (!state.selectedLayer) {
      multiSelectedLayerKeys = [];
      return;
    }
    if (stateChanged || sideChanged || multiSelectedLayerKeys.indexOf(state.selectedLayer) < 0) {
      multiSelectedLayerKeys = [state.selectedLayer];
      return;
    }
    multiSelectedLayerKeys = multiSelectedLayerKeys.filter(function (key, index, list) {
      return list.indexOf(key) === index && layerAvailableOnSide(key, state.side, state);
    });
    if (multiSelectedLayerKeys.indexOf(state.selectedLayer) < 0) multiSelectedLayerKeys.push(state.selectedLayer);
  }
  function selectedLayerKeys() {
    syncMultiSelectionToPrimary();
    return multiSelectedLayerKeys.slice();
  }
  function selectedLayerCount() { return selectedLayerKeys().length; }
  function isLayerSelected(key, side) {
    if (!key || side && side !== state.side) return false;
    return selectedLayerKeys().indexOf(key) >= 0;
  }
  function finishInspectorEditBeforeSelectionChange(nextKey) {
    if (String(nextKey || "") === String(state.selectedLayer || "")) return;
    var active = document.activeElement;
    if (!active || !active.closest || !active.closest(".editor-panel") || !isEditingTarget(active)) return;
    /* Canvas objects are not focusable, so clicking a different layer used to
       leave the previous inspector input active. setInputValue() deliberately
       protects an active field while typing, which then made the new layer
       display (and appear to keep) the old layer's controls. End that editing
       transaction before changing the selection so the next render can bind
       every text/style control to the new layer immediately. */
    suppressFinishEditRender = true;
    try {
      active.blur();
      /* Color-code fields own a custom blur handler that validates the value
         but does not finish the undo transaction itself. */
      if (editSnapshot) finishEdit();
    } finally {
      suppressFinishEditRender = false;
    }
  }
  function clearLayerSelection() {
    finishInspectorEditBeforeSelectionChange("");
    state.selectedLayer = "";
    trackedTextSelection = null;
    multiSelectedLayerKeys = [];
    multiSelectionSide = state.side;
    multiSelectionStateRef = state;
  }
  function setPrimarySelection(key, additive) {
    syncMultiSelectionToPrimary();
    var togglesPrimaryOff = Boolean(additive && key && key === state.selectedLayer && multiSelectedLayerKeys.indexOf(key) >= 0);
    if (key && (key !== state.selectedLayer || togglesPrimaryOff)) finishInspectorEditBeforeSelectionChange(togglesPrimaryOff ? "" : key);
    if (!key || !layerAvailableOnSide(key, state.side, state)) {
      if (!additive) clearLayerSelection();
      return false;
    }
    if (!additive) {
      /* A canvas/layer-list click leaves the textarea editing context. Clear a
         stale substring selection even when the same layer is clicked again. */
      trackedTextSelection = null;
      state.selectedLayer = key;
      multiSelectedLayerKeys = [key];
      multiSelectionSide = state.side;
      multiSelectionStateRef = state;
      return true;
    }
    if (additive && state.selectedLayer !== key) trackedTextSelection = null;
    var index = multiSelectedLayerKeys.indexOf(key);
    if (index >= 0) {
      multiSelectedLayerKeys.splice(index, 1);
      if (state.selectedLayer === key) state.selectedLayer = multiSelectedLayerKeys.length ? multiSelectedLayerKeys[multiSelectedLayerKeys.length - 1] : "";
      return false;
    }
    multiSelectedLayerKeys.push(key);
    state.selectedLayer = key;
    return true;
  }

  function customLayerById(key, documentState) {
    var source = documentState || state;
    if (!source || !source.customLayers) return null;
    var match = null;
    ["front", "back"].some(function (side) {
      match = (source.customLayers[side] || []).find(function (item) { return item.id === key; }) || null;
      return Boolean(match);
    });
    return match;
  }
  function isCustomShapeLayer(item) { return Boolean(item && item.type === "shape"); }
  function customLayerCanStoreImage(item) { return Boolean(item && (item.type === "image" || item.type === "shape")); }
  function customLayerUsesRasterFill(item) { return Boolean(item && (item.type === "image" || item.type === "shape" && item.fillMode === "image")); }
  function customLayerHasImageAsset(item) { return customLayerCanStoreImage(item) && Boolean(item.imageData); }
  function shapeCornerCount(kind) { return kind === "triangle" ? 3 : kind === "star" ? 10 : kind === "rectangle" ? 4 : 0; }
  function isCustomLayer(key, documentState) { return Boolean(customLayerById(key, documentState)); }
  function isMovableLayer(key, documentState) {
    return MOVABLE_LAYERS.indexOf(key) >= 0 || isCustomLayer(key, documentState);
  }
  function isProtectedLayer(key) { return key === ATTRIBUTION_LAYER_KEY; }
  function layerDefinition(key, documentState) {
    var templateLayer = LAYER_DEFS.find(function (item) { return item.key === key; });
    if (templateLayer) return templateLayer;
    var custom = customLayerById(key, documentState);
    if (!custom) return null;
    var fallbackName = custom.type === "image" ? "사용자 이미지" : custom.type === "shape" ? "사용자 도형" : "사용자 텍스트";
    var typeLabel = custom.type === "image" ? "USER IMAGE" : custom.type === "shape" ? "USER SHAPE" : "USER TEXT";
    var label = [custom.name || fallbackName, typeLabel];
    return { key: custom.id, icon: custom.type === "image" ? "▧" : custom.type === "shape" ? "◇" : "T", group: "CUSTOM", front: label, back: label, sides: [custom.side] };
  }
  function layerAvailableOnSide(key, side, documentState) {
    var source = documentState || state;
    var definition = layerDefinition(key, documentState);
    if (!definition) return false;
    if (isProtectedLayer(key)) return side === "front" || side === "back";
    if (Array.isArray(source.removedLayers) && hasLayerFlag(source.removedLayers, key, side, source)) return false;
    if (definition.group === "CUSTOM") return !definition.sides || definition.sides.indexOf(side) >= 0;
    if (source.template === "train" && (key === "back-note" || (side === "back" && key === "serial"))) return false;
    var templateLayers = TEMPLATE_LAYER_SIDES[source.template];
    if (templateLayers) {
      var templateSides = templateLayers[key];
      return Array.isArray(templateSides) && templateSides.indexOf(side) >= 0;
    }
    if (definition.templates && definition.templates.indexOf(source.template) < 0) return false;
    var allowedSides = source.template === "cinema" && Array.isArray(definition.cinemaSides) ? definition.cinemaSides : definition.sides;
    return !allowedSides || allowedSides.indexOf(side) >= 0;
  }
  function normalizedLayerOrderForSide(list, side, documentState) {
    var source = documentState || state;
    var customIds = source && source.customLayers && source.customLayers[side]
      ? source.customLayers[side].map(function (item) { return item.id; }) : [];
    var required = templateLayerOrder(source && source.template).concat(customIds);
    var expanded = expandLegacyLayers(list, customIds);
    var insertBackImage = source && source.template === "postcard" && side === "back" && expanded.indexOf("image-main") < 0;
    var ordered = expanded.concat(required);
    var normalized = [];
    ordered.forEach(function (key) {
      if (normalized.indexOf(key) < 0 && layerAvailableOnSide(key, side, source)) normalized.push(key);
    });
    if (insertBackImage) {
      normalized = normalized.filter(function (key) { return key !== "image-main"; });
      var blockIndex = normalized.indexOf("block-main");
      normalized.splice(blockIndex >= 0 ? blockIndex + 1 : 0, 0, "image-main");
    }
    if (layerAvailableOnSide("face-shadow", side, source)) {
      normalized = normalized.filter(function (key) { return key !== "face-shadow"; });
      normalized.unshift("face-shadow");
    }
    if (layerAvailableOnSide("attribution", side, source)) {
      normalized = normalized.filter(function (key) { return key !== "attribution"; });
      normalized.push("attribution");
    }
    return normalized;
  }
  function createSideLayerOrders(flatOrder, documentState, savedOrders) {
    var source = documentState || state;
    return {
      front: normalizedLayerOrderForSide(savedOrders && savedOrders.front || flatOrder, "front", source),
      back: normalizedLayerOrderForSide(savedOrders && savedOrders.back || flatOrder, "back", source)
    };
  }
  function layerOrderFor(side, documentState) {
    var source = documentState || state;
    if (source && source.layerOrders && Array.isArray(source.layerOrders[side])) return source.layerOrders[side];
    return source && Array.isArray(source.layerOrder) ? source.layerOrder : [];
  }
  function syncFlatLayerOrder(documentState) {
    var source = documentState || state;
    if (!source || !source.layerOrders) return source && source.layerOrder;
    source.layerOrder = ["front", "back"].reduce(function (combined, side) {
      (Array.isArray(source.layerOrders[side]) ? source.layerOrders[side] : []).forEach(function (key) {
        if (combined.indexOf(key) < 0) combined.push(key);
      });
      return combined;
    }, []);
    return source.layerOrder;
  }
  function createSideShadows(savedSideShadows, flatShadows, documentState) {
    var source = documentState || state;
    var result = { front: {}, back: {} };
    ["front", "back"].forEach(function (side) {
      layerOrderFor(side, source).forEach(function (key) {
        if (!layerAvailableOnSide(key, side, source)) return;
        var canonicalSide = canonicalTrainCouponSide(side, key, source);
        var saved = savedSideShadows && savedSideShadows[canonicalSide] && savedSideShadows[canonicalSide][key]
          || source && source.template === "train" && canonicalSide === "front" && TRAIN_MIRRORED_COUPON_LAYERS.indexOf(key) >= 0
            && savedSideShadows && savedSideShadows.back && savedSideShadows.back[key]
          || savedSideShadows && savedSideShadows[side] && savedSideShadows[side][key]
          || flatShadows && flatShadows[key];
        if (!result[canonicalSide][key]) result[canonicalSide][key] = normalizeShadow(saved);
      });
    });
    return result;
  }
  function layerLabel(definition, side, documentState) {
    if (!definition) return null;
    var source = documentState || state;
    if (source && source.template === "train" && side === "back" && TRAIN_BACK_LAYER_LABELS[definition.key]) {
      return TRAIN_BACK_LAYER_LABELS[definition.key];
    }
    if (source && source.template === "cinema" && side === "back" && CINEMA_BACK_LAYER_LABELS[definition.key]) {
      return CINEMA_BACK_LAYER_LABELS[definition.key];
    }
    var templateLabels = source && TEMPLATE_LAYER_LABELS[source.template];
    var nativeLabel = templateLabels && templateLabels[definition.key];
    if (nativeLabel) {
      if (Array.isArray(nativeLabel)) return nativeLabel;
      if (Array.isArray(nativeLabel[side])) return nativeLabel[side];
    }
    return definition[side] || definition.front || definition.back || null;
  }
  function layerDefinitionsForDocument(documentState) {
    var source = documentState || state;
    var customDefinitions = [];
    if (source && source.customLayers) {
      ["front", "back"].forEach(function (side) {
        (source.customLayers[side] || []).forEach(function (item) {
          var definition = layerDefinition(item.id, source);
          if (definition) customDefinitions.push(definition);
        });
      });
    }
    return LAYER_DEFS.concat(customDefinitions);
  }
  function buildLayerList() {
    var list = $("#layerList");
    var definitions = layerDefinitionsForDocument(state).filter(function (definition) {
      return layerAvailableOnSide(definition.key, state.side, state);
    });
    var activeOrder = layerOrderFor(state.side, state);
    definitions.sort(function (a, b) { return activeOrder.indexOf(b.key) - activeOrder.indexOf(a.key); });
    var signature = state.template + "|" + state.side + "|" + definitions.map(function (item) { return item.key; }).join("|");
    if (list.dataset.signature === signature) return;
    var scrollTop = list.scrollTop;
    list.replaceChildren();
    definitions.forEach(function (definition) {
      var folder = layerFolderFor(definition);
      var label = layerLabel(definition, state && state.side ? state.side : "front", state) || [definition.key, definition.group || "LAYER"];
      var row = document.createElement("div");
      row.className = "layer-row" + (isLayerSelected(definition.key, state.side) ? " selected" : "") + (definition.group === "CUSTOM" ? " custom-layer-row" : "") + (definition.protectedLayer ? " protected-layer-row" : "");
      row.dataset.layerRow = definition.key;
      row.dataset.layerGroup = definition.group;
      row.dataset.layerFolderItem = folder;
      var grip = document.createElement("span");
      grip.className = "layer-drag-grip";
      grip.textContent = "⋮⋮";
      grip.title = "드래그하여 레이어 순서 변경";
      grip.setAttribute("aria-hidden", "true");
      var select = document.createElement("button");
      select.type = "button";
      select.className = "layer-select";
      select.dataset.layerSelect = definition.key;
      select.title = label[0];
      if (definition.visibilityOnly) {
        select.removeAttribute("data-layer-select");
        select.setAttribute("aria-disabled", "true");
        select.tabIndex = -1;
        row.classList.add("visibility-only-layer");
        grip.hidden = true;
      }
      var icon = document.createElement("i");
      icon.textContent = layerTypeIcon(definition);
      var copy = document.createElement("span");
      var strong = document.createElement("strong");
      strong.textContent = label[0];
      var small = document.createElement("small");
      small.textContent = label[1] + " · " + (LAYER_FOLDER_LABELS[folder] || folder);
      copy.append(strong, small);
      select.append(icon, copy);
      var visible = document.createElement("button");
      visible.type = "button";
      visible.className = "layer-action";
      visible.dataset.visible = definition.key;
      visible.title = "Hide layer";
      visible.setAttribute("aria-label", "Hide " + label[0]);
      var lock = document.createElement("button");
      lock.type = "button";
      lock.className = "layer-action";
      lock.dataset.lock = definition.key;
      lock.title = "위치 잠금";
      lock.setAttribute("aria-label", label[0] + " 위치 잠금");
      if (definition.protectedLayer) {
        grip.hidden = true;
        var protectedMark = document.createElement("span");
        protectedMark.className = "layer-protected-mark";
        protectedMark.textContent = "◆";
        protectedMark.title = "필수 출처 레이어 · 숨김 및 삭제 불가";
        protectedMark.setAttribute("aria-label", protectedMark.title);
        row.append(select, protectedMark);
      } else row.append(grip, select, visible);
      if (!definition.protectedLayer && isMovableLayer(definition.key, state)) row.appendChild(lock);
      else row.classList.add("single-action");
      list.appendChild(row);
    });
    list.dataset.signature = signature;
    list.scrollTop = scrollTop;
  }
  buildLayerList();

  var ticket = $("#ticket");
  var ticketViewport = $("#ticketViewport");
  var ticketZoom = $("#ticketZoom");
  var ticketScale = $("#ticketScale");
  var ticketViewTransform = $("#ticketViewTransform");
  var stage = $("#stage");
  var frontFace = $("#frontFace");
  var backFace = $("#backFace");
  function createFaceShadowLayer(side, face) {
    var shadow = document.createElement("div");
    var shape = document.createElement("div");
    shadow.className = "ticket-face-shadow ticket-face-shadow-" + side;
    shadow.setAttribute("aria-hidden", "true");
    shape.className = "ticket-face-shadow-shape";
    shadow.appendChild(shape);
    ticket.insertBefore(shadow, face);
    return { node: shadow, shape: shape, face: face };
  }
  var faceShadowLayers = {
    front: createFaceShadowLayer("front", frontFace),
    back: createFaceShadowLayer("back", backFace)
  };
  function syncFaceShadowMasks(explicitClipPath) {
    ["front", "back"].forEach(function (side) {
      var entry = faceShadowLayers[side];
      var computed = getComputedStyle(entry.face);
      var clipPath = explicitClipPath || entry.face.style.clipPath || computed.clipPath || "none";
      var webkitClipPath = entry.face.style.webkitClipPath || computed.webkitClipPath || clipPath;
      entry.shape.style.clipPath = clipPath;
      entry.shape.style.webkitClipPath = webkitClipPath;
      entry.shape.style.borderRadius = computed.borderRadius;
    });
  }
  var selectionOverlay = document.createElement("div");
  selectionOverlay.id = "selectionOverlay";
  selectionOverlay.className = "selection-overlay";
  selectionOverlay.hidden = true;
  selectionOverlay.setAttribute("aria-hidden", "true");
  ticket.appendChild(selectionOverlay);
  var snapGuideOverlay = document.createElement("div");
  snapGuideOverlay.id = "snapGuideOverlay";
  snapGuideOverlay.className = "snap-guide-overlay";
  snapGuideOverlay.hidden = true;
  snapGuideOverlay.setAttribute("aria-hidden", "true");
  ticket.appendChild(snapGuideOverlay);
  var clippingPreviewTimer = 0;
  var clippingPreviewGeneration = 0;
  var clippingPreviewPromise = Promise.resolve();
  var clippingPreviewBusy = false;
  var clippingPreviewPending = null;
  var installedLayerClippingSignatures = Object.create(null);
  var interactiveLayerClippingSignatures = Object.create(null);
  var customLayerInspector = $('[data-inspector="custom-text custom-image custom-shape"]');
  var customLayerIdentityFields = $("#customLayerIdentityFields");
  var customLayerIdentityHome = $("#customLayerIdentityHome");
  var layerStyleInspector = $(".layer-style-inspector");
  var imageEffectsInspector = $('[data-inspector="image-main image-stub custom-image shape-image-effects"]');
  if (customLayerInspector && imageEffectsInspector && imageEffectsInspector.parentNode) {
    imageEffectsInspector.parentNode.insertBefore(customLayerInspector, imageEffectsInspector);
  }
  function positionCustomLayerIdentityFields(custom) {
    if (!customLayerIdentityFields || !customLayerIdentityHome || !layerStyleInspector) return;
    if (custom && custom.type === "text") {
      var styleHeading = layerStyleInspector.firstElementChild;
      if (styleHeading && styleHeading.nextElementSibling !== customLayerIdentityFields) {
        styleHeading.insertAdjacentElement("afterend", customLayerIdentityFields);
      }
      return;
    }
    var homeParent = customLayerIdentityHome.parentNode;
    if (homeParent && customLayerIdentityFields.parentNode !== homeParent) {
      homeParent.insertBefore(customLayerIdentityFields, customLayerIdentityHome.nextSibling);
    }
  }
  var blockDom = {
    frontMain: { node: $("#frontMainImageSlot"), block: $("#frontMainBlock"), frame: $("#frontMainImageSlot .block-image-frame"), image: $("#frontMainImage") },
    frontStub: { node: $("#frontStubImageSlot"), block: $("#frontStubBlock"), frame: $("#frontStubImageSlot .block-image-frame"), image: $("#frontStubImage") },
    backMain: { node: $("#backMainImageSlot"), block: $("#backMainBlock"), frame: $("#backMainImageSlot .block-image-frame"), image: $("#backMainImage") },
    backStub: { node: $("#backStubImageSlot"), block: $("#backStubBlock"), frame: $("#backStubImageSlot .block-image-frame"), image: $("#backStubImage") }
  };
  var failedBlockImageSources = {};
  var trainMainOpeningMaskPromise = null;
  var trainBackOpeningMaskPromise = null;
  var TRAIN_MAIN_OPENING_MASK_SCALE_X = 1.0034;
  var TRAIN_MAIN_OPENING_MASK_SCALE_Y = 1.0068;

  function loadTrainMainOpeningMask() {
    var source = window.LOG_TICKET_TRAIN_MAIN_OPENING_MASK_ASSET || "";
    if (!source) return Promise.resolve(null);
    if (!trainMainOpeningMaskPromise) {
      trainMainOpeningMaskPromise = new Promise(function (resolve) {
        var image = new Image();
        image.onload = function () { resolve(image); };
        image.onerror = function () { resolve(null); };
        image.src = source;
      });
    }
    return trainMainOpeningMaskPromise;
  }

  function loadTrainBackOpeningMask() {
    var source = window.LOG_TICKET_TRAIN_BACK_OPENING_MASK_ASSET || "";
    if (!source) return Promise.resolve(null);
    if (!trainBackOpeningMaskPromise) {
      trainBackOpeningMaskPromise = new Promise(function (resolve) {
        var image = new Image();
        image.onload = function () { resolve(image); };
        image.onerror = function () { resolve(null); };
        image.src = source;
      });
    }
    return trainBackOpeningMaskPromise;
  }
  var templateTotal = $$("[data-start-template]").length;
  $("#templateCount").textContent = String(templateTotal).padStart(2, "0") + " TEMPLATES";

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function finiteNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  function pxToPt(value) { return Math.round(finiteNumber(value, 0) * .75 * 100) / 100; }
  function ptToPx(value) { return finiteNumber(value, 0) * 4 / 3; }
  /* Inspector values are expressed in pt, while preview styles use CSS px. */
  var MAX_FONT_SIZE_PT = 200;
  var MAX_FONT_SIZE_PX = ptToPx(MAX_FONT_SIZE_PT);
  /* These are corruption guards, not canvas-bound resize limits. */
  var MAX_OBJECT_SIZE_PERCENT = 10000;
  var MAX_NATIVE_OBJECT_SCALE = 100;
  var MAX_TEXT_BOX_SIZE_PX = 100000;
  function syncFontSelectPreview(selector, fontKey) {
    var select = $(selector);
    if (!select) return;
    select.style.fontFamily = fontKey ? fontFamilyForKey(fontKey) : "var(--sans)";
    Array.prototype.forEach.call(select.options, function (option) {
      option.style.fontFamily = option.value ? fontFamilyForKey(option.value) : "var(--sans)";
    });
  }
  function setInputValue(selector, value) {
    var node = $(selector);
    if (node && node !== document.activeElement && String(node.value) !== String(value)) node.value = value;
  }
  function normalizedHexColor(value) {
    var raw = String(value || "").trim();
    if (/^#[0-9a-f]{3}$/i.test(raw)) return "#" + raw.slice(1).split("").map(function (part) { return part + part; }).join("").toLowerCase();
    return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toLowerCase() : "";
  }
  function syncColorCodeInputs() {
    $$(".color-code-input[data-color-picker]").forEach(function (codeInput) {
      var picker = $("#" + codeInput.dataset.colorPicker);
      if (picker && codeInput !== document.activeElement) codeInput.value = picker.value.toUpperCase();
    });
  }
  function installColorCodeInputs() {
    $$("input[type=color]").forEach(function (picker) {
      if (!picker.id || $('[data-color-picker="' + picker.id + '"]')) return;
      var codeInput = document.createElement("input");
      codeInput.type = "text";
      codeInput.className = "color-code-input";
      codeInput.dataset.colorPicker = picker.id;
      codeInput.value = picker.value.toUpperCase();
      codeInput.maxLength = 7;
      codeInput.spellcheck = false;
      codeInput.setAttribute("aria-label", (picker.getAttribute("aria-label") || picker.id) + " 색상 코드");
      picker.insertAdjacentElement("afterend", codeInput);
      if (picker.parentElement) picker.parentElement.classList.add("color-enhanced");
      picker.addEventListener("input", function () { codeInput.value = picker.value.toUpperCase(); });
      codeInput.addEventListener("focus", startEdit);
      codeInput.addEventListener("input", function () {
        var color = normalizedHexColor(codeInput.value);
        if (!color) return;
        picker.value = color;
        picker.dispatchEvent(new Event("input", { bubbles: true }));
      });
      codeInput.addEventListener("change", function () {
        var color = normalizedHexColor(codeInput.value);
        if (color) {
          picker.value = color;
          picker.dispatchEvent(new Event("input", { bubbles: true }));
          picker.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          codeInput.value = picker.value.toUpperCase();
          finishEdit();
        }
      });
      codeInput.addEventListener("blur", function () {
        if (!normalizedHexColor(codeInput.value)) codeInput.value = picker.value.toUpperCase();
      });
    });
  }
  function toggleInArray(list, value) {
    var index = list.indexOf(value);
    if (index >= 0) list.splice(index, 1); else list.push(value);
  }

  function normalizeBlock(saved, fallback, legacyEffect) {
    var next = Object.assign({}, fallback, saved && typeof saved === "object" ? saved : {});
    next.fit = next.fit === "cover" ? "cover" : "contain";
    next.zoom = clamp(finiteNumber(next.zoom, 1), 1, 3);
    next.panX = clamp(finiteNumber(next.panX, 0), -1, 1);
    next.panY = clamp(finiteNumber(next.panY, 0), -1, 1);
    next.tintMode = next.tintMode === "accent" ? "accent" : "none";
    next.effect = normalizeEffect(saved && saved.effect || legacyEffect, fallback.effect || defaultEffect());
    return next;
  }
  function normalizeLayout(saved, fallback) {
    return Object.assign({}, fallback, saved && typeof saved === "object" ? saved : {});
  }
  function normalizeLayerStyles(saved) {
    var next = defaultLayerStyles();
    ["front", "back"].forEach(function (side) {
      var source = saved && saved[side] && typeof saved[side] === "object" ? saved[side] : {};
      Object.keys(source).forEach(function (key) {
        if (LAYER_ORDER.indexOf(key) < 0) return;
        var value = source[key] && typeof source[key] === "object" ? source[key] : {};
        var style = {};
        if (/^#[0-9a-f]{6}$/i.test(String(value.color || ""))) style.color = String(value.color).toLowerCase();
        if (TEXT_COLOR_MODES.indexOf(value.colorMode) >= 0) style.colorMode = value.colorMode;
        if (Number.isFinite(Number(value.fontSize))) style.fontSize = clamp(Number(value.fontSize), 2, MAX_FONT_SIZE_PX);
        if (fontKeyAllowed(value.fontFamily)) style.fontFamily = value.fontFamily;
        if (/^[1-9]00$/.test(String(value.fontWeight || ""))) style.fontWeight = String(value.fontWeight);
        if (["normal", "italic"].indexOf(value.fontStyle) >= 0) style.fontStyle = value.fontStyle;
        if (Number.isFinite(Number(value.letterSpacing))) style.letterSpacing = clamp(Number(value.letterSpacing), -300, 300);
        if (Number.isFinite(Number(value.lineHeight))) style.lineHeight = clamp(Number(value.lineHeight), .6, 3);
        if (["left", "center", "right"].indexOf(value.textAlign) >= 0) style.textAlign = value.textAlign;
        if (["horizontal-tb", "vertical-rl"].indexOf(value.writingMode) >= 0) style.writingMode = value.writingMode;
        if (Object.keys(style).length) next[side][key] = style;
      });
    });
    return next;
  }
  function normalizeInlineStyleRuns(saved, textLength) {
    if (!Array.isArray(saved)) return [];
    var limit = Number.isFinite(textLength) ? Math.max(0, Math.floor(textLength)) : 100000;
    return saved.slice(0, 256).map(function (entry) {
      var run = entry && typeof entry === "object" ? entry : {};
      var start = clamp(Math.floor(finiteNumber(run.start, 0)), 0, limit);
      var end = clamp(Math.floor(finiteNumber(run.end, start)), start, limit);
      var next = { start: start, end: end };
      if (/^#[0-9a-f]{6}$/i.test(String(run.color || ""))) next.color = String(run.color).toLowerCase();
      if (fontKeyAllowed(run.fontFamily)) next.fontFamily = run.fontFamily;
      if (Number.isFinite(Number(run.fontSize))) next.fontSize = clamp(Number(run.fontSize), 2, MAX_FONT_SIZE_PX);
      if (/^[1-9]00$/.test(String(run.fontWeight || ""))) next.fontWeight = String(run.fontWeight);
      if (["normal", "italic"].indexOf(run.fontStyle) >= 0) next.fontStyle = run.fontStyle;
      if (Number.isFinite(Number(run.letterSpacing))) next.letterSpacing = clamp(Number(run.letterSpacing), -300, 300);
      if (Number.isFinite(Number(run.lineHeight))) next.lineHeight = clamp(Number(run.lineHeight), .6, 3);
      return next;
    }).filter(function (run) {
      return run.end > run.start && Object.keys(run).some(function (key) { return key !== "start" && key !== "end"; });
    }).sort(function (a, b) { return a.start - b.start || a.end - b.end; });
  }
  function normalizeInlineStylePatch(saved) {
    if (!saved || typeof saved !== "object") return {};
    var normalized = normalizeInlineStyleRuns([Object.assign({ start: 0, end: 1 }, saved)], 1)[0];
    if (!normalized) return {};
    delete normalized.start;
    delete normalized.end;
    return normalized;
  }
  function normalizeInlineTextStyles(saved) {
    var next = { front: {}, back: {} };
    ["front", "back"].forEach(function (side) {
      var sideSource = saved && saved[side] && typeof saved[side] === "object" ? saved[side] : {};
      Object.keys(sideSource).forEach(function (layerKey) {
        if (LAYER_ORDER.indexOf(layerKey) < 0 || !sideSource[layerKey] || typeof sideSource[layerKey] !== "object") return;
        var fields = {};
        Object.keys(sideSource[layerKey]).slice(0, 8).forEach(function (property) {
          if (!/^[a-z][a-zA-Z0-9]{0,79}$/.test(property)) return;
          var runs = normalizeInlineStyleRuns(sideSource[layerKey][property]);
          if (runs.length) fields[property] = runs;
        });
        if (Object.keys(fields).length) next[side][layerKey] = fields;
      });
    });
    return next;
  }
  function normalizeTextTypingStyles(saved) {
    var next = { front: {}, back: {} };
    ["front", "back"].forEach(function (side) {
      var sideSource = saved && saved[side] && typeof saved[side] === "object" ? saved[side] : {};
      Object.keys(sideSource).forEach(function (layerKey) {
        if (LAYER_ORDER.indexOf(layerKey) < 0 || !sideSource[layerKey] || typeof sideSource[layerKey] !== "object") return;
        var fields = {};
        Object.keys(sideSource[layerKey]).slice(0, 8).forEach(function (property) {
          if (!/^[a-z][a-zA-Z0-9]{0,79}$/.test(property)) return;
          var patch = normalizeInlineStylePatch(sideSource[layerKey][property]);
          if (Object.keys(patch).length) fields[property] = patch;
        });
        if (Object.keys(fields).length) next[side][layerKey] = fields;
      });
    });
    return next;
  }
  function normalizeLayerFolders(saved) {
    var next = defaultLayerFolders();
    Object.keys(next).forEach(function (key) { next[key] = Boolean(saved && saved[key]); });
    return next;
  }
  function layerFolderFor(definition) {
    if (!definition) return "TEXT";
    if (definition.group === "CUSTOM") return "CUSTOM";
    if (definition.group === "SURFACE") return "SURFACES";
    if (definition.group === "IMAGE") return "IMAGES";
    if (definition.group === "STRUCTURE") return "FRAMES";
    return "TEXT";
  }
  function layerTypeIcon(definition) {
    var folder = layerFolderFor(definition);
    if (definition && definition.key === "texture") return LAYER_TYPE_ICONS.EFFECT;
    if (folder === "CUSTOM") {
      var custom = customLayerById(definition && definition.key);
      return custom && custom.type === "image" ? LAYER_TYPE_ICONS.CUSTOM_IMAGE
        : custom && custom.type === "shape" ? LAYER_TYPE_ICONS.CUSTOM_SHAPE
          : LAYER_TYPE_ICONS.CUSTOM_TEXT;
    }
    return LAYER_TYPE_ICONS[folder] || LAYER_TYPE_ICONS.TEXT;
  }
  function normalizeLayerOrderByFolder(order, documentState) {
    return Array.isArray(order) ? order.slice() : [];
  }
  function normalizeEffect(saved, fallback) {
    var source = saved && typeof saved === "object" ? saved : {};
    var legacyGlass = clamp(finiteNumber(source.glass, 0), 0, 100);
    var next = Object.assign({}, fallback, source);
    next.blur = clamp(finiteNumber(next.blur, fallback.blur) + legacyGlass * .08, 0, 24);
    next.brightness = clamp(finiteNumber(next.brightness, fallback.brightness), 0, 200);
    next.saturation = clamp(finiteNumber(next.saturation, fallback.saturation), 0, 200);
    next.contrast = clamp(finiteNumber(next.contrast, fallback.contrast), 0, 200);
    next.hue = clamp(finiteNumber(next.hue, 0), -180, 180);
    next.sepia = clamp(finiteNumber(next.sepia, 0), 0, 100);
    next.grayscale = clamp(finiteNumber(next.grayscale, 0), 0, 100);
    var savedVignette = finiteNumber(next.vignette, 0);
    /* Before signed vignettes, positive values meant a dark edge. Preserve
       those documents by migrating the value to the new negative range. */
    if (finiteNumber(source.vignetteSignedVersion, 0) < 1 && savedVignette > 0) savedVignette *= -1;
    next.vignette = clamp(savedVignette, -100, 100);
    next.vignetteSignedVersion = 1;
    next.overlay = clamp(finiteNumber(next.overlay, fallback.overlay), 0, 100);
    delete next.glass;
    var legacyNeutral = next.blur === 0 && next.brightness === 102 && next.saturation === 106 && next.contrast === 100
      && next.hue === 0 && next.sepia === 0 && next.grayscale === 0 && next.vignette === 0 && next.overlay === 0;
    if (legacyNeutral) { next.brightness = 100; next.saturation = 100; }
    if (!/^#[0-9a-f]{6}$/i.test(String(next.overlayColor || ""))) next.overlayColor = fallback.overlayColor;
    if (["multiply", "soft-light", "screen", "overlay", "normal"].indexOf(next.overlayBlend) < 0) next.overlayBlend = "multiply";
    return next;
  }
  function safeStyleValue(value, fallback, maxLength) {
    var text = String(value == null ? "" : value).slice(0, maxLength || 180);
    return /[{};]/.test(text) ? fallback : text || fallback;
  }
  function normalizeStyledRuns(saved) {
    if (!Array.isArray(saved)) return [];
    return saved.slice(0, 48).map(function (run) {
      return {
        text: String(run && run.text || "").slice(0, 2000),
        x: clamp(finiteNumber(run && run.x, 0), -50, 150),
        y: clamp(finiteNumber(run && run.y, 0), -50, 150),
        w: clamp(finiteNumber(run && run.w, 100), 0, 800),
        h: clamp(finiteNumber(run && run.h, 100), 0, 800),
        color: /^#[0-9a-f]{6}$/i.test(String(run && run.color || "")) ? run.color : "#684b47",
        background: safeStyleValue(run && run.background, "transparent", 1200),
        borderTop: safeStyleValue(run && run.borderTop, "0px none rgba(0, 0, 0, 0)", 160),
        borderRight: safeStyleValue(run && run.borderRight, "0px none rgba(0, 0, 0, 0)", 160),
        borderBottom: safeStyleValue(run && run.borderBottom, "0px none rgba(0, 0, 0, 0)", 160),
        borderLeft: safeStyleValue(run && run.borderLeft, "0px none rgba(0, 0, 0, 0)", 160),
        borderRadius: safeStyleValue(run && run.borderRadius, "0px", 100),
        boxShadow: safeStyleValue(run && run.boxShadow, "none", 220),
        fontFamily: safeStyleValue(run && run.fontFamily, "inherit", 180),
        fontSize: clamp(finiteNumber(run && run.fontSize, 28), 4, MAX_FONT_SIZE_PX),
        fontWeight: safeStyleValue(run && run.fontWeight, "400", 40),
        fontStyle: safeStyleValue(run && run.fontStyle, "normal", 40),
        lineHeight: safeStyleValue(run && run.lineHeight, "normal", 60),
        letterSpacing: safeStyleValue(run && run.letterSpacing, "normal", 60),
        textAlign: ["left", "center", "right", "justify", "start", "end"].indexOf(run && run.textAlign) >= 0 ? run.textAlign : "left",
        textTransform: safeStyleValue(run && run.textTransform, "none", 40),
        whiteSpace: safeStyleValue(run && run.whiteSpace, "pre-wrap", 40),
        display: safeStyleValue(run && run.display, "block", 40),
        alignItems: safeStyleValue(run && run.alignItems, "normal", 60),
        justifyContent: safeStyleValue(run && run.justifyContent, "normal", 60),
        justifyItems: safeStyleValue(run && run.justifyItems, "normal", 60),
        transform: safeStyleValue(run && run.transform, "none", 300),
        transformOrigin: safeStyleValue(run && run.transformOrigin, "50% 50%", 120),
        opacity: clamp(finiteNumber(run && run.opacity, 1), 0, 1)
      };
    });
  }
  function normalizeStyledShapes(saved) {
    if (!Array.isArray(saved)) return [];
    return saved.slice(0, 64).map(function (shape) {
      return {
        x: clamp(finiteNumber(shape && shape.x, 0), -50, 150),
        y: clamp(finiteNumber(shape && shape.y, 0), -50, 150),
        w: clamp(finiteNumber(shape && shape.w, 0), 0, 180),
        h: clamp(finiteNumber(shape && shape.h, 0), 0, 180),
        background: safeStyleValue(shape && shape.background, "transparent", 1200),
        borderTop: safeStyleValue(shape && shape.borderTop, "0px none rgba(0, 0, 0, 0)", 160),
        borderRight: safeStyleValue(shape && shape.borderRight, "0px none rgba(0, 0, 0, 0)", 160),
        borderBottom: safeStyleValue(shape && shape.borderBottom, "0px none rgba(0, 0, 0, 0)", 160),
        borderLeft: safeStyleValue(shape && shape.borderLeft, "0px none rgba(0, 0, 0, 0)", 160),
        borderRadius: safeStyleValue(shape && shape.borderRadius, "0px", 100),
        boxShadow: safeStyleValue(shape && shape.boxShadow, "none", 220),
        opacity: clamp(finiteNumber(shape && shape.opacity, 1), 0, 1)
      };
    });
  }
  function normalizeBoxStyle(saved) {
    var box = saved && typeof saved === "object" ? saved : {};
    return {
      background: safeStyleValue(box.background, "transparent", 1200),
      borderTop: safeStyleValue(box.borderTop, "0px none rgba(0, 0, 0, 0)", 160),
      borderRight: safeStyleValue(box.borderRight, "0px none rgba(0, 0, 0, 0)", 160),
      borderBottom: safeStyleValue(box.borderBottom, "0px none rgba(0, 0, 0, 0)", 160),
      borderLeft: safeStyleValue(box.borderLeft, "0px none rgba(0, 0, 0, 0)", 160),
      borderRadius: safeStyleValue(box.borderRadius, "0px", 100),
      boxShadow: safeStyleValue(box.boxShadow, "none", 220),
      clipPath: safeStyleValue(box.clipPath, "none", 300),
      overflow: ["", "visible", "hidden", "clip"].indexOf(box.overflow) >= 0 ? box.overflow : "",
      transform: safeStyleValue(box.transform, "none", 300),
      rotate: safeStyleValue(box.rotate, "none", 100),
      transformOrigin: safeStyleValue(box.transformOrigin, "50% 50%", 120),
      mixBlendMode: ["normal", "multiply", "screen", "overlay", "soft-light", "darken", "lighten", "difference"].indexOf(box.mixBlendMode) >= 0 ? box.mixBlendMode : "normal"
    };
  }
  function normalizeCustomLayers(saved, legacyEffects) {
    var next = { front: [], back: [] };
    var usedIds = {};
    ["front", "back"].forEach(function (side) {
      var source = saved && Array.isArray(saved[side]) ? saved[side] : [];
      source.forEach(function (item, index) {
        if (!item || typeof item !== "object" || ["text", "image", "shape"].indexOf(item.type) < 0) return;
        var rawId = String(item.id || "");
        var id = /^custom-[a-z0-9-]+$/i.test(rawId) && !usedIds[rawId] ? rawId : "custom-" + side + "-import-" + index;
        while (usedIds[id]) id += "-copy";
        usedIds[id] = true;
        var imageData = String(item.imageData || "");
        if (imageData && !/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(imageData)) imageData = "";
        var imageEffect = item.type === "image" || item.type === "shape"
          ? normalizeEffect(item.effect || legacyEffects && legacyEffects[side], defaultEffect())
          : defaultEffect();
        var styledRuns = normalizeStyledRuns(item.styledRuns);
        var styledShapes = normalizeStyledShapes(item.styledShapes);
        var structuredText = item.type === "text" && (styledRuns.length || styledShapes.length);
        var boxStyle = normalizeBoxStyle(item.boxStyle);
        var colorMode = TEXT_COLOR_MODES.indexOf(item.colorMode) >= 0
          ? item.colorMode
          : (item.type === "text" && boxStyle.mixBlendMode === "difference" ? "difference" : "solid");
        if (item.type === "text" && boxStyle.mixBlendMode === "difference") boxStyle.mixBlendMode = "normal";
        var shapeKind = ["rectangle", "ellipse", "triangle", "star"].indexOf(item.shapeKind) >= 0 ? item.shapeKind : "rectangle";
        var fillMode = item.fillMode === "image" ? "image" : "color";
        var cornerCount = shapeCornerCount(shapeKind);
        var cornerRadius = clamp(finiteNumber(item.cornerRadius, 0), 0, 50);
        var cornerRadii = Array.isArray(item.cornerRadii) ? item.cornerRadii.slice(0, cornerCount).map(function (value) {
          return clamp(finiteNumber(value, cornerRadius), 0, 50);
        }) : [];
        while (cornerRadii.length < cornerCount) cornerRadii.push(cornerRadius);
        next[side].push({
          id: id,
          side: side,
          type: item.type,
          name: String(item.name || (item.type === "image" ? "사용자 이미지" : item.type === "shape" ? "사용자 도형" : "사용자 텍스트")).slice(0, 80),
          text: String(item.text || ""),
          imageData: imageData,
          imageName: String(item.imageName || "").slice(0, 180),
          imageType: String(item.imageType || "").slice(0, 80),
          imageAssetStored: typeof item.imageAssetStored === "boolean" ? item.imageAssetStored : undefined,
          x: clamp(finiteNumber(item.x, 12), -50, 100),
          y: clamp(finiteNumber(item.y, 12), -50, 100),
          w: item.type === "shape"
            ? clamp(finiteNumber(item.w, 30), 3, MAX_OBJECT_SIZE_PERCENT)
            : item.type === "image"
              ? clamp(finiteNumber(item.w, 30), .01, MAX_OBJECT_SIZE_PERCENT)
              : clamp(finiteNumber(item.w, 34), structuredText ? .25 : 3, MAX_OBJECT_SIZE_PERCENT),
          h: item.type === "shape"
            ? clamp(finiteNumber(item.h, 30), 3, MAX_OBJECT_SIZE_PERCENT)
            : item.type === "image"
              ? clamp(finiteNumber(item.h, 30), .01, MAX_OBJECT_SIZE_PERCENT)
              : clamp(finiteNumber(item.h, 12), structuredText ? .25 : 3, MAX_OBJECT_SIZE_PERCENT),
          rotation: clamp(finiteNumber(item.rotation, 0), -360, 360),
          skewX: clamp(finiteNumber(item.skewX, 0), -70, 70),
          scaleX: item.type === "text" ? clamp(finiteNumber(item.scaleX, 1), .1, MAX_NATIVE_OBJECT_SCALE) : 1,
          scaleY: item.type === "text" ? clamp(finiteNumber(item.scaleY, 1), .1, MAX_NATIVE_OBJECT_SCALE) : 1,
          autoHeight: item.type === "text" ? item.autoHeight !== false : false,
          font: fontKeyAllowed(item.font) ? item.font : "noto-serif",
          fontSize: clamp(finiteNumber(item.fontSize, 28), 8, MAX_FONT_SIZE_PX),
          fontWeight: safeStyleValue(item.fontWeight, "400", 40),
          fontStyle: safeStyleValue(item.fontStyle, "normal", 40),
          lineHeight: safeStyleValue(item.lineHeight, "1.35", 60),
          letterSpacing: safeStyleValue(item.letterSpacing, "normal", 60),
          textTransform: safeStyleValue(item.textTransform, "none", 40),
          whiteSpace: safeStyleValue(item.whiteSpace, "pre-wrap", 40),
          color: /^#[0-9a-f]{6}$/i.test(String(item.color || "")) ? item.color : "#684b47",
          colorMode: colorMode,
          opacity: clamp(finiteNumber(item.opacity, 100), 0, 100),
          align: ["left", "center", "right"].indexOf(item.align) >= 0 ? item.align : "left",
          writingMode: item.writingMode === "vertical-rl" ? "vertical-rl" : "horizontal-tb",
          fit: item.fit === "cover" ? "cover" : "contain",
          zoom: clamp(finiteNumber(item.zoom, 1), 1, 3),
          panX: clamp(finiteNumber(item.panX, 0), -1, 1),
          panY: clamp(finiteNumber(item.panY, 0), -1, 1),
          effect: imageEffect,
          shapeKind: shapeKind,
          fillMode: fillMode,
          fillColor: /^#[0-9a-f]{6}$/i.test(String(item.fillColor || "")) ? item.fillColor : "#b87977",
          cornerMode: item.cornerMode === "individual" ? "individual" : "all",
          cornerRadius: cornerRadius,
          cornerRadii: cornerRadii,
          inlineTextStyles: item.type === "text" ? normalizeInlineStyleRuns(item.inlineTextStyles, String(item.text || "").length) : [],
          typingStyle: item.type === "text" ? normalizeInlineStylePatch(item.typingStyle) : {},
          styledRuns: styledRuns,
          styledShapes: styledShapes,
          boxStyle: boxStyle
        });
      });
    });
    return next;
  }
  function normalizePlacements(saved) {
    var next = defaultPlacements();
    ["front", "back"].forEach(function (side) {
      var source = saved && saved[side] && typeof saved[side] === "object" ? saved[side] : {};
      MOVABLE_LAYERS.forEach(function (layer) {
        var legacyParent = LEGACY_PARENT_BY_LAYER[layer];
        var savedPlacement = source[layer] || (legacyParent && source[legacyParent]);
        if (!savedPlacement || typeof savedPlacement !== "object") return;
        var x = clamp(finiteNumber(savedPlacement.x, 0), -100, 100);
        var y = clamp(finiteNumber(savedPlacement.y, 0), -100, 100);
        var scaleX = clamp(finiteNumber(savedPlacement.scaleX, 1), .1, MAX_NATIVE_OBJECT_SCALE);
        var scaleY = clamp(finiteNumber(savedPlacement.scaleY, 1), .1, MAX_NATIVE_OBJECT_SCALE);
        var rotation = clamp(finiteNumber(savedPlacement.rotation, 0), -360, 360);
        var boxW = clamp(finiteNumber(savedPlacement.boxW, 0), 0, MAX_TEXT_BOX_SIZE_PX);
        var boxH = clamp(finiteNumber(savedPlacement.boxH, 0), 0, MAX_TEXT_BOX_SIZE_PX);
        /* `height` was the old fixed-height mode. Treat it as an area-text box
           on load; width-only records stay auto-height until the user resizes
           them once, so existing documents do not jump unexpectedly. */
        var boxMode = savedPlacement.boxMode === "height" || savedPlacement.boxMode === "area" ? "area" : "width";
        var skewX = clamp(finiteNumber(savedPlacement.skewX, 0), -70, 70);
        if (x || y || scaleX !== 1 || scaleY !== 1 || rotation || boxW || boxH || skewX) next[side][layer] = {
          x: x, y: y, scaleX: scaleX, scaleY: scaleY, rotation: rotation,
          boxW: boxW, boxH: boxH, boxMode: boxMode, skewX: skewX
        };
      });
    });
    return next;
  }
  function normalizeShadow(saved) {
    var next = Object.assign({}, defaultShadow(), saved && typeof saved === "object" ? saved : {});
    if (saved && typeof saved === "object" && (!Number.isFinite(saved.angle) || !Number.isFinite(saved.distance))) {
      var oldX = Number(saved.x) || 0;
      var oldY = Number(saved.y) || 0;
      next.angle = Math.round((Math.atan2(oldY, oldX) * 180 / Math.PI + 360) % 360);
      next.distance = Math.round(Math.sqrt(oldX * oldX + oldY * oldY));
    }
    next.angle = ((Number(next.angle) || 0) % 360 + 360) % 360;
    next.distance = clamp(Number(next.distance) || 0, 0, 120);
    delete next.x;
    delete next.y;
    return next;
  }
  function migrateStockLayout(savedLayout, fallbackLayout, stockQuoteSize) {
    var migrated = clone(fallbackLayout);
    var savedSize = finiteNumber(savedLayout && savedLayout.quoteSize, stockQuoteSize);
    if (savedSize !== stockQuoteSize) migrated.quoteSize = savedSize;
    return migrated;
  }
  function migrateLegacyLayout(savedLayout, template, side, migrateDesign) {
    if (!savedLayout || !migrateDesign) return savedLayout;
    if (template === "cinema") {
      var cinemaV21Front = side === "front" && savedLayout.quoteX === 10 && savedLayout.quoteY === 73.5 && savedLayout.quoteW === 80
        && savedLayout.detailsX === 8 && savedLayout.detailsY === 92 && savedLayout.detailsW === 84;
      var cinemaV21Back = side === "back" && savedLayout.quoteX === 8 && savedLayout.quoteY === 31.5 && savedLayout.quoteW === 84
        && savedLayout.detailsX === 8 && savedLayout.detailsY === 92 && savedLayout.detailsW === 84;
      if (cinemaV21Front) return migrateStockLayout(savedLayout, createTemplateDefaults("cinema").layouts.front, 31);
      if (cinemaV21Back) return migrateStockLayout(savedLayout, createTemplateDefaults("cinema").layouts.back, 22);
      var cinemaV20Front = side === "front" && savedLayout.quoteX === 7 && savedLayout.quoteY === 75.5 && savedLayout.quoteW === 86
        && savedLayout.detailsX === 8 && savedLayout.detailsY === 92 && savedLayout.detailsW === 84;
      var cinemaV20Back = side === "back" && savedLayout.quoteX === 8 && savedLayout.quoteY === 31.5 && savedLayout.quoteW === 84
        && savedLayout.detailsX === 8 && savedLayout.detailsY === 92 && savedLayout.detailsW === 84;
      if (cinemaV20Front) return migrateStockLayout(savedLayout, createTemplateDefaults("cinema").layouts.front, 30);
      if (cinemaV20Back) return migrateStockLayout(savedLayout, createTemplateDefaults("cinema").layouts.back, 22);
      var cinemaV19Front = side === "front" && savedLayout.quoteX === 8 && savedLayout.quoteY === 66.5 && savedLayout.quoteW === 84
        && savedLayout.detailsX === 8 && savedLayout.detailsY === 75 && savedLayout.detailsW === 84;
      var cinemaV19Back = side === "back" && savedLayout.quoteX === 8 && savedLayout.quoteY === 29.5 && savedLayout.quoteW === 84
        && savedLayout.detailsX === 8 && savedLayout.detailsY === 75 && savedLayout.detailsW === 84;
      if (cinemaV19Front) return migrateStockLayout(savedLayout, createTemplateDefaults("cinema").layouts.front, 27);
      if (cinemaV19Back) return migrateStockLayout(savedLayout, createTemplateDefaults("cinema").layouts.back, 23);
      var cinemaV17Front = side === "front" && savedLayout.quoteX === 8 && savedLayout.quoteY === 64 && savedLayout.quoteW === 84
        && savedLayout.detailsX === 8 && savedLayout.detailsY === 75.5 && savedLayout.detailsW === 84;
      var cinemaV17Back = side === "back" && savedLayout.quoteX === 40 && savedLayout.quoteY === 31 && savedLayout.quoteW === 52
        && savedLayout.detailsX === 8 && savedLayout.detailsY === 75.5 && savedLayout.detailsW === 84;
      if (cinemaV17Front || cinemaV17Back) return migrateStockLayout(savedLayout, createTemplateDefaults("cinema").layouts[side], null);
      var cinemaV15Front = side === "front" && savedLayout.quoteX === 5.8 && savedLayout.quoteY === 73 && savedLayout.quoteW === 61.5
        && savedLayout.detailsX === 5.8 && savedLayout.detailsY === 92 && savedLayout.detailsW === 61.5;
      var cinemaV15Back = side === "back" && savedLayout.quoteX === 5.8 && savedLayout.quoteY === 68 && savedLayout.quoteW === 61.5
        && savedLayout.detailsX === 5.8 && savedLayout.detailsY === 92 && savedLayout.detailsW === 61.5;
      if (cinemaV15Front || cinemaV15Back) return migrateStockLayout(savedLayout, createTemplateDefaults("cinema").layouts[side], null);
      var cinemaV14Front = side === "front" && savedLayout.quoteX === 8 && savedLayout.quoteY === 59 && savedLayout.quoteW === 84
        && savedLayout.detailsX === 8 && savedLayout.detailsY === 94 && savedLayout.detailsW === 84;
      var cinemaV14Back = side === "back" && savedLayout.quoteX === 8 && savedLayout.quoteY === 28 && savedLayout.quoteW === 84
        && savedLayout.detailsX === 8 && savedLayout.detailsY === 93 && savedLayout.detailsW === 84;
      if (cinemaV14Front || cinemaV14Back) return migrateStockLayout(savedLayout, createTemplateDefaults("cinema").layouts[side], null);
      if (side === "front" && savedLayout.quoteX === 10 && savedLayout.quoteY === 63 && savedLayout.quoteW === 80
        && savedLayout.detailsX === 10 && savedLayout.detailsY === 89 && savedLayout.detailsW === 80) return migrateStockLayout(savedLayout, createTemplateDefaults("cinema").layouts.front, null);
      if (side === "back" && savedLayout.quoteX === 10 && savedLayout.quoteY === 57 && savedLayout.quoteW === 80
        && savedLayout.detailsX === 10 && savedLayout.detailsY === 89 && savedLayout.detailsW === 80) return migrateStockLayout(savedLayout, createTemplateDefaults("cinema").layouts.back, null);
      return savedLayout;
    }
    if (template !== "train") return savedLayout;
    if (side === "back") {
      var v20BackDefault = savedLayout.quoteX === 29.2 && savedLayout.quoteY === 14 && savedLayout.quoteW === 39.5
        && savedLayout.detailsX === 29.2 && savedLayout.detailsY === 91.5 && savedLayout.detailsW === 39.5;
      if (v20BackDefault) return migrateStockLayout(savedLayout, createTemplateDefaults("train").layouts.back, 36);
      var v19BackDefault = savedLayout.quoteX === 5.8 && savedLayout.quoteY === 27.5 && savedLayout.quoteW === 39
        && savedLayout.detailsX === 5.8 && savedLayout.detailsY === 92 && savedLayout.detailsW === 61.5;
      if (v19BackDefault) return migrateStockLayout(savedLayout, createTemplateDefaults("train").layouts.back, 28);
      var v15BackDefault = savedLayout.quoteX === 5.8 && savedLayout.quoteY === 68 && savedLayout.quoteW === 61.5
        && savedLayout.detailsX === 5.8 && savedLayout.detailsY === 92 && savedLayout.detailsW === 61.5;
      var v14BackDefault = savedLayout.quoteX === 5.8 && savedLayout.quoteY === 29 && savedLayout.quoteW === 36
        && savedLayout.detailsX === 5.8 && savedLayout.detailsY === 92 && savedLayout.detailsW === 61.5;
      var oldBackDefault = savedLayout.quoteX === 8 && savedLayout.quoteY === 23 && savedLayout.quoteW === 34
        && savedLayout.detailsX === 8 && savedLayout.detailsY === 86 && savedLayout.detailsW === 34;
      var v13BackDefault = savedLayout.quoteX === 7 && savedLayout.quoteY === 23 && savedLayout.quoteW === 35
        && savedLayout.detailsX === 7 && savedLayout.detailsY === 88 && savedLayout.detailsW === 61;
      return v15BackDefault || v14BackDefault || oldBackDefault || v13BackDefault
        ? migrateStockLayout(savedLayout, createTemplateDefaults("train").layouts.back, null)
        : savedLayout;
    }
    if (side !== "front") return savedLayout;
    var v26FrontDefault = savedLayout.quoteX === 5.2 && savedLayout.quoteY === 66.8 && savedLayout.quoteW === 63.7
      && savedLayout.detailsX === 0 && savedLayout.detailsY === 0 && savedLayout.detailsW === 100;
    if (v26FrontDefault) return migrateStockLayout(savedLayout, createTemplateDefaults("train").layouts.front, 26);
    var v25FrontDefault = savedLayout.quoteX === 7.2 && savedLayout.quoteY === 66.8 && savedLayout.quoteW === 59.8
      && savedLayout.detailsX === 0 && savedLayout.detailsY === 0 && savedLayout.detailsW === 100;
    if (v25FrontDefault) return migrateStockLayout(savedLayout, createTemplateDefaults("train").layouts.front, 26);
    var v24FrontDefault = savedLayout.quoteX === 7.5 && savedLayout.quoteY === 63.5 && savedLayout.quoteW === 59.5
      && savedLayout.detailsX === 0 && savedLayout.detailsY === 0 && savedLayout.detailsW === 100;
    if (v24FrontDefault) return migrateStockLayout(savedLayout, createTemplateDefaults("train").layouts.front, 26);
    var v22FrontDefault = savedLayout.quoteX === 8.5 && savedLayout.quoteY === 47.5 && savedLayout.quoteW === 56
      && savedLayout.detailsX === 0 && savedLayout.detailsY === 0 && savedLayout.detailsW === 100;
    if (v22FrontDefault) return migrateStockLayout(savedLayout, createTemplateDefaults("train").layouts.front, 42);
    var v21FrontDefault = savedLayout.quoteX === 8 && savedLayout.quoteY === 62 && savedLayout.quoteW === 55
      && savedLayout.detailsX === 0 && savedLayout.detailsY === 0 && savedLayout.detailsW === 100;
    if (v21FrontDefault) return migrateStockLayout(savedLayout, createTemplateDefaults("train").layouts.front, 48);
    var v20FrontDefault = savedLayout.quoteX === 8 && savedLayout.quoteY === 62.5 && savedLayout.quoteW === 55
      && savedLayout.detailsX === 7 && savedLayout.detailsY === 92 && savedLayout.detailsW === 61.5;
    if (v20FrontDefault) return migrateStockLayout(savedLayout, createTemplateDefaults("train").layouts.front, 48);
    var v19FrontDefault = savedLayout.quoteX === 5.8 && savedLayout.quoteY === 73 && savedLayout.quoteW === 61.5
      && savedLayout.detailsX === 5.8 && savedLayout.detailsY === 92 && savedLayout.detailsW === 61.5;
    if (v19FrontDefault) return migrateStockLayout(savedLayout, createTemplateDefaults("train").layouts.front, 34);
    var oldDefault = savedLayout.quoteX === 39 && savedLayout.quoteY === 28 && savedLayout.quoteW === 28
      && savedLayout.detailsX === 39 && savedLayout.detailsY === 82 && savedLayout.detailsW === 28;
    var fullBleedDefault = savedLayout.quoteX === 7 && savedLayout.quoteY === 58 && savedLayout.quoteW === 57
      && savedLayout.detailsX === 76.5 && savedLayout.detailsY === 83 && savedLayout.detailsW === 19.5;
    var passageDefault = savedLayout.quoteX === 7.5 && savedLayout.quoteY === 76 && savedLayout.quoteW === 58
      && savedLayout.detailsX === 75.2 && savedLayout.detailsY === 88.5 && savedLayout.detailsW === 19.6;
    var v13Default = savedLayout.quoteX === 7.2 && savedLayout.quoteY === 75 && savedLayout.quoteW === 58
      && savedLayout.detailsX === 7.2 && savedLayout.detailsY === 93 && savedLayout.detailsW === 87.6;
    return oldDefault || fullBleedDefault || passageDefault || v13Default
      ? migrateStockLayout(savedLayout, createTemplateDefaults("train").layouts.front, null)
      : savedLayout;
  }

  function expandLegacyLayers(list, customIds) {
    var expanded = [];
    (Array.isArray(list) ? list : []).forEach(function (key) {
      var members = LEGACY_LAYER_MEMBERS[key] || [key];
      members.forEach(function (member) {
        if ((LAYER_ORDER.indexOf(member) >= 0 || customIds && customIds.indexOf(member) >= 0) && expanded.indexOf(member) < 0) expanded.push(member);
      });
    });
    return expanded;
  }
  function layerFlagToken(key, side, documentState) {
    var canonicalSide = canonicalTrainCouponSide(side, key, documentState);
    return isCustomLayer(key, documentState) ? key : canonicalSide + "::" + key;
  }
  function hasLayerFlag(list, key, side, documentState) {
    return Array.isArray(list) && list.indexOf(layerFlagToken(key, side, documentState)) >= 0;
  }
  function toggleLayerFlag(list, key, side, documentState) {
    toggleInArray(list, layerFlagToken(key, side, documentState));
  }
  function isLayerHidden(key, side, documentState) {
    if (isProtectedLayer(key)) return false;
    var source = documentState || state;
    return hasLayerFlag(source.hidden, key, side || source.side, source);
  }
  function isLayerLocked(key, side, documentState) {
    if (isProtectedLayer(key)) return false;
    var source = documentState || state;
    return hasLayerFlag(source.locked, key, side || source.side, source);
  }
  function isLayerClipped(key, side, documentState) {
    if (isProtectedLayer(key)) return false;
    var source = documentState || state;
    return hasLayerFlag(source.clipping, key, side || source.side, source);
  }
  function enforceProtectedAttribution(documentState) {
    var source = documentState || state;
    if (!source) return source;
    var migrateOutsideAttribution = finiteNumber(source.attributionOutsideVersion, 0) < 1;
    var forbidden = [ATTRIBUTION_LAYER_KEY, "front::" + ATTRIBUTION_LAYER_KEY, "back::" + ATTRIBUTION_LAYER_KEY];
    ["hidden", "removedLayers", "locked", "clipping"].forEach(function (name) {
      source[name] = (Array.isArray(source[name]) ? source[name] : []).filter(function (token) {
        return forbidden.indexOf(token) < 0;
      });
    });
    source.placements = source.placements || { front: {}, back: {} };
    source.layerStyles = source.layerStyles || { front: {}, back: {} };
    source.layerOrders = source.layerOrders || { front: [], back: [] };
    ["front", "back"].forEach(function (side) {
      source.placements[side] = source.placements[side] || {};
      var placement = migrateOutsideAttribution ? {} : (source.placements[side][ATTRIBUTION_LAYER_KEY] || {});
      source.placements[side][ATTRIBUTION_LAYER_KEY] = {
        x: clamp(finiteNumber(placement.x, 0), -100, 100),
        y: clamp(finiteNumber(placement.y, 0), -100, 100),
        scaleX: 1, scaleY: 1, rotation: 0, skewX: 0
      };
      source.layerStyles[side] = source.layerStyles[side] || {};
      var savedColor = migrateOutsideAttribution ? "" : source.layerStyles[side][ATTRIBUTION_LAYER_KEY] && source.layerStyles[side][ATTRIBUTION_LAYER_KEY].color;
      source.layerStyles[side][ATTRIBUTION_LAYER_KEY] = /^#[0-9a-f]{6}$/i.test(String(savedColor || "")) ? { color: savedColor } : {};
      var order = Array.isArray(source.layerOrders[side]) ? source.layerOrders[side] : [];
      source.layerOrders[side] = order.filter(function (key) { return key !== ATTRIBUTION_LAYER_KEY; });
      source.layerOrders[side].push(ATTRIBUTION_LAYER_KEY);
    });
    source.attributionOutsideVersion = 1;
    syncFlatLayerOrder(source);
    return source;
  }
  function clippingTargetFor(key, side, documentState) {
    var source = documentState || state;
    side = side || source.side;
    var order = layerOrderFor(side, source);
    var index = order.indexOf(key);
    if (index < 0) return null;
    for (var cursor = index - 1; cursor >= 0; cursor--) {
      var candidate = order[cursor];
      if (candidate === "face-shadow" || candidate === "effects" || !layerAvailableOnSide(candidate, side, source) || isLayerHidden(candidate, side, source)) continue;
      var customCandidate = customLayerById(candidate, source);
      if (customCandidate && finiteNumber(customCandidate.opacity, 100) <= 0) continue;
      /* Consecutive clipped layers form one Photoshop-style clipping group:
         every clipped member resolves to the first visible, unclipped base. */
      if (isLayerClipped(candidate, side, source)) continue;
      return candidate;
    }
    return null;
  }
  function normalizeLayerFlags(list, customIds, documentState) {
    var normalized = [];
    function push(value) {
      if (normalized.indexOf(value) < 0) normalized.push(value);
    }
    function addForSide(key, side) {
      var members = key === "frame" && documentState.template === "train"
        ? ["main-frame", "stub-frame", "stub-divider"]
        : (LEGACY_LAYER_MEMBERS[key] || [key]);
      members.forEach(function (member) {
        if (customIds.indexOf(member) >= 0) {
          var custom = customLayerById(member, documentState);
          if (custom && custom.side === side) push(member);
        } else if (LAYER_ORDER.indexOf(member) >= 0 && layerAvailableOnSide(member, side, documentState)) {
          push(layerFlagToken(member, side, documentState));
        }
      });
    }
    (Array.isArray(list) ? list : []).forEach(function (rawKey) {
      if (customIds.indexOf(rawKey) >= 0) {
        push(rawKey);
        return;
      }
      var scoped = /^(front|back)::(.+)$/.exec(String(rawKey));
      if (scoped) addForSide(scoped[2], scoped[1]);
      else ["front", "back"].forEach(function (side) { addForSide(String(rawKey), side); });
    });
    return normalized;
  }
  var POSTCARD_LEGACY_LAYER_MAP = {
    "block-stub": "block-main",
    "image-stub": "image-stub",
    "stub-frame": "stub-frame",
    "copy-label": "copy-label",
    "back-note": "quote",
    body: "body",
    texture: "texture"
  };
  function migrateLegacyPostcardDocument(saved) {
    if (!saved || finiteNumber(saved.postcardFaceModelVersion, 0) >= 1) return saved;
    var migrated = clone(saved);
    migrated.blocks = migrated.blocks && typeof migrated.blocks === "object" ? migrated.blocks : {};
    var legacyReverse = migrated.blocks.frontStub && typeof migrated.blocks.frontStub === "object"
      ? clone(migrated.blocks.frontStub) : defaultBlock("#fffdf8");
    migrated.blocks.backMain = defaultBlock(legacyReverse.color || "#fffdf8");
    migrated.blocks.backStub = Object.assign(defaultBlock("#e8d8c2"), legacyReverse);
    migrated.blocks.frontStub = defaultBlock(legacyReverse.color || "#fffdf8");

    ["placements", "layerStyles"].forEach(function (property) {
      var collection = migrated[property] && typeof migrated[property] === "object" ? migrated[property] : {};
      collection.front = collection.front && typeof collection.front === "object" ? collection.front : {};
      collection.back = collection.back && typeof collection.back === "object" ? collection.back : {};
      Object.keys(POSTCARD_LEGACY_LAYER_MAP).forEach(function (oldKey) {
        var newKey = POSTCARD_LEGACY_LAYER_MAP[oldKey];
        if (collection.front[oldKey] && !collection.back[newKey]) collection.back[newKey] = clone(collection.front[oldKey]);
        delete collection.front[oldKey];
      });
      migrated[property] = collection;
    });
    ["hidden", "locked"].forEach(function (property) {
      var migratedFlags = [];
      (Array.isArray(migrated[property]) ? migrated[property] : []).forEach(function (rawToken) {
        var token = String(rawToken);
        var scoped = /^(front|back)::(.+)$/.exec(token);
        if (scoped && scoped[1] === "front" && POSTCARD_LEGACY_LAYER_MAP[scoped[2]]) {
          token = "back::" + POSTCARD_LEGACY_LAYER_MAP[scoped[2]];
        } else if (!scoped && POSTCARD_LEGACY_LAYER_MAP[token]) {
          token = "back::" + POSTCARD_LEGACY_LAYER_MAP[token];
        }
        if (migratedFlags.indexOf(token) < 0) migratedFlags.push(token);
      });
      migrated[property] = migratedFlags;
    });

    var legacyOrder = Array.isArray(migrated.layerOrder) ? migrated.layerOrder : LAYER_ORDER;
    var frontOrder = [];
    var backOrder = [];
    legacyOrder.forEach(function (key) {
      if (!POSTCARD_LEGACY_LAYER_MAP[key] && frontOrder.indexOf(key) < 0) frontOrder.push(key);
      var mapped = POSTCARD_LEGACY_LAYER_MAP[key];
      if (mapped && backOrder.indexOf(mapped) < 0) backOrder.push(mapped);
    });
    migrated.layerOrders = { front: frontOrder, back: backOrder };
    migrated.sideShadows = { front: {}, back: {} };
    Object.keys(migrated.shadows || {}).forEach(function (key) {
      if (!POSTCARD_LEGACY_LAYER_MAP[key]) migrated.sideShadows.front[key] = clone(migrated.shadows[key]);
      if (POSTCARD_LEGACY_LAYER_MAP[key]) migrated.sideShadows.back[POSTCARD_LEGACY_LAYER_MAP[key]] = clone(migrated.shadows[key]);
    });
    migrated.postcardFaceModelVersion = 1;
    migrated.postcardViewMode = "both";
    migrated.postcardTopSide = "front";
    migrated.side = "front";
    migrated.motion = "none";
    return migrated;
  }
  function migratePostcardLayoutDocument(saved) {
    if (!saved || finiteNumber(saved.postcardLayoutVersion, 0) >= POSTCARD_LAYOUT_VERSION) return saved;
    var migrated = clone(saved);
    if (migrated.backCopyLabel === "MESSAGE / MEMORY NOTE") migrated.backCopyLabel = "";
    if (migrated.backTitle === "이 장면이 오래 남기를.") migrated.backTitle = "";
    if (migrated.backBody === "오늘의 풍경과 네가 건넨 한 문장을 오래 기억하고 싶어. 이 카드는 돌아보고 싶은 순간을 천천히 적어 두는 작은 편지야.") migrated.backBody = POSTCARD_WRITING_SAMPLE;
    else if (typeof migrated.backBody !== "string") migrated.backBody = POSTCARD_WRITING_SAMPLE;
    if (migrated.botName === "HAEON" || migrated.botName === "model" || migrated.botName === "BOT") migrated.botName = "Bot";
    if (migrated.personaName === "MIRA" || migrated.personaName === "prompt" || migrated.personaName === "PERSONA") migrated.personaName = "Persona";
    if (migrated.dateLabel === "POSTMARK") migrated.dateLabel = "DATE";
    if (typeof migrated.postcardModelLabel !== "string") migrated.postcardModelLabel = "MODEL";
    if (migrated.postcardModel === "AI") migrated.postcardModel = "ai";
    else if (typeof migrated.postcardModel !== "string") migrated.postcardModel = "ai";
    if (typeof migrated.postcardPromptLabel !== "string") migrated.postcardPromptLabel = "PROMPT";
    if (migrated.postcardPrompt === "PR") migrated.postcardPrompt = "pr";
    else if (typeof migrated.postcardPrompt !== "string") migrated.postcardPrompt = "pr";
    if (migrated.blocks && migrated.blocks.backMain
      && String(migrated.blocks.backMain.color || "").toLowerCase() === "#fffdf8") {
      migrated.blocks.backMain.color = "#f6f4ef";
    }
    var writingLines = String(migrated.backBody || "").replace(/\r/g, "").split("\n");
    if (writingLines.length > 4) writingLines = writingLines.slice(0, 3).concat(writingLines.slice(3).join(" "));
    while (writingLines.length < 4) writingLines.push("");
    [1, 2, 3, 4].forEach(function (number) {
      var property = "postcardWriting" + number;
      if (typeof migrated[property] !== "string") migrated[property] = writingLines[number - 1] || "";
    });
    var splitLayerMap = {
      "stub-frame": ["postcard-center-rule", "postcard-writing-rule-1", "postcard-writing-rule-2", "postcard-writing-rule-3", "postcard-writing-rule-4"],
      "meta-bot": ["postcard-from-rule", "postcard-from-label", "postcard-from-value"],
      "meta-persona": ["postcard-to-rule", "postcard-to-label", "postcard-to-value"],
      "meta-date": ["postcard-date-label", "postcard-date-value"],
      "postcard-model": ["postcard-model-label", "postcard-model-value"],
      "postcard-prompt": ["postcard-prompt-label", "postcard-prompt-value"],
      body: ["postcard-writing-1", "postcard-writing-2", "postcard-writing-3", "postcard-writing-4"]
    };
    function expandPostcardOrder(order) {
      var expanded = [];
      (Array.isArray(order) ? order : []).forEach(function (key) {
        var targets = splitLayerMap[key] || [key];
        targets.forEach(function (target) { if (expanded.indexOf(target) < 0) expanded.push(target); });
      });
      return expanded;
    }
    if (migrated.layerOrders && Array.isArray(migrated.layerOrders.back)) {
      migrated.layerOrders.back = expandPostcardOrder(migrated.layerOrders.back);
    }
    if (Array.isArray(migrated.layerOrder)) migrated.layerOrder = expandPostcardOrder(migrated.layerOrder);
    ["placements", "layerStyles"].forEach(function (property) {
      var backValues = migrated[property] && migrated[property].back;
      if (!backValues || typeof backValues !== "object") return;
      Object.keys(splitLayerMap).forEach(function (sourceKey) {
        if (!backValues[sourceKey]) return;
        splitLayerMap[sourceKey].forEach(function (targetKey) {
          if (!backValues[targetKey]) backValues[targetKey] = clone(backValues[sourceKey]);
        });
      });
    });
    if (migrated.sideShadows && migrated.sideShadows.back) {
      Object.keys(splitLayerMap).forEach(function (sourceKey) {
        if (!migrated.sideShadows.back[sourceKey]) return;
        splitLayerMap[sourceKey].forEach(function (targetKey) {
          if (!migrated.sideShadows.back[targetKey]) migrated.sideShadows.back[targetKey] = clone(migrated.sideShadows.back[sourceKey]);
        });
      });
    }
    ["hidden", "locked"].forEach(function (property) {
      var expandedTokens = [];
      (Array.isArray(migrated[property]) ? migrated[property] : []).forEach(function (rawToken) {
        var token = String(rawToken);
        var scoped = /^(front|back)::(.+)$/.exec(token);
        var side = scoped ? scoped[1] : "back";
        var key = scoped ? scoped[2] : token;
        var targets = side === "back" && splitLayerMap[key] ? splitLayerMap[key] : [key];
        targets.forEach(function (target) {
          var nextToken = scoped || splitLayerMap[key] ? side + "::" + target : target;
          if (expandedTokens.indexOf(nextToken) < 0) expandedTokens.push(nextToken);
        });
      });
      migrated[property] = expandedTokens;
    });
    var selectedMap = { "meta-bot": "postcard-from-value", "meta-persona": "postcard-to-value", "meta-date": "postcard-date-value", "postcard-model": "postcard-model-value", "postcard-prompt": "postcard-prompt-value", body: "postcard-writing-1", "stub-frame": "postcard-center-rule" };
    if (selectedMap[migrated.selectedLayer]) migrated.selectedLayer = selectedMap[migrated.selectedLayer];
    migrated.backBody = [migrated.postcardWriting1, migrated.postcardWriting2, migrated.postcardWriting3, migrated.postcardWriting4].join("\n");
    migrated.postcardLayoutVersion = POSTCARD_LAYOUT_VERSION;
    return migrated;
  }
  function migrateCinemaRatingLayersDocument(saved) {
    if (!saved || finiteNumber(saved.cinemaRatingLayerVersion, 0) >= CINEMA_RATING_LAYER_VERSION) return saved;
    var migrated = clone(saved);
    var splitKeys = ["rating-label", "rating-marks"];
    function splitOrder(order) {
      var nextOrder = [];
      (Array.isArray(order) ? order : []).forEach(function (key) {
        var targets = key === "rating" ? splitKeys : [key];
        targets.forEach(function (target) { if (nextOrder.indexOf(target) < 0) nextOrder.push(target); });
      });
      return nextOrder;
    }
    migrated.layerOrder = splitOrder(migrated.layerOrder);
    if (migrated.layerOrders && typeof migrated.layerOrders === "object") {
      ["front", "back"].forEach(function (side) {
        if (Array.isArray(migrated.layerOrders[side])) migrated.layerOrders[side] = splitOrder(migrated.layerOrders[side]);
      });
    }
    ["placements", "layerStyles", "sideShadows"].forEach(function (property) {
      var collection = migrated[property];
      if (!collection || typeof collection !== "object") return;
      ["front", "back"].forEach(function (side) {
        var values = collection[side];
        if (!values || typeof values !== "object" || !values.rating) return;
        splitKeys.forEach(function (key) { if (!values[key]) values[key] = clone(values.rating); });
        delete values.rating;
      });
    });
    if (migrated.shadows && typeof migrated.shadows === "object" && migrated.shadows.rating) {
      splitKeys.forEach(function (key) { if (!migrated.shadows[key]) migrated.shadows[key] = clone(migrated.shadows.rating); });
      delete migrated.shadows.rating;
    }
    var oldInline = migrated.inlineTextStyles && migrated.inlineTextStyles.back && migrated.inlineTextStyles.back.rating;
    if (oldInline && typeof oldInline === "object") {
      var backInline = migrated.inlineTextStyles.back;
      if (!backInline["rating-label"] && Array.isArray(oldInline.ratingLabel)) backInline["rating-label"] = { ratingLabel: clone(oldInline.ratingLabel) };
      if (!backInline["rating-marks"] && Array.isArray(oldInline.ratingMark)) backInline["rating-marks"] = { ratingMark: clone(oldInline.ratingMark) };
      delete backInline.rating;
    }
    ["hidden", "locked"].forEach(function (property) {
      var nextFlags = [];
      (Array.isArray(migrated[property]) ? migrated[property] : []).forEach(function (rawToken) {
        var token = String(rawToken);
        var scoped = /^(front|back)::(.+)$/.exec(token);
        var key = scoped ? scoped[2] : token;
        if (key !== "rating") {
          if (nextFlags.indexOf(token) < 0) nextFlags.push(token);
          return;
        }
        var sidePrefix = scoped ? scoped[1] + "::" : "back::";
        splitKeys.forEach(function (target) {
          var nextToken = sidePrefix + target;
          if (nextFlags.indexOf(nextToken) < 0) nextFlags.push(nextToken);
        });
      });
      migrated[property] = nextFlags;
    });
    if (migrated.selectedLayer === "rating") migrated.selectedLayer = "rating-marks";
    migrated.cinemaRatingLayerVersion = CINEMA_RATING_LAYER_VERSION;
    return migrated;
  }
  function compositeTextSplitMap(template) {
    return template === "train" ? {
      "meta-bot": ["meta-bot-label"],
      "meta-persona": ["meta-persona-label"],
      "meta-date": ["meta-date-label"],
      "record-meta-bot": ["record-meta-bot-label"],
      "record-meta-persona": ["record-meta-persona-label"],
      "record-meta-date": ["record-meta-date-label"],
      serial: ["serial-label"]
    } : template === "cinema" ? {
      "meta-bot": ["meta-bot-label"],
      "meta-persona": ["meta-persona-label"],
      "meta-date": ["meta-date-label"],
      "back-note": ["back-note-label"],
      serial: ["serial-label"],
      source: ["source-label"],
      "rating-marks": ["rating-score"],
      "cinema-etc": ["cinema-etc-label"]
    } : {};
  }
  function normalizeLegacyCompositeTransforms(saved, template) {
    var splitMap = compositeTextSplitMap(template);
    var normalized = { front: {}, back: {} };
    ["front", "back"].forEach(function (side) {
      var source = saved && typeof saved === "object" && saved[side] && typeof saved[side] === "object" ? saved[side] : {};
      Object.keys(splitMap).forEach(function (key) {
        if (source[key] === true) normalized[side][key] = true;
      });
    });
    return normalized;
  }
  function rebaseLegacyCompositePlacement(placement, originX, originY, centerX, centerY, basisWidth, basisHeight) {
    var target = placement || {};
    var scaleX = clamp(finiteNumber(target.scaleX, 1), .1, MAX_NATIVE_OBJECT_SCALE);
    var scaleY = clamp(finiteNumber(target.scaleY, 1), .1, MAX_NATIVE_OBJECT_SCALE);
    var rotation = finiteNumber(target.rotation, 0) * Math.PI / 180;
    var skew = Math.tan(finiteNumber(target.skewX, 0) * Math.PI / 180);
    var cos = Math.cos(rotation);
    var sin = Math.sin(rotation);
    /* CSS applies rotate() skewX() scale() as R*K*S. Changing transform-origin
       from O to C therefore needs t' = t + (I - R*K*S)(O - C). */
    var a = cos * scaleX;
    var b = sin * scaleX;
    var c = scaleY * (cos * skew - sin);
    var d = scaleY * (sin * skew + cos);
    var relativeX = finiteNumber(originX, 0) - finiteNumber(centerX, 0);
    var relativeY = finiteNumber(originY, 0) - finiteNumber(centerY, 0);
    var deltaX = relativeX - (a * relativeX + c * relativeY);
    var deltaY = relativeY - (b * relativeX + d * relativeY);
    target.x = Math.round((finiteNumber(target.x, 0) + deltaX / Math.max(1, finiteNumber(basisWidth, 1)) * 100) * 1000000) / 1000000;
    target.y = Math.round((finiteNumber(target.y, 0) + deltaY / Math.max(1, finiteNumber(basisHeight, 1)) * 100) * 1000000) / 1000000;
    return target;
  }
  function migrateCompositeTextLayersDocument(saved, template) {
    if (!saved || finiteNumber(saved.compositeTextLayerVersion, 0) >= COMPOSITE_TEXT_LAYER_VERSION) return saved;
    var migrated = clone(saved);
    var splitMap = compositeTextSplitMap(template);
    migrated.legacyCompositeTransforms = normalizeLegacyCompositeTransforms(migrated.legacyCompositeTransforms, template);
    var inlinePropertyMap = {
      "meta-bot": { "meta-bot-label": "botLabel" },
      "meta-persona": { "meta-persona-label": "personaLabel" },
      "meta-date": { "meta-date-label": "dateLabel" },
      "record-meta-bot": { "record-meta-bot-label": "botLabel" },
      "record-meta-persona": { "record-meta-persona-label": "personaLabel" },
      "record-meta-date": { "record-meta-date-label": "dateLabel" }
    };
    function splitOrder(order) {
      var nextOrder = [];
      (Array.isArray(order) ? order : []).forEach(function (key) {
        if (nextOrder.indexOf(key) < 0) nextOrder.push(key);
        (splitMap[key] || []).forEach(function (target) {
          if (nextOrder.indexOf(target) < 0) nextOrder.push(target);
        });
      });
      return nextOrder;
    }
    migrated.layerOrder = splitOrder(migrated.layerOrder);
    if (migrated.layerOrders && typeof migrated.layerOrders === "object") {
      ["front", "back"].forEach(function (side) {
        if (Array.isArray(migrated.layerOrders[side])) migrated.layerOrders[side] = splitOrder(migrated.layerOrders[side]);
      });
    }
    ["placements", "layerStyles", "sideShadows"].forEach(function (property) {
      var collection = migrated[property];
      if (!collection || typeof collection !== "object") return;
      ["front", "back"].forEach(function (side) {
        var values = collection[side];
        if (!values || typeof values !== "object") return;
        Object.keys(splitMap).forEach(function (sourceKey) {
          if (!values[sourceKey]) return;
          if (property === "placements") {
            var sourcePlacement = values[sourceKey];
            var hasSharedTransform = Math.abs(finiteNumber(sourcePlacement.scaleX, 1) - 1) > .0001
              || Math.abs(finiteNumber(sourcePlacement.scaleY, 1) - 1) > .0001
              || Math.abs(finiteNumber(sourcePlacement.rotation, 0)) > .0001
              || Math.abs(finiteNumber(sourcePlacement.skewX, 0)) > .0001;
            if (hasSharedTransform) migrated.legacyCompositeTransforms[side][sourceKey] = true;
          }
          splitMap[sourceKey].forEach(function (targetKey) {
            if (!values[targetKey]) values[targetKey] = clone(values[sourceKey]);
          });
        });
      });
    });
    if (migrated.shadows && typeof migrated.shadows === "object") {
      Object.keys(splitMap).forEach(function (sourceKey) {
        if (!migrated.shadows[sourceKey]) return;
        splitMap[sourceKey].forEach(function (targetKey) {
          if (!migrated.shadows[targetKey]) migrated.shadows[targetKey] = clone(migrated.shadows[sourceKey]);
        });
      });
    }
    ["inlineTextStyles", "textTypingStyles"].forEach(function (property) {
      var collection = migrated[property];
      if (!collection || typeof collection !== "object") return;
      ["front", "back"].forEach(function (side) {
        var values = collection[side];
        if (!values || typeof values !== "object") return;
        Object.keys(inlinePropertyMap).forEach(function (sourceKey) {
          var sourceFields = values[sourceKey];
          if (!sourceFields || typeof sourceFields !== "object") return;
          Object.keys(inlinePropertyMap[sourceKey]).forEach(function (targetKey) {
            var textProperty = inlinePropertyMap[sourceKey][targetKey];
            if (!Object.prototype.hasOwnProperty.call(sourceFields, textProperty)) return;
            if (!values[targetKey]) values[targetKey] = {};
            if (!Object.prototype.hasOwnProperty.call(values[targetKey], textProperty)) {
              values[targetKey][textProperty] = clone(sourceFields[textProperty]);
            }
            delete sourceFields[textProperty];
          });
          if (!Object.keys(sourceFields).length) delete values[sourceKey];
        });
      });
    });
    ["hidden", "locked", "clipping"].forEach(function (property) {
      var flags = Array.isArray(migrated[property]) ? migrated[property].slice() : [];
      flags.slice().forEach(function (rawToken) {
        var token = String(rawToken);
        var scoped = /^(front|back)::(.+)$/.exec(token);
        var key = scoped ? scoped[2] : token;
        (splitMap[key] || []).forEach(function (targetKey) {
          var targetToken = scoped ? scoped[1] + "::" + targetKey : targetKey;
          if (flags.indexOf(targetToken) < 0) flags.push(targetToken);
        });
      });
      migrated[property] = flags;
    });
    migrated.compositeTextLayerVersion = COMPOSITE_TEXT_LAYER_VERSION;
    return migrated;
  }
  function migrateTrainCouponRulesDocument(saved, template) {
    if (template !== "train" || !saved || typeof saved !== "object") return saved;
    var migrated = clone(saved);
    var legacyKeys = ["coupon-meta-divider-1", "coupon-meta-divider-2"];
    var ruleKey = "coupon-meta-rules";
    function replaceOrder(order) {
      var replaced = [];
      (Array.isArray(order) ? order : []).forEach(function (key) {
        var nextKey = legacyKeys.indexOf(key) >= 0 ? ruleKey : key;
        if (replaced.indexOf(nextKey) < 0) replaced.push(nextKey);
      });
      return replaced;
    }
    function replaceFlags(flags) {
      var replaced = [];
      (Array.isArray(flags) ? flags : []).forEach(function (rawToken) {
        var token = String(rawToken);
        var scoped = /^(front|back)::(.+)$/.exec(token);
        var key = scoped ? scoped[2] : token;
        var nextToken = legacyKeys.indexOf(key) >= 0
          ? (scoped ? scoped[1] + "::" : "") + ruleKey
          : token;
        if (replaced.indexOf(nextToken) < 0) replaced.push(nextToken);
      });
      return replaced;
    }
    function mergeSideValues(property, keepLegacyValue) {
      var collection = migrated[property];
      if (!collection || typeof collection !== "object") return;
      ["front", "back"].forEach(function (side) {
        var values = collection[side];
        if (!values || typeof values !== "object") return;
        var legacyValue = values[legacyKeys[0]] || values[legacyKeys[1]];
        if (keepLegacyValue && !values[ruleKey] && legacyValue) values[ruleKey] = clone(legacyValue);
        legacyKeys.forEach(function (key) { delete values[key]; });
      });
    }
    migrated.layerOrder = replaceOrder(migrated.layerOrder);
    if (migrated.layerOrders && typeof migrated.layerOrders === "object") {
      ["front", "back"].forEach(function (side) {
        if (Array.isArray(migrated.layerOrders[side])) migrated.layerOrders[side] = replaceOrder(migrated.layerOrders[side]);
      });
    }
    ["hidden", "locked", "clipping"].forEach(function (property) {
      if (Array.isArray(migrated[property])) migrated[property] = replaceFlags(migrated[property]);
    });
    mergeSideValues("layerStyles", true);
    mergeSideValues("sideShadows", true);
    /* A legacy divider placement was measured from one narrow vertical hit
       target. Applying it to the new full-table group would move or scale all
       three rules incorrectly, so the merged layer deliberately starts from
       the stock table geometry. */
    mergeSideValues("placements", false);
    if (migrated.shadows && typeof migrated.shadows === "object") {
      var legacyShadow = migrated.shadows[legacyKeys[0]] || migrated.shadows[legacyKeys[1]];
      if (!migrated.shadows[ruleKey] && legacyShadow) migrated.shadows[ruleKey] = clone(legacyShadow);
      legacyKeys.forEach(function (key) { delete migrated.shadows[key]; });
    }
    if (legacyKeys.indexOf(migrated.selectedLayer) >= 0) migrated.selectedLayer = ruleKey;
    return migrated;
  }
  function normalizeDocument(saved, template) {
    saved = migrateTrainCouponRulesDocument(saved, template);
    if (template === "postcard") {
      saved = migrateLegacyPostcardDocument(saved);
      saved = migratePostcardLayoutDocument(saved);
    }
    if (template === "cinema") saved = migrateCinemaRatingLayersDocument(saved);
    saved = migrateCompositeTextLayersDocument(saved, template);
    var fallback = createTemplateDefaults(template);
    var savedDesignVersion = saved ? finiteNumber(saved.designVersion, 0) : 0;
    var migrateDesign = !saved || savedDesignVersion < DESIGN_VERSION;
    var migrateLegacyDesign = migrateDesign && !(template === "cinema" && savedDesignVersion === 27);
    var savedLogoVersion = saved ? finiteNumber(saved.trainLogoVersion, 0) : 0;
    var savedLogoBlock = saved && saved.blocks && saved.blocks.frontStub;
    var savedLogoData = savedLogoBlock && savedLogoBlock.imageData || "";
    var savedLogoName = String(savedLogoBlock && savedLogoBlock.imageName || "");
    var savedLogoReferencesExternalAsset = Boolean(!savedLogoData && savedLogoBlock
      && (savedLogoBlock.imageAssetStored === true
        || savedLogoBlock.imageAssetStored !== false && savedLogoName && savedLogoName !== "train-travel-logo-v4.png"));
    var legacyTrainLogo = window.LOG_TICKET_TRAIN_LOGO_LEGACY_ASSET || "";
    var bundledTrainLogo = window.LOG_TICKET_TRAIN_LOGO_ASSET || "";
    var savedLogoWasLegacy = Boolean(savedLogoData && legacyTrainLogo && savedLogoData === legacyTrainLogo);
    var savedLogoWasBundled = Boolean(savedLogoData && bundledTrainLogo && savedLogoData === bundledTrainLogo);
    var resetTrainLogoState = template === "train" && Boolean(saved) && savedLogoVersion < TRAIN_LOGO_VERSION
      && (savedLogoVersion < 1 || (!savedLogoData && !savedLogoReferencesExternalAsset) || savedLogoWasLegacy || savedLogoWasBundled);
    var savedTrainGeometryVersion = saved ? finiteNumber(saved.trainGeometryVersion, 0) : 0;
    var savedTrainHandwritingVersion = saved ? finiteNumber(saved.trainHandwritingVersion, 0) : 0;
    var savedPolaroidReverseVersion = saved ? finiteNumber(saved.polaroidReverseVersion, 0) : 0;
    var savedFaceViewVersion = saved ? finiteNumber(saved.faceViewVersion, 0) : 0;
    var savedCinemaPairTitleVersion = saved ? finiteNumber(saved.cinemaPairTitleVersion, 0) : 0;
    var migrateTrainGeometry = template === "train" && (!saved || savedTrainGeometryVersion < TRAIN_GEOMETRY_VERSION);
    var migrateTrainHandwriting = template === "train" && (!saved || savedTrainHandwritingVersion < TRAIN_HANDWRITING_VERSION);
    var migratePolaroidReverse = template === "polaroid" && (!saved || savedPolaroidReverseVersion < POLAROID_REVERSE_VERSION);
    var next = Object.assign({}, fallback, saved && typeof saved === "object" ? saved : {});
    var seedStockCinemaPairTitle = template === "cinema" && saved && savedCinemaPairTitleVersion < CINEMA_PAIR_TITLE_VERSION
      && saved.title === "" && saved.botName === "HAEON" && saved.personaName === "MIRA";
    if (seedStockCinemaPairTitle) next.title = fallback.title;
    if (template === "cinema") {
      next.cinemaPairTitleVersion = CINEMA_PAIR_TITLE_VERSION;
      next.cinemaRatingLayerVersion = CINEMA_RATING_LAYER_VERSION;
    }
    next.compositeTextLayerVersion = COMPOSITE_TEXT_LAYER_VERSION;
    next.legacyCompositeTransforms = normalizeLegacyCompositeTransforms(next.legacyCompositeTransforms, template);
    next.template = template;
    next.side = next.side === "back" ? "back" : "front";
    /* Legacy non-postcard documents carried postcardViewMode="front" as an
       unused default. On first adoption preserve the face the user actually
       had open instead of incorrectly switching a saved BACK document. */
    if (template !== "postcard" && saved && savedFaceViewVersion < FACE_VIEW_VERSION) {
      next.postcardViewMode = next.side;
      next.postcardTopSide = next.side;
    }
    next.postcardViewMode = ["front", "back", "both"].indexOf(next.postcardViewMode) >= 0
      ? next.postcardViewMode
      : (template === "postcard" ? "both" : next.side);
    next.postcardTopSide = next.postcardTopSide === "back" ? "back" : "front";
    if (next.postcardViewMode !== "both") next.side = next.postcardViewMode;
    else next.side = next.postcardTopSide;
    next.faceViewVersion = FACE_VIEW_VERSION;
    if (template === "postcard") {
      next.postcardFaceModelVersion = 1;
      next.postcardLayoutVersion = POSTCARD_LAYOUT_VERSION;
      next.motion = "none";
    }
    if (template === "polaroid") {
      next.polaroidReverseVersion = POLAROID_REVERSE_VERSION;
      if (migratePolaroidReverse && saved) {
        if (saved.botName === "HAEON") next.botName = fallback.botName;
        if (saved.personaName === "MIRA") next.personaName = fallback.personaName;
        if (String(saved.accent || "").toLowerCase() === "#a45a50") next.accent = fallback.accent;
      }
    }
    if (template === "cinema" || template === "polaroid") {
      next.texture = false;
      next.textureStrength = 0;
    }
    var legacyEffects = {
      front: normalizeEffect(saved && saved.effects && saved.effects.front, defaultEffect()),
      back: normalizeEffect(saved && saved.effects && saved.effects.back, defaultEffect())
    };
    next.blocks = {};
    Object.keys(fallback.blocks).forEach(function (key) {
      var side = key.indexOf("front") === 0 ? "front" : "back";
      next.blocks[key] = normalizeBlock(saved && saved.blocks && saved.blocks[key], fallback.blocks[key], legacyEffects[side]);
    });
    if (migratePolaroidReverse && saved && saved.blocks && saved.blocks.backMain
      && String(saved.blocks.backMain.color || "").toLowerCase() === "#fffdfa") {
      next.blocks.backMain.color = fallback.blocks.backMain.color;
    }
    if (template === "train") {
      next.handwrittenNote = String(next.handwrittenNote || fallback.handwrittenNote).slice(0, 600);
      next.backNote = "";
      var shouldSeedDefaultLogo = !saved || (!savedLogoData && !savedLogoReferencesExternalAsset) || savedLogoWasLegacy || savedLogoWasBundled;
      if (shouldSeedDefaultLogo) {
        next.blocks.frontStub.imageData = fallback.blocks.frontStub.imageData;
        next.blocks.frontStub.imageName = fallback.blocks.frontStub.imageName;
        next.blocks.frontStub.imageType = fallback.blocks.frontStub.imageType;
        next.blocks.frontStub.fit = "contain";
        next.blocks.frontStub.zoom = 1;
        next.blocks.frontStub.panX = 0;
        next.blocks.frontStub.panY = 0;
        next.blocks.frontStub.tintMode = "accent";
      } else if (savedLogoVersion < TRAIN_LOGO_VERSION) {
        next.blocks.frontStub.tintMode = "none";
      }
      next.trainLogoVersion = TRAIN_LOGO_VERSION;
      next.trainGeometryVersion = TRAIN_GEOMETRY_VERSION;
      next.trainHandwritingVersion = TRAIN_HANDWRITING_VERSION;
      if (saved && saved.kicker === "THE GRAND NIGHT RAILWAY · PASSENGER DEPT.") next.kicker = fallback.kicker;
    }
    if (template === "cinema" && saved) {
      if (saved.botLabel === "BOT") next.botLabel = fallback.botLabel;
      if (saved.personaLabel === "PERSONA") next.personaLabel = fallback.personaLabel;
      if (saved.source === "AUDITORIUM 02 · 23:40") next.source = fallback.source;
      if (saved.serial === "NC-0248 · G12") next.serial = fallback.serial;
      if (saved.backNote === "NOCTURNE CINEMA · AUDIENCE RECORD") next.backNote = fallback.backNote;
      if (saved.backKicker === "ORIGINAL CINEMA TICKET / RECORD 0248") next.backKicker = fallback.backKicker;
      if (saved.backCopyLabel === "REVIEW / MEMORY NOTE") next.backCopyLabel = fallback.backCopyLabel;
      if (saved.ratingLabel === "MY RATING") next.ratingLabel = fallback.ratingLabel;
      if (!saved.postcardModel || saved.postcardModel === "AI") next.postcardModel = fallback.postcardModel;
      if (!saved.postcardPrompt || saved.postcardPrompt === "PR") next.postcardPrompt = fallback.postcardPrompt;
    }
    var blockKeys = Object.keys(fallback.blocks);
    var knownPaperColors = template === "train"
      ? ["#ffffff", "#fffefe", "#fefefe", "#fffafa", "#fefbfb", "#fffaf1", "#fff7ea", "#faebda", "#fff4e5", "#f7e3d1", "#f8efe1", "#f2e2d2", "#f4ebdf", "#eadbca", "#f4ece0", "#f6ede1", "#ebdccb", "#f8f3eb", "#efe4d8", "#c8ad7f", "#382126", "#c3a678", "#4a2b31", "#eadcc4", "#d8c4b2", "#e8d8bf", "#decdb9"]
      : ["#161719", "#2a2021", "#181719", "#302224", "#f1ede4", "#dedbd3", "#d46c5b", "#bd5148", "#b85f56", "#a64f49", "#a86d49", "#3f2a25", "#51372f"];
    var v27StockSurface = template === "train" && savedDesignVersion === 27 && saved && saved.blocks
      && String(saved.blocks.frontMain && saved.blocks.frontMain.color || "").toLowerCase() === "#eadcc4"
      && String(saved.blocks.backMain && saved.blocks.backMain.color || "").toLowerCase() === "#eadcc4"
      && String(saved.blocks.frontStub && saved.blocks.frontStub.color || "").toLowerCase() === "#d8c4b2"
      && String(saved.blocks.backStub && saved.blocks.backStub.color || "").toLowerCase() === "#d8c4b2";
    if (migrateLegacyDesign && saved && saved.blocks) {
      if (template === "train" && savedDesignVersion === 27) {
        if (v27StockSurface) blockKeys.forEach(function (key) { next.blocks[key].color = fallback.blocks[key].color; });
      } else {
        blockKeys.forEach(function (key) {
          var savedColor = saved.blocks[key] && String(saved.blocks[key].color || "").toLowerCase();
          if (knownPaperColors.indexOf(savedColor) >= 0) next.blocks[key].color = fallback.blocks[key].color;
        });
      }
    }
    delete next.effects;
    next.customLayers = normalizeCustomLayers(saved && saved.customLayers, legacyEffects);
    next.layouts = {
      front: normalizeLayout(migrateLegacyLayout(saved && saved.layouts && saved.layouts.front, template, "front", migrateLegacyDesign), fallback.layouts.front),
      back: normalizeLayout(migrateLegacyLayout(saved && saved.layouts && saved.layouts.back, template, "back", migrateLegacyDesign), fallback.layouts.back)
    };
    var savedTrainBackLayout = saved && saved.layouts && saved.layouts.back;
    var stockTrainBackTitleLayout = template === "train" && savedTrainBackLayout
      && savedTrainBackLayout.quoteX === 27.4 && [14, 17.2, 20.2].indexOf(savedTrainBackLayout.quoteY) >= 0
      && savedTrainBackLayout.quoteW === 41.2;
    if (stockTrainBackTitleLayout) {
      next.layouts.back.quoteX = fallback.layouts.back.quoteX;
      next.layouts.back.quoteY = fallback.layouts.back.quoteY;
      next.layouts.back.quoteW = fallback.layouts.back.quoteW;
    }
    var savedCinemaBackLayout = saved && saved.layouts && saved.layouts.back;
    var cinemaV33BackLayout = template === "cinema" && savedDesignVersion < 34 && savedCinemaBackLayout
      && savedCinemaBackLayout.quoteX === 8 && savedCinemaBackLayout.quoteY === 40.5
      && savedCinemaBackLayout.quoteW === 84
      && savedCinemaBackLayout.detailsX === 8 && savedCinemaBackLayout.detailsY === 87
      && savedCinemaBackLayout.detailsW === 84;
    if (cinemaV33BackLayout) {
      next.layouts.back = normalizeLayout(migrateStockLayout(savedCinemaBackLayout, fallback.layouts.back, 34), fallback.layouts.back);
    }
    var stockCinemaBackLayout = template === "cinema" && savedCinemaBackLayout
      && savedCinemaBackLayout.quoteX === 8 && savedCinemaBackLayout.quoteY === 41
      && savedCinemaBackLayout.quoteW === 84
      && savedCinemaBackLayout.detailsX === 8 && savedCinemaBackLayout.detailsY === 90
      && savedCinemaBackLayout.detailsW === 84;
    if (stockCinemaBackLayout) next.layouts.back = normalizeLayout(fallback.layouts.back, fallback.layouts.back);
    var savedFrontLayout = saved && saved.layouts && saved.layouts.front;
    var v28TightFrameLayout = template === "train" && (savedDesignVersion === 27 || savedDesignVersion === 28) && savedFrontLayout
      && savedFrontLayout.quoteX === 5.2 && savedFrontLayout.quoteY === 70.6 && savedFrontLayout.quoteW === 64.3
      && savedFrontLayout.detailsX === 0 && savedFrontLayout.detailsY === 0 && savedFrontLayout.detailsW === 100;
    if (v28TightFrameLayout) {
      next.layouts.front = normalizeLayout(migrateStockLayout(savedFrontLayout, fallback.layouts.front, 29), fallback.layouts.front);
    }
    var v29ApprovedFrontLayout = template === "train" && savedDesignVersion === 29 && savedFrontLayout
      && savedFrontLayout.quoteX === 3.36 && savedFrontLayout.quoteY === 72.1 && savedFrontLayout.quoteW === 66.04
      && savedFrontLayout.detailsX === 0 && savedFrontLayout.detailsY === 0 && savedFrontLayout.detailsW === 100;
    if (v29ApprovedFrontLayout) {
      next.layouts.front = normalizeLayout(migrateStockLayout(savedFrontLayout, fallback.layouts.front, 29), fallback.layouts.front);
    }
    next.placements = normalizePlacements(saved && saved.placements);
    if (migratePolaroidReverse) {
      ["frame", "meta-bot", "meta-persona"].forEach(function (key) { delete next.placements.back[key]; });
    }
    if (template === "postcard" && savedDesignVersion < 34) {
      ["block-main", "block-stub", "image-main", "image-stub", "main-frame", "stub-frame", "kicker", "title", "subtitle",
        "meta-bot", "meta-persona", "meta-date", "quote", "speaker", "copy-label", "body", "source", "back-note", "serial",
        "texture"].forEach(function (layer) {
        delete next.placements.front[layer];
      });
    }
    next.layerStyles = normalizeLayerStyles(saved && saved.layerStyles);
    next.inlineTextStyleVersion = INLINE_TEXT_STYLE_VERSION;
    next.inlineTextStyles = normalizeInlineTextStyles(saved && saved.inlineTextStyles);
    next.textTypingStyles = normalizeTextTypingStyles(saved && saved.textTypingStyles);
    if (template === "polaroid") {
      ["meta-bot", "meta-persona"].forEach(function (key) {
        if (!next.layerStyles.back[key]) next.layerStyles.back[key] = clone(fallback.layerStyles.back[key]);
      });
    }
    if (next.layerStyles.front.quote && TEXT_COLOR_MODES.indexOf(next.layerStyles.front.quote.colorMode) >= 0) {
      next.quoteEffect = next.layerStyles.front.quote.colorMode;
    }
    next.layerFolders = normalizeLayerFolders(saved && saved.layerFolders);
    if (migrateTrainGeometry && saved && saved.layerStyles && saved.layerStyles.back && saved.layerStyles.back.source) {
      next.layerStyles.back["back-note"] = normalizeLayerStyles({ back: { "back-note": saved.layerStyles.back.source } }).back["back-note"];
      delete next.layerStyles.back.source;
    }
    if (migrateTrainGeometry && template === "train" && saved && saved.layerStyles && saved.layerStyles.back && saved.layerStyles.back["main-frame"]) {
      ["record-divider-top", "record-divider-middle"].forEach(function (key) {
        next.layerStyles.back[key] = normalizeLayerStyles({ back: { [key]: saved.layerStyles.back["main-frame"] } }).back[key];
      });
      delete next.layerStyles.back["main-frame"];
    }
    if (saved && saved.layerStyles) ["front", "back"].forEach(function (side) {
      var legacyStubStyle = saved.layerStyles[side] && saved.layerStyles[side]["stub-copy"];
      if (!legacyStubStyle) return;
      ["stub-topline", "admit-copy", "stub-title", "platform"].forEach(function (key) {
        if (!next.layerStyles[side][key]) next.layerStyles[side][key] = normalizeLayerStyles({ front: side === "front" ? { [key]: legacyStubStyle } : {}, back: side === "back" ? { [key]: legacyStubStyle } : {} })[side][key];
      });
    });
    if (saved && saved.personaName === "K") next.personaName = fallback.personaName;
    if (next.barcode === "|||| ||| | |||| | | |||") next.barcode = fallback.barcode;
    if (next.backBarcode === "||||| || |||| | |||") next.backBarcode = fallback.backBarcode;
    if (!saved || finiteNumber(saved.texturePresetVersion, 0) < 1) {
      var oldTextureDefault = template === "train" ? 18 : 20;
      if (!saved || finiteNumber(saved.textureStrength, oldTextureDefault) === oldTextureDefault) next.textureStrength = fallback.textureStrength;
      next.texturePresetVersion = 1;
    }
    if (migrateTrainGeometry) {
      /* v34 only resets geometry that must track the canonical coupon/record layout.
         User artwork placement, crop/effects and all authored copy remain untouched. */
      ["main-frame", "back-image-frame", "record-divider-top", "record-divider-middle", "stub-frame", "stub-divider", "route-art", "image-main", "image-stub", "kicker", "title", "subtitle",
        "coach", "stub-topline", "admit-copy", "stub-title", "platform", "source", "serial-copy",
        "meta-bot", "meta-persona", "meta-date", "record-meta-bot", "record-meta-persona", "record-meta-date", "barcode", "copy-label", "quote", "body",
        "back-note", "serial", "handwritten-note"].forEach(function (layer) {
        delete next.placements.back[layer];
      });
      /* The barcode moved clear of the lower frame. */
      delete next.placements.front.barcode;
      /* v35 promotes the user's approved conductor-coupon rhythm and speaker
         baseline to template geometry.  Remove only the built-in deltas that
         would otherwise keep an older saved document visibly out of sync. */
      ["speaker", "handwritten-note", "image-stub", "stub-frame", "stub-divider", "route-art", "kicker", "title", "subtitle",
        "coach", "stub-topline", "admit-copy", "stub-title", "platform", "source", "serial-copy",
        "meta-bot", "meta-persona", "meta-date"].forEach(function (layer) {
        delete next.placements.front[layer];
      });
    }
    if (migrateTrainHandwriting) delete next.placements.front["handwritten-note"];
    if (template === "train") {
      ["front", "back"].forEach(function (side) {
        var legacyFramePlacement = next.placements[side] && next.placements[side].frame;
        if (!legacyFramePlacement) return;
        if (!next.placements[side]["main-frame"]) next.placements[side]["main-frame"] = clone(legacyFramePlacement);
        if (!next.placements[side]["stub-frame"]) next.placements[side]["stub-frame"] = clone(legacyFramePlacement);
        if (!next.placements[side]["stub-divider"]) next.placements[side]["stub-divider"] = clone(legacyFramePlacement);
        delete next.placements[side].frame;
      });
      if (savedDesignVersion < 28) ["front", "back"].forEach(function (side) {
        var savedStubPlacement = next.placements[side] && next.placements[side]["stub-frame"];
        if (savedStubPlacement && !next.placements[side]["stub-divider"]) next.placements[side]["stub-divider"] = clone(savedStubPlacement);
      });
    }
    next.freeform = Boolean(next.freeform);
    next.snapToGrid = next.snapToGrid !== false;
    next.snapToObjects = Boolean(next.snapToObjects);
    next.snapToCanvasCenter = Boolean(next.snapToCanvasCenter);
    next.postcardModelLabel = String(typeof next.postcardModelLabel === "string" ? next.postcardModelLabel : fallback.postcardModelLabel).slice(0, 40);
    next.postcardModel = String(typeof next.postcardModel === "string" ? next.postcardModel : fallback.postcardModel).slice(0, 80);
    next.postcardPromptLabel = String(typeof next.postcardPromptLabel === "string" ? next.postcardPromptLabel : fallback.postcardPromptLabel).slice(0, 40);
    next.postcardPrompt = String(typeof next.postcardPrompt === "string" ? next.postcardPrompt : fallback.postcardPrompt).slice(0, 80);
    next.postcardCardTitle = String(typeof next.postcardCardTitle === "string" ? next.postcardCardTitle : fallback.postcardCardTitle).slice(0, 80);
    next.postcardCardSubtitle = String(typeof next.postcardCardSubtitle === "string" ? next.postcardCardSubtitle : fallback.postcardCardSubtitle).slice(0, 80);
    [1, 2, 3, 4].forEach(function (number) {
      var property = "postcardWriting" + number;
      next[property] = String(typeof next[property] === "string" ? next[property] : fallback[property]).slice(0, 280);
    });
    if (template === "postcard") next.backBody = [next.postcardWriting1, next.postcardWriting2, next.postcardWriting3, next.postcardWriting4].join("\n");
    next.sourceLabel = String(typeof next.sourceLabel === "string" ? next.sourceLabel : fallback.sourceLabel).slice(0, 80);
    next.serialLabel = String(typeof next.serialLabel === "string" ? next.serialLabel : fallback.serialLabel).slice(0, 80);
    next.serialCopyLabel = String(typeof next.serialCopyLabel === "string" ? next.serialCopyLabel : fallback.serialCopyLabel).slice(0, 80);
    next.backNoteLabel = String(typeof next.backNoteLabel === "string" ? next.backNoteLabel : fallback.backNoteLabel).slice(0, 80);
    next.cinemaEtcLabel = String(typeof next.cinemaEtcLabel === "string" ? next.cinemaEtcLabel : fallback.cinemaEtcLabel).slice(0, 80);
    next.ratingLabel = String(next.ratingLabel || fallback.ratingLabel).slice(0, 40);
    next.ratingMark = Array.from(String(next.ratingMark || fallback.ratingMark).trim())[0] || "☆";
    next.ratingScore = String(typeof next.ratingScore === "string" ? next.ratingScore : fallback.ratingScore).slice(0, 40);
    next.quoteEffect = ["difference", "solid"].indexOf(next.quoteEffect) >= 0 ? next.quoteEffect : fallback.quoteEffect;
    if (migrateLegacyDesign && saved && savedDesignVersion < 27 && saved.textureStrength === 48) next.textureStrength = fallback.textureStrength;
    if (template === "cinema" && saved && migrateLegacyDesign) {
      next.theme = fallback.theme;
      if (["#d7a85b", "#b64039", "#fff0dc", "#f1d8c8", "#d7b46d", "#d7ad68"].indexOf(String(saved.accent || "").toLowerCase()) >= 0) next.accent = fallback.accent;
      if (["#f2eadc", "#272a2c", "#fff8eb", "#fff7ed", "#f4dfb3", "#f8ead0"].indexOf(String(saved.quoteColor || "").toLowerCase()) >= 0) next.quoteColor = fallback.quoteColor;
      if (["#b6a894", "#e7b9ae", "#c7a879", "#e0c293"].indexOf(String(saved.muted || "").toLowerCase()) >= 0) next.muted = fallback.muted;
      if ([12, 16, 18, 24, 48].indexOf(Number(saved.textureStrength)) >= 0) next.textureStrength = fallback.textureStrength;
      if (saved.title === "AFTERIMAGE") next.title = fallback.title;
      if (saved.title === "NOCTURNE CINEMA") next.title = fallback.title;
      if (saved.botLabel === "DIRECTOR" && saved.botName === "M. SEO") { next.botLabel = fallback.botLabel; next.botName = fallback.botName; }
      if (saved.personaLabel === "THEATER / SEAT" && saved.personaName === "02 / G-12") { next.personaLabel = fallback.personaLabel; next.personaName = fallback.personaName; }
      if (saved.dateLabel === "SCREENED") next.dateLabel = fallback.dateLabel;
      if (saved.subtitle === "A NOCTURNE CINEMA PRESENTATION") next.subtitle = fallback.subtitle;
      if (saved.kicker === "NOCTURNE / TICKET NO. 0248") next.kicker = fallback.kicker;
      if (saved.backKicker === "TERMS / SCREENING RECORD") next.backKicker = fallback.backKicker;
      if (saved.botLabel === "SCREEN" && saved.botName === "02") { next.botLabel = fallback.botLabel; next.botName = fallback.botName; }
      if (saved.personaLabel === "ROW / SEAT" && saved.personaName === "G · 12") { next.personaLabel = fallback.personaLabel; next.personaName = fallback.personaName; }
      if (saved.dateLabel === "SHOWTIME") next.dateLabel = fallback.dateLabel;
      if (saved.quote === "한 장면은 끝나도,\n그 순간의 빛은 오래 남는다.") next.quote = fallback.quote;
      if (saved.backTitle === "KEEP THE MOMENT\nAFTER THE LIGHTS.") next.backTitle = fallback.backTitle;
      if (saved.backBody === "관람 중 다른 관객에게 불편을 주는 촬영과 녹음은 삼가 주세요. 상영이 끝난 뒤에는 좌석 주변의 소지품을 확인하고, 오래 남은 장면과 대사는 이 티켓의 기록면에 자유롭게 남겨 주세요.") next.backBody = fallback.backBody;
      if (saved.backCopyLabel === "AUDIENCE RECORD / REVERSE") next.backCopyLabel = fallback.backCopyLabel;
      if (saved.backRouteTo === "EXIT B") next.backRouteTo = fallback.backRouteTo;
      if (saved.subtitle === "FEATURE PRESENTATION · SCREEN 02") next.subtitle = fallback.subtitle;
      if (saved.kicker === "NOCTURNE CINEMA · PRIVATE SCREENING") next.kicker = fallback.kicker;
      if (saved.backKicker === "REVERSE / SCREENING RECORD") next.backKicker = fallback.backKicker;
      if (saved.backHeading === "NOCTURNE CINEMA") next.backHeading = fallback.backHeading;
      if (saved.speaker === "엔딩 크레딧") next.speaker = fallback.speaker;
      if (saved.source === "PRIVATE SCREENING · LOG 02") next.source = fallback.source;
      if (saved.serial === "NC 0207 · ROW G") next.serial = fallback.serial;
      if (saved.backTitle === "THE LIGHT REMAINS\nAFTER THE CREDITS.") next.backTitle = fallback.backTitle;
      if (saved.backBody === "마지막 장면이 끝난 뒤에도 오래 남은 표정과 대사를 한 장의 상영 기록으로 보관합니다.") next.backBody = fallback.backBody;
      if (saved.backNote === "NOCTURNE CINEMA · SCREENING ARCHIVE") next.backNote = fallback.backNote;
      if (saved.backCopyLabel === "SCREENING ARCHIVE / REVERSE") next.backCopyLabel = fallback.backCopyLabel;
      if (saved.dateLabel === "SHOW DATE") next.dateLabel = fallback.dateLabel;
      if (saved.routeFrom === "OPENING") next.routeFrom = fallback.routeFrom;
      if (saved.routeTo === "CREDITS") next.routeTo = fallback.routeTo;
      if (saved.routeIndex === "NC—02 / FEATURE") next.routeIndex = fallback.routeIndex;
      if (saved.backRouteFrom === "SCREEN 02") next.backRouteFrom = fallback.backRouteFrom;
      if (saved.backRouteTo === "ARCHIVE") next.backRouteTo = fallback.backRouteTo;
      if (saved.stubTopline === "AUDIENCE COPY") next.stubTopline = fallback.stubTopline;
      if (saved.stubTitle === "SCREEN 02") next.stubTitle = fallback.stubTitle;
      if (saved.platformText === "FEATURE 23:40") next.platformText = fallback.platformText;
      if (saved.backIndex === "ARCHIVE\n02") next.backIndex = fallback.backIndex;
      if (saved.backStamp === "SCREENING\nVALIDATED") next.backStamp = fallback.backStamp;
      if (saved.backBody === "이 티켓의 영화 템플릿은 열차 템플릿과 별개의 문서입니다. 글과 이미지, 레이어 설정을 독립적으로 보관합니다.") next.backBody = fallback.backBody;
      if (saved.backTitle === "PLEASE REMAIN\nFOR THE FINAL SCENE.") next.backTitle = fallback.backTitle;
      if (saved.backCopyLabel === "ARCHIVE COPY / REVERSE") next.backCopyLabel = fallback.backCopyLabel;
      if (saved.botLabel === "BOT" && saved.botName === "DIRECTOR") { next.botLabel = fallback.botLabel; next.botName = fallback.botName; }
      if (saved.personaLabel === "PERSONA" && saved.personaName === "GUEST") { next.personaLabel = fallback.personaLabel; next.personaName = fallback.personaName; }
      if (saved.coachLabel === "ROW" && saved.coachNumber === "G") { next.coachLabel = fallback.coachLabel; next.coachNumber = fallback.coachNumber; }
    }
    if (template === "train" && saved && migrateDesign) {
      var v27StockInk = savedDesignVersion === 27
        && String(saved.accent || "").toLowerCase() === "#794940"
        && String(saved.quoteColor || "").toLowerCase() === "#332521"
        && String(saved.muted || "").toLowerCase() === "#654e46";
      if (savedDesignVersion === 27) {
        if (v27StockInk) {
          next.accent = fallback.accent;
          next.quoteColor = fallback.quoteColor;
          next.muted = fallback.muted;
        }
        if (v27StockInk && v27StockSurface && Number(saved.textureStrength) === 22) next.textureStrength = fallback.textureStrength;
      } else {
        if (["#bc6f68", "#b96760", "#ad6963", "#713b34", "#794940"].indexOf(String(saved.accent || "").toLowerCase()) >= 0) next.accent = fallback.accent;
        if (["#6f3f43", "#624843", "#684b47", "#251a17", "#332521"].indexOf(String(saved.quoteColor || "").toLowerCase()) >= 0) next.quoteColor = fallback.quoteColor;
        if (["#98766f", "#88736c", "#7d6758", "#654e46"].indexOf(String(saved.muted || "").toLowerCase()) >= 0) next.muted = fallback.muted;
        if ([12, 16, 22, 25, 48].indexOf(Number(saved.textureStrength)) >= 0) next.textureStrength = fallback.textureStrength;
      }
    }
    if (template === "train" && saved && migrateDesign) {
      if (saved.title === "MIDNIGHT PASSAGE") next.title = fallback.title;
      if (saved.backHeading === "MIDNIGHT PASSAGE") next.backHeading = fallback.backHeading;
      if (saved.subtitle === "ONE WAY · PRIVATE ARCHIVE") next.subtitle = fallback.subtitle;
      if (saved.kicker === "NIGHTLINE EXPRESS · MEMORY CLASS") next.kicker = fallback.kicker;
      if (saved.backKicker === "REVERSE / JOURNEY RECORD") next.backKicker = fallback.backKicker;
      if (saved.routeIndex === "NL—07 / ONE WAY") next.routeIndex = fallback.routeIndex;
      if (saved.backBody === "이 티켓은 로그 원문을 바꾸지 않습니다. 당신이 남기고 싶은 장면과 오래 기억하고 싶은 문장을 한 면에 조용히 보관합니다. 목적지보다 오래 남은 대화, 다시 돌아보고 싶은 순간, 그날의 온도를 이어서 기록해 보세요.") next.backBody = fallback.backBody;
      if (saved.backBody === "이 티켓은 로그 원문을 바꾸지 않습니다. 당신이 남기고 싶은 장면만 조용히 보관합니다.") next.backBody = fallback.backBody;
      if (saved.stubTopline === "PASSENGER STUB" || saved.stubTopline === "PASSENGER COPY") next.stubTopline = fallback.stubTopline;
      if (saved.admitText === "ONE\nWAY") next.admitText = fallback.admitText;
      if (saved.stubTitle === "NIGHTLINE EXPRESS" || saved.stubTitle === "NIGHTLINE") next.stubTitle = fallback.stubTitle;
      if (saved.subtitle === "VINTAGE NIGHT RAIL · PRIVATE ARCHIVE") next.subtitle = fallback.subtitle;
      if (saved.backKicker === "REVERSE / PASSAGE ARCHIVE") next.backKicker = fallback.backKicker;
      if (saved.backCopyLabel === "ARCHIVE COPY / REVERSE") next.backCopyLabel = fallback.backCopyLabel;
      if (saved.backNote === "KEEP THIS SIDE · ARCHIVE COPY") next.backNote = fallback.backNote;
      if (saved.backIndex === "VERSO\n02") next.backIndex = fallback.backIndex;
      if (saved.routeIndex === "NL—07 / ADMIT ONE") next.routeIndex = fallback.routeIndex;
      if (saved.routeFrom === "ORIGIN" && saved.routeTo === "ARCHIVE") { next.routeFrom = fallback.routeFrom; next.routeTo = fallback.routeTo; }
      if (saved.backRouteFrom === "ORIGIN" && saved.backRouteTo === "ARCHIVE") { next.backRouteFrom = fallback.backRouteFrom; next.backRouteTo = fallback.backRouteTo; }
      if (saved.subtitle === "VINTAGE NIGHT RAIL · PASSENGER COPY") next.subtitle = fallback.subtitle;
      if (saved.subtitle === "FIRST CLASS · RESERVED PASSAGE") next.subtitle = fallback.subtitle;
      if (saved.kicker === "THE GRAND NIGHT RAILWAY / EST. 1926") next.kicker = fallback.kicker;
      if (saved.botLabel === "BOT") next.botLabel = fallback.botLabel;
      if (saved.personaLabel === "PERSONA") next.personaLabel = fallback.personaLabel;
      if (saved.dateLabel === "DATE") next.dateLabel = fallback.dateLabel;
      if (saved.dateLabel === "VALID ON") next.dateLabel = fallback.dateLabel;
      if (saved.source === "밤을 건너는 열차 · 47번째 로그") next.source = fallback.source;
      if (saved.coachLabel === "COACH") next.coachLabel = fallback.coachLabel;
      if (saved.coachNumber === "07") next.coachNumber = fallback.coachNumber;
      if (saved.stubTopline === "PASSENGER ADMISSION") next.stubTopline = fallback.stubTopline;
      if (saved.stubTitle === "MIDNIGHT EXPRESS") next.stubTitle = fallback.stubTitle;
      if (saved.platformText === "PLATFORM 07") next.platformText = fallback.platformText;
      if (saved.platformText === "CLASS A · VALID 07") next.platformText = fallback.platformText;
      if (saved.validationText === "07\nVALID") next.validationText = fallback.validationText;
    }
    if (!saved || typeof saved.backHeading !== "string") next.backHeading = TEMPLATE_LAYER_SIDES[template] ? fallback.backHeading : next.title;
    if (!saved || typeof saved.stubTitle !== "string") next.stubTitle = TEMPLATE_LAYER_SIDES[template] ? fallback.stubTitle : (template === "train" ? (next.title.split(" ")[0] || "PASSAGE") : "SCREEN 02");
    var customIds = next.customLayers.front.concat(next.customLayers.back).map(function (item) { return item.id; });
    var expandedOrder = expandLegacyLayers(next.layerOrder, customIds);
    var savedMainFrameIndex = expandedOrder.indexOf("main-frame");
    var savedStubFrameIndex = expandedOrder.indexOf("stub-frame");
    var savedStubDividerIndex = expandedOrder.indexOf("stub-divider");
    var legacyFrameIndex = expandedOrder.indexOf("frame");
    next.layerOrder = expandedOrder
      .concat(LAYER_ORDER.filter(function (key) { return expandedOrder.indexOf(key) < 0; }))
      .concat(customIds.filter(function (key) { return expandedOrder.indexOf(key) < 0; }));
    if (expandedOrder.indexOf("serial-copy") < 0) {
      next.layerOrder = next.layerOrder.filter(function (key) { return key !== "serial-copy"; });
      var mainSerialIndex = next.layerOrder.indexOf("serial");
      next.layerOrder.splice(mainSerialIndex >= 0 ? mainSerialIndex + 1 : next.layerOrder.length, 0, "serial-copy");
    }
    if (template === "train" && (expandedOrder.indexOf("image-stub") < 0 || resetTrainLogoState)) {
      next.layerOrder = next.layerOrder.filter(function (key) { return key !== "image-stub"; });
      var mainImageIndex = next.layerOrder.indexOf("image-main");
      next.layerOrder.splice(mainImageIndex >= 0 ? mainImageIndex + 1 : 0, 0, "image-stub");
    }
    if (template === "train") {
      if (savedMainFrameIndex >= 0 && savedStubFrameIndex >= 0) {
        next.layerOrder = next.layerOrder.filter(function (key) { return key !== "frame"; });
      } else {
        var defaultMainFrameIndex = LAYER_ORDER.indexOf("main-frame");
        var frameInsertIndex = savedMainFrameIndex >= 0
          ? savedMainFrameIndex
          : (savedStubFrameIndex >= 0 ? savedStubFrameIndex : (legacyFrameIndex >= 0 ? legacyFrameIndex : defaultMainFrameIndex));
        next.layerOrder = next.layerOrder.filter(function (key) { return ["frame", "main-frame", "stub-frame", "stub-divider"].indexOf(key) < 0; });
        next.layerOrder.splice(clamp(frameInsertIndex, 0, next.layerOrder.length), 0, "main-frame", "stub-frame", "stub-divider");
      }
      if (savedStubDividerIndex < 0) {
        next.layerOrder = next.layerOrder.filter(function (key) { return key !== "stub-divider"; });
        var currentStubFrameIndex = next.layerOrder.indexOf("stub-frame");
        next.layerOrder.splice(currentStubFrameIndex >= 0 ? currentStubFrameIndex + 1 : next.layerOrder.length, 0, "stub-divider");
      }
      var recordDividerKeys = ["record-divider-top"];
      if (recordDividerKeys.some(function (key) { return expandedOrder.indexOf(key) < 0; })) {
        next.layerOrder = next.layerOrder.filter(function (key) { return recordDividerKeys.indexOf(key) < 0; });
        var recordDividerAnchor = next.layerOrder.indexOf("main-frame");
        next.layerOrder.splice.apply(next.layerOrder, [recordDividerAnchor >= 0 ? recordDividerAnchor + 1 : 0, 0].concat(recordDividerKeys));
      }
    } else if (template === "cinema") {
      next.layerOrder = next.layerOrder.filter(function (key) { return ["image-stub", "main-frame", "back-image-frame", "record-divider-top", "record-divider-middle", "stub-frame", "stub-divider", "serial-copy", "stub-topline", "admit-copy", "stub-title", "platform", "record-meta-bot", "record-meta-persona", "record-meta-date", "texture"].indexOf(key) < 0; });
    } else {
      var nativeLayerOrder = templateLayerOrder(template);
      next.layerOrder = next.layerOrder.filter(function (key) {
        return nativeLayerOrder.indexOf(key) >= 0 || customIds.indexOf(key) >= 0;
      });
    }
    if (template !== "postcard") {
      next.layerOrder = next.layerOrder.filter(function (key) {
        return ["postcard-model", "postcard-prompt"].indexOf(key) < 0;
      });
    }
    if (savedDesignVersion < 32) {
      ["texture"].forEach(function (key) {
        if (next.layerOrder.indexOf(key) < 0) return;
        next.layerOrder = next.layerOrder.filter(function (item) { return item !== key; });
        next.layerOrder.push(key);
      });
    }
    /* Layout examples may intentionally delete a stock layer instead of merely
       hiding it. Normalize those tokens before deriving the two face orders so
       deleted native layers stay out of the canvas and the layer list. */
    next.removedLayers = [];
    next.removedLayers = normalizeLayerFlags(saved && saved.removedLayers, customIds, next);
    next.layerOrder = normalizeLayerOrderByFolder(next.layerOrder, next);
    if (template === "postcard" && savedDesignVersion < 34) {
      next.layerOrder = normalizeLayerOrderByFolder(fallback.layerOrder.concat(customIds), next);
    }
    next.layerOrders = createSideLayerOrders(next.layerOrder, next, saved && saved.layerOrders);
    syncFlatLayerOrder(next);
    next.hidden = normalizeLayerFlags(saved && saved.hidden, customIds, next);
    next.locked = normalizeLayerFlags(saved && saved.locked, customIds, next);
    next.clipping = normalizeLayerFlags(saved && saved.clipping, customIds, next);
    if (migratePolaroidReverse) {
      [next.hidden, next.locked].forEach(function (flags) {
        ["frame", "meta-bot", "meta-persona"].forEach(function (key) {
          var token = layerFlagToken(key, "back", next);
          if (flags.indexOf(token) >= 0) flags.splice(flags.indexOf(token), 1);
        });
      });
    }
    if (migrateTrainGeometry && template === "train") {
      [
        { saved: saved && saved.hidden, next: next.hidden },
        { saved: saved && saved.locked, next: next.locked }
      ].forEach(function (entry) {
        var list = Array.isArray(entry.saved) ? entry.saved : [];
        var inherited = list.indexOf("back::main-frame") >= 0 || list.indexOf("main-frame") >= 0 || list.indexOf("frame") >= 0;
        if (!inherited) return;
        ["record-divider-top", "record-divider-middle"].forEach(function (key) {
          var token = layerFlagToken(key, "back", next);
          if (entry.next.indexOf(token) < 0) entry.next.push(token);
        });
      });
    }
    if (migrateTrainGeometry && template === "train") {
      [next.hidden, next.locked].forEach(function (flags) {
        var oldBackSource = layerFlagToken("source", "back", next);
        var backNote = layerFlagToken("back-note", "back", next);
        if (flags.indexOf(oldBackSource) < 0) return;
        flags.splice(flags.indexOf(oldBackSource), 1);
        if (flags.indexOf(backNote) < 0) flags.push(backNote);
      });
    }
    if (resetTrainLogoState) {
      var logoFlag = layerFlagToken("image-stub", "front", next);
      next.hidden = next.hidden.filter(function (key) { return key !== logoFlag; });
      next.locked = next.locked.filter(function (key) { return key !== logoFlag; });
    }
    if (template === "train" && savedDesignVersion < 28) ["front", "back"].forEach(function (side) {
      if (hasLayerFlag(next.hidden, "stub-frame", side, next) && !hasLayerFlag(next.hidden, "stub-divider", side, next)) next.hidden.push(layerFlagToken("stub-divider", side, next));
      if (hasLayerFlag(next.locked, "stub-frame", side, next) && !hasLayerFlag(next.locked, "stub-divider", side, next)) next.locked.push(layerFlagToken("stub-divider", side, next));
    });
    next.shadows = {};
    LAYER_ORDER.concat(customIds).forEach(function (key) {
      var legacyParent = LEGACY_PARENT_BY_LAYER[key];
      var savedShadow = saved && saved.shadows && (saved.shadows[key] || (legacyParent && saved.shadows[legacyParent]));
      if (!savedShadow && migrateTrainGeometry && template === "train" && key === "back-note") savedShadow = saved && saved.shadows && saved.shadows.source;
      if (!savedShadow && template === "train" && ["record-divider-top", "record-divider-middle"].indexOf(key) >= 0) savedShadow = saved && saved.shadows && (saved.shadows["main-frame"] || saved.shadows.frame);
      if (!savedShadow && template === "train" && key === "stub-divider") savedShadow = saved && saved.shadows && (saved.shadows["stub-frame"] || saved.shadows.frame);
      if (!savedShadow && template === "train" && ["main-frame", "stub-frame", "stub-divider"].indexOf(key) >= 0) savedShadow = saved && saved.shadows && saved.shadows.frame;
      next.shadows[key] = normalizeShadow(savedShadow);
    });
    if (!saved || finiteNumber(saved.shadowPresetVersion, 0) < 2) {
      if (!(saved && saved.shadows && saved.shadows.title && saved.shadows.title.enabled)) {
        next.shadows.title = template === "cinema" ? cinemaTitleShadow() : (template === "train" ? trainTitleShadow() : defaultShadow());
      }
      next.shadowPresetVersion = 2;
    }
    if (template === "cinema" && saved && saved.shadows && isLegacyCinemaTitleShadow(saved.shadows.title)) {
      next.shadows.title = cinemaTitleShadow();
    }
    if (template === "cinema") delete next.shadows.texture;
    if (resetTrainLogoState) next.shadows["image-stub"] = defaultShadow();
    next.sideShadows = createSideShadows(saved && saved.sideShadows, next.shadows, next);
    if (resetTrainLogoState) next.sideShadows.front["image-stub"] = defaultShadow();
    if (next.font === "serif") next.font = "noto-serif";
    if (next.font === "sans" || next.font === "mono") next.font = "pretendard";
    if (!fontKeyAllowed(next.font)) next.font = "noto-serif";
    next.viewZoom = clamp(finiteNumber(next.viewZoom, 1), .1, 8);
    next.viewRotation = finiteNumber(next.viewRotation, 0);
    var legacySelection = { heading: "title", metadata: "meta-bot", route: "route-art", "stub-print": "admit-copy", "stub-copy": "admit-copy", details: "source" };
    if (legacySelection[next.selectedLayer]) next.selectedLayer = legacySelection[next.selectedLayer];
    if (migrateTrainGeometry && template === "train" && next.side === "back" && next.selectedLayer === "source") next.selectedLayer = "back-note";
    if (template === "train" && next.selectedLayer === "frame") next.selectedLayer = "main-frame";
    if (layerOrderFor(next.side, next).indexOf(next.selectedLayer) < 0 || !layerAvailableOnSide(next.selectedLayer, next.side, next)) next.selectedLayer = "";
    if (template === "train") {
      /* The two faces keep independent image/crop/effect records, but their
         paper colors are one shared stock. Normalize legacy/imported documents
         after every migration so stale reverse-only colors cannot reappear. */
      setBlockColorForKey("backMain", blockColorForKey("frontMain", next), next);
      setBlockColorForKey("backStub", blockColorForKey("frontStub", next), next);
    }
    delete next.reducedMotion;
    next.designVersion = DESIGN_VERSION;
    return enforceProtectedAttribution(next);
  }
  function loadState() {
    try {
      var sourceStorageKey = STORAGE_KEY;
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        for (var legacyIndex = 0; legacyIndex < LEGACY_STORAGE_KEYS.length && !raw; legacyIndex++) {
          raw = localStorage.getItem(LEGACY_STORAGE_KEYS[legacyIndex]);
          if (raw) sourceStorageKey = LEGACY_STORAGE_KEYS[legacyIndex];
        }
      }
      var saved = JSON.parse(raw || "null");
      if (!saved || typeof saved !== "object") return clone(templateDocuments.train);
      if (saved.documents && typeof saved.documents === "object") {
        TEMPLATE_IDS.forEach(function (template) {
          templateDocuments[template] = saved.documents[template]
            ? normalizeDocument(saved.documents[template], template)
            : createTemplateDefaults(template);
        });
        if (sourceStorageKey !== STORAGE_KEY) migratedLegacyStorageKey = sourceStorageKey;
        return clone(templateDocuments[safeTemplateId(saved.activeTemplate)]);
      }
      var migratedTemplate = safeTemplateId(saved.template);
      templateDocuments[migratedTemplate] = normalizeDocument(saved, migratedTemplate);
      if (sourceStorageKey !== STORAGE_KEY) migratedLegacyStorageKey = sourceStorageKey;
      return clone(templateDocuments[migratedTemplate]);
    } catch (error) {
      return clone(templateDocuments.train);
    }
  }

  var IMAGE_ASSET_DB = "log-ticket-image-assets-v1";
  var IMAGE_ASSET_STORE = "images";
  function imageAssetBlockedError() {
    var error = new Error("Image storage access is blocked.");
    error.name = "SecurityError";
    return error;
  }
  function openImageAssetDb() {
    if (!window.indexedDB) return Promise.resolve(null);
    if (imageAssetDbPromise) return imageAssetDbPromise;
    imageAssetDbPromise = new Promise(function (resolve) {
      var request;
      try {
        request = window.indexedDB.open(IMAGE_ASSET_DB, 1);
      } catch (error) {
        imageAssetDbOpenError = error;
        resolve(null);
        return;
      }
      request.onupgradeneeded = function () {
        if (!request.result.objectStoreNames.contains(IMAGE_ASSET_STORE)) request.result.createObjectStore(IMAGE_ASSET_STORE, { keyPath: "id" });
      };
      request.onsuccess = function () {
        imageAssetDbOpenError = null;
        resolve(request.result);
      };
      request.onerror = function () {
        imageAssetDbOpenError = request.error || new Error("Image storage could not be opened.");
        resolve(null);
      };
      request.onblocked = function () {
        imageAssetDbOpenError = imageAssetBlockedError();
        resolve(null);
      };
    });
    return imageAssetDbPromise;
  }
  function imageBlockAssetId(template, key) { return template + ":block:" + key; }
  function imageCustomAssetId(template, side, id) { return template + ":custom:" + side + ":" + id; }
  function writeImageAssetRecord(record) {
    return openImageAssetDb().then(function (db) {
      if (!db || !record || !record.data) {
        return { saved: false, error: imageAssetDbOpenError || new Error("Image data is unavailable.") };
      }
      return new Promise(function (resolve) {
        var transaction;
        var request;
        var failure = null;
        try {
          transaction = db.transaction(IMAGE_ASSET_STORE, "readwrite");
          request = transaction.objectStore(IMAGE_ASSET_STORE).put(record);
        } catch (error) {
          resolve({ saved: false, error: error });
          return;
        }
        request.onerror = function () { failure = request.error || failure; };
        transaction.oncomplete = function () {
          imageAssetDbOpenError = null;
          resolve({ saved: true, error: null });
        };
        transaction.onerror = transaction.onabort = function () {
          resolve({ saved: false, error: failure || transaction.error || new Error("Image data could not be saved.") });
        };
      });
    });
  }
  function putImageAsset(record) {
    return writeImageAssetRecord(record).then(function (result) { return result.saved === true; });
  }
  function deleteImageAsset(id) {
    return openImageAssetDb().then(function (db) {
      if (!db || !id) return false;
      return new Promise(function (resolve) {
        var transaction = db.transaction(IMAGE_ASSET_STORE, "readwrite");
        transaction.objectStore(IMAGE_ASSET_STORE).delete(id);
        transaction.oncomplete = function () { resolve(true); };
        transaction.onerror = transaction.onabort = function () { resolve(false); };
      });
    });
  }
  function readImageAssets() {
    return openImageAssetDb().then(function (db) {
      if (!db) return [];
      return new Promise(function (resolve) {
        var request = db.transaction(IMAGE_ASSET_STORE, "readonly").objectStore(IMAGE_ASSET_STORE).getAll();
        request.onsuccess = function () {
          imageAssetDbOpenError = null;
          resolve(Array.isArray(request.result) ? request.result : []);
        };
        request.onerror = function () {
          imageAssetDbOpenError = request.error || new Error("Image storage could not be read.");
          resolve([]);
        };
      });
    });
  }
  function imageAssetSaveError(cause) {
    var error = new Error("이미지 저장소에 자동 저장하지 못했습니다.");
    error.name = "ImageAssetSaveError";
    if (cause) {
      error.originalError = cause;
      var kind = autoSaveStorageErrorKind(cause);
      error.storageKind = kind === "quota" || kind === "security" ? kind : "image";
    } else {
      error.storageKind = "image";
    }
    return error;
  }
  function persistPresentImageAssets(documents) {
    if (!window.indexedDB) return Promise.reject(imageAssetSaveError(imageAssetBlockedError()));
    var tasks = [];
    var missingAssetData = false;
    Object.keys(documents || {}).forEach(function (template) {
      var documentState = documents[template];
      Object.keys(documentState.blocks || {}).forEach(function (key) {
        var block = documentState.blocks[key];
        if (!block) return;
        if (!block.imageData) {
          if (blockReferencesImageAsset(template, key, block)) missingAssetData = true;
          return;
        }
        var bundledTrainLogo = template === "train" && key === "frontStub"
          && block.imageData === window.LOG_TICKET_TRAIN_LOGO_ASSET
          && block.imageAssetStored !== true
          && block.imageName === "train-travel-logo-v4.png";
        if (bundledTrainLogo) return;
        tasks.push(writeImageAssetRecord({
          id: imageBlockAssetId(template, key), data: block.imageData,
          name: block.imageName || "", type: block.imageType || "", tintMode: block.tintMode || "none"
        }));
      });
      ["front", "back"].forEach(function (side) {
        ((documentState.customLayers || {})[side] || []).forEach(function (item) {
          if (!customLayerCanStoreImage(item) || item.type === "shape" && item.fillMode !== "image") return;
          if (!item.imageData) {
            if (metadataReferencesImageAsset(item)) missingAssetData = true;
            return;
          }
          tasks.push(writeImageAssetRecord({
            id: imageCustomAssetId(template, side, item.id), data: item.imageData,
            name: item.imageName || "", type: item.imageType || ""
          }));
        });
      });
    });
    if (missingAssetData) return Promise.reject(imageAssetSaveError(imageAssetDbOpenError));
    return Promise.all(tasks).then(function (results) {
      var failed = results.find(function (result) { return !result || result.saved !== true; });
      if (failed) throw imageAssetSaveError(failed.error);
      return results.length;
    }, function (error) {
      if (error && error.name === "ImageAssetSaveError") throw error;
      throw imageAssetSaveError(error);
    });
  }
  function metadataReferencesImageAsset(item) {
    if (!item) return false;
    if (item.imageAssetStored === true) return true;
    if (item.imageAssetStored === false) return false;
    return Boolean(item.imageName || item.imageType);
  }
  function blockReferencesImageAsset(template, key, block) {
    if (template === "train" && key === "frontStub" && block && block.imageAssetStored !== true
      && block.imageName === "train-travel-logo-v4.png") return false;
    return metadataReferencesImageAsset(block);
  }
  function collectActiveImageAssetIds(documents) {
    var activeIds = {};
    Object.keys(documents || {}).forEach(function (template) {
      var documentState = documents[template] || {};
      Object.keys(documentState.blocks || {}).forEach(function (key) {
        var block = documentState.blocks[key];
        if (!block) return;
        var bundledTrainLogo = template === "train" && key === "frontStub"
          && block.imageData === window.LOG_TICKET_TRAIN_LOGO_ASSET
          && block.imageAssetStored !== true;
        if (!bundledTrainLogo && (block.imageData || blockReferencesImageAsset(template, key, block))) {
          activeIds[imageBlockAssetId(template, key)] = true;
        }
      });
      ["front", "back"].forEach(function (side) {
        (((documentState.customLayers || {})[side]) || []).forEach(function (item) {
          if (!customLayerCanStoreImage(item) || item.type === "shape" && item.fillMode !== "image") return;
          if (item.imageData || metadataReferencesImageAsset(item)) {
            activeIds[imageCustomAssetId(template, side, item.id)] = true;
          }
        });
      });
    });
    return activeIds;
  }
  function pruneOrphanImageAssets(activeIds, isCurrentSave) {
    if (!window.indexedDB) return Promise.resolve({ removed: 0, stale: false });
    return openImageAssetDb().then(function (db) {
      if (!db) throw imageAssetSaveError(imageAssetDbOpenError);
      return new Promise(function (resolve, reject) {
        var transaction;
        var request;
        var removed = 0;
        var stale = false;
        var failure = null;
        try {
          transaction = db.transaction(IMAGE_ASSET_STORE, "readwrite");
          request = transaction.objectStore(IMAGE_ASSET_STORE).openCursor();
        } catch (error) {
          reject(imageAssetSaveError(error));
          return;
        }
        request.onsuccess = function () {
          var cursor = request.result;
          if (!cursor) return;
          if (typeof isCurrentSave === "function" && !isCurrentSave()) {
            stale = true;
            transaction.abort();
            return;
          }
          if (!activeIds || !activeIds[cursor.key]) {
            try {
              cursor.delete();
              removed++;
            } catch (error) {
              failure = error;
              transaction.abort();
              return;
            }
          }
          cursor.continue();
        };
        request.onerror = function () { failure = request.error || failure; };
        transaction.oncomplete = function () { resolve({ removed: removed, stale: false }); };
        transaction.onabort = function () {
          if (stale) resolve({ removed: 0, stale: true });
          else reject(imageAssetSaveError(failure || transaction.error));
        };
        transaction.onerror = function () { failure = transaction.error || failure; };
      });
    });
  }
  function hydrateDocumentImageAssets(documentState, template, records) {
    if (!documentState) return 0;
    var restored = 0;
    Object.keys(documentState.blocks || {}).forEach(function (key) {
      var block = documentState.blocks[key];
      var record = records[imageBlockAssetId(template, key)];
      if (!record && template === "postcard" && key === "backStub") record = records[imageBlockAssetId(template, "frontStub")];
      if (!block || block.imageData || !blockReferencesImageAsset(template, key, block) || !record || !record.data) return;
      block.imageData = record.data;
      block.imageAssetStored = true;
      block.imageName = block.imageName || record.name || "";
      block.imageType = block.imageType || record.type || "";
      if (!block.tintMode && record.tintMode) block.tintMode = record.tintMode;
      restored++;
    });
    ["front", "back"].forEach(function (side) {
      (((documentState.customLayers || {})[side]) || []).forEach(function (item) {
        var record = item && records[imageCustomAssetId(template, side, item.id)];
        if (!customLayerCanStoreImage(item) || item.type === "shape" && item.fillMode !== "image"
          || item.imageData || !metadataReferencesImageAsset(item) || !record || !record.data) return;
        item.imageData = record.data;
        item.imageAssetStored = true;
        item.imageName = item.imageName || record.name || "";
        item.imageType = item.imageType || record.type || "";
        restored++;
      });
    });
    return restored;
  }
  function hydrateImageAssets() {
    return readImageAssets().then(function (items) {
      var records = {};
      items.forEach(function (item) { if (item && item.id) records[item.id] = item; });
      var restored = 0;
      TEMPLATE_IDS.forEach(function (template) {
        restored += hydrateDocumentImageAssets(templateDocuments[template], template, records);
      });
      restored += hydrateDocumentImageAssets(state, state.template, records);
      return restored;
    });
  }
  function clearTemplateImageAssets(template) {
    return readImageAssets().then(function (items) {
      return Promise.all(items.filter(function (item) { return item && item.id && item.id.indexOf(template + ":") === 0; })
        .map(function (item) { return deleteImageAsset(item.id); }));
    });
  }

  /* System fonts stay on the user's computer. Only a small, encoded descriptor
     is kept in the document; the browser resolves the installed face via local(). */
  function systemFontMetaValue(value) {
    return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 180);
  }
  function encodeSystemFontKey(font) {
    var meta = {
      p: systemFontMetaValue(font && font.postscriptName),
      n: systemFontMetaValue(font && font.fullName),
      f: systemFontMetaValue(font && font.family),
      s: systemFontMetaValue(font && font.style)
    };
    if (!meta.p && !meta.n && !meta.f) return "";
    var json = JSON.stringify(meta);
    var bytes = typeof TextEncoder === "function" ? new TextEncoder().encode(json) : null;
    var binary = bytes ? Array.prototype.map.call(bytes, function (byte) { return String.fromCharCode(byte); }).join("") : unescape(encodeURIComponent(json));
    return "system:" + window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  function decodeSystemFontKey(key) {
    if (!isSystemFontKey(key)) return null;
    try {
      var payload = String(key).slice(7).replace(/-/g, "+").replace(/_/g, "/");
      while (payload.length % 4) payload += "=";
      var binary = window.atob(payload);
      var bytes = Uint8Array.from(binary, function (character) { return character.charCodeAt(0); });
      var json = typeof TextDecoder === "function" ? new TextDecoder().decode(bytes) : decodeURIComponent(escape(binary));
      var parsed = JSON.parse(json);
      var meta = {
        postscriptName: systemFontMetaValue(parsed.p),
        fullName: systemFontMetaValue(parsed.n),
        family: systemFontMetaValue(parsed.f),
        style: systemFontMetaValue(parsed.s)
      };
      return meta.postscriptName || meta.fullName || meta.family ? meta : null;
    } catch (ignore) { return null; }
  }
  function cssSystemFontString(value) {
    return systemFontMetaValue(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }
  function systemFontDisplayName(meta) {
    if (!meta) return "시스템 글꼴";
    var name = meta.fullName || meta.family || meta.postscriptName || "시스템 글꼴";
    return meta.style && name.toLowerCase().indexOf(meta.style.toLowerCase()) < 0 ? name + " · " + meta.style : name;
  }
  function systemFontPreviewFamily(meta) {
    var names = meta ? [meta.postscriptName, meta.fullName, meta.family] : [];
    names = names.filter(function (value, index, values) { return value && values.indexOf(value) === index; });
    return names.map(function (value) { return '"' + cssSystemFontString(value) + '"'; }).concat(["sans-serif"]).join(", ");
  }
  function registerSystemFontKey(key) {
    var meta = decodeSystemFontKey(key);
    if (!meta) return false;
    systemFontRecords[key] = meta;
    return true;
  }
  function rebuildSystemFontFaceStyles() {
    var style = $("#systemFontFaceStyles");
    if (!style) {
      style = document.createElement("style");
      style.id = "systemFontFaceStyles";
      document.head.appendChild(style);
    }
    style.textContent = Object.keys(systemFontRecords).map(function (key) {
      var meta = systemFontRecords[key];
      var sources = [meta.postscriptName, meta.fullName, meta.family].filter(function (value, index, values) {
        return value && values.indexOf(value) === index;
      }).map(function (value) { return 'local("' + cssSystemFontString(value) + '")'; });
      return sources.length ? '@font-face{font-family:"' + systemFontAlias(key) + '";src:' + sources.join(",") + ';font-style:normal;font-weight:400;font-display:block;}' : "";
    }).join("\n");
  }
  function hydrateSystemFontRecords() {
    var seen = [];
    function visit(value) {
      if (typeof value === "string") {
        if (isSystemFontKey(value)) registerSystemFontKey(value);
        return;
      }
      if (!value || typeof value !== "object" || seen.indexOf(value) >= 0) return;
      seen.push(value);
      Object.keys(value).forEach(function (key) { visit(value[key]); });
    }
    visit(state);
    visit(templateDocuments);
    rebuildSystemFontFaceStyles();
  }
  function currentFontKeyForTarget(target) {
    if (target === "layer") {
      var sharedCustom = activeCustomLayer();
      if (sharedCustom && sharedCustom.type === "text") {
        return trackedInlineStyleValue("custom", "fontFamily", sharedCustom.font || "");
      }
      var selectedStyle = TEXT_LAYER_KEYS.indexOf(state.selectedLayer) >= 0 ? layerStyleEntry(state.side, state.selectedLayer, false) : null;
      var selectedFont = selectedStyle && selectedStyle.fontFamily || "";
      return trackedInlineStyleValue("native", "fontFamily", selectedFont);
    }
    if (target === "custom") {
      var custom = activeCustomLayer();
      var customFont = custom && custom.type === "text" ? custom.font || "" : "";
      return trackedInlineStyleValue("custom", "fontFamily", customFont);
    }
    return state.font || "";
  }
  function selectFontSourceTab(target, source) {
    var resolved = source === "system" ? "system" : "app";
    $$('[data-font-tabs="' + target + '"] [data-font-tab]').forEach(function (button) {
      var selected = button.dataset.fontTab === resolved;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });
    $$('[data-font-panel][data-font-target="' + target + '"]').forEach(function (panel) {
      panel.hidden = panel.dataset.fontPanel !== resolved;
    });
  }
  function syncFontSourceTab(target, key) {
    selectFontSourceTab(target, isSystemFontKey(key) ? "system" : "app");
    var select = $('[data-system-font-select="' + target + '"]');
    if (!isSystemFontKey(key)) {
      /* A native select does not emit change when its already-selected option
         is chosen again. Clear a system-font value inherited from the
         previously inspected layer so the same font remains directly
         selectable on this app-font/default-font layer. */
      if (select) {
        select.value = "";
        select.style.removeProperty("font-family");
      }
      return;
    }
    registerSystemFontKey(key);
    rebuildSystemFontFaceStyles();
    if (!select) return;
    if (!Array.prototype.some.call(select.options, function (option) { return option.value === key; })) {
      var meta = systemFontRecords[key];
      var option = document.createElement("option");
      option.value = key;
      option.textContent = systemFontDisplayName(meta);
      option.style.fontFamily = fontFamilyForKey(key);
      select.appendChild(option);
    }
    select.hidden = false;
    select.value = key;
    select.style.fontFamily = fontFamilyForKey(key);
  }
  function setSystemFontStatus(target, message, stateName) {
    var node = $('[data-system-font-status="' + target + '"]');
    if (!node) return;
    node.textContent = message;
    if (stateName) node.dataset.state = stateName;
    else delete node.dataset.state;
  }
  function populateSystemFontOptions(fonts) {
    var keyed = {};
    (fonts || []).forEach(function (font) {
      var key = encodeSystemFontKey(font);
      if (key && !keyed[key]) keyed[key] = decodeSystemFontKey(key);
    });
    var entries = Object.keys(keyed).map(function (key) { return { key: key, meta: keyed[key] }; }).sort(function (a, b) {
      return systemFontDisplayName(a.meta).localeCompare(systemFontDisplayName(b.meta), undefined, { numeric: true });
    });
    $$('[data-system-font-select]').forEach(function (select) {
      var target = select.dataset.systemFontSelect || "global";
      var activeKey = currentFontKeyForTarget(target);
      while (select.options.length > 1) select.remove(1);
      entries.forEach(function (entry) {
        var option = document.createElement("option");
        option.value = entry.key;
        option.textContent = systemFontDisplayName(entry.meta);
        option.style.fontFamily = systemFontPreviewFamily(entry.meta);
        select.appendChild(option);
      });
      select.hidden = false;
      if (isSystemFontKey(activeKey)) {
        if (!keyed[activeKey]) {
          registerSystemFontKey(activeKey);
          var activeOption = document.createElement("option");
          activeOption.value = activeKey;
          activeOption.textContent = systemFontDisplayName(systemFontRecords[activeKey]);
          activeOption.style.fontFamily = fontFamilyForKey(activeKey);
          select.appendChild(activeOption);
        }
        select.value = activeKey;
        select.style.fontFamily = fontFamilyForKey(activeKey);
      }
    });
    return entries.length;
  }
  async function browseSystemFonts(target) {
    if (typeof window.queryLocalFonts !== "function") {
      setSystemFontStatus(target, "이 브라우저에서는 시스템 글꼴 목록을 지원하지 않습니다. 데스크톱 Chrome 또는 Edge에서 열어 주세요.", "error");
      return;
    }
    setSystemFontStatus(target, "컴퓨터에 설치된 글꼴을 확인하는 중입니다…");
    try {
      var fontsRequest = window.queryLocalFonts();
      var fonts = await fontsRequest;
      var count = populateSystemFontOptions(fonts);
      systemFontPermissionLoaded = true;
      $$('[data-system-font-status]').forEach(function (node) {
        node.textContent = count ? count + "개의 시스템 글꼴을 찾았습니다. 목록의 글꼴 이름도 실제 글꼴로 표시됩니다." : "사용 가능한 시스템 글꼴을 찾지 못했습니다.";
        node.dataset.state = count ? "ready" : "error";
      });
    } catch (error) {
      var denied = error && (error.name === "NotAllowedError" || error.name === "SecurityError");
      setSystemFontStatus(target, denied ? "시스템 글꼴 권한이 필요합니다. 브라우저의 사이트 권한에서 로컬 글꼴 접근을 허용해 주세요." : "시스템 글꼴을 불러오지 못했습니다. 보안 연결과 브라우저 지원 여부를 확인해 주세요.", "error");
    }
  }
  function applySystemFontToTarget(key, target) {
    if (!isSystemFontKey(key) || !registerSystemFontKey(key)) return;
    rebuildSystemFontFaceStyles();
    if (target === "layer") {
      var sharedCustom = activeCustomLayer();
      if (sharedCustom && sharedCustom.type === "text") {
        if (trackedTextSelectionMatches("custom")) {
          commit(function () { applyInlineStyleToTrackedSelection({ fontFamily: key }); });
          return;
        }
        commit(function () {
          removeCustomInlineStyleProperty(sharedCustom, "fontFamily");
          sharedCustom.font = key;
          (sharedCustom.styledRuns || []).forEach(function (run) { run.fontFamily = fontFamilyForKey(key); });
        });
        return;
      }
      if (TEXT_LAYER_KEYS.indexOf(state.selectedLayer) < 0) { showToast("먼저 텍스트 레이어를 선택해 주세요."); return; }
      if (trackedTextSelectionMatches("native")) {
        commit(function () { applyInlineStyleToTrackedSelection({ fontFamily: key }); });
        return;
      }
      commit(function () {
        removeNativeInlineStyleProperty(state.side, state.selectedLayer, "fontFamily");
        layerStyleEntry(state.side, state.selectedLayer, true).fontFamily = key;
      });
      return;
    }
    if (target === "custom") {
      var custom = activeCustomLayer();
      if (!custom || custom.type !== "text") { showToast("먼저 사용자 텍스트를 선택해 주세요."); return; }
      if (trackedTextSelectionMatches("custom")) {
        commit(function () { applyInlineStyleToTrackedSelection({ fontFamily: key }); });
        return;
      }
      commit(function () {
        removeCustomInlineStyleProperty(custom, "fontFamily");
        custom.font = key;
        (custom.styledRuns || []).forEach(function (run) { run.fontFamily = fontFamilyForKey(key); });
      });
      return;
    }
    commit(function () { state.font = key; });
  }
  async function ensureReferencedSystemFontsLoaded() {
    hydrateSystemFontRecords();
    if (!document.fonts) return;
    await Promise.all(Object.keys(systemFontRecords).map(function (key) {
      return document.fonts.load('16px "' + systemFontAlias(key) + '"').catch(function () { return []; });
    }));
  }

  function removeImageDataFromDocuments(documents) {
    Object.keys(documents || {}).forEach(function (template) {
      var documentState = documents[template];
      Object.keys(documentState.blocks || {}).forEach(function (key) {
        var block = documentState.blocks[key];
        var bundledTrainLogo = template === "train" && key === "frontStub"
          && block.imageData === window.LOG_TICKET_TRAIN_LOGO_ASSET
          && block.imageAssetStored !== true
          && block.imageName === "train-travel-logo-v4.png";
        block.imageAssetStored = Boolean(!bundledTrainLogo && (block.imageData
          || block.imageAssetStored === true && (block.imageName || block.imageType)));
        delete block.imageData;
      });
      ["front", "back"].forEach(function (side) {
        (((documentState.customLayers || {})[side]) || []).forEach(function (item) {
          if (!customLayerCanStoreImage(item)) return;
          item.imageAssetStored = Boolean((item.type !== "shape" || item.fillMode === "image")
            && (item.imageData || item.imageAssetStored === true && (item.imageName || item.imageType)));
          delete item.imageData;
        });
      });
    });
    return documents;
  }

  function statePackage(lightweight) {
    var documents = {};
    TEMPLATE_IDS.forEach(function (template) {
      documents[template] = clone(state.template === template ? state : templateDocuments[template]);
    });
    Object.keys(documents).forEach(function (template) {
      documents[template].placements = normalizePlacements(documents[template].placements);
    });
    if (lightweight) removeImageDataFromDocuments(documents);
    return { version: DESIGN_VERSION, activeTemplate: state.template, documents: documents };
  }

  function setAutoSaveState(requestId, message) {
    if (requestId === saveRequestId) $("#saveState").textContent = message;
  }
  function autoSaveStorageErrorKind(error) {
    var name = String(error && error.name || "");
    var code = Number(error && error.code);
    if (name === "ImageAssetSaveError") {
      if (error.storageKind) return error.storageKind;
      if (error.originalError) return autoSaveStorageErrorKind(error.originalError);
      return "image";
    }
    if (name === "SecurityError" || name === "NotAllowedError") return "security";
    if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED" || code === 22 || code === 1014) {
      return "quota";
    }
    return "storage";
  }
  function localStorageFailureMessage(error) {
    var kind = autoSaveStorageErrorKind(error);
    if (kind === "security") return "자동 저장 실패: 저장소 접근이 차단됨";
    if (kind === "quota") return "자동 저장 실패: 저장 공간 부족";
    if (kind === "image") return "자동 저장 실패: 이미지 저장소 오류";
    return "자동 저장 실패: 브라우저 저장소 오류";
  }
  function verifyAutoSaveSnapshot(serialized) {
    if (localStorage.getItem(STORAGE_KEY) !== serialized) {
      var error = new Error("The current autosave snapshot could not be verified.");
      error.name = "StorageVerificationError";
      throw error;
    }
    return true;
  }
  function writeAutoSaveSnapshot(serialized) {
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      verifyAutoSaveSnapshot(serialized);
      return { recoveredFromLegacyQuota: false, verified: true };
    } catch (error) {
      if (autoSaveStorageErrorKind(error) !== "quota" || !migratedLegacyStorageKey) throw error;
    }
    /* Replacing the loaded legacy value with the same current lightweight
       snapshot frees its embedded Base64 without risking the only recovery
       copy. Do not remove any legacy key until the current key is durable. */
    localStorage.setItem(migratedLegacyStorageKey, serialized);
    localStorage.setItem(STORAGE_KEY, serialized);
    verifyAutoSaveSnapshot(serialized);
    return { recoveredFromLegacyQuota: true, verified: true };
  }
  function cleanupLegacyStorageKeys() {
    var cleanupComplete = true;
    LEGACY_STORAGE_KEYS.forEach(function (key) {
      try { localStorage.removeItem(key); } catch (ignore) { cleanupComplete = false; }
    });
    if (cleanupComplete) migratedLegacyStorageKey = "";
  }

  function scheduleSave() {
    if (suspendAutoSave) return;
    clearTimeout(saveTimer);
    var requestId = ++saveRequestId;
    if (!imageAssetsReady) {
      imageAssetHydrationPromise.then(function () {
        if (requestId === saveRequestId) scheduleSave();
      });
      return;
    }
    saveTimer = setTimeout(async function () {
      if (requestId !== saveRequestId) return;
      var packageSnapshot;
      try {
        templateDocuments[state.template] = clone(state);
        packageSnapshot = statePackage(false);
      } catch (error) {
        setAutoSaveState(requestId, "자동 저장 실패: 데이터 직렬화 오류");
        return;
      }
      try {
        await persistPresentImageAssets(packageSnapshot.documents);
      } catch (error) {
        setAutoSaveState(requestId, localStorageFailureMessage(error));
        return;
      }
      if (requestId !== saveRequestId) return;
      var activeImageAssetIds = collectActiveImageAssetIds(packageSnapshot.documents);
      removeImageDataFromDocuments(packageSnapshot.documents);
      var serialized;
      try {
        serialized = JSON.stringify(packageSnapshot);
        if (typeof serialized !== "string") throw new TypeError("자동 저장 패키지를 직렬화하지 못했습니다.");
      } catch (error) {
        setAutoSaveState(requestId, "자동 저장 실패: 데이터 직렬화 오류");
        return;
      }
      try {
        writeAutoSaveSnapshot(serialized);
      } catch (error) {
        setAutoSaveState(requestId, localStorageFailureMessage(error));
        return;
      }
      cleanupLegacyStorageKeys();
      try {
        var pruneResult = await pruneOrphanImageAssets(
          activeImageAssetIds,
          function () { return requestId === saveRequestId; }
        );
        if (pruneResult.stale || requestId !== saveRequestId) return;
      } catch (error) {
        setAutoSaveState(requestId, localStorageFailureMessage(error));
        return;
      }
      setAutoSaveState(requestId, new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) + " 자동 저장");
    }, 320);
  }

  function showToast(message) {
    var node = $("#toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.remove("show"); }, 2200);
  }

  function commit(change) {
    history.push(clone(state));
    if (history.length > 40) history.shift();
    future = [];
    change();
    render();
  }
  function startEdit() { if (!editSnapshot) editSnapshot = clone(state); }
  function finishEdit() {
    if (editSnapshot && JSON.stringify(editSnapshot) !== JSON.stringify(state)) {
      history.push(editSnapshot);
      if (history.length > 40) history.shift();
      future = [];
    }
    editSnapshot = null;
    if (!suppressFinishEditRender) render();
  }
  function undo() {
    if (!history.length || flipPhase) return;
    editSnapshot = null;
    drag = null;
    future.unshift(clone(state));
    state = history.pop();
    trackedTextSelection = null;
    render();
  }
  function redo() {
    if (!future.length || flipPhase) return;
    editSnapshot = null;
    drag = null;
    history.push(clone(state));
    state = future.shift();
    trackedTextSelection = null;
    render();
  }

  function activeLayout() { return state.layouts[state.side]; }
  function activeEffectTarget() {
    var custom = activeCustomLayer();
    if (customLayerUsesRasterFill(custom)) return custom;
    if (selectedImageLayer()) return activeBlock();
    return null;
  }
  function activeEffect() {
    var target = activeEffectTarget();
    if (!target) return null;
    if (!target.effect) target.effect = defaultEffect();
    return target.effect;
  }
  function placementFor(side, layer) {
    var canonicalSide = canonicalTrainCouponSide(side, layer, state);
    return state.placements && state.placements[canonicalSide] && state.placements[canonicalSide][layer]
      ? state.placements[canonicalSide][layer]
      : { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, boxW: 0, boxH: 0, boxMode: "width", skewX: 0 };
  }
  function legacyCompositeTransformSource(side, layer) {
    var splitMap = compositeTextSplitMap(state.template);
    var canonicalSide = canonicalTrainCouponSide(side, layer, state);
    var stores = state.legacyCompositeTransforms || {};
    var sideStore = stores[side] || {};
    var canonicalStore = stores[canonicalSide] || {};
    return Object.keys(splitMap).find(function (sourceKey) {
      return (sideStore[sourceKey] === true || canonicalStore[sourceKey] === true)
        && (layer === sourceKey || splitMap[sourceKey].indexOf(layer) >= 0);
    }) || "";
  }
  function legacyCompositeTransformOrigin(node, side, layer) {
    var sourceKey = legacyCompositeTransformSource(side, layer);
    var parent = sourceKey && node.parentElement;
    if (!parent) return "";
    var sourceNode = Array.prototype.find.call(parent.children, function (child) {
      return child.dataset && child.dataset.canvasLayer === sourceKey;
    });
    if (!sourceNode) return "";
    var directLayers = Array.prototype.filter.call(parent.children, function (child) {
      return child.dataset && child.dataset.canvasLayer;
    });
    var nodeOffset = elementOffsetInside(node, parent);
    var pivotX = parent.clientWidth / 2;
    var pivotY = parent.clientHeight / 2;
    if (directLayers.length > 2) {
      var sourceOffset = elementOffsetInside(sourceNode, parent);
      pivotX = sourceOffset.x + sourceNode.offsetWidth / 2;
      pivotY = sourceOffset.y + sourceNode.offsetHeight / 2;
    }
    return (pivotX - nodeOffset.x).toFixed(2) + "px " + (pivotY - nodeOffset.y).toFixed(2) + "px";
  }
  function clearLegacyCompositeTransformMarker(side, sourceKey) {
    var stores = state.legacyCompositeTransforms || {};
    var canonicalSide = canonicalTrainCouponSide(side, sourceKey, state);
    [side, canonicalSide].forEach(function (storeSide) {
      if (stores[storeSide] && stores[storeSide][sourceKey]) delete stores[storeSide][sourceKey];
    });
  }
  function resetLegacyCompositeTransformsForSide(side) {
    var splitMap = compositeTextSplitMap(state.template);
    Object.keys(splitMap).forEach(function (sourceKey) {
      var canonicalSide = canonicalTrainCouponSide(side, sourceKey, state);
      clearLegacyCompositeTransformMarker(side, sourceKey);
      if (canonicalSide !== side && state.placements && state.placements[canonicalSide]) {
        [sourceKey].concat(splitMap[sourceKey] || []).forEach(function (key) {
          delete state.placements[canonicalSide][key];
        });
      }
    });
  }
  function materializeLegacyCompositeTransform(side, layer) {
    var sourceKey = legacyCompositeTransformSource(side, layer);
    if (!sourceKey) return false;
    var splitMap = compositeTextSplitMap(state.template);
    var groupKeys = [sourceKey].concat(splitMap[sourceKey] || []);
    var face = side === "back" ? backFace : frontFace;
    var records = groupKeys.map(function (key) {
      var node = face && face.querySelector('[data-canvas-layer="' + key + '"]');
      return node ? {
        key: key,
        node: node,
        hidden: node.classList.contains("hidden-layer"),
        unavailable: node.classList.contains("template-unavailable")
      } : null;
    });
    if (records.some(function (record) { return !record; })) return false;
    records.forEach(function (record) {
      record.node.classList.remove("hidden-layer", "template-unavailable");
    });
    try {
      var prepared = records.map(function (record) {
        var origin = legacyCompositeTransformOrigin(record.node, side, record.key).split(/\s+/).map(parseFloat);
        if (origin.length < 2 || !origin.every(Number.isFinite) || !record.node.offsetWidth || !record.node.offsetHeight) return null;
        return {
          key: record.key,
          originX: origin[0], originY: origin[1],
          centerX: record.node.offsetWidth / 2, centerY: record.node.offsetHeight / 2
        };
      });
      if (prepared.some(function (record) { return !record; })) return false;
      prepared.forEach(function (record) {
        var canonicalSide = canonicalTrainCouponSide(side, record.key, state);
        if (!state.placements) state.placements = defaultPlacements();
        if (!state.placements[canonicalSide]) state.placements[canonicalSide] = {};
        if (!state.placements[canonicalSide][record.key]) {
          state.placements[canonicalSide][record.key] = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, boxW: 0, boxH: 0, boxMode: "width", skewX: 0 };
        }
        rebaseLegacyCompositePlacement(
          state.placements[canonicalSide][record.key],
          record.originX, record.originY, record.centerX, record.centerY,
          ticket.offsetWidth, ticket.offsetHeight
        );
      });
      clearLegacyCompositeTransformMarker(side, sourceKey);
      return true;
    } finally {
      records.forEach(function (record) {
        record.node.classList.toggle("hidden-layer", record.hidden);
        record.node.classList.toggle("template-unavailable", record.unavailable);
      });
    }
  }
  function writablePlacementFor(side, layer) {
    materializeLegacyCompositeTransform(side, layer);
    side = canonicalTrainCouponSide(side, layer, state);
    if (!state.placements) state.placements = defaultPlacements();
    if (!state.placements[side]) state.placements[side] = {};
    if (!state.placements[side][layer]) state.placements[side][layer] = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, boxW: 0, boxH: 0, boxMode: "width", skewX: 0 };
    var placement = state.placements[side][layer];
    placement.scaleX = clamp(finiteNumber(placement.scaleX, 1), .1, MAX_NATIVE_OBJECT_SCALE);
    placement.scaleY = clamp(finiteNumber(placement.scaleY, 1), .1, MAX_NATIVE_OBJECT_SCALE);
    placement.rotation = clamp(finiteNumber(placement.rotation, 0), -360, 360);
    placement.boxW = clamp(finiteNumber(placement.boxW, 0), 0, MAX_TEXT_BOX_SIZE_PX);
    placement.boxH = clamp(finiteNumber(placement.boxH, 0), 0, MAX_TEXT_BOX_SIZE_PX);
    placement.boxMode = placement.boxMode === "height" || placement.boxMode === "area" ? "area" : "width";
    placement.skewX = clamp(finiteNumber(placement.skewX, 0), -70, 70);
    return state.placements[side][layer];
  }
  function snapMetric(value, event) {
    if (!state.snapToGrid || event && event.altKey) return Math.round(value * 100) / 100;
    return Math.round(value * 2) / 2;
  }
  function constrainedMoveMetric(start, delta, basis, event, axisLock, axis, smartMove) {
    if (event && event.shiftKey && !axisLock) return start;
    var locked = axis === "x" ? axisLock === "y" : axisLock === "x";
    if (locked) return start;
    if (smartMove && smartMove[axis === "x" ? "snappedX" : "snappedY"]) {
      return Math.round((start + smartMove[axis] / Math.max(1, basis) * 100) * 10000) / 10000;
    }
    return snapMetric(start + delta / Math.max(1, basis) * 100, event);
  }
  function normalizedRotation(value) {
    return ((finiteNumber(value, 0) % 360) + 360) % 360;
  }
  function blockKey(side, layer) {
    /* Railway paper is one physical stock across both faces. Keep the main
       surface color canonical on frontMain while leaving the two main image
       slots independent. The coupon already follows the same frontStub rule. */
    if (state.template === "train" && layer === "block-main") return "frontMain";
    if (state.template === "train" && (layer === "image-stub" || side === "back" && layer === "block-stub")) return "frontStub";
    return side + (layer === "block-main" || layer === "image-main" ? "Main" : "Stub");
  }
  function canonicalBlockColorKey(key, documentState) {
    var source = documentState || state;
    if (!source || source.template !== "train") return key;
    if (key === "backMain") return "frontMain";
    if (key === "backStub") return "frontStub";
    return key;
  }
  function blockColorForKey(key, documentState) {
    var source = documentState || state;
    var canonicalKey = canonicalBlockColorKey(key, source);
    var block = source && source.blocks && source.blocks[canonicalKey];
    return block && block.color || "#ffffff";
  }
  function setBlockColorForKey(key, color, documentState) {
    var source = documentState || state;
    if (!source || !source.blocks) return;
    var canonicalKey = canonicalBlockColorKey(key, source);
    if (source.blocks[canonicalKey]) source.blocks[canonicalKey].color = color;
    /* Retain mirrored schema fields so old JSON consumers remain compatible;
       all reads still go through the single canonical front-side value. */
    if (source.template === "train" && canonicalKey === "frontMain" && source.blocks.backMain) source.blocks.backMain.color = color;
    if (source.template === "train" && canonicalKey === "frontStub" && source.blocks.backStub) source.blocks.backStub.color = color;
  }
  function activeBlockKey() { return blockKey(state.side, state.selectedLayer); }
  function activeBlock() {
    if (["block-main", "block-stub", "image-main", "image-stub"].indexOf(state.selectedLayer) < 0) return null;
    return state.blocks[activeBlockKey()];
  }

  function selectedImageLayer() {
    return state.selectedLayer === "image-main" || state.selectedLayer === "image-stub";
  }

  function activeCustomLayer() { return customLayerById(state.selectedLayer); }
  function nextCustomLayerId() {
    customIdSequence += 1;
    return "custom-" + state.side + "-" + Date.now().toString(36) + "-" + customIdSequence.toString(36);
  }
  function defaultCustomLayer(type) {
    var count = (state.customLayers[state.side] || []).length;
    var offset = count % 8 * 2;
    return {
      id: nextCustomLayerId(), side: state.side, type: type,
      name: type === "image" ? "사용자 이미지 " + (count + 1) : type === "shape" ? "사용자 도형 " + (count + 1) : "사용자 텍스트 " + (count + 1),
      text: type === "text" ? "새 텍스트" : "", imageData: "", imageName: "", imageType: "",
      x: 12 + offset, y: 12 + offset, w: type === "text" ? 34 : 30, h: type === "text" ? 12 : 30,
      rotation: 0, skewX: 0, scaleX: 1, scaleY: 1, autoHeight: type === "text",
      font: state.font || "noto-serif", fontSize: 28, fontWeight: "400", fontStyle: "normal",
      lineHeight: "1.35", letterSpacing: "normal", textTransform: "none", whiteSpace: "pre-wrap",
      color: state.quoteColor || "#684b47", colorMode: "solid", opacity: 100, align: "left", writingMode: "horizontal-tb", fit: "contain",
      zoom: 1, panX: 0, panY: 0, effect: defaultEffect(), inlineTextStyles: [], typingStyle: {}, styledRuns: [], styledShapes: [], boxStyle: normalizeBoxStyle()
    };
  }
  function defaultCustomShape(kind) {
    var layer = defaultCustomLayer("shape");
    layer.shapeKind = ["rectangle", "ellipse", "triangle", "star"].indexOf(kind) >= 0 ? kind : "rectangle";
    layer.fillMode = "color";
    layer.fillColor = "#b87977";
    layer.cornerMode = "all";
    layer.cornerRadius = 0;
    layer.cornerRadii = Array(shapeCornerCount(layer.shapeKind)).fill(0);
    var names = { rectangle: "사각형", ellipse: "원 · 타원", triangle: "삼각형", star: "별" };
    layer.name = (names[layer.shapeKind] || "도형") + " " + ((state.customLayers[state.side] || []).length + 1);
    return layer;
  }
  function addCustomLayer(layer, copiedShadow) {
    if (!layer) return;
    if (!state.customLayers) state.customLayers = { front: [], back: [] };
    state.customLayers[layer.side].push(layer);
    var order = layerOrderFor(layer.side, state);
    if (order.indexOf(layer.id) < 0) order.push(layer.id);
    syncFlatLayerOrder(state);
    if (!state.sideShadows) state.sideShadows = { front: {}, back: {} };
    if (!state.sideShadows[layer.side]) state.sideShadows[layer.side] = {};
    state.sideShadows[layer.side][layer.id] = copiedShadow ? normalizeShadow(copiedShadow) : defaultShadow();
    state.selectedLayer = layer.id;
  }
  function purgeCustomLayer(id) {
    var layer = customLayerById(id);
    if (!layer) return false;
    if (customLayerCanStoreImage(layer)) deleteImageAsset(imageCustomAssetId(state.template, layer.side, layer.id));
    state.customLayers[layer.side] = state.customLayers[layer.side].filter(function (item) { return item.id !== id; });
    state.layerOrder = state.layerOrder.filter(function (key) { return key !== id; });
    if (state.layerOrders) ["front", "back"].forEach(function (side) {
      state.layerOrders[side] = (state.layerOrders[side] || []).filter(function (key) { return key !== id; });
    });
    syncFlatLayerOrder(state);
    state.hidden = state.hidden.filter(function (key) { return key !== id; });
    state.locked = state.locked.filter(function (key) { return key !== id; });
    state.clipping = (state.clipping || []).filter(function (key) { return key !== id; });
    delete state.shadows[id];
    if (state.sideShadows) ["front", "back"].forEach(function (side) { delete state.sideShadows[side][id]; });
    if (state.selectedLayer === id) {
      state.selectedLayer = "";
      trackedTextSelection = null;
    }
    return true;
  }
  function imageFileAllowed(file) {
    return Boolean(file && (/^(?:image\/(?:png|jpeg|webp|gif))$/i.test(file.type) || /\.(?:png|jpe?g|webp|gif)$/i.test(file.name || "")));
  }
  function readImageFile(file, done) {
    if (!imageFileAllowed(file)) { showToast("PNG, JPG, WebP, GIF 이미지만 사용할 수 있어요."); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = String(reader.result);
      loadDataImage(dataUrl).then(function (image) { done(dataUrl, image); }).catch(function () {
        showToast("이미지 크기를 확인하지 못했어요.");
      });
    };
    reader.onerror = function () { showToast("이미지 파일을 읽지 못했어요."); };
    reader.readAsDataURL(file);
  }

  function effectFilterString(effect, visible, pixelScale) {
    if (!visible || !effect) return "none";
    var scale = Math.max(.1, finiteNumber(pixelScale, 1));
    var filters = [];
    if (effect.blur) filters.push("blur(" + effect.blur * scale + "px)");
    if (effect.brightness !== 100) filters.push("brightness(" + effect.brightness + "%)");
    if (effect.saturation !== 100) filters.push("saturate(" + effect.saturation + "%)");
    if (effect.contrast !== 100) filters.push("contrast(" + effect.contrast + "%)");
    if (effect.hue) filters.push("hue-rotate(" + effect.hue + "deg)");
    if (effect.sepia) filters.push("sepia(" + effect.sepia + "%)");
    if (effect.grayscale) filters.push("grayscale(" + effect.grayscale + "%)");
    return filters.join(" ") || "none";
  }

  function setImageVignetteProperties(node, value) {
    if (!node) return;
    var amount = clamp(finiteNumber(value, 0), -100, 100);
    var strength = Math.abs(amount) / 100;
    node.style.setProperty("--image-vignette", strength);
    node.style.setProperty("--image-vignette-edge", amount > 0
      ? "rgba(255,255,255," + strength + ")"
      : "rgba(20,13,10," + strength + ")");
  }

  function drawImageVignette(canvas, effect) {
    var amount = clamp(finiteNumber(effect && effect.vignette, 0), -100, 100);
    var strength = Math.abs(amount) / 100;
    if (!strength) return;
    var edgeColor = amount > 0 ? "rgba(255,255,255,1)" : "rgba(20,13,10,1)";
    drawAlphaMaskedEffectLayer(canvas, function (layerContext, width, height) {
      var vignette = layerContext.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .22, width / 2, height / 2, Math.max(width, height) * .66);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(.58, "rgba(0,0,0,0)");
      vignette.addColorStop(1, edgeColor);
      layerContext.fillStyle = vignette;
      layerContext.fillRect(0, 0, width, height);
    }, "source-over", strength);
  }

  function applySnapshotBoxStyle(node, boxStyle) {
    var box = normalizeBoxStyle(boxStyle);
    node.style.background = box.background;
    node.style.borderTop = box.borderTop;
    node.style.borderRight = box.borderRight;
    node.style.borderBottom = box.borderBottom;
    node.style.borderLeft = box.borderLeft;
    node.style.borderRadius = box.borderRadius;
    node.style.boxShadow = box.boxShadow;
    node.style.clipPath = box.clipPath;
    node.style.overflow = box.overflow;
    node.style.transform = box.transform;
    node.style.rotate = box.rotate;
    node.style.transformOrigin = box.transformOrigin;
    node.style.mixBlendMode = box.mixBlendMode;
  }
  function appendStyledRun(node, run) {
    var span = document.createElement("span");
    span.className = "styled-clone-run";
    span.textContent = run.text;
    span.style.left = run.x + "%";
    span.style.top = run.y + "%";
    span.style.width = run.w + "%";
    span.style.height = run.h + "%";
    span.style.color = run.color;
    span.style.background = run.background;
    span.style.borderTop = run.borderTop;
    span.style.borderRight = run.borderRight;
    span.style.borderBottom = run.borderBottom;
    span.style.borderLeft = run.borderLeft;
    span.style.borderRadius = run.borderRadius;
    span.style.boxShadow = run.boxShadow;
    span.style.fontFamily = run.fontFamily;
    span.style.fontSize = run.fontSize + "px";
    span.style.fontWeight = run.fontWeight;
    span.style.fontStyle = run.fontStyle;
    span.style.lineHeight = run.lineHeight;
    span.style.letterSpacing = run.letterSpacing;
    span.style.textAlign = run.textAlign;
    span.style.textTransform = run.textTransform;
    span.style.whiteSpace = run.whiteSpace;
    span.style.display = run.display;
    span.style.alignItems = run.alignItems;
    span.style.justifyContent = run.justifyContent;
    span.style.justifyItems = run.justifyItems;
    span.style.transform = run.transform;
    span.style.transformOrigin = run.transformOrigin;
    span.style.opacity = run.opacity;
    node.appendChild(span);
  }
  function inlineStyleProperties(run, target, suppressColor) {
    if (!run) return;
    if (run.color && !suppressColor) target.style.setProperty("color", run.color, "important");
    if (run.fontFamily) target.style.setProperty("font-family", fontFamilyForKey(run.fontFamily), "important");
    if (run.fontSize != null) target.style.setProperty("font-size", run.fontSize + "px", "important");
    if (run.fontWeight) target.style.setProperty("font-weight", run.fontWeight, "important");
    if (run.fontStyle) target.style.setProperty("font-style", run.fontStyle, "important");
    if (run.letterSpacing != null) target.style.setProperty("letter-spacing", run.letterSpacing + "px", "important");
    if (run.lineHeight != null) target.style.setProperty("line-height", String(run.lineHeight), "important");
  }
  function appendInlineText(node, text, runs, suppressColor) {
    var textValue = String(text == null ? "" : text);
    var styles = normalizeInlineStyleRuns(runs, textValue.length);
    if (!styles.length) {
      node.textContent = textValue;
      return;
    }
    var boundaries = [0, textValue.length];
    styles.forEach(function (run) { boundaries.push(run.start, run.end); });
    boundaries = boundaries.filter(function (value, index, list) { return list.indexOf(value) === index; }).sort(function (a, b) { return a - b; });
    var fragment = document.createDocumentFragment();
    boundaries.slice(0, -1).forEach(function (start, index) {
      var end = boundaries[index + 1];
      if (end <= start) return;
      var active = styles.filter(function (run) { return run.start <= start && run.end >= end; });
      if (!active.length) {
        fragment.appendChild(document.createTextNode(textValue.slice(start, end)));
        return;
      }
      var span = document.createElement("span");
      span.className = "partial-text-run";
      span.textContent = textValue.slice(start, end);
      active.forEach(function (run) { inlineStyleProperties(run, span, suppressColor); });
      fragment.appendChild(span);
    });
    node.replaceChildren(fragment);
  }
  function renderDirectNativeInlineText(node, text, runs, suppressColor) {
    if (!node) return false;
    /* Several stock template leaves are flex/grid containers. Appending one
       span per style run directly to those leaves turns a single sentence
       into several flex/grid items, so alignment and wrapping change merely
       because a substring was styled. Keep the leaf's original layout role
       and expose exactly one flow item to it; run spans then remain ordinary
       inline text inside that item. The wrapper is also copied verbatim by
       the PNG export clone, keeping preview and export geometry identical. */
    var content = document.createElement("span");
    content.className = "native-inline-text-content";
    appendInlineText(content, text, runs, suppressColor);
    node.replaceChildren(content);
    return true;
  }
  function slicedInlineStyleRuns(runs, start, end, outputOffset) {
    var from = Math.max(0, Math.floor(finiteNumber(start, 0)));
    var to = Math.max(from, Math.floor(finiteNumber(end, from)));
    var offset = Math.max(0, Math.floor(finiteNumber(outputOffset, 0)));
    return normalizeInlineStyleRuns(runs, to).map(function (run) {
      var overlapStart = Math.max(from, run.start);
      var overlapEnd = Math.min(to, run.end);
      if (overlapEnd <= overlapStart) return null;
      var shifted = Object.assign({}, run);
      shifted.start = offset + overlapStart - from;
      shifted.end = offset + overlapEnd - from;
      return shifted;
    }).filter(Boolean);
  }
  function trimmedInlineSegment(value, runs) {
    var raw = String(value == null ? "" : value);
    var start = 0;
    var end = raw.length;
    while (start < end && /\s/.test(raw.charAt(start))) start++;
    while (end > start && /\s/.test(raw.charAt(end - 1))) end--;
    return { text: raw.slice(start, end), start: start, end: end, runs: slicedInlineStyleRuns(runs, start, end, 0) };
  }
  function cinemaKickerInlineSegments(value, runs) {
    var raw = String(value == null ? "" : value);
    var range = trimmedInlineSegment(raw, runs);
    var pieces = [];
    var delimiter = /\s*(?:\/|\||\u00b7|\u2014|\u2022)\s*/g;
    var cursor = range.start;
    var match;
    delimiter.lastIndex = range.start;
    function pushPiece(start, end) {
      while (start < end && /\s/.test(raw.charAt(start))) start++;
      while (end > start && /\s/.test(raw.charAt(end - 1))) end--;
      if (end <= start) return;
      pieces.push({ text: raw.slice(start, end), start: start, end: end, runs: slicedInlineStyleRuns(runs, start, end, 0) });
    }
    while ((match = delimiter.exec(raw)) && match.index < range.end) {
      pushPiece(cursor, match.index);
      cursor = match.index + match[0].length;
    }
    pushPiece(cursor, range.end);
    if (!pieces.length && range.text) pieces.push(range);
    return pieces;
  }
  function renderSpeakerInlineText(node, value, runs, suppressColor) {
    var textValue = String(value || "");
    var visibleValue = textValue || "이름 없음";
    var content = document.createElement("span");
    content.className = "native-inline-text-content speaker-inline-content";
    var valueNode = document.createElement("span");
    valueNode.className = "speaker-inline-value";
    appendInlineText(valueNode, visibleValue, textValue ? runs : [], suppressColor);
    content.appendChild(document.createTextNode("— "));
    content.appendChild(valueNode);
    node.replaceChildren(content);
  }
  function renderCinemaCastInlineText(node, fields, suppressColor) {
    var bot = trimmedInlineSegment(state.botName, fields && fields.botName);
    var persona = trimmedInlineSegment(state.personaName, fields && fields.personaName);
    var textValue = "";
    var combinedRuns = [];
    [bot, persona].forEach(function (segment) {
      if (!segment.text) return;
      if (textValue) textValue += "\n";
      var offset = textValue.length;
      textValue += segment.text;
      segment.runs.forEach(function (run) {
        combinedRuns.push(Object.assign({}, run, { start: run.start + offset, end: run.end + offset }));
      });
    });
    var content = document.createElement("span");
    content.className = "cinema-cast-inline";
    appendInlineText(content, textValue || "—", combinedRuns, suppressColor);
    node.replaceChildren(content);
  }
  function renderCinemaBackKickerInline(node, value, runs, suppressColor) {
    var pieces = cinemaKickerInlineSegments(value, runs);
    var left = document.createElement("span");
    var right = document.createElement("span");
    var first = pieces.shift();
    appendInlineText(left, first ? first.text : String(value || "").trim(), first ? first.runs : [], suppressColor);
    var rightText = "";
    var rightRuns = [];
    pieces.forEach(function (piece) {
      if (rightText) rightText += " ";
      var offset = rightText.length;
      rightText += piece.text;
      piece.runs.forEach(function (run) {
        rightRuns.push(Object.assign({}, run, { start: run.start + offset, end: run.end + offset }));
      });
    });
    appendInlineText(right, rightText, rightRuns, suppressColor);
    node.replaceChildren(left, right);
  }
  function appendStyledShape(node, shape) {
    var span = document.createElement("span");
    span.className = "styled-clone-shape";
    span.style.left = shape.x + "%";
    span.style.top = shape.y + "%";
    span.style.width = shape.w + "%";
    span.style.height = shape.h + "%";
    span.style.background = shape.background;
    span.style.borderTop = shape.borderTop;
    span.style.borderRight = shape.borderRight;
    span.style.borderBottom = shape.borderBottom;
    span.style.borderLeft = shape.borderLeft;
    span.style.borderRadius = shape.borderRadius;
    span.style.boxShadow = shape.boxShadow;
    span.style.opacity = shape.opacity;
    node.appendChild(span);
  }
  function shapeVertices(kind, width, height) {
    if (kind === "rectangle") return [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
    if (kind === "triangle") return [{ x: width / 2, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
    if (kind === "star") {
      var points = [];
      for (var index = 0; index < 10; index++) {
        var angle = -Math.PI / 2 + index * Math.PI / 5;
        var inner = index % 2 === 1;
        points.push({ x: width / 2 + Math.cos(angle) * width / 2 * (inner ? .45 : 1), y: height / 2 + Math.sin(angle) * height / 2 * (inner ? .45 : 1) });
      }
      return points;
    }
    return [];
  }
  function traceShapePath(context, item, width, height) {
    context.beginPath();
    if (item.shapeKind === "ellipse") {
      context.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      context.closePath();
      return;
    }
    var vertices = shapeVertices(item.shapeKind, width, height);
    if (!vertices.length) return;
    var radii = item.cornerMode === "individual" ? item.cornerRadii || [] : vertices.map(function () { return item.cornerRadius; });
    var entries = [];
    var exits = [];
    vertices.forEach(function (point, index) {
      var previous = vertices[(index + vertices.length - 1) % vertices.length];
      var next = vertices[(index + 1) % vertices.length];
      var previousLength = Math.hypot(previous.x - point.x, previous.y - point.y) || 1;
      var nextLength = Math.hypot(next.x - point.x, next.y - point.y) || 1;
      var distance = Math.min(clamp(finiteNumber(radii[index], item.cornerRadius), 0, 50) / 100 * Math.min(width, height), previousLength * .48, nextLength * .48);
      entries.push({ x: point.x + (previous.x - point.x) / previousLength * distance, y: point.y + (previous.y - point.y) / previousLength * distance });
      exits.push({ x: point.x + (next.x - point.x) / nextLength * distance, y: point.y + (next.y - point.y) / nextLength * distance });
    });
    context.moveTo(entries[0].x, entries[0].y);
    vertices.forEach(function (point, index) {
      context.quadraticCurveTo(point.x, point.y, exits[index].x, exits[index].y);
      var nextIndex = (index + 1) % vertices.length;
      context.lineTo(entries[nextIndex].x, entries[nextIndex].y);
    });
    context.closePath();
  }
  function paintCustomShape(canvas, image, item, renderScale) {
    var cssWidth = Math.max(1, canvas.parentElement.clientWidth || 1);
    var cssHeight = Math.max(1, canvas.parentElement.clientHeight || 1);
    /* Shapes are raster-backed even in the editor. A 1x canvas was visibly
       stair-stepped after small/large resizes, especially with image fills.
       Keep a 3x minimum preview backing store (up to 4x on dense displays),
       while the existing 4096/16MP budget still bounds memory. */
    var previewScale = Math.min(4, Math.max(3, (window.devicePixelRatio || 1) * 2));
    var requestedScale = Math.max(1, finiteNumber(renderScale, previewScale));
    var rawWidth = cssWidth * requestedScale;
    var rawHeight = cssHeight * requestedScale;
    var maxPixels = 4096 * 4096;
    var memoryScale = Math.min(1, 4096 / rawWidth, 4096 / rawHeight, Math.sqrt(maxPixels / Math.max(1, rawWidth * rawHeight)));
    var width = Math.max(1, Math.round(rawWidth * memoryScale));
    var height = Math.max(1, Math.round(rawHeight * memoryScale));
    var scale = Math.min(width / cssWidth, height / cssHeight);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    var context = canvas.getContext("2d", { alpha: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, width, height);
    context.save();
    traceShapePath(context, item, width, height);
    context.clip();
    if (item.fillMode === "image" && image && image.complete && image.naturalWidth) {
      var crop = calculateCrop(item, image.naturalWidth, image.naturalHeight, width, height, scale);
      var imageCanvas = document.createElement("canvas");
      imageCanvas.width = width;
      imageCanvas.height = height;
      var imageContext = imageCanvas.getContext("2d", { alpha: true });
      imageContext.imageSmoothingEnabled = true;
      imageContext.imageSmoothingQuality = "high";
      imageContext.filter = effectFilterString(item.effect || defaultEffect(), true, scale);
      imageContext.drawImage(image, crop.x, crop.y, crop.width, crop.height);
      var effect = item.effect || defaultEffect();
      drawAlphaMaskedEffectLayer(imageCanvas, function (layerContext, layerWidth, layerHeight) {
        layerContext.fillStyle = effect.overlayColor;
        layerContext.fillRect(0, 0, layerWidth, layerHeight);
      }, effect.overlayBlend === "normal" ? "source-over" : effect.overlayBlend, effect.overlay / 100);
      drawImageVignette(imageCanvas, effect);
      context.drawImage(imageCanvas, 0, 0);
      imageCanvas.width = 1;
      imageCanvas.height = 1;
    } else {
      context.fillStyle = item.fillColor || "#b87977";
      context.fillRect(0, 0, width, height);
    }
    context.restore();
  }
  function renderCustomLayers(renderScale) {
    ["front", "back"].forEach(function (side) {
      var face = side === "front" ? frontFace : backFace;
      var layers = state.customLayers && state.customLayers[side] ? state.customLayers[side] : [];
      var valid = layers.map(function (item) { return item.id; });
      Array.prototype.slice.call(face.querySelectorAll(".custom-layer-object")).forEach(function (node) {
        if (valid.indexOf(node.dataset.canvasLayer) < 0) node.remove();
      });
      layers.forEach(function (item) {
        var node = face.querySelector('[data-canvas-layer="' + item.id + '"]');
        if (!node) {
          node = document.createElement("div");
          node.dataset.canvasLayer = item.id;
          face.appendChild(node);
          bindCanvasLayerNode(node);
        }
        var richText = item.type === "text" && ((Array.isArray(item.styledRuns) && item.styledRuns.length) || (Array.isArray(item.styledShapes) && item.styledShapes.length));
        var customFontClass = item.type === "text" && FONT_FAMILY_MAP[item.font] ? " " + item.font : "";
        node.className = "custom-layer-object custom-" + item.type + "-layer" + customFontClass + (richText ? " rich-text-clone" : "");
        node.style.left = item.x + "%";
        node.style.top = item.y + "%";
        node.style.width = item.w + "%";
        node.style.height = item.type === "text" && item.autoHeight ? "auto" : item.h + "%";
        node.style.minHeight = item.type === "text" ? item.h + "%" : "0";
        node.style.opacity = item.opacity / 100;
        if (item.type === "text") {
          /* Point text may grow naturally until its first explicit box resize.
             Area text owns both dimensions and clips overflow like a layout
             frame; content never pushes the frame wider or taller. */
          node.style.color = item.color;
          node.style.setProperty("font-family", fontFamilyForKey(item.font), "important");
          node.style.fontSize = item.fontSize + "px";
          node.style.fontWeight = item.fontWeight;
          node.style.fontStyle = item.fontStyle;
          node.style.lineHeight = item.lineHeight;
          node.style.letterSpacing = item.letterSpacing;
          node.style.textAlign = item.align;
          node.style.setProperty("writing-mode", item.writingMode === "vertical-rl" ? "vertical-rl" : "horizontal-tb", "important");
          node.style.setProperty("text-orientation", "mixed", "important");
          node.style.textTransform = item.textTransform;
          node.style.whiteSpace = item.whiteSpace;
          node.replaceChildren();
          if (richText) {
            applySnapshotBoxStyle(node, null);
            node.style.mixBlendMode = normalizeBoxStyle(item.boxStyle).mixBlendMode;
            var visual = document.createElement("div");
            visual.className = "rich-text-visual";
            applySnapshotBoxStyle(visual, item.boxStyle);
            visual.style.mixBlendMode = "normal";
            (item.styledShapes || []).forEach(function (shape) { appendStyledShape(visual, shape); });
            item.styledRuns.forEach(function (run) { appendStyledRun(visual, run); });
            node.appendChild(visual);
          } else {
            applySnapshotBoxStyle(node, item.boxStyle);
            var textNode = document.createElement("span");
            appendInlineText(textNode, item.text || "", item.inlineTextStyles, customTextColorMode(item) === "difference");
            node.appendChild(textNode);
          }
          /* Snapshot box styles can carry their original overflow value, so
             enforce the editor's point/area mode after applying the snapshot. */
          node.style.overflow = item.autoHeight ? "visible" : "hidden";
          node.style.textOverflow = "clip";
        } else if (item.type === "image") {
          applySnapshotBoxStyle(node, item.boxStyle);
          var image = node.querySelector("img.custom-image-source");
          if (!image) {
            node.replaceChildren();
            image = document.createElement("img");
            image.className = "custom-image-source";
            image.alt = item.name || "사용자 이미지";
            image.addEventListener("load", renderCustomLayers);
            node.appendChild(image);
          }
          if (item.imageData) {
            if (image.src !== item.imageData) image.src = item.imageData;
          } else {
            image.removeAttribute("src");
          }
          var effect = item.effect || defaultEffect();
          var customShadow = imageShadowFilter(shadowFor(item.id, side));
          var customEffectFilter = effectFilterString(effect, true);
          image.style.filter = ((customEffectFilter === "none" ? "" : customEffectFilter + " ") + customShadow).trim() || "none";
          /* A free image is its layer box, not a crop inside a separate frame.
             Keeping the bitmap at exactly 100% x 100% makes the selection,
             inspector dimensions, preview and export share one geometry. */
          image.style.setProperty("object-fit", "fill", "important");
          image.style.setProperty("width", "100%", "important");
          image.style.setProperty("height", "100%", "important");
          image.style.setProperty("left", "0", "important");
          image.style.setProperty("top", "0", "important");
          image.style.setProperty("right", "auto", "important");
          image.style.setProperty("bottom", "auto", "important");
          node.style.setProperty("--image-alpha-mask-size", "100% 100%");
          node.style.setProperty("--image-alpha-mask-position", "0 0");
          node.style.setProperty("--image-alpha-mask", item.imageData ? 'url("' + item.imageData + '")' : "none");
          node.style.setProperty("--image-overlay", effect.overlay / 100);
          node.style.setProperty("--image-overlay-color", effect.overlayColor);
          node.style.setProperty("--image-overlay-blend", effect.overlayBlend);
          setImageVignetteProperties(node, effect.vignette);
        } else {
          applySnapshotBoxStyle(node, item.boxStyle);
          node.style.background = "transparent";
          node.style.border = "0";
          var canvas = node.querySelector("canvas.custom-shape-canvas");
          var shapeImage = node.querySelector("img.custom-shape-source");
          var placeholder = node.querySelector("span.custom-shape-placeholder");
          if (!canvas) {
            node.replaceChildren();
            canvas = document.createElement("canvas");
            canvas.className = "custom-shape-canvas";
            shapeImage = document.createElement("img");
            shapeImage.className = "custom-shape-source";
            shapeImage.alt = "";
            shapeImage.addEventListener("load", function () { renderCustomLayers(renderScale); });
            placeholder = document.createElement("span");
            placeholder.className = "custom-shape-placeholder";
            placeholder.textContent = "ADD IMAGE";
            node.appendChild(canvas);
            node.appendChild(shapeImage);
            node.appendChild(placeholder);
          }
          if (item.imageData) {
            if (shapeImage.src !== item.imageData) shapeImage.src = item.imageData;
          } else shapeImage.removeAttribute("src");
          placeholder.hidden = item.fillMode !== "image" || Boolean(item.imageData);
          /* Export only needs a high-resolution backing canvas on the active
             face. Keeping the hidden face at preview resolution avoids a
             second multi-megapixel canvas during PNG generation. */
          paintCustomShape(canvas, shapeImage, item, side === state.side ? renderScale : undefined);
        }
        node.style.rotate = finiteNumber(item.rotation, 0) + "deg";
        node.style.transformOrigin = "center center";
      });
    });
  }

  function calculateCrop(config, imageW, imageH, frameW, frameH, renderPixelScale) {
    var cover = config && config.fit === "cover";
    var scale = cover ? Math.max(frameW / imageW, frameH / imageH) : Math.min(frameW / imageW, frameH / imageH);
    /* Contain means an uncropped original. At preview resolution a small
       bitmap keeps its natural pixel size instead of being blown up to the
       slot. Export/shape backing canvases pass their render scale so the same
       CSS-size composition is preserved at higher output density. Cover and
       an explicit zoom remain opt-in ways to enlarge an image. */
    if (!cover) scale = Math.min(scale, Math.max(.01, finiteNumber(renderPixelScale, 1)));
    var zoom = clamp(finiteNumber(config && config.zoom, 1), 1, 3);
    var width = imageW * scale * zoom;
    var height = imageH * scale * zoom;
    var maxX = Math.max(0, (width - frameW) / 2);
    var maxY = Math.max(0, (height - frameH) / 2);
    return {
      width: width,
      height: height,
      x: (frameW - width) / 2 + clamp(finiteNumber(config && config.panX, 0), -1, 1) * maxX,
      y: (frameH - height) / 2 + clamp(finiteNumber(config && config.panY, 0), -1, 1) * maxY
    };
  }

  function shadowFor(layer, side) {
    side = side || state.side;
    if (!layer) return defaultShadow();
    side = canonicalTrainCouponSide(side, layer, state);
    if (!state.sideShadows) state.sideShadows = createSideShadows(null, state.shadows, state);
    if (!state.sideShadows[side]) state.sideShadows[side] = {};
    if (!state.sideShadows[side][layer]) state.sideShadows[side][layer] = defaultShadow();
    return state.sideShadows[side][layer];
  }
  function layerSupportsShadow(layer, side) {
    side = side || state.side;
    if (!layer || ["face-shadow", "texture", "effects"].indexOf(layer) >= 0) return false;
    if ((state.template === "postcard" || state.template === "polaroid") && layer === "block-main") return false;
    if (state.template === "polaroid" && layer === "frame") return false;
    return layerAvailableOnSide(layer, side, state);
  }

  function hexToRgba(hex, opacity) {
    var clean = String(hex || "#000000").replace("#", "");
    if (clean.length === 3) clean = clean.split("").map(function (char) { return char + char; }).join("");
    var number = parseInt(clean, 16);
    if (!Number.isFinite(number)) number = 0;
    return "rgba(" + (number >> 16 & 255) + "," + (number >> 8 & 255) + "," + (number & 255) + "," + clamp(opacity, 0, 100) / 100 + ")";
  }

  function shadowOffset(shadow) {
    var radians = ((Number(shadow.angle) || 0) % 360) * Math.PI / 180;
    var distance = clamp(Number(shadow.distance) || 0, 0, 120);
    return {
      x: Math.cos(radians) * distance,
      y: Math.sin(radians) * distance
    };
  }

  function imageShadowFilter(shadow, pixelScale) {
    if (!shadow || !shadow.enabled) return "";
    var scale = Math.max(.1, finiteNumber(pixelScale, 1));
    var offset = shadowOffset(shadow);
    var blur = Math.max(0, (Number(shadow.blur) || 0) + (Number(shadow.spread) || 0) * .45) * scale;
    return " drop-shadow(" + (offset.x * scale).toFixed(2) + "px " + (offset.y * scale).toFixed(2) + "px " + blur.toFixed(2) + "px " + hexToRgba(shadow.color, shadow.opacity) + ")";
  }

  function applyLayerPresentation() {
    $$("[data-canvas-layer]").forEach(function (node) {
      var layer = node.dataset.canvasLayer;
      if (!layerDefinition(layer, state)) return;
      var custom = customLayerById(layer);
      var side = node.closest(".ticket-back") ? "back" : "front";
      if (!layerAvailableOnSide(layer, side, state)) return;
      var layerStyle = !custom && layerStyleEntry(side, layer, false) || {};
      var textBox = TEXT_LAYER_KEYS.indexOf(layer) >= 0 || Boolean(custom && custom.type === "text");
      var textColorMode = custom && custom.type === "text"
        ? customTextColorMode(custom)
        : (TEXT_LAYER_KEYS.indexOf(layer) >= 0 ? nativeTextColorMode(layer, side) : "solid");
      var nativePlacement = custom ? null : placementFor(side, layer);
      var order = layerOrderFor(side, state).indexOf(layer);
      node.style.zIndex = String(order < 0 ? 1 : order + 1);
      node.style.setProperty("--layer-z", String(order < 0 ? 1 : order + 1));
      var shadow = shadowFor(layer, side);
      var color = hexToRgba(shadow.color, shadow.opacity);
      var offset = shadowOffset(shadow);
      node.style.setProperty("--layer-shadow-color", color);
      node.style.setProperty("--layer-shadow-x", offset.x.toFixed(2) + "px");
      node.style.setProperty("--layer-shadow-y", offset.y.toFixed(2) + "px");
      node.style.setProperty("--layer-shadow-blur", shadow.blur + "px");
      node.style.setProperty("--layer-shadow-spread", shadow.spread + "px");
      node.classList.toggle("layer-shadow-on", Boolean(shadow.enabled));
      node.classList.toggle("freeform-movable", isMovableLayer(layer));
      node.classList.toggle("layer-color-override", Boolean(layerStyle.color));
      node.classList.toggle("layer-text-difference", textBox && textColorMode === "difference");
      node.classList.toggle("layer-font-size-override", TEXT_LAYER_KEYS.indexOf(layer) >= 0 && layerStyle.fontSize != null);
      node.classList.toggle("layer-font-family-override", TEXT_LAYER_KEYS.indexOf(layer) >= 0 && Boolean(layerStyle.fontFamily));
      node.classList.toggle("layer-font-weight-override", TEXT_LAYER_KEYS.indexOf(layer) >= 0 && Boolean(layerStyle.fontWeight));
      node.classList.toggle("layer-font-style-override", TEXT_LAYER_KEYS.indexOf(layer) >= 0 && Boolean(layerStyle.fontStyle));
      node.classList.toggle("layer-spacing-override", TEXT_LAYER_KEYS.indexOf(layer) >= 0 && (layerStyle.letterSpacing != null || layerStyle.lineHeight != null));
      node.classList.toggle("layer-text-align-override", TEXT_LAYER_KEYS.indexOf(layer) >= 0 && Boolean(layerStyle.textAlign));
      node.classList.toggle("layer-writing-vertical", TEXT_LAYER_KEYS.indexOf(layer) >= 0 && layerStyle.writingMode === "vertical-rl");
      node.classList.toggle("text-box-layer", textBox);
      node.classList.toggle("text-box-resized", Boolean(!custom && textBox && nativePlacement.boxW));
      if (layerStyle.color) node.style.setProperty("--layer-custom-color", layerStyle.color);
      else node.style.removeProperty("--layer-custom-color");
      if (isCinemaFrontFrameColor(layer, side, state)) {
        var cinemaFrontFrameColor = effectiveLayerColor(layer, side);
        node.style.setProperty("--cinema-frame-ink", cinemaFrontFrameColor);
        node.style.setProperty("--cinema-front-frame-ink", cinemaFrontFrameColor);
      } else {
        node.style.removeProperty("--cinema-frame-ink");
        node.style.removeProperty("--cinema-front-frame-ink");
      }
      if (layerStyle.fontSize != null) node.style.setProperty("--layer-font-size", layerStyle.fontSize + "px");
      else node.style.removeProperty("--layer-font-size");
      if (layerStyle.fontFamily) node.style.setProperty("--layer-font-family", fontFamilyForKey(layerStyle.fontFamily));
      else node.style.removeProperty("--layer-font-family");
      if (layerStyle.fontWeight) node.style.setProperty("--layer-font-weight", layerStyle.fontWeight);
      else node.style.removeProperty("--layer-font-weight");
      if (layerStyle.fontStyle) node.style.setProperty("--layer-font-style", layerStyle.fontStyle);
      else node.style.removeProperty("--layer-font-style");
      if (layerStyle.letterSpacing != null) node.style.setProperty("--layer-letter-spacing", layerStyle.letterSpacing + "px");
      else node.style.removeProperty("--layer-letter-spacing");
      if (layerStyle.lineHeight != null) node.style.setProperty("--layer-line-height", String(layerStyle.lineHeight));
      else node.style.removeProperty("--layer-line-height");
      if (layerStyle.textAlign) node.style.setProperty("--layer-text-align", layerStyle.textAlign);
      else node.style.removeProperty("--layer-text-align");
      if (!custom && textBox) {
        node.style.setProperty("writing-mode", layerStyle.writingMode === "vertical-rl" ? "vertical-rl" : "horizontal-tb", "important");
        node.style.setProperty("text-orientation", "mixed", "important");
      }
      if (!custom && textBox && nativePlacement.boxW) {
        node.style.setProperty("--text-box-width", nativePlacement.boxW + "px");
        node.style.setProperty("--text-box-height", nativePlacement.boxH ? nativePlacement.boxH + "px" : "auto");
        node.style.setProperty("width", nativePlacement.boxW + "px", "important");
        node.style.setProperty("height", nativePlacement.boxMode === "area" && nativePlacement.boxH ? nativePlacement.boxH + "px" : "auto", "important");
        node.dataset.textBoxMode = nativePlacement.boxMode;
      } else {
        node.style.removeProperty("--text-box-width");
        node.style.removeProperty("--text-box-height");
        if (!custom && textBox) {
          node.style.removeProperty("width");
          node.style.removeProperty("height");
        }
        delete node.dataset.textBoxMode;
      }
      if (custom) {
        var customScaleX = custom.type === "text" ? clamp(finiteNumber(custom.scaleX, 1), .1, MAX_NATIVE_OBJECT_SCALE) : 1;
        var customScaleY = custom.type === "text" ? clamp(finiteNumber(custom.scaleY, 1), .1, MAX_NATIVE_OBJECT_SCALE) : 1;
        node.style.transform = "skewX(" + clamp(finiteNumber(custom.skewX, 0), -70, 70) + "deg) scale(" + customScaleX + "," + customScaleY + ")";
      } else if (!isMovableLayer(layer)) {
        node.style.transform = "";
      } else {
        var placement = nativePlacement;
        var scaleX = clamp(finiteNumber(placement.scaleX, 1), .1, MAX_NATIVE_OBJECT_SCALE);
        var scaleY = clamp(finiteNumber(placement.scaleY, 1), .1, MAX_NATIVE_OBJECT_SCALE);
        var rotation = clamp(finiteNumber(placement.rotation, 0), -360, 360);
        node.style.transformOrigin = legacyCompositeTransformOrigin(node, side, layer) || "center center";
        node.style.transform = "translate(" + (finiteNumber(placement.x, 0) * ticket.offsetWidth / 100).toFixed(2) + "px," + (finiteNumber(placement.y, 0) * ticket.offsetHeight / 100).toFixed(2) + "px) rotate(" + rotation + "deg) skewX(" + clamp(finiteNumber(placement.skewX, 0), -70, 70) + "deg) scale(" + scaleX + "," + scaleY + ")";
      }
    });
  }

  function layerClippingSpecs(documentState, requestedSide) {
    var source = documentState || state;
    var specs = [];
    var sides = requestedSide === "front" || requestedSide === "back" ? [requestedSide] : ["front", "back"];
    sides.forEach(function (side) {
      layerOrderFor(side, source).forEach(function (key) {
        if (!isLayerClipped(key, side, source) || isLayerHidden(key, side, source) || !layerAvailableOnSide(key, side, source)) return;
        var target = clippingTargetFor(key, side, source);
        if (target) specs.push({ side: side, source: key, target: target });
      });
    });
    return specs;
  }

  function clearLayerClippingPreviews() {
    $$(".layer-clipping-preview").forEach(function (canvas) {
      canvas.width = canvas.height = 1;
      canvas.remove();
    });
    $$(".layer-clipping-source-hidden").forEach(function (node) {
      node.classList.remove("layer-clipping-source-hidden");
    });
    $$(".layer-clipping-target-paint-hidden").forEach(function (node) {
      node.classList.remove("layer-clipping-target-paint-hidden");
    });
    installedLayerClippingSignatures = Object.create(null);
    interactiveLayerClippingSignatures = Object.create(null);
  }

  function layerClippingSignature(side, source, target) {
    return String(side) + "::" + String(source) + "::" + String(target);
  }

  function clippingTargetPaintShouldBeHidden(key, documentState) {
    var custom = customLayerById(key, documentState || state);
    return TEXT_LAYER_KEYS.indexOf(key) >= 0 || Boolean(custom && custom.type === "text");
  }

  function setClippingTargetPaintHidden(spec, hidden, documentState) {
    if (!spec || !clippingTargetPaintShouldBeHidden(spec.target, documentState)) return;
    var face = spec.side === "back" ? backFace : frontFace;
    face.querySelectorAll('[data-canvas-layer="' + spec.target + '"]').forEach(function (node) {
      node.classList.toggle("layer-clipping-target-paint-hidden", Boolean(hidden));
    });
  }

  function syncInstalledLayerClippingSources(documentState) {
    var source = documentState || state;
    var current = Object.create(null);
    var specs = layerClippingSpecs(source);
    specs.forEach(function (spec) {
      current[layerClippingSignature(spec.side, spec.source, spec.target)] = spec;
    });

    $$(".layer-clipping-preview").forEach(function (canvas) {
      var signature = layerClippingSignature(
        canvas.dataset.clippingSide,
        canvas.dataset.clippingSource,
        canvas.dataset.clippingTarget
      );
      if (current[signature]) {
        installedLayerClippingSignatures[signature] = true;
        var order = layerOrderFor(current[signature].side, source).indexOf(current[signature].source);
        canvas.style.zIndex = String(order < 0 ? 1 : order + 1);
        if (interactiveLayerClippingSignatures[signature]) canvas.style.setProperty("display", "none", "important");
        else canvas.style.removeProperty("display");
        return;
      }
      canvas.width = canvas.height = 1;
      canvas.remove();
      delete installedLayerClippingSignatures[signature];
    });
    Object.keys(installedLayerClippingSignatures).forEach(function (signature) {
      if (!current[signature]) delete installedLayerClippingSignatures[signature];
    });

    /* Custom layers are rebuilt during ordinary inspector edits. Reapply the
       hidden source state synchronously when a matching, last-known-good clip
       is already installed, so the unclipped replacement cannot flash above
       the retained preview while the debounced capture catches up. */
    $$(".layer-clipping-source-hidden").forEach(function (node) {
      node.classList.remove("layer-clipping-source-hidden");
    });
    $$(".layer-clipping-target-paint-hidden").forEach(function (node) {
      node.classList.remove("layer-clipping-target-paint-hidden");
    });
    specs.forEach(function (spec) {
      var signature = layerClippingSignature(spec.side, spec.source, spec.target);
      if (!installedLayerClippingSignatures[signature]) return;
      if (interactiveLayerClippingSignatures[signature]) return;
      var face = spec.side === "back" ? backFace : frontFace;
      face.querySelectorAll('[data-canvas-layer="' + spec.source + '"]').forEach(function (node) {
        node.classList.add("layer-clipping-source-hidden");
      });
      setClippingTargetPaintHidden(spec, true, source);
    });
  }

  function cancelQueuedLayerClippingPreview() {
    clippingPreviewGeneration += 1;
    clearTimeout(clippingPreviewTimer);
    clippingPreviewTimer = 0;
    if (clippingPreviewPending) {
      clippingPreviewPending.resolve();
      clippingPreviewPending = null;
    }
  }

  function retainLayerClippingForDrag(activeDrag) {
    if (!activeDrag || activeDrag.clippingPreviewRetained) return;
    activeDrag.clippingPreviewRetained = true;
    var movingKeys = activeDrag.mode === "move-group" && Array.isArray(activeDrag.entries)
      ? activeDrag.entries.map(function (entry) { return entry.key; })
      : [activeDrag.layer];
    movingKeys = movingKeys.filter(Boolean);
    if (!movingKeys.length) return;
    var specs = layerClippingSpecs(state, activeDrag.side || state.side);
    var affected = specs.filter(function (spec) {
      return movingKeys.indexOf(spec.source) >= 0 || movingKeys.indexOf(spec.target) >= 0;
    });
    if (!affected.length) return;
    cancelQueuedLayerClippingPreview();
    activeDrag.clippingSide = activeDrag.side || state.side;
    activeDrag.clippingMovingKeys = movingKeys;
    activeDrag.clippingPreviewEntries = [];
    affected.forEach(function (spec) {
      var signature = layerClippingSignature(spec.side, spec.source, spec.target);
      var face = spec.side === "back" ? backFace : frontFace;
      var previews = face.querySelectorAll('.layer-clipping-preview[data-clipping-side="' + spec.side + '"][data-clipping-source="' + spec.source + '"][data-clipping-target="' + spec.target + '"]');
      if (!installedLayerClippingSignatures[signature] && !previews.length) return;
      /* Never reveal the unclipped source while its mask is being edited.
         Retain the last known-good bitmap until the exact idle capture can
         replace it after pointer-up. */
      face.querySelectorAll('[data-canvas-layer="' + spec.source + '"]').forEach(function (node) {
        node.classList.add("layer-clipping-source-hidden");
      });
      setClippingTargetPaintHidden(spec, true, state);
      previews.forEach(function (canvas) {
        canvas.style.removeProperty("display");
        activeDrag.clippingPreviewEntries.push({
          canvas: canvas,
          spec: spec,
          baseTransform: canvas.style.transform || ""
        });
      });
    });
  }

  function layerClippingDragTranslation(activeDrag, key) {
    if (!activeDrag || !key) return null;
    var side = activeDrag.clippingSide || activeDrag.side || state.side;
    var layout = state.layouts && state.layouts[side];
    var deltaX = 0;
    var deltaY = 0;
    if (activeDrag.mode === "move-custom" && key === activeDrag.layer) {
      var custom = customLayerById(key);
      if (!custom) return null;
      deltaX = finiteNumber(custom.x, 0) - finiteNumber(activeDrag.customX, 0);
      deltaY = finiteNumber(custom.y, 0) - finiteNumber(activeDrag.customY, 0);
    } else if (activeDrag.mode === "move-quote" && key === "quote" && layout) {
      deltaX = finiteNumber(layout.quoteX, 0) - finiteNumber(activeDrag.quoteX, 0);
      deltaY = finiteNumber(layout.quoteY, 0) - finiteNumber(activeDrag.quoteY, 0);
    } else if (activeDrag.mode === "move-details" && key === "details" && layout) {
      deltaX = finiteNumber(layout.detailsX, 0) - finiteNumber(activeDrag.detailsX, 0);
      deltaY = finiteNumber(layout.detailsY, 0) - finiteNumber(activeDrag.detailsY, 0);
    } else if (activeDrag.mode === "move-layer" && key === activeDrag.layer) {
      var placement = placementFor(side, key);
      deltaX = finiteNumber(placement.x, 0) - finiteNumber(activeDrag.placementX, 0);
      deltaY = finiteNumber(placement.y, 0) - finiteNumber(activeDrag.placementY, 0);
    } else if (activeDrag.mode === "move-group" && Array.isArray(activeDrag.entries)) {
      var entry = activeDrag.entries.find(function (candidate) { return candidate.key === key; });
      if (!entry) return null;
      if (entry.kind === "custom") {
        var groupCustom = customLayerById(key);
        if (!groupCustom) return null;
        deltaX = finiteNumber(groupCustom.x, 0) - entry.startX;
        deltaY = finiteNumber(groupCustom.y, 0) - entry.startY;
      } else if (entry.kind === "quote" && layout) {
        deltaX = finiteNumber(layout.quoteX, 0) - entry.startX;
        deltaY = finiteNumber(layout.quoteY, 0) - entry.startY;
      } else if (entry.kind === "details" && layout) {
        deltaX = finiteNumber(layout.detailsX, 0) - entry.startX;
        deltaY = finiteNumber(layout.detailsY, 0) - entry.startY;
      } else {
        var groupPlacement = placementFor(side, key);
        deltaX = finiteNumber(groupPlacement.x, 0) - entry.startX;
        deltaY = finiteNumber(groupPlacement.y, 0) - entry.startY;
      }
    } else {
      return null;
    }
    return {
      x: deltaX / 100 * Math.max(1, activeDrag.ticketW),
      y: deltaY / 100 * Math.max(1, activeDrag.ticketH)
    };
  }

  function updateRetainedLayerClippingForDrag(activeDrag) {
    if (!activeDrag || !Array.isArray(activeDrag.clippingPreviewEntries)) return;
    var movingKeys = activeDrag.clippingMovingKeys || [];
    activeDrag.clippingPreviewEntries.forEach(function (entry) {
      if (movingKeys.indexOf(entry.spec.target) < 0) return;
      var offset = layerClippingDragTranslation(activeDrag, entry.spec.target);
      if (!offset) return;
      var base = entry.baseTransform && entry.baseTransform !== "none" ? entry.baseTransform + " " : "";
      entry.canvas.style.transform = base + "translate(" + offset.x.toFixed(3) + "px," + offset.y.toFixed(3) + "px)";
    });
  }

  function layerClippingPresentation(side, key) {
    var liveFace = side === "back" ? backFace : frontFace;
    var nodes = Array.prototype.slice.call(liveFace.querySelectorAll('[data-canvas-layer="' + key + '"]'));
    var node = nodes.find(function (candidate) {
      var computed = getComputedStyle(candidate);
      return computed.display !== "none" && computed.visibility !== "hidden";
    }) || nodes[0];
    var computed = node ? getComputedStyle(node) : null;
    return {
      mixBlendMode: computed && computed.mixBlendMode && computed.mixBlendMode !== "normal"
        ? computed.mixBlendMode
        : "normal"
    };
  }

  function copyClippingCanvasPixels(sourceNode, clonedNode) {
    if (!sourceNode || !clonedNode) return;
    var sourceCanvases = [];
    var clonedCanvases = [];
    if (sourceNode.matches && sourceNode.matches("canvas")) sourceCanvases.push(sourceNode);
    if (clonedNode.matches && clonedNode.matches("canvas")) clonedCanvases.push(clonedNode);
    Array.prototype.push.apply(sourceCanvases, sourceNode.querySelectorAll("canvas"));
    Array.prototype.push.apply(clonedCanvases, clonedNode.querySelectorAll("canvas"));
    sourceCanvases.forEach(function (sourceCanvas, index) {
      var clonedCanvas = clonedCanvases[index];
      if (!clonedCanvas || !sourceCanvas.width || !sourceCanvas.height) return;
      try {
        clonedCanvas.width = sourceCanvas.width;
        clonedCanvas.height = sourceCanvas.height;
        clonedCanvas.getContext("2d", { alpha: true }).drawImage(sourceCanvas, 0, 0);
      } catch (error) {
        /* A browser may refuse to copy a tainted third-party canvas. Let the
           regular image capture path decide whether it can still render it. */
        console.warn("Clipping canvas pixels could not be copied.", error);
      }
    });
  }

  function copyLayerClippingPreviewPixels(sourceRoot, clonedRoot) {
    if (!sourceRoot || !clonedRoot) return;
    var sourcePreviews = sourceRoot.querySelectorAll(".layer-clipping-preview");
    var clonedPreviews = clonedRoot.querySelectorAll(".layer-clipping-preview");
    Array.prototype.forEach.call(sourcePreviews, function (sourceCanvas, index) {
      var clonedCanvas = clonedPreviews[index];
      copyClippingCanvasPixels(sourceCanvas, clonedCanvas);
      /* html2canvas 1.4 does not implement CSS mix-blend-mode. Normalize its
         clone explicitly so unsupported blend parsing cannot discard an
         otherwise valid clipped bitmap; the dependable fallback is normal. */
      if (clonedCanvas) clonedCanvas.style.setProperty("mix-blend-mode", "normal", "important");
    });
  }

  function cssColorPaints(value) {
    var color = String(value || "").trim().toLowerCase();
    if (!color || color === "transparent") return false;
    var rgba = color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/);
    return !rgba || finiteNumber(parseFloat(rgba[1]), 1) > 0;
  }

  function customTextCaptureHasPaintedBox(node) {
    if (!node) return false;
    var computed = getComputedStyle(node);
    return cssColorPaints(computed.backgroundColor)
      || computed.backgroundImage && computed.backgroundImage !== "none"
      || computed.boxShadow && computed.boxShadow !== "none"
      || computed.clipPath && computed.clipPath !== "none"
      || [computed.borderTopWidth, computed.borderRightWidth, computed.borderBottomWidth, computed.borderLeftWidth]
        .some(function (width) { return finiteNumber(parseFloat(width), 0) > 0; });
  }

  function prepareCustomTextClippingCapture(node, scratchFace) {
    if (!node || customTextCaptureHasPaintedBox(node)) return;
    var candidates = [node].concat(Array.prototype.slice.call(node.querySelectorAll("*")));
    var largestFontSize = candidates.reduce(function (largest, candidate) {
      var computed = getComputedStyle(candidate);
      if (computed.display === "none" || computed.visibility === "hidden") return largest;
      return Math.max(largest, finiteNumber(parseFloat(computed.fontSize), 0));
    }, 0);
    var bleed = clamp(largestFontSize || 16, 8, 512);
    /* Point text can use a line-height below 1. Its glyph ink then extends
       outside the CSS line box even though it is visibly painted in the live
       editor. html2canvas clips that ink to the element box while isolating a
       clipping mask. Expand only the transparent capture box: content width,
       baseline, transform center, and live document geometry stay unchanged. */
    node.style.setProperty("box-sizing", "content-box", "important");
    node.style.setProperty("padding", bleed + "px", "important");
    node.style.setProperty("margin", -bleed + "px", "important");
    node.style.setProperty("overflow", "hidden", "important");
    node.style.setProperty("max-width", "none", "important");
    node.style.setProperty("max-height", "none", "important");
    var ancestor = node.parentElement;
    while (ancestor && ancestor !== scratchFace) {
      ancestor.style.setProperty("overflow", "visible", "important");
      ancestor = ancestor.parentElement;
    }
  }

  async function captureLayerForClipping(side, key, scale, bakedImages) {
    var liveFace = side === "back" ? backFace : frontFace;
    var width = Math.max(1, liveFace.offsetWidth);
    var height = Math.max(1, liveFace.offsetHeight);
    var captureId = "clip-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    var scratchTicket = ticket.cloneNode(true);
    scratchTicket.dataset.clippingCapture = captureId;
    scratchTicket.querySelectorAll("#selectionOverlay,.layer-clipping-preview").forEach(function (node) { node.remove(); });
    Array.prototype.slice.call(scratchTicket.children).forEach(function (child) {
      if (!child.classList.contains(side === "back" ? "ticket-back" : "ticket-front")) child.remove();
    });
    var scratchFace = scratchTicket.querySelector(side === "back" ? ".ticket-back" : ".ticket-front");
    if (!scratchFace) return null;
    var liveLayerNodes = liveFace.querySelectorAll('[data-canvas-layer="' + key + '"]');
    var scratchLayerNodes = scratchFace.querySelectorAll('[data-canvas-layer="' + key + '"]');
    Array.prototype.forEach.call(liveLayerNodes, function (liveNode, index) {
      copyClippingCanvasPixels(liveNode, scratchLayerNodes[index]);
    });
    scratchTicket.className = scratchTicket.className.split(/\s+/).filter(function (className) {
      return !/^(?:postcard|face)-(?:view|top|active)-/.test(className) && className !== "is-back";
    }).join(" ");
    scratchTicket.classList.add("face-view-" + side, "face-active-" + side);
    if (side === "back") scratchTicket.classList.add("is-back");
    scratchTicket.style.setProperty("position", "fixed", "important");
    scratchTicket.style.setProperty("inset", "0 auto auto 0", "important");
    scratchTicket.style.setProperty("width", width + "px", "important");
    scratchTicket.style.setProperty("height", height + "px", "important");
    scratchTicket.style.setProperty("zoom", "1", "important");
    scratchTicket.style.setProperty("transform", "none", "important");
    scratchTicket.style.setProperty("z-index", "-2147483647", "important");
    scratchTicket.style.setProperty("pointer-events", "none", "important");
    scratchFace.style.setProperty("display", "block", "important");
    scratchFace.style.setProperty("visibility", "visible", "important");
    scratchFace.style.setProperty("position", "relative", "important");
    scratchFace.style.setProperty("inset", "auto", "important");
    scratchFace.style.setProperty("width", width + "px", "important");
    scratchFace.style.setProperty("height", height + "px", "important");
    scratchFace.style.setProperty("transform", "none", "important");
    scratchFace.style.setProperty("translate", "none", "important");
    scratchFace.style.setProperty("rotate", "none", "important");
    scratchFace.style.setProperty("scale", "none", "important");
    scratchFace.style.setProperty("background", "transparent", "important");
    scratchFace.style.setProperty("box-shadow", "none", "important");
    scratchFace.querySelectorAll(".image-placeholder,.custom-shape-placeholder").forEach(function (node) {
      node.style.setProperty("display", "none", "important");
    });
    scratchFace.querySelectorAll("[data-canvas-layer]").forEach(function (node) {
      node.classList.remove("canvas-selected", "selection-proxied", "object-transform-active", "layer-clipping-source-hidden", "layer-clipping-target-paint-hidden");
      if (node.dataset.canvasLayer !== key) {
        node.style.setProperty("display", "none", "important");
        node.style.setProperty("visibility", "hidden", "important");
      } else {
        node.style.setProperty("visibility", "visible", "important");
        /* Capture the layer against transparency. Its layer-level blend mode
           belongs on the clipped result, not inside this isolated scratch. */
        node.style.setProperty("mix-blend-mode", "normal", "important");
        node.style.setProperty("isolation", "auto", "important");
      }
    });
    document.body.appendChild(scratchTicket);
    try {
      var clippingCustom = customLayerById(key);
      if (clippingCustom && clippingCustom.type === "text") {
        Array.prototype.forEach.call(scratchLayerNodes, function (node) {
          prepareCustomTextClippingCapture(node, scratchFace);
        });
      }
      return await window.html2canvas(scratchFace, {
        backgroundColor: null,
        scale: Math.max(1, finiteNumber(scale, 1)),
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
        imageTimeout: 30000,
        logging: false,
        removeContainer: true,
        width: width,
        height: height,
        scrollX: 0,
        scrollY: 0,
        onclone: function (clonedDocument) {
          var clonedTicket = clonedDocument.querySelector('[data-clipping-capture="' + captureId + '"]');
          if (!clonedTicket) return;
          var clonedFace = clonedTicket.querySelector(side === "back" ? ".ticket-back" : ".ticket-front");
          copyClippingCanvasPixels(scratchFace, clonedFace);
          clonedTicket.classList.add("effects-baked", "layer-overlay-export");
          addExportBlendNeutralizer(clonedDocument, clonedTicket, key);
          if (bakedImages && bakedImages.length) applyExportImageBakesToClone(clonedTicket, bakedImages);
          normalizeExportCloneRotations(clonedDocument, clonedTicket);
          if (clonedFace) clonedFace.querySelectorAll(".layer-clipping-preview").forEach(function (node) { node.remove(); });
          var visible = {};
          visible[key] = true;
          pruneExportCloneWrappers(clonedTicket, visible, true, side);
        }
      });
    } finally {
      scratchTicket.remove();
    }
  }

  function clippingCanvasAlphaBounds(canvas) {
    var width = canvas.width;
    var height = canvas.height;
    if (!width || !height) return null;
    try {
      var context = canvas.getContext("2d", { alpha: true });
      /* Reading a full export-sized face at once briefly allocates another
         width * height * 4 byte buffer. Scan in short strips so clipping does
         not double the renderer's peak memory just to find alpha bounds. */
      var scanRows = Math.min(64, height);
      var pixels = null;
      var minX = width;
      var minY = height;
      var maxX = -1;
      var maxY = -1;
      for (var tileY = 0; tileY < height; tileY += scanRows) {
        var tileHeight = Math.min(scanRows, height - tileY);
        pixels = context.getImageData(0, tileY, width, tileHeight).data;
        for (var localY = 0; localY < tileHeight; localY++) {
          var y = tileY + localY;
          var alphaOffset = (localY * width * 4) + 3;
          for (var x = 0; x < width; x++, alphaOffset += 4) {
            if (!pixels[alphaOffset]) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      pixels = null;
      if (maxX < minX || maxY < minY) return null;
      return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
    } catch {
      /* An origin-tainted canvas cannot be inspected. Keep the correct full
         image instead of failing the clipping feature. */
      return { x: 0, y: 0, width: width, height: height };
    }
  }

  function composeLayerClippingPreview(sourceCanvas, maskCanvas, liveFace, presentation) {
    if (!sourceCanvas || !maskCanvas) return null;
    var output = sourceCanvas;
    var fullWidth = output.width;
    var fullHeight = output.height;
    var context = output.getContext("2d", { alpha: true });
    context.globalCompositeOperation = "destination-in";
    context.drawImage(maskCanvas, 0, 0, output.width, output.height);
    context.globalCompositeOperation = "source-over";
    var bounds = clippingCanvasAlphaBounds(output);
    if (!bounds) {
      output.width = output.height = 1;
      return null;
    }
    if (bounds.x || bounds.y || bounds.width !== fullWidth || bounds.height !== fullHeight) {
      var cropped = document.createElement("canvas");
      cropped.width = bounds.width;
      cropped.height = bounds.height;
      cropped.getContext("2d", { alpha: true }).drawImage(
        output,
        bounds.x, bounds.y, bounds.width, bounds.height,
        0, 0, bounds.width, bounds.height
      );
      output.width = output.height = 1;
      output = cropped;
    }
    var cssScaleX = Math.max(1, liveFace.offsetWidth) / Math.max(1, fullWidth);
    var cssScaleY = Math.max(1, liveFace.offsetHeight) / Math.max(1, fullHeight);
    output.className = "layer-clipping-preview";
    output.setAttribute("aria-hidden", "true");
    output.style.inset = "auto";
    output.style.left = (bounds.x * cssScaleX) + "px";
    output.style.top = (bounds.y * cssScaleY) + "px";
    output.style.right = "auto";
    output.style.bottom = "auto";
    output.style.width = (bounds.width * cssScaleX) + "px";
    output.style.height = (bounds.height * cssScaleY) + "px";
    output.style.mixBlendMode = presentation && presentation.mixBlendMode || "normal";
    return output;
  }

  function releaseLayerClippingCanvas(canvas) {
    if (canvas) canvas.width = canvas.height = 1;
  }

  function clippingMaskEntries(specs) {
    var entries = Object.create(null);
    specs.forEach(function (spec) {
      var key = spec.side + "::" + spec.target;
      if (!entries[key]) entries[key] = { canvas: null, remaining: 0 };
      entries[key].remaining += 1;
    });
    return entries;
  }

  async function renderLayerClippingPreviews(generation, scale, bakedImages) {
    if (generation !== clippingPreviewGeneration) return;
    var activeSides = isBothView(state) && !document.body.classList.contains("exporting-ticket") ? null : state.side;
    var specs = layerClippingSpecs(state, activeSides);
    if (!specs.length || typeof window.html2canvas !== "function") {
      clearLayerClippingPreviews();
      return;
    }
    var results = [];
    /* Several clipped sources can share one base. Keep one mask per base and
       release it immediately after its final consumer rather than retaining
       every full-face mask until the whole render finishes. */
    var masks = clippingMaskEntries(specs);
    var installed = false;
    try {
      for (var index = 0; index < specs.length; index++) {
        if (generation !== clippingPreviewGeneration) return;
        var spec = specs[index];
        var presentation = layerClippingPresentation(spec.side, spec.source);
        var maskKey = spec.side + "::" + spec.target;
        var maskEntry = masks[maskKey];
        var sourceCanvas = null;
        try {
          if (!maskEntry.canvas) maskEntry.canvas = await captureLayerForClipping(spec.side, spec.target, scale, bakedImages);
          if (generation !== clippingPreviewGeneration) return;
          if (maskEntry.canvas) sourceCanvas = await captureLayerForClipping(spec.side, spec.source, scale, bakedImages);
          if (generation !== clippingPreviewGeneration) return;
          var liveFace = spec.side === "back" ? backFace : frontFace;
          var preview = composeLayerClippingPreview(sourceCanvas, maskEntry.canvas, liveFace, presentation);
          /* A valid clip can have no overlapping alpha at all. It must still
             hide the source instead of silently falling back to the unclipped
             original layer. */
          results.push({ spec: spec, canvas: preview });
          if (preview === sourceCanvas) sourceCanvas = null;
        } finally {
          releaseLayerClippingCanvas(sourceCanvas);
          maskEntry.remaining -= 1;
          if (maskEntry.remaining <= 0) {
            releaseLayerClippingCanvas(maskEntry.canvas);
            maskEntry.canvas = null;
            delete masks[maskKey];
          }
        }
      }
      if (generation !== clippingPreviewGeneration) return;
      clearLayerClippingPreviews();
      results.forEach(function (result) {
        var face = result.spec.side === "back" ? backFace : frontFace;
        var sourceNodes = face.querySelectorAll('[data-canvas-layer="' + result.spec.source + '"]');
        if (!sourceNodes.length) {
          if (result.canvas) result.canvas.width = result.canvas.height = 1;
          return;
        }
        if (result.canvas) {
          var order = layerOrderFor(result.spec.side, state).indexOf(result.spec.source);
          result.canvas.dataset.clippingSide = result.spec.side;
          result.canvas.dataset.clippingSource = result.spec.source;
          result.canvas.dataset.clippingTarget = result.spec.target;
          result.canvas.style.zIndex = String(order < 0 ? 1 : order + 1);
          face.appendChild(result.canvas);
        }
        installedLayerClippingSignatures[layerClippingSignature(
          result.spec.side,
          result.spec.source,
          result.spec.target
        )] = true;
        sourceNodes.forEach(function (sourceNode) {
          sourceNode.classList.add("layer-clipping-source-hidden");
        });
        setClippingTargetPaintHidden(result.spec, true, state);
      });
      installed = true;
    } finally {
      Object.keys(masks).forEach(function (key) {
        releaseLayerClippingCanvas(masks[key] && masks[key].canvas);
      });
      if (!installed) results.forEach(function (result) {
        releaseLayerClippingCanvas(result.canvas);
      });
    }
  }

  function runPendingLayerClippingPreview() {
    if (clippingPreviewBusy || !clippingPreviewPending) return;
    var request = clippingPreviewPending;
    clippingPreviewPending = null;
    clippingPreviewBusy = true;
    Promise.resolve(renderLayerClippingPreviews(request.generation, request.scale, request.bakedImages)).then(function () {
      request.resolve();
    }).catch(function (error) {
      console.warn("Layer clipping preview could not be rendered.", error);
      if (request.propagateErrors) request.reject(error);
      else request.resolve();
    }).then(function () {
      clippingPreviewBusy = false;
      if (clippingPreviewPending) runPendingLayerClippingPreview();
    });
  }

  function queueLayerClippingPreview(scale, immediate, bakedImages, propagateErrors) {
    clippingPreviewGeneration += 1;
    var generation = clippingPreviewGeneration;
    clearTimeout(clippingPreviewTimer);
    clippingPreviewTimer = 0;
    if (clippingPreviewPending) clippingPreviewPending.resolve();
    var resolveRequest;
    var rejectRequest;
    clippingPreviewPromise = new Promise(function (resolve, reject) {
      resolveRequest = resolve;
      rejectRequest = reject;
    });
    clippingPreviewPending = {
      generation: generation,
      scale: scale,
      bakedImages: bakedImages,
      propagateErrors: Boolean(propagateErrors),
      resolve: resolveRequest,
      reject: rejectRequest
    };
    function enqueue() {
      clippingPreviewTimer = 0;
      runPendingLayerClippingPreview();
    }
    if (immediate) enqueue();
    /* html2canvas is intentionally idle-debounced. Inspector color drags can
       emit dozens of input events per second; retaining the last good bitmap
       and rendering only the latest state keeps those controls responsive. */
    else clippingPreviewTimer = setTimeout(enqueue, 240);
    return clippingPreviewPromise;
  }

  function refreshLayerClippingPreviews(scale, bakedImages) {
    queueLayerClippingPreview(scale, true, bakedImages, true);
    return clippingPreviewPromise;
  }

  function rawBlockImageSource(key, config) {
    if (!config) return "";
    if (config.imageData) return config.imageData;
    if (state.template === "train" && (key === "frontStub" || key === "backStub")) return window.LOG_TICKET_TRAIN_LOGO_ASSET || "";
    return "";
  }
  function blockUsesAccentTint(key, config) {
    return state.template === "train" && (key === "frontStub" || key === "backStub") && Boolean(rawBlockImageSource(key, config)) && config.tintMode === "accent";
  }
  function effectiveBlockImageSource(key, config) {
    var source = rawBlockImageSource(key, config);
    if (!source) return "";
    var side = key.indexOf("back") === 0 ? "back" : "front";
    var rendered = renderedTrainLogos[side];
    if (blockUsesAccentTint(key, config)
      && rendered.base === source
      && rendered.color === effectiveLayerColor("image-stub", side)
      && rendered.source) return rendered.source;
    return source;
  }
  function blockConfigForDomKey(key) {
    return state.template === "train" && key === "backStub" ? state.blocks.frontStub : state.blocks[key];
  }
  function renderBlockImages() {
    Object.keys(blockDom).forEach(function (key) {
      var dom = blockDom[key];
      var config = blockConfigForDomKey(key);
      var imageSource = effectiveBlockImageSource(key, config);
      if (imageSource && failedBlockImageSources[key] === imageSource) imageSource = "";
      var effect = config.effect || defaultEffect();
      var surfaceColor = blockColorForKey(key, state);
      dom.block.style.setProperty("--block-color", surfaceColor);
      dom.node.style.setProperty("--block-color", surfaceColor);
      dom.node.style.setProperty("--image-overlay", effect.overlay / 100);
      dom.node.style.setProperty("--image-overlay-color", effect.overlayColor);
      dom.node.style.setProperty("--image-overlay-blend", effect.overlayBlend);
      setImageVignetteProperties(dom.node, effect.vignette);
      dom.node.classList.toggle("has-image", Boolean(imageSource));
      if (!imageSource) {
        dom.node.style.setProperty("--image-alpha-mask", "none");
        dom.image.style.display = "none";
        dom.image.removeAttribute("src");
        return;
      }
      dom.image.style.display = "block";
      if (dom.image.src !== imageSource) dom.image.src = imageSource;
      if (!dom.image.complete || !dom.image.naturalWidth) return;
      var frameWidth = dom.frame.clientWidth;
      var frameHeight = dom.frame.clientHeight;
      if (!frameWidth || !frameHeight) return;
      var crop = calculateCrop(config, dom.image.naturalWidth, dom.image.naturalHeight, frameWidth, frameHeight);
      // Fitted image geometry must override protected stock-template geometry.
      // Otherwise cover/contain is replaced by a distorted 100% x 100% box.
      dom.image.style.setProperty("width", crop.width + "px", "important");
      dom.image.style.setProperty("height", crop.height + "px", "important");
      dom.image.style.setProperty("left", crop.x + "px", "important");
      dom.image.style.setProperty("top", crop.y + "px", "important");
      dom.image.style.setProperty("right", "auto", "important");
      dom.image.style.setProperty("bottom", "auto", "important");
      dom.image.style.setProperty("object-fit", "fill", "important");
      dom.node.style.setProperty("--image-alpha-mask", 'url("' + imageSource + '")');
      dom.node.style.setProperty("--image-alpha-mask-size", crop.width + "px " + crop.height + "px");
      dom.node.style.setProperty("--image-alpha-mask-position", crop.x + "px " + crop.y + "px");
      var effectFilter = effectFilterString(effect, true);
      var imageLayer = key.endsWith("Main") ? "image-main" : "image-stub";
      var shapeShadow = imageShadowFilter(shadowFor(imageLayer, key.indexOf("back") === 0 ? "back" : "front"));
      dom.image.style.filter = (effectFilter === "none" ? "" : effectFilter + " ") + shapeShadow || "none";
    });
  }

  function applyLayouts() {
    var trainScale = .65;
    var front = state.layouts.front;
    var back = state.layouts.back;
    var frontQuote = $("#frontQuoteLayer");
    var backQuote = $("#backQuoteLayer");
    var frontDetails = $("#frontDetailsLayer");
    var backDetails = $("#backDetailsLayer");

    // Template artwork uses !important geometry to protect its stock layout.
    // Keep editor-owned layout values at the same priority so dragging and the
    // transform inspector can override that stock geometry on every template.
    frontQuote.style.setProperty("left", front.quoteX + "%", "important");
    frontQuote.style.setProperty("top", front.quoteY + "%", "important");
    frontQuote.style.setProperty("width", front.quoteW + "%", "important");
    var frontQuoteFontSize = Math.max(16, front.quoteSize * trainScale);
    $("#quotePreview").style.fontSize = frontQuoteFontSize + "px";
    if (state.template === "train") {
      $("#speakerPreview").style.removeProperty("top");
    } else {
      $("#speakerPreview").style.removeProperty("top");
    }
    frontDetails.style.setProperty("left", front.detailsX + "%", "important");
    frontDetails.style.setProperty("top", front.detailsY + "%", "important");
    frontDetails.style.setProperty("width", front.detailsW + "%", "important");

    backQuote.style.setProperty("left", back.quoteX + "%", "important");
    backQuote.style.setProperty("top", back.quoteY + "%", "important");
    backQuote.style.setProperty("width", back.quoteW + "%", "important");
    $("#backTitlePreview").style.fontSize = Math.max(17, back.quoteSize * trainScale) + "px";
    backDetails.style.setProperty("left", back.detailsX + "%", "important");
    backDetails.style.setProperty("top", back.detailsY + "%", "important");
    backDetails.style.setProperty("width", back.detailsW + "%", "important");
  }

  function textFieldsForLayer(key, side) {
    var front = side === "front";
    var mirroredTrainCoupon = state.template === "train" && !front;
    var cinemaBack = state.template === "cinema" && !front;
    var map = {
      kicker: [{ label: front || mirroredTrainCoupon ? "상단 운행 문구" : "뒷면 상단 문구", prop: front || mirroredTrainCoupon ? "kicker" : "backKicker" }],
      title: [{ label: front || mirroredTrainCoupon ? "제목" : "뒷면 헤딩", prop: front || mirroredTrainCoupon ? "title" : "backHeading" }],
      subtitle: [{ label: "부제목", prop: "subtitle" }],
      "meta-bot-label": [{ label: "항목명", prop: "botLabel" }],
      "meta-bot": cinemaBack
        ? [{ label: "DIRECTOR", prop: "postcardPrompt" }]
        : (state.template === "polaroid" && !front
          ? [{ label: "상단 반복 이름", prop: "botName" }]
          : [{ label: "내용", prop: "botName" }]),
      "meta-persona-label": [{ label: "항목명", prop: "personaLabel" }],
      "meta-persona": cinemaBack
        ? [{ label: "CAST 1", prop: "botName" }, { label: "CAST 2", prop: "personaName" }]
        : (state.template === "polaroid" && !front
          ? [{ label: "하단 반복 이름", prop: "personaName" }]
          : [{ label: "내용", prop: "personaName" }]),
      "meta-date-label": [{ label: "항목명", prop: "dateLabel" }],
      "meta-date": [{ label: "내용", prop: "date" }],
      "postcard-model": [{ label: "항목명", prop: "postcardModelLabel" }, { label: "내용", prop: "postcardModel" }],
      "postcard-prompt": [{ label: "항목명", prop: "postcardPromptLabel" }, { label: "내용", prop: "postcardPrompt" }],
      "postcard-card-title": [{ label: "엽서 제목", prop: "postcardCardTitle" }],
      "postcard-card-subtitle": [{ label: "엽서 부제", prop: "postcardCardSubtitle" }],
      "postcard-from-label": [{ label: "FROM 항목명", prop: "botLabel" }],
      "postcard-from-value": [{ label: "보낸 사람", prop: "botName" }],
      "postcard-to-label": [{ label: "TO 항목명", prop: "personaLabel" }],
      "postcard-to-value": [{ label: "받는 사람", prop: "personaName" }],
      "postcard-date-label": [{ label: "날짜 항목명", prop: "dateLabel" }],
      "postcard-date-value": [{ label: "날짜", prop: "date" }],
      "postcard-model-label": [{ label: "모델 항목명", prop: "postcardModelLabel" }],
      "postcard-model-value": [{ label: "모델", prop: "postcardModel" }],
      "postcard-prompt-label": [{ label: "프롬프트 항목명", prop: "postcardPromptLabel" }],
      "postcard-prompt-value": [{ label: "프롬프트", prop: "postcardPrompt" }],
      "postcard-writing-1": [{ label: "필기 문장 1", prop: "postcardWriting1" }],
      "postcard-writing-2": [{ label: "필기 문장 2", prop: "postcardWriting2" }],
      "postcard-writing-3": [{ label: "필기 문장 3", prop: "postcardWriting3" }],
      "postcard-writing-4": [{ label: "필기 문장 4", prop: "postcardWriting4" }],
      "record-meta-bot-label": [{ label: "항목명", prop: "botLabel" }],
      "record-meta-bot": [{ label: "내용", prop: "botName" }],
      "record-meta-persona-label": [{ label: "항목명", prop: "personaLabel" }],
      "record-meta-persona": [{ label: "내용", prop: "personaName" }],
      "record-meta-date-label": [{ label: "항목명", prop: "dateLabel" }],
      "record-meta-date": [{ label: "내용", prop: "date" }],
      quote: [{ label: front ? "대표 대사" : "뒷면 제목", prop: front ? "quote" : "backTitle" }],
      speaker: [{ label: "화자", prop: "speaker" }],
      "handwritten-note": [{ label: "앞면 필기 문장", prop: "handwrittenNote" }],
      "copy-label": [{ label: "카피 라벨", prop: "backCopyLabel" }],
      body: [{ label: "본문", prop: "backBody" }],
      "source-label": [{ label: "SEAT", prop: "sourceLabel" }],
      source: state.template === "train"
        ? [{ label: "항목명", prop: "sourceLabel" }, { label: "내용", prop: "source" }]
        : [{ label: cinemaBack ? "SEAT" : (templateConfig(state.template).sourceLabel || "REFERENCE") + " 내용", prop: "source" }],
      "back-note-label": [{ label: "THEATER", prop: "backNoteLabel" }],
      "back-note": [{ label: cinemaBack ? "THEATER" : "뒷면 메모", prop: "backNote" }],
      "serial-label": [{ label: cinemaBack ? "SCREEN" : "일련번호 항목명", prop: "serialLabel" }],
      serial: [{ label: cinemaBack ? "SCREEN" : "일련번호", prop: "serial" }],
      "serial-copy": [{ label: "항목명", prop: "serialCopyLabel" }, { label: "스텁 일련번호", prop: "serial" }],
      coach: [{ label: "항목명", prop: "coachLabel" }, { label: "내용", prop: "coachNumber" }],
      "stub-topline": [{ label: "스텁 상단 문구", prop: "stubTopline" }],
      "admit-copy": [{ label: "입장 표기", prop: "admitText" }],
      "stub-title": [{ label: "운행명", prop: "stubTitle" }],
      platform: [{ label: "등급 / 탑승 정보", prop: "platformText" }],
      validation: [{ label: front ? "검표 문구" : "검표 도장", prop: front ? "validationText" : "backStamp" }],
      barcode: [{ label: front || mirroredTrainCoupon ? "바코드 문자열" : "뒷면 바코드", prop: front || mirroredTrainCoupon ? "barcode" : "backBarcode" }],
      "rating-label": [{ label: "평점 라벨", prop: "ratingLabel" }],
      "rating-marks": [{ label: "평점 기호", prop: "ratingMark" }],
      "rating-score": [{ label: "평점 점수 표기", prop: "ratingScore" }],
      "cinema-etc-label": [{ label: "ETC. 항목명", prop: "cinemaEtcLabel" }],
      "cinema-etc": [{ label: "ETC.", prop: "postcardModel" }],
      seal: [{ label: "철도 운영사 인장", prop: "sealText" }]
    };
    return map[key] || [];
  }
  function inlineStyleFieldStore(side, layerKey, property, create) {
    if (!state.inlineTextStyles) {
      if (!create) return [];
      state.inlineTextStyles = { front: {}, back: {} };
    }
    if (!state.inlineTextStyles[side]) {
      if (!create) return [];
      state.inlineTextStyles[side] = {};
    }
    if (!state.inlineTextStyles[side][layerKey]) {
      if (!create) return [];
      state.inlineTextStyles[side][layerKey] = {};
    }
    if (!state.inlineTextStyles[side][layerKey][property]) {
      if (!create) return [];
      state.inlineTextStyles[side][layerKey][property] = [];
    }
    return state.inlineTextStyles[side][layerKey][property];
  }
  function nativeInlineTextRuns(layerKey, side, property) {
    return inlineStyleFieldStore(canonicalTrainCouponSide(side, layerKey, state), layerKey, property, false);
  }
  function nativeInlineTextTarget(layerKey, side, property) {
    var front = side === "front";
    var ids = {
      kicker: { kicker: front ? "#templateKicker" : "#backKickerPreview", backKicker: "#backKickerPreview" },
      title: { title: front ? "#ticketTitleText" : "#backHeadingText", backHeading: "#backHeadingText" },
      subtitle: { subtitle: front ? "#ticketSubtitlePreview" : "#backSubtitlePreview" },
      "meta-bot-label": { botLabel: front ? "#botLabelPreview" : "#backBotLabelPreview" },
      "meta-bot": { botName: front ? "#botNamePreview" : "#backBotPreview", postcardPrompt: "#backBotPreview" },
      "meta-persona-label": { personaLabel: front ? "#personaLabelPreview" : "#backPersonaLabelPreview" },
      "meta-persona": { botName: "#backPersonaPreview", personaName: front ? "#personaNamePreview" : "#backPersonaPreview" },
      "meta-date-label": { dateLabel: front ? "#dateLabelPreview" : "#backDateLabelPreview" },
      "meta-date": { date: front ? "#datePreview" : "#backDatePreview" },
      "record-meta-bot-label": { botLabel: "#backRecordBotLabelPreview" },
      "record-meta-bot": { botName: "#backRecordBotPreview" },
      "record-meta-persona-label": { personaLabel: "#backRecordPersonaLabelPreview" },
      "record-meta-persona": { personaName: "#backRecordPersonaPreview" },
      "record-meta-date-label": { dateLabel: "#backRecordDateLabelPreview" },
      "record-meta-date": { date: "#backRecordDatePreview" },
      quote: { quote: "#quotePreview", backTitle: "#backTitlePreview" },
      speaker: { speaker: "#speakerPreview" },
      "handwritten-note": { handwrittenNote: "#trainHandwrittenNotePreview" },
      "copy-label": { backCopyLabel: "#backCopyLabelPreview" },
      body: { backBody: "#backBodyPreview" },
      "source-label": { sourceLabel: "#backSourceLabelPreview" },
      source: { sourceLabel: front ? "#sourcePreview .coupon-label" : "#backSourcePreview .coupon-label", source: front ? "#sourcePreviewValue" : "#backSourcePreviewValue" },
      "back-note-label": { backNoteLabel: "#backNoteLabelPreview" },
      "back-note": { backNote: "#backNotePreview" },
      "serial-label": { serialLabel: front ? "#frontSerialLabelPreview" : "#backSerialLabelPreview" },
      serial: { serial: front ? "#serialPreview" : "#backSerial" },
      "serial-copy": { serialCopyLabel: front ? "#serialCopyLabelPreview" : "#backSerialCopyLabelPreview", serial: front ? "#serialCopyValue" : "#backSerialCopyValue" },
      coach: { coachLabel: front ? "#coachLabelPreview" : "#backCoachLabelPreview", coachNumber: front ? "#coachNumberPreview" : "#backCoachNumberPreview" },
      "stub-topline": { stubTopline: front ? "#stubToplinePreview" : "#backStubToplinePreview" },
      "admit-copy": { admitText: front ? "#admitTextPreview" : "#backAdmitTextPreview" },
      "stub-title": { stubTitle: front ? "#stubTitlePreview" : "#backStubTitlePreview" },
      platform: { platformText: front ? "#platformTextPreview" : "#backPlatformTextPreview" },
      validation: { validationText: "#validationTextPreview", backStamp: "#backValidationTextPreview" },
      "rating-label": { ratingLabel: "#ratingLabelPreview" },
      "rating-marks": { ratingMark: "#ratingGlyphsPreview" },
      "rating-score": { ratingScore: "#ratingScorePreview" },
      "cinema-etc-label": { cinemaEtcLabel: "#cinemaEtcLabelPreview" },
      "cinema-etc": { postcardModel: "#cinemaEtcPreview" },
      seal: { sealText: "#sealTextPreview" },
      "postcard-card-title": { postcardCardTitle: "#postcardCardTitlePreview" },
      "postcard-card-subtitle": { postcardCardSubtitle: "#postcardCardSubtitlePreview" },
      "postcard-from-label": { botLabel: "#postcardFromLabelPreview" },
      "postcard-from-value": { botName: "#postcardFromValuePreview" },
      "postcard-to-label": { personaLabel: "#postcardToLabelPreview" },
      "postcard-to-value": { personaName: "#postcardToValuePreview" },
      "postcard-date-label": { dateLabel: "#postcardDateLabelPreview" },
      "postcard-date-value": { date: "#postcardDateValuePreview" },
      "postcard-model-label": { postcardModelLabel: "#postcardModelLabelLayerPreview" },
      "postcard-model-value": { postcardModel: "#postcardModelValueLayerPreview" },
      "postcard-prompt-label": { postcardPromptLabel: "#postcardPromptLabelLayerPreview" },
      "postcard-prompt-value": { postcardPrompt: "#postcardPromptValueLayerPreview" },
      "postcard-writing-1": { postcardWriting1: "#postcardWriting1Preview" },
      "postcard-writing-2": { postcardWriting2: "#postcardWriting2Preview" },
      "postcard-writing-3": { postcardWriting3: "#postcardWriting3Preview" },
      "postcard-writing-4": { postcardWriting4: "#postcardWriting4Preview" }
    };
    var selector = ids[layerKey] && ids[layerKey][property];
    return selector ? $(selector) : null;
  }
  function trackedTextSelectionMatches(kind) {
    if (!trackedTextSelection || trackedTextSelection.kind !== kind || trackedTextSelection.end <= trackedTextSelection.start) return false;
    if (kind === "custom") {
      var custom = activeCustomLayer();
      return Boolean(custom && custom.type === "text" && custom.id === trackedTextSelection.layerKey);
    }
    return trackedTextSelection.layerKey === state.selectedLayer && trackedTextSelection.side === state.side;
  }
  function activeTrackedInlineRuns(create) {
    if (!trackedTextSelection || trackedTextSelection.end <= trackedTextSelection.start) return null;
    if (trackedTextSelection.kind === "custom") {
      var custom = customLayerById(trackedTextSelection.layerKey);
      if (!custom || custom.type !== "text") return null;
      if (!Array.isArray(custom.inlineTextStyles) && create) custom.inlineTextStyles = [];
      return Array.isArray(custom.inlineTextStyles) ? custom.inlineTextStyles : [];
    }
    var side = canonicalTrainCouponSide(trackedTextSelection.side, trackedTextSelection.layerKey, state);
    return inlineStyleFieldStore(side, trackedTextSelection.layerKey, trackedTextSelection.property, create);
  }
  function inlineRunStyleAt(runs, index) {
    var style = {};
    (runs || []).forEach(function (run) {
      if (run.start <= index && run.end > index) Object.keys(run).forEach(function (key) {
        if (key !== "start" && key !== "end") style[key] = run[key];
      });
    });
    return style;
  }
  function nativeTypingStyleField(side, layerKey, property, create) {
    side = canonicalTrainCouponSide(side, layerKey, state);
    if (!state.textTypingStyles && create) state.textTypingStyles = { front: {}, back: {} };
    if (!state.textTypingStyles) return null;
    if (!state.textTypingStyles[side] && create) state.textTypingStyles[side] = {};
    var sideStore = state.textTypingStyles[side];
    if (!sideStore) return null;
    if (!sideStore[layerKey] && create) sideStore[layerKey] = {};
    var layerStore = sideStore[layerKey];
    if (!layerStore) return null;
    if (!layerStore[property] && create) layerStore[property] = {};
    return layerStore[property] || null;
  }
  function inlineStyleValuesMatch(first, second) {
    var firstNumber = Number(first);
    var secondNumber = Number(second);
    if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) return Math.abs(firstNumber - secondNumber) < .0001;
    return String(first == null ? "" : first) === String(second == null ? "" : second);
  }
  function trackedInlineStyleValue(kind, property, fallback) {
    if (!trackedTextSelectionMatches(kind)) return fallback;
    var runs = activeTrackedInlineRuns(false) || [];
    var start = trackedTextSelection.start;
    var end = trackedTextSelection.end;
    var boundaries = [start, end];
    canonicalInlineRuns(runs, activeTrackedTextLength()).forEach(function (run) {
      if (run.start > start && run.start < end) boundaries.push(run.start);
      if (run.end > start && run.end < end) boundaries.push(run.end);
    });
    boundaries = boundaries.filter(function (value, index, list) { return list.indexOf(value) === index; }).sort(function (a, b) { return a - b; });
    var value;
    for (var index = 0; index < boundaries.length - 1; index += 1) {
      var style = inlineRunStyleAt(runs, boundaries[index]);
      var nextValue = style[property] == null ? fallback : style[property];
      if (index === 0) value = nextValue;
      else if (!inlineStyleValuesMatch(value, nextValue)) return fallback;
    }
    return value == null ? fallback : value;
  }
  function removeInlineStyleProperty(runs, property, textLength) {
    if (!Array.isArray(runs) || !runs.length) return;
    var next = canonicalInlineRuns(runs, textLength).map(function (run) {
      var clean = Object.assign({}, run);
      delete clean[property];
      return clean;
    }).filter(function (run) {
      return Object.keys(run).some(function (key) { return key !== "start" && key !== "end"; });
    });
    runs.splice(0, runs.length);
    Array.prototype.push.apply(runs, canonicalInlineRuns(next, textLength));
  }
  function removeNativeInlineStyleProperty(side, layerKey, property) {
    var canonicalSide = canonicalTrainCouponSide(side, layerKey, state);
    var layerFields = state.inlineTextStyles && state.inlineTextStyles[canonicalSide] && state.inlineTextStyles[canonicalSide][layerKey];
    if (layerFields) Object.keys(layerFields).forEach(function (textProperty) {
        if (!Array.isArray(layerFields[textProperty])) { delete layerFields[textProperty]; return; }
        var textLength = String(state[textProperty] == null ? "" : state[textProperty]).length;
        removeInlineStyleProperty(layerFields[textProperty], property, textLength);
        if (!layerFields[textProperty].length) delete layerFields[textProperty];
      });
    var typingFields = state.textTypingStyles && state.textTypingStyles[canonicalSide] && state.textTypingStyles[canonicalSide][layerKey];
    if (typingFields) Object.keys(typingFields).forEach(function (textProperty) {
      delete typingFields[textProperty][property];
      if (!Object.keys(typingFields[textProperty]).length) delete typingFields[textProperty];
    });
  }
  function removeCustomInlineStyleProperty(layer, property) {
    if (!layer || layer.type !== "text") return;
    removeInlineStyleProperty(layer.inlineTextStyles, property, String(layer.text || "").length);
    if (layer.typingStyle) delete layer.typingStyle[property];
  }
  function canonicalInlineRuns(runs, textLength) {
    var normalized = normalizeInlineStyleRuns(runs, textLength);
    var boundaries = [0, Math.max(0, textLength)];
    normalized.forEach(function (run) { boundaries.push(run.start, run.end); });
    boundaries = boundaries.filter(function (value, index, list) { return list.indexOf(value) === index; }).sort(function (a, b) { return a - b; });
    var result = [];
    boundaries.slice(0, -1).forEach(function (start, index) {
      var end = boundaries[index + 1];
      if (end <= start) return;
      var style = inlineRunStyleAt(normalized, start);
      if (!Object.keys(style).length) return;
      var signature = JSON.stringify(style);
      var previous = result[result.length - 1];
      if (previous && previous.end === start && previous.signature === signature) previous.end = end;
      else result.push(Object.assign({ start: start, end: end, signature: signature }, style));
    });
    return result.map(function (run) { delete run.signature; return run; });
  }
  function activeTrackedTextLength() {
    if (!trackedTextSelection) return 0;
    if (trackedTextSelection.kind === "custom") {
      var custom = customLayerById(trackedTextSelection.layerKey);
      return custom ? String(custom.text || "").length : 0;
    }
    return String(state[trackedTextSelection.property] == null ? "" : state[trackedTextSelection.property]).length;
  }
  function applyInlineStyleToTrackedSelection(patch) {
    if (!trackedTextSelection || trackedTextSelection.end <= trackedTextSelection.start) return false;
    var trackedCustom = trackedTextSelection.kind === "custom" ? customLayerById(trackedTextSelection.layerKey) : null;
    var differenceColor = trackedTextSelection.kind === "native"
      ? nativeTextColorMode(trackedTextSelection.layerKey, trackedTextSelection.side) === "difference"
      : trackedCustom && customTextColorMode(trackedCustom) === "difference";
    if (patch && patch.color && differenceColor) {
      showToast("자동 반전 색상에서는 부분 글자색을 지정할 수 없어요.");
      return false;
    }
    var runs = activeTrackedInlineRuns(true);
    if (!runs) return false;
    var textLength = activeTrackedTextLength();
    var start = clamp(trackedTextSelection.start, 0, textLength);
    var end = clamp(trackedTextSelection.end, start, textLength);
    var next = [];
    canonicalInlineRuns(runs, textLength).forEach(function (run) {
      if (run.end <= start || run.start >= end) { next.push(run); return; }
      if (run.start < start) next.push(Object.assign({}, run, { end: start }));
      if (run.end > end) next.push(Object.assign({}, run, { start: end }));
    });
    var boundaries = [start, end];
    canonicalInlineRuns(runs, textLength).forEach(function (run) {
      if (run.start > start && run.start < end) boundaries.push(run.start);
      if (run.end > start && run.end < end) boundaries.push(run.end);
    });
    boundaries = boundaries.filter(function (value, index, list) { return list.indexOf(value) === index; }).sort(function (a, b) { return a - b; });
    boundaries.slice(0, -1).forEach(function (partStart, index) {
      var partEnd = boundaries[index + 1];
      var style = inlineRunStyleAt(runs, partStart);
      Object.keys(patch || {}).forEach(function (key) {
        if (patch[key] == null || patch[key] === "") delete style[key];
        else style[key] = patch[key];
      });
      if (Object.keys(style).length) next.push(Object.assign({ start: partStart, end: partEnd }, style));
    });
    var canonical = canonicalInlineRuns(next, textLength);
    runs.splice(0, runs.length);
    Array.prototype.push.apply(runs, canonical);
    return true;
  }
  function clearTrackedInlineStyles() {
    if (!trackedTextSelection || trackedTextSelection.end <= trackedTextSelection.start) return false;
    var runs = activeTrackedInlineRuns(false);
    if (!runs) return false;
    var textLength = activeTrackedTextLength();
    var start = trackedTextSelection.start;
    var end = trackedTextSelection.end;
    var next = [];
    canonicalInlineRuns(runs, textLength).forEach(function (run) {
      if (run.end <= start || run.start >= end) next.push(run);
      else {
        if (run.start < start) next.push(Object.assign({}, run, { end: start }));
        if (run.end > end) next.push(Object.assign({}, run, { start: end }));
      }
    });
    runs.splice(0, runs.length);
    Array.prototype.push.apply(runs, canonicalInlineRuns(next, textLength));
    return true;
  }
  function inlineSelectionHasStyle() {
    var runs = activeTrackedInlineRuns(false) || [];
    return Boolean(trackedTextSelection && runs.some(function (run) {
      return run.start < trackedTextSelection.end && run.end > trackedTextSelection.start;
    }));
  }
  function renderPartialTextStatus(kind) {
    var prefix = kind === "custom" ? "custom" : "layer";
    var selectionKind = kind === "custom" ? "custom" : "native";
    var tools = $("#" + prefix + "PartialTextTools");
    var status = $("#" + prefix + "PartialTextStatus");
    var clearButton = $("#clear" + (kind === "custom" ? "Custom" : "Layer") + "PartialStyle");
    if (!tools || !status || !clearButton) return;
    var selected = trackedTextSelectionMatches(selectionKind);
    var count = selected ? trackedTextSelection.end - trackedTextSelection.start : 0;
    var styled = selected && inlineSelectionHasStyle();
    tools.classList.toggle("has-selection", selected);
    tools.classList.toggle("has-partial-style", styled);
    status.textContent = selected ? count + "자 선택됨 · 아래 글자 옵션은 선택 부분에만 적용됩니다." : "텍스트에서 서식을 다르게 할 부분을 선택하세요.";
    clearButton.disabled = !styled;
  }
  function rebaseInlineRunsForTextEdit(runs, oldValue, newValue, selectionStart, preserveTrackedSelection, fallbackStyle) {
    if (!Array.isArray(runs) || oldValue === newValue) return;
    var canonicalBefore = canonicalInlineRuns(runs, oldValue.length);
    var prefix = 0;
    while (prefix < oldValue.length && prefix < newValue.length && oldValue[prefix] === newValue[prefix]) prefix += 1;
    var oldSuffix = oldValue.length;
    var newSuffix = newValue.length;
    while (oldSuffix > prefix && newSuffix > prefix && oldValue[oldSuffix - 1] === newValue[newSuffix - 1]) { oldSuffix -= 1; newSuffix -= 1; }
    var removed = oldSuffix - prefix;
    var inserted = newSuffix - prefix;
    var delta = inserted - removed;
    var inheritedStyle = inserted > 0
      ? inlineRunStyleAt(canonicalBefore, prefix > 0 ? prefix - 1 : oldSuffix)
      : {};
    if (inserted > 0 && oldValue.length === 0 && !Object.keys(inheritedStyle).length) {
      inheritedStyle = normalizeInlineStylePatch(fallbackStyle);
    }
    var next = [];
    canonicalBefore.forEach(function (run) {
      if (run.end <= prefix) next.push(run);
      else if (run.start >= oldSuffix) next.push(Object.assign({}, run, { start: run.start + delta, end: run.end + delta }));
      else {
        if (run.start < prefix) next.push(Object.assign({}, run, { end: prefix }));
        if (run.end > oldSuffix) next.push(Object.assign({}, run, { start: prefix + inserted, end: run.end + delta }));
      }
    });
    if (inserted > 0 && Object.keys(inheritedStyle).length) {
      next.push(Object.assign({ start: prefix, end: prefix + inserted }, inheritedStyle));
    }
    runs.splice(0, runs.length);
    Array.prototype.push.apply(runs, canonicalInlineRuns(next, newValue.length));
    if (trackedTextSelection && !preserveTrackedSelection) {
      trackedTextSelection.start = clamp(selectionStart, 0, newValue.length);
      trackedTextSelection.end = trackedTextSelection.start;
    }
  }
  function rebaseNativeInlineProperty(property, oldValue, newValue, selectionStart) {
    var previous = String(oldValue == null ? "" : oldValue);
    var nextValue = String(newValue == null ? "" : newValue);
    if (previous === nextValue) return;
    ["front", "back"].forEach(function (side) {
      var sideStyles = state.inlineTextStyles && state.inlineTextStyles[side] || {};
      var sideTypingStyles = state.textTypingStyles && state.textTypingStyles[side] || {};
      var layerKeys = Object.keys(sideStyles).concat(Object.keys(sideTypingStyles)).filter(function (key, index, list) {
        return list.indexOf(key) === index;
      });
      layerKeys.forEach(function (layerKey) {
        var rememberedTypingStyle = nativeTypingStyleField(side, layerKey, property, false);
        var runs = sideStyles[layerKey] && sideStyles[layerKey][property];
        if (!Array.isArray(runs) && !previous.length && nextValue.length && rememberedTypingStyle) {
          runs = inlineStyleFieldStore(side, layerKey, property, true);
        }
        if (!Array.isArray(runs)) return;
        if (previous.length && !nextValue.length) {
          var remembered = normalizeInlineStylePatch(inlineRunStyleAt(canonicalInlineRuns(runs, previous.length), previous.length - 1));
          if (Object.keys(remembered).length) {
            var typingStyle = nativeTypingStyleField(side, layerKey, property, true);
            Object.keys(typingStyle).forEach(function (key) { delete typingStyle[key]; });
            Object.assign(typingStyle, remembered);
          }
        }
        rebaseInlineRunsForTextEdit(runs, previous, nextValue, nextValue.length, true, rememberedTypingStyle);
      });
    });
    if (trackedTextSelection && trackedTextSelection.property === property) {
      trackedTextSelection.start = clamp(Number.isFinite(selectionStart) ? selectionStart : nextValue.length, 0, nextValue.length);
      trackedTextSelection.end = trackedTextSelection.start;
    }
  }
  function setNativeTextProperty(property, value) {
    var previous = state[property] == null ? "" : String(state[property]);
    var nextValue = String(value == null ? "" : value);
    rebaseNativeInlineProperty(property, previous, nextValue);
    state[property] = nextValue;
  }
  function trackTextareaSelection(textarea, kind, fieldIndex) {
    if (!textarea || textarea.selectionEnd <= textarea.selectionStart) {
      trackedTextSelection = null;
      renderInspector();
      return;
    }
    if (kind === "custom") {
      var custom = activeCustomLayer();
      if (!custom || custom.type !== "text" || (custom.styledRuns || []).length || (custom.styledShapes || []).length) {
        trackedTextSelection = null;
        renderInspector();
        return;
      }
      trackedTextSelection = { kind: "custom", layerKey: custom.id, side: custom.side, property: "text", start: textarea.selectionStart, end: textarea.selectionEnd };
    } else {
      var field = textFieldsForLayer(state.selectedLayer, state.side)[fieldIndex];
      if (!field) return;
      var directTarget = nativeInlineTextTarget(state.selectedLayer, state.side, field.prop);
      var directValue = state[field.prop] == null ? "" : String(state[field.prop]);
      var supportedPolaroidRepeat = state.template === "polaroid" && state.side === "back" && (field.prop === "botName" || field.prop === "personaName");
      var supportedCinemaRatingRepeat = state.template === "cinema" && state.side === "back" && field.prop === "ratingMark";
      var supportedSpeaker = field.prop === "speaker";
      var supportedCinemaCast = state.template === "cinema" && state.side === "back" && state.selectedLayer === "meta-persona"
        && (field.prop === "botName" || field.prop === "personaName");
      var supportedCinemaKicker = state.template === "cinema" && state.side === "back" && state.selectedLayer === "kicker" && field.prop === "backKicker";
      var unsupportedDerived = directTarget && directTarget.textContent !== directValue
        && !supportedPolaroidRepeat && !supportedCinemaRatingRepeat && !supportedSpeaker && !supportedCinemaCast && !supportedCinemaKicker;
      if (!directTarget || unsupportedDerived) {
        trackedTextSelection = null;
        renderInspector();
        $("#layerPartialTextStatus").textContent = "자동 조합되는 이 텍스트는 레이어 전체 서식만 지원합니다.";
        return;
      }
      trackedTextSelection = { kind: "native", layerKey: state.selectedLayer, side: state.side, property: field.prop, start: textarea.selectionStart, end: textarea.selectionEnd };
    }
    renderInspector();
  }
  function renderNativeInlineTextStyles() {
    ["front", "back"].forEach(function (side) {
      TEXT_LAYER_KEYS.forEach(function (layerKey) {
        if (!layerAvailableOnSide(layerKey, side, state)) return;
        var canonicalSide = canonicalTrainCouponSide(side, layerKey, state);
        var fields = state.inlineTextStyles && state.inlineTextStyles[canonicalSide] && state.inlineTextStyles[canonicalSide][layerKey] || {};
        Object.keys(fields).forEach(function (property) {
          var node = nativeInlineTextTarget(layerKey, side, property);
          if (!node || !document.documentElement.contains(node)) return;
          var textValue = state[property] == null ? "" : String(state[property]);
          var suppressColor = nativeTextColorMode(layerKey, side) === "difference";
          if (property === "speaker") {
            renderSpeakerInlineText(node, textValue, fields[property], suppressColor);
            return;
          }
          if (state.template === "cinema" && side === "back" && layerKey === "kicker" && property === "backKicker") {
            renderCinemaBackKickerInline(node, textValue, fields[property], suppressColor);
            return;
          }
          if (state.template === "cinema" && side === "back" && layerKey === "meta-persona"
            && (property === "botName" || property === "personaName")) {
            renderCinemaCastInlineText(node, fields, suppressColor);
            return;
          }
          if (state.template === "polaroid" && side === "back" && property === "botName") {
            renderPolaroidInlineRepeat(node, textValue, 5, "Bot name", fields[property], suppressColor);
            return;
          }
          if (state.template === "polaroid" && side === "back" && property === "personaName") {
            renderPolaroidInlineRepeat(node, textValue, 3, "Persona name", fields[property], suppressColor);
            return;
          }
          if (state.template === "cinema" && side === "back" && property === "ratingMark") {
            renderCinemaRatingInlineRepeat(node, textValue, 5, fields[property], suppressColor);
            return;
          }
          /* Derived renderers (auto pair titles, repeated polaroid strips,
             split cinema metadata) own their internal markup. Only adapt a
             direct text leaf when its rendered copy still matches the field. */
          if (String(node.textContent || "") !== textValue) return;
          renderDirectNativeInlineText(node, textValue, fields[property], suppressColor);
        });
      });
    });
  }
  function layerStyleEntry(side, key, create) {
    side = canonicalTrainCouponSide(side, key, state);
    if (!state.layerStyles) state.layerStyles = defaultLayerStyles();
    if (!state.layerStyles[side]) state.layerStyles[side] = {};
    if (!state.layerStyles[side][key] && create) state.layerStyles[side][key] = {};
    return state.layerStyles[side][key] || null;
  }
  function isCinemaFrontFrameColor(key, side, documentState) {
    var source = documentState || state;
    return Boolean(source && source.template === "cinema" && side === "front" && key === "frame");
  }
  function isPostcardStampBorderColor(key, side, documentState) {
    var source = documentState || state;
    return Boolean(source && source.template === "postcard" && side === "back" && key === "image-stub");
  }
  function isIndependentFrameColor(key, side, documentState) {
    return isCinemaFrontFrameColor(key, side, documentState) || isPostcardStampBorderColor(key, side, documentState);
  }
  function selectedLayerBaseColor(key, side, documentState) {
    var source = documentState || state;
    if (isCinemaFrontFrameColor(key, side || source.side, source)) return CINEMA_FRONT_FRAME_DEFAULT_COLOR;
    if (isPostcardStampBorderColor(key, side || source.side, source)) return POSTCARD_STAMP_BORDER_DEFAULT_COLOR;
    return FRAME_COLOR_LAYER_KEYS.indexOf(key) >= 0 ? source.accent : source.quoteColor;
  }
  function effectiveLayerColor(key, side) {
    side = side || state.side;
    var style = layerStyleEntry(side, key, false);
    return style && style.color || selectedLayerBaseColor(key, side, state);
  }
  function nativeTextColorMode(key, side) {
    if (TEXT_LAYER_KEYS.indexOf(key) < 0) return "solid";
    side = side || state.side;
    var style = layerStyleEntry(side, key, false);
    if (style && TEXT_COLOR_MODES.indexOf(style.colorMode) >= 0) return style.colorMode;
    if (key === "quote" && side === "front" && TEXT_COLOR_MODES.indexOf(state.quoteEffect) >= 0) return state.quoteEffect;
    return "solid";
  }
  function customTextColorMode(layer) {
    return layer && layer.type === "text" && TEXT_COLOR_MODES.indexOf(layer.colorMode) >= 0 ? layer.colorMode : "solid";
  }
  var TRAIN_PERFORATION_SPEC = Object.freeze({
    lineWidth: .76,
    dash: 3.15,
    gap: 4.85,
    alpha: .58,
    endInset: 2.4,
    backingScale: 4
  });
  function paintTrainPerforation(canvas, side) {
    if (!canvas) return;
    var width = Math.max(1, canvas.clientWidth);
    var height = Math.max(1, canvas.clientHeight);
    var ratio = Math.max(TRAIN_PERFORATION_SPEC.backingScale, Math.ceil(window.devicePixelRatio || 1));
    var pixelWidth = Math.max(1, Math.round(width * ratio));
    var pixelHeight = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    var context = canvas.getContext("2d", { alpha: true });
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.strokeStyle = effectiveLayerColor("route-art", side);
    context.globalAlpha = TRAIN_PERFORATION_SPEC.alpha;
    context.lineWidth = TRAIN_PERFORATION_SPEC.lineWidth;
    context.lineCap = "round";
    var usable = Math.max(TRAIN_PERFORATION_SPEC.dash, height - TRAIN_PERFORATION_SPEC.endInset * 2);
    var count = Math.max(1, Math.floor((usable + TRAIN_PERFORATION_SPEC.gap) / (TRAIN_PERFORATION_SPEC.dash + TRAIN_PERFORATION_SPEC.gap)));
    var patternHeight = count * TRAIN_PERFORATION_SPEC.dash + Math.max(0, count - 1) * TRAIN_PERFORATION_SPEC.gap;
    var y = (height - patternHeight) / 2;
    var x = width / 2;
    for (var index = 0; index < count; index++) {
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x, y + TRAIN_PERFORATION_SPEC.dash);
      context.stroke();
      y += TRAIN_PERFORATION_SPEC.dash + TRAIN_PERFORATION_SPEC.gap;
    }
  }
  function paintTrainPerforations() {
    if (state.template !== "train") return;
    paintTrainPerforation(frontFace.querySelector("canvas.perforation"), "front");
    paintTrainPerforation(backFace.querySelector("canvas.perforation"), "back");
  }
  function renderLayerTextInspector() {
    var fields = textFieldsForLayer(state.selectedLayer, state.side);
    var definition = layerDefinition(state.selectedLayer);
    var label = layerLabel(definition, state.side, state);
    $("#layerTextInspectorName").textContent = label ? label[0] : "텍스트";
    [0, 1].forEach(function (index) {
      var wrapper = $("#layerTextField" + (index ? "B" : "A"));
      var field = fields[index];
      wrapper.hidden = !field;
      if (!field) return;
      wrapper.querySelector("span").textContent = field.label;
      var textarea = wrapper.querySelector("textarea");
      var nextValue = state[field.prop] == null ? "" : String(state[field.prop]);
      if (textarea.value !== nextValue) textarea.value = nextValue;
    });
    renderPartialTextStatus("layer");
  }
  function renderLayerStyleInspector() {
    var key = state.selectedLayer;
    var custom = activeCustomLayer();
    var customText = Boolean(custom && custom.type === "text");
    var style = customText ? {
      color: custom.color,
      fontSize: custom.fontSize,
      fontFamily: custom.font,
      fontWeight: custom.fontWeight,
      fontStyle: custom.fontStyle,
      textAlign: custom.align,
      writingMode: custom.writingMode,
      letterSpacing: custom.letterSpacing === "normal" ? 0 : finiteNumber(parseFloat(custom.letterSpacing), 0),
      lineHeight: custom.lineHeight === "normal" ? 1.35 : finiteNumber(parseFloat(custom.lineHeight), 1.35)
    } : (layerStyleEntry(state.side, key, false) || {});
    var face = state.side === "front" ? frontFace : backFace;
    var node = key ? face.querySelector('[data-canvas-layer="' + key + '"]') : null;
    /* Whole-layer controls describe the canvas layer, but substring controls
       must start from the actual editable text leaf. Metadata rows and other
       stock layers often give their label/value leaves different font metrics;
       reading the outer row made the inspector show a false size/line-height
       and the first edit caused a visible geometry jump. */
    var inlineComputedNode = !customText && trackedTextSelectionMatches("native")
      ? nativeInlineTextTarget(key, state.side, trackedTextSelection.property)
      : null;
    var computedNode = inlineComputedNode || node;
    var computed = computedNode ? window.getComputedStyle(computedNode) : null;
    var independentFrameColor = !customText && isIndependentFrameColor(key, state.side, state);
    var fallbackColor = customText ? custom.color : independentFrameColor
      ? selectedLayerBaseColor(key, state.side, state)
      : (computed ? rgbToHex(computed.color, selectedLayerBaseColor(key, state.side, state)) : selectedLayerBaseColor(key, state.side, state));
    var baseColor = style.color || fallbackColor;
    var textKind = customText ? "custom" : "native";
    var displayedColor = trackedInlineStyleValue(textKind, "color", baseColor);
    setInputValue("#layerColorInput", displayedColor);
    $("#layerColorCode").textContent = String(displayedColor || baseColor).toUpperCase();
    var textLayer = customText || TEXT_LAYER_KEYS.indexOf(key) >= 0;
    $("#layerTypographyFields").hidden = !textLayer;
    $("#layerTextColorModeFields").hidden = !textLayer;
    var textColorMode = customText ? customTextColorMode(custom) : nativeTextColorMode(key, state.side);
    $$('input[name="layerTextColorMode"]').forEach(function (input) {
      input.checked = input.value === textColorMode;
    });
    $("#layerTextColorModeHint").textContent = textColorMode === "difference"
      ? "배경과 겹치는 글자를 자동으로 반전합니다."
      : "선택한 글자색을 그대로 사용합니다.";
    var computedLetter = computed && computed.letterSpacing !== "normal" ? parseFloat(computed.letterSpacing) : 0;
    var computedSize = computed ? parseFloat(computed.fontSize) || 10 : 10;
    var computedLine = computed && computed.lineHeight !== "normal" ? (parseFloat(computed.lineHeight) / computedSize) : 1.2;
    var computedWeight = computed ? parseInt(computed.fontWeight, 10) || 400 : 400;
    var computedStyle = computed ? computed.fontStyle : "normal";
    var baseFontSize = style.fontSize == null ? computedSize : style.fontSize;
    var displayedFontSize = trackedInlineStyleValue(textKind, "fontSize", baseFontSize);
    var baseFontFamily = style.fontFamily || "";
    var displayedFontFamily = trackedInlineStyleValue(textKind, "fontFamily", baseFontFamily);
    var displayedWeight = trackedInlineStyleValue(textKind, "fontWeight", style.fontWeight || String(computedWeight));
    var displayedFontStyle = trackedInlineStyleValue(textKind, "fontStyle", style.fontStyle || computedStyle);
    setInputValue("#layerFontSize", pxToPt(displayedFontSize));
    setInputValue("#layerFontFamily", displayedFontFamily);
    syncFontSelectPreview("#layerFontFamily", displayedFontFamily);
    syncFontSourceTab("layer", displayedFontFamily);
    $("#layerBoldToggle").checked = parseInt(displayedWeight, 10) >= 600;
    $("#layerItalicToggle").checked = displayedFontStyle === "italic";
    $("#layerBoldToggle").indeterminate = false;
    $("#layerItalicToggle").indeterminate = false;
    if (customText && !trackedTextSelectionMatches("custom")) {
      var customRuns = (custom.styledRuns || []).filter(function (run) { return String(run.text || "").length > 0; });
      var customBoldStates = customRuns.map(function (run) { return parseInt(run.fontWeight, 10) >= 600; });
      var customItalicStates = customRuns.map(function (run) { return run.fontStyle === "italic"; });
      $("#layerBoldToggle").checked = customBoldStates.length ? customBoldStates.every(Boolean) : parseInt(custom.fontWeight, 10) >= 600;
      $("#layerBoldToggle").indeterminate = customBoldStates.length > 1 && customBoldStates.some(Boolean) && !customBoldStates.every(Boolean);
      $("#layerItalicToggle").checked = customItalicStates.length ? customItalicStates.every(Boolean) : custom.fontStyle === "italic";
      $("#layerItalicToggle").indeterminate = customItalicStates.length > 1 && customItalicStates.some(Boolean) && !customItalicStates.every(Boolean);
    }
    $("#layerTextAlign").value = style.textAlign || "";
    $("#layerWritingMode").value = style.writingMode === "vertical-rl" ? "vertical-rl" : "horizontal-tb";
    var baseLetterSpacing = style.letterSpacing == null ? Number(computedLetter.toFixed(2)) : style.letterSpacing;
    var displayedLetterSpacing = trackedInlineStyleValue(textKind, "letterSpacing", baseLetterSpacing);
    var baseLineHeight = style.lineHeight == null ? Number(computedLine.toFixed(2)) : style.lineHeight;
    var displayedLineHeight = trackedInlineStyleValue(textKind, "lineHeight", baseLineHeight);
    setInputValue("#layerLetterSpacing", displayedLetterSpacing);
    $("#layerLetterSpacingOut").textContent = $("#layerLetterSpacing").value + "px";
    setInputValue("#layerLineHeight", displayedLineHeight);
    $("#layerLineHeightOut").textContent = $("#layerLineHeight").value;
    var frameColor = !customText && FRAME_COLOR_LAYER_KEYS.indexOf(key) >= 0;
    $("#commonFrameColorFields").hidden = !frameColor || independentFrameColor;
    $("#layerColorModeRow").hidden = !frameColor || independentFrameColor;
    $("#layerColorMode").checked = independentFrameColor || Boolean(style.color);
    $("#layerColorInput").disabled = frameColor && !independentFrameColor && !style.color || textLayer && textColorMode === "difference";
    var layerColorCodeInput = $('[data-color-picker="layerColorInput"]');
    if (layerColorCodeInput) layerColorCodeInput.disabled = frameColor && !independentFrameColor && !style.color || textLayer && textColorMode === "difference";
    $("#layerColorReset").disabled = textLayer && textColorMode === "difference";
    $("#commonAccentColor").value = state.accent;
    $("#commonAccentCode").textContent = state.accent.toUpperCase();
    $("#layerColorLabel").textContent = isPostcardStampBorderColor(key, state.side, state)
      ? "우표 테두리 색상"
      : (independentFrameColor ? "프레임 색상" : (frameColor ? "개별 색상" : "지정 색상"));
  }

  function renderShapeCornerControls(shape) {
    var container = $("#customShapeCornerIndividual");
    var count = shapeCornerCount(shape.shapeKind);
    var rectangleLabels = ["왼쪽 위", "오른쪽 위", "오른쪽 아래", "왼쪽 아래"];
    var labels = shape.shapeKind === "triangle" ? ["위", "오른쪽 아래", "왼쪽 아래"]
      : shape.shapeKind === "star" ? Array.from({ length: 10 }, function (_, index) { return "꼭짓점 " + (index + 1); })
        : rectangleLabels;
    if (container.dataset.shapeKind !== shape.shapeKind) {
      container.replaceChildren();
      labels.forEach(function (label, index) {
        var wrapper = document.createElement("div");
        var caption = document.createElement("span");
        var controls = document.createElement("div");
        var range = document.createElement("input");
        var numberLabel = document.createElement("label");
        var number = document.createElement("input");
        var unit = document.createElement("span");
        wrapper.className = "shape-corner-control";
        controls.className = "shape-corner-control-fields";
        caption.textContent = label;
        range.type = "range";
        range.min = "0";
        range.max = "50";
        range.step = "1";
        range.dataset.shapeCornerIndex = String(index);
        range.setAttribute("aria-label", label + " 둥글기");
        numberLabel.className = "view-number shape-corner-value";
        number.type = "number";
        number.min = "0";
        number.max = "50";
        number.step = "1";
        number.dataset.shapeCornerIndex = String(index);
        number.setAttribute("aria-label", label + " 둥글기 직접 입력");
        unit.textContent = "%";
        numberLabel.appendChild(number);
        numberLabel.appendChild(unit);
        controls.appendChild(range);
        controls.appendChild(numberLabel);
        wrapper.appendChild(caption);
        wrapper.appendChild(controls);
        container.appendChild(wrapper);
      });
      container.dataset.shapeKind = shape.shapeKind;
    }
    var radii = shape.cornerRadii || [];
    while (radii.length < count) radii.push(shape.cornerRadius || 0);
    shape.cornerRadii = radii.slice(0, count);
    container.querySelectorAll('[data-shape-corner-index]').forEach(function (input) { input.value = shape.cornerRadii[Number(input.dataset.shapeCornerIndex)] || 0; });
    container.hidden = shape.cornerMode !== "individual" || count === 0;
  }

  function renderInspector() {
    var definition = layerDefinition(state.selectedLayer);
    var custom = activeCustomLayer();
    var hasSelection = Boolean(definition && layerAvailableOnSide(state.selectedLayer, state.side));
    $("#emptyInspector").hidden = hasSelection;

    var inspectorByLayer = {
      frame: "layer-style", "main-frame": "layer-style", "back-image-frame": "layer-style", "record-divider-top": "layer-style", "record-divider-middle": "layer-style", "stub-frame": "layer-style", "stub-divider": "layer-style", "route-art": "layer-style",
      "block-main": "block-main", "block-stub": "block-stub", "image-main": "image-main", "image-stub": "image-stub", texture: "texture"
    };
    TEXT_LAYER_KEYS.forEach(function (key) { inspectorByLayer[key] = "layer-text"; });
    var inspectorKey = custom ? "custom-" + custom.type : (inspectorByLayer[state.selectedLayer] || state.selectedLayer);
    var activeInspectors = [inspectorKey];
    var multiCount = selectedLayerCount();
    if (multiCount > 1) activeInspectors.push("multi-selection");
    if (custom && custom.type === "shape" && custom.fillMode === "image") activeInspectors.push("shape-image-effects");
    if (custom && custom.type === "text") activeInspectors.push("layer-style");
    if (!custom && COLOR_LAYER_KEYS.indexOf(state.selectedLayer) >= 0) activeInspectors.push("layer-style");
    /* The quote used to open a second, legacy typography panel backed by
       state.font/quoteSize in addition to the normal layer-style controls.
       Keep that legacy DOM and its bindings for document compatibility, but
       never expose it as a second inspector. Every stock text layer now uses
       the same single layer-style surface. */
    $$("[data-inspector]").forEach(function (group) {
      var keys = group.dataset.inspector.split(" ");
      group.classList.toggle("active", hasSelection && activeInspectors.some(function (key) { return keys.indexOf(key) >= 0; }));
    });
    $$("[data-face-fields]").forEach(function (group) {
      var active = group.dataset.faceFields === state.side;
      group.classList.toggle("active", active);
      group.hidden = !active;
    });
    $$("[data-custom-fields]").forEach(function (group) {
      group.classList.toggle("active", Boolean(custom && group.dataset.customFields === custom.type));
    });

    $("#multiSelectionCount").textContent = multiCount + "개 선택";
    var movableMultiCount = multiCount > 1 ? multiSelectionItems().length : 0;
    ["#alignSelectionX", "#alignSelectionCenterX", "#alignSelectionRight", "#alignSelectionY", "#alignSelectionCenterY", "#alignSelectionBottom"].forEach(function (selector) {
      $(selector).disabled = movableMultiCount < 2;
    });
    ["#distributeSelectionX", "#distributeSelectionY"].forEach(function (selector) {
      $(selector).disabled = movableMultiCount < 3;
    });

    var isPosition = isMovableLayer(state.selectedLayer)
      && !isLayerLocked(state.selectedLayer, state.side);
    $("#positionInspector").classList.toggle("active", isPosition);
    if (isPosition) {
      var layout = activeLayout();
      var quote = state.selectedLayer === "quote";
      var placement = custom ? null : placementFor(state.side, state.selectedLayer);
      var selectedFace = state.side === "front" ? frontFace : backFace;
      var selectedNode = selectedFace.querySelector('[data-canvas-layer="' + state.selectedLayer + '"]');
      var designSize = layerDesignSize(selectedNode, selectedFace, state.side, state.selectedLayer, state.template);
      var designPosition = custom
        ? customLayerDesignPosition(custom, state.template)
        : nativeLayerDesignPosition(selectedNode, selectedFace, state.side, state.selectedLayer, state.template);
      if (isProtectedLayer(state.selectedLayer)) {
        var attributionInspectorSize = templateConfig(state.template).preview;
        var attributionInspectorBase = attributionBasePosition(state.template, attributionInspectorSize.width, attributionInspectorSize.height, isBothView(state));
        designPosition = {
          x: attributionInspectorBase.x + finiteNumber(placement.x, 0) / 100 * attributionInspectorSize.width,
          y: attributionInspectorBase.y + 8 + finiteNumber(placement.y, 0) / 100 * attributionInspectorSize.height
        };
      }
      setInputValue("#inspectX", roundedDesignMetric(designPosition && designPosition.x));
      setInputValue("#inspectY", roundedDesignMetric(designPosition && designPosition.y));
      setInputValue("#inspectW", roundedDesignMetric(designSize.width));
      setInputValue("#inspectH", roundedDesignMetric(designSize.height));
      setInputValue("#inspectRotate", custom ? custom.rotation : placement.rotation);
      setInputValue("#inspectSize", custom && custom.type === "text" ? pxToPt(custom.fontSize) : quote ? pxToPt(layout.quoteSize) : "");
      $("#inspectXLabel").firstChild.nodeValue = "X PX";
      $("#inspectYLabel").firstChild.nodeValue = "Y PX";
      $("#inspectX").step = "0.1";
      $("#inspectY").step = "0.1";
      $("#inspectWLabel").firstChild.nodeValue = "W PX";
      $("#inspectHLabel").firstChild.nodeValue = "H PX";
      var protectedSelection = isProtectedLayer(state.selectedLayer);
      $("#inspectWLabel").style.display = protectedSelection ? "none" : "block";
      $("#inspectHLabel").style.display = protectedSelection ? "none" : "block";
      $("#inspectRotateLabel").style.display = protectedSelection ? "none" : "block";
      $("#inspectSizeLabel").firstChild.nodeValue = "FONT PT";
      /* Font size belongs to the text-style inspector. Showing it again in
         FREE POSITION gave both stock and user text two independently-backed
         size inputs. Position keeps geometry/rotation only. */
      $("#inspectSizeLabel").style.display = "none";
    }
    var protectedSelection = isProtectedLayer(state.selectedLayer);
    $("#duplicateLayerInspectorBtn").hidden = protectedSelection;
    $("#deleteLayerInspectorBtn").hidden = protectedSelection;

    if (custom) {
      setInputValue("#customLayerNameInput", custom.name);
      setInputValue("#customTextInput", custom.text);
      var displayedCustomColor = trackedInlineStyleValue("custom", "color", custom.color);
      setInputValue("#customTextColor", displayedCustomColor);
      var customColorMode = customTextColorMode(custom);
      $$('input[name="customTextColorMode"]').forEach(function (input) {
        input.checked = input.value === customColorMode;
      });
      $("#customTextColorModeHint").textContent = customColorMode === "difference"
        ? "배경과 겹치는 글자를 자동으로 반전합니다."
        : "선택한 글자색을 그대로 사용합니다.";
      $("#customTextColor").disabled = customColorMode === "difference";
      var customTextColorCodeInput = $('[data-color-picker="customTextColor"]');
      if (customTextColorCodeInput) customTextColorCodeInput.disabled = customColorMode === "difference";
      $("#customTextColorReset").disabled = customColorMode === "difference";
      setInputValue("#customTextAlign", custom.align);
      setInputValue("#customWritingMode", custom.writingMode === "vertical-rl" ? "vertical-rl" : "horizontal-tb");
      var displayedCustomFont = trackedInlineStyleValue("custom", "fontFamily", custom.font);
      setInputValue("#customTextFont", displayedCustomFont);
      syncFontSelectPreview("#customTextFont", displayedCustomFont);
      syncFontSourceTab("custom", displayedCustomFont);
      var textRuns = (custom.styledRuns || []).filter(function (run) { return String(run.text || "").length > 0; });
      var boldStates = textRuns.map(function (run) { return parseInt(run.fontWeight, 10) >= 600; });
      var italicStates = textRuns.map(function (run) { return run.fontStyle === "italic"; });
      var customSelectionActive = trackedTextSelectionMatches("custom");
      var displayedCustomWeight = trackedInlineStyleValue("custom", "fontWeight", custom.fontWeight);
      var displayedCustomFontStyle = trackedInlineStyleValue("custom", "fontStyle", custom.fontStyle);
      $("#customBoldToggle").checked = customSelectionActive ? parseInt(displayedCustomWeight, 10) >= 600 : (boldStates.length ? boldStates.every(Boolean) : parseInt(custom.fontWeight, 10) >= 600);
      $("#customBoldToggle").indeterminate = !customSelectionActive && boldStates.length > 1 && boldStates.some(Boolean) && !boldStates.every(Boolean);
      $("#customItalicToggle").checked = customSelectionActive ? displayedCustomFontStyle === "italic" : (italicStates.length ? italicStates.every(Boolean) : custom.fontStyle === "italic");
      $("#customItalicToggle").indeterminate = !customSelectionActive && italicStates.length > 1 && italicStates.some(Boolean) && !italicStates.every(Boolean);
      setInputValue("#customFontSizePt", pxToPt(trackedInlineStyleValue("custom", "fontSize", custom.fontSize)));
      var customLetterSpacing = custom.letterSpacing === "normal" ? 0 : finiteNumber(parseFloat(custom.letterSpacing), 0);
      var customLineHeight = custom.lineHeight === "normal" ? 1.35 : finiteNumber(parseFloat(custom.lineHeight), 1.35);
      var displayedCustomLetterSpacing = trackedInlineStyleValue("custom", "letterSpacing", customLetterSpacing);
      var displayedCustomLineHeight = trackedInlineStyleValue("custom", "lineHeight", customLineHeight);
      setInputValue("#customLetterSpacing", displayedCustomLetterSpacing);
      $("#customLetterSpacingOut").textContent = displayedCustomLetterSpacing + "px";
      setInputValue("#customLineHeight", displayedCustomLineHeight);
      $("#customLineHeightOut").textContent = displayedCustomLineHeight;
      if (custom.type === "text") renderPartialTextStatus("custom");
      setInputValue("#customImageFit", custom.fit);
      $("#customImageName").textContent = custom.imageName || "선택한 파일 없음";
      if (custom.type === "shape") {
        setInputValue("#customShapeType", custom.shapeKind);
        setInputValue("#customShapeFillMode", custom.fillMode);
        $("#customShapeFillColor").value = custom.fillColor;
        $("#customShapeFillColorCode").textContent = custom.fillColor.toUpperCase();
        $("#customShapeColorFields").hidden = custom.fillMode !== "color";
        $("#customShapeImageFields").hidden = custom.fillMode !== "image";
        var shapeHasImage = Boolean(custom.imageData || custom.imageName);
        $("#chooseCustomShapeImageBtn").textContent = shapeHasImage ? "이미지 교체" : "파일 불러오기";
        $("#removeCustomShapeImageBtn").disabled = !shapeHasImage;
        $("#customShapeImageName").textContent = custom.imageName || "선택한 파일 없음";
        setInputValue("#customShapeImageFit", custom.fit);
        $("#customShapeZoomRange").value = Math.round(custom.zoom * 100);
        $("#customShapeZoomOut").textContent = Math.round(custom.zoom * 100) + "%";
        $("#customShapePanXRange").value = Math.round(custom.panX * 100);
        $("#customShapePanXOut").textContent = Math.round(custom.panX * 100);
        $("#customShapePanYRange").value = Math.round(custom.panY * 100);
        $("#customShapePanYOut").textContent = Math.round(custom.panY * 100);
        $("#customShapeCornerFields").hidden = custom.shapeKind === "ellipse";
        $("#customShapeCornerMode").checked = custom.cornerMode === "individual";
        setInputValue("#customShapeCornerAll", custom.cornerRadius);
        setInputValue("#customShapeCornerAllNumber", Math.round(custom.cornerRadius));
        $("#customShapeCornerAllRow").hidden = custom.cornerMode === "individual";
        renderShapeCornerControls(custom);
      }
      $("#customOpacityRange").value = custom.opacity;
      $("#customOpacityOut").textContent = Math.round(custom.opacity) + "%";
    }
    if (!custom && inspectorKey === "layer-text") renderLayerTextInspector();
    if (custom && custom.type === "text" || !custom && COLOR_LAYER_KEYS.indexOf(state.selectedLayer) >= 0) renderLayerStyleInspector();

    $("#logoTintControl").hidden = true;
    $("#logoAccentControl").hidden = true;
    var block = activeBlock();
    if (block) {
      if (state.selectedLayer === "block-main" || state.selectedLayer === "block-stub") {
        $("#blockColor").value = block.color;
        $("#blockColorCode").textContent = block.color.toUpperCase();
        $("#blockHelp").textContent = (state.side === "front" ? "FRONT / " : "BACK / ") + (state.selectedLayer === "block-main" ? "MAIN FILL" : "STUB FILL");
      }
      if (selectedImageLayer()) {
        $("#imageName").textContent = block.imageName || "선택한 파일 없음";
        $("#blockZoomRange").value = block.zoom;
        $("#blockZoomOut").textContent = Math.round(block.zoom * 100) + "%";
        $("#imagePanXRange").value = Math.round(block.panX * 100);
        $("#imagePanYRange").value = Math.round(block.panY * 100);
        $("#imagePanXOut").textContent = Math.round(block.panX * 100);
        $("#imagePanYOut").textContent = Math.round(block.panY * 100);
        $("#imageHelp").textContent = state.selectedLayer === "image-stub"
          ? (state.template === "postcard" ? "BACK / POSTAGE ILLUSTRATION" : (state.side === "front" ? "FRONT / RAILWAY LOGO" : "BACK / RAILWAY LOGO"))
          : (state.side === "front" ? "FRONT / MAIN IMAGE" : "BACK / MAIN IMAGE");
        $("#logoTintControl").hidden = state.template !== "train" || state.selectedLayer !== "image-stub";
        $("#logoAccentControl").hidden = true;
        $("#logoTintToggle").checked = block.tintMode === "accent";
        $("#logoAccentColor").value = effectiveLayerColor("image-stub", state.side);
        $("#logoAccentCode").textContent = effectiveLayerColor("image-stub", state.side).toUpperCase();
        $$("[data-fit]").forEach(function (button) { button.classList.toggle("active", button.dataset.fit === block.fit); });
      }
    }

    var clippingEditable = hasSelection && state.selectedLayer !== "effects";
    var clippingTarget = clippingEditable ? clippingTargetFor(state.selectedLayer, state.side, state) : null;
    $("#clippingInspector").classList.toggle("active", clippingEditable);
    if (clippingEditable) {
      var clippingTargetLabel = clippingTarget && layerLabel(layerDefinition(clippingTarget, state), state.side, state);
      $("#layerClippingToggle").checked = isLayerClipped(state.selectedLayer, state.side);
      $("#layerClippingToggle").disabled = !clippingTarget;
      $("#clippingTargetName").textContent = clippingTargetLabel ? clippingTargetLabel[0] : "아래 레이어 없음";
      $("#clippingTargetHint").textContent = clippingTarget
        ? "현재 레이어의 내용만 ‘" + clippingTargetLabel[0] + "’의 투명도 모양 안에 표시합니다."
        : "클리핑 설정은 유지되지만 아래에 보이는 레이어가 생길 때까지 원본 그대로 표시합니다.";
    }

    var shadowEditable = hasSelection && layerSupportsShadow(state.selectedLayer, state.side);
    $("#shadowInspector").classList.toggle("active", shadowEditable);
    if (shadowEditable) {
      var shadow = shadowFor(state.selectedLayer);
      $("#shadowEnabled").checked = Boolean(shadow.enabled);
      $("#shadowColor").value = shadow.color;
      $("#shadowColorCode").textContent = shadow.color.toUpperCase();
      $("#shadowOpacityRange").value = shadow.opacity;
      $("#shadowOpacityOut").textContent = shadow.opacity + "%";
      setInputValue("#shadowAngle", Math.round(shadow.angle));
      setInputValue("#shadowDistance", Math.round(shadow.distance));
      setInputValue("#shadowBlur", shadow.blur);
      setInputValue("#shadowSpread", shadow.spread);
      $("#shadowAngleDial").style.setProperty("--shadow-angle", shadow.angle + "deg");
      $("#shadowAngleDial").setAttribute("aria-valuenow", String(Math.round(shadow.angle)));
    }
    /* Mount this block last. Inspector renderers can update several shared
       typography groups, but USER LAYER through partial-style clearing must
       always remain immediately below the LAYER STYLE heading. */
    positionCustomLayerIdentityFields(custom);
  }

  function updateTicketGeometry() {
    var preview = templateConfig(state.template).preview;
    var baseWidth = preview.width;
    var baseHeight = preview.height;
    var radians = state.viewRotation * Math.PI / 180;
    var rotatedWidth = Math.abs(baseWidth * Math.cos(radians)) + Math.abs(baseHeight * Math.sin(radians));
    var rotatedHeight = Math.abs(baseWidth * Math.sin(radians)) + Math.abs(baseHeight * Math.cos(radians));
    ticket.style.width = baseWidth + "px";
    ticket.style.height = baseHeight + "px";
    ticket.style.zoom = String(state.viewZoom);
    ticketViewTransform.style.width = baseWidth * state.viewZoom + "px";
    ticketViewTransform.style.height = baseHeight * state.viewZoom + "px";
    ticketViewTransform.style.transform = "translate(-50%, -50%) rotate(" + state.viewRotation + "deg)";
    ticketScale.style.width = rotatedWidth * state.viewZoom + "px";
    ticketScale.style.height = rotatedHeight * state.viewZoom + "px";
    ticketZoom.style.width = rotatedWidth * state.viewZoom + "px";
    ticketZoom.style.height = rotatedHeight * state.viewZoom + "px";
  }

  function renderLayerState() {
    var layerList = $("#layerList");
    $$("[data-layer-row]").forEach(function (row) {
      var definition = layerDefinition(row.dataset.layerRow);
      var label = layerLabel(definition, state.side, state);
      row.hidden = !layerAvailableOnSide(row.dataset.layerRow, state.side);
      if (label) {
        row.querySelector("strong").textContent = label[0];
        var folder = layerFolderFor(definition);
        row.querySelector("small").textContent = label[1] + " · " + (LAYER_FOLDER_LABELS[folder] || folder);
      }
      row.classList.toggle("selected", isLayerSelected(row.dataset.layerRow, state.side));
      row.classList.toggle("layer-clipped", isLayerClipped(row.dataset.layerRow, state.side));
    });
    $$("[data-visible]").forEach(function (button) {
      var hidden = isLayerHidden(button.dataset.visible, state.side);
      var row = button.closest(".layer-row");
      var label = row && row.querySelector("strong") ? row.querySelector("strong").textContent : "레이어";
      button.classList.toggle("off", hidden);
      row.classList.toggle("layer-hidden", hidden);
      button.title = hidden ? label + " 표시" : label + " 숨기기";
      button.setAttribute("aria-label", button.title);
      button.setAttribute("aria-pressed", String(!hidden));
    });
    $$("[data-lock]").forEach(function (button) {
      var locked = isLayerLocked(button.dataset.lock, state.side);
      var row = button.closest(".layer-row");
      var label = row && row.querySelector("strong") ? row.querySelector("strong").textContent : "레이어";
      button.classList.toggle("off", !locked);
      row.classList.toggle("layer-locked", locked);
      button.title = locked ? label + " 위치 잠금 해제" : label + " 위치 잠금";
      button.setAttribute("aria-label", button.title);
      button.setAttribute("aria-pressed", String(locked));
    });

    frontFace.classList.toggle("main-fill-hidden", isLayerHidden("block-main", "front"));
    backFace.classList.toggle("main-fill-hidden", isLayerHidden("block-main", "back"));
    ["front", "back"].forEach(function (side) {
      var faceShadow = faceShadowLayers[side] && faceShadowLayers[side].node;
      if (faceShadow) faceShadow.classList.toggle("hidden-layer", isLayerHidden("face-shadow", side));
    });
    $$("[data-canvas-layer]").forEach(function (node) {
      var nodeFace = node.closest(".ticket-face");
      var nodeSide = nodeFace === backFace ? "back" : "front";
      node.classList.toggle("template-unavailable", !layerAvailableOnSide(node.dataset.canvasLayer, nodeSide, state));
      node.classList.toggle("hidden-layer", isLayerHidden(node.dataset.canvasLayer, nodeSide));
      node.classList.remove("canvas-selected");
    });
    $$("[data-record-layer]").forEach(function (node) {
      node.hidden = state.template !== "train" || isLayerHidden(node.dataset.recordLayer, "back");
    });
    var activeFace = state.side === "front" ? frontFace : backFace;
    selectedLayerKeys().forEach(function (key) {
      var selected = activeFace.querySelector('[data-canvas-layer="' + key + '"]');
      if (selected && !isLayerHidden(key, state.side)) selected.classList.add("canvas-selected");
    });
    ["#layerBottom", "#layerBackward", "#layerForward", "#layerTop"].forEach(function (selector) {
      $(selector).disabled = !state.selectedLayer || layerOrderFor(state.side, state).indexOf(state.selectedLayer) < 0;
    });
    applyLayerPresentation();
    renderObjectTransformHandles();
  }

  function copyTransformSpace(source, target) {
    var computed = window.getComputedStyle(source);
    target.style.transform = computed.transform;
    target.style.transformOrigin = computed.transformOrigin;
    target.style.translate = computed.translate;
    target.style.rotate = computed.rotate;
    target.style.scale = computed.scale;
    target.style.transformBox = computed.transformBox;
  }

  function elementOffsetInside(node, root) {
    var nodeOffset = layoutOffset(node);
    var rootOffset = layoutOffset(root);
    return { x: nodeOffset.x - rootOffset.x, y: nodeOffset.y - rootOffset.y };
  }

  function customLayerDesignPosition(custom, template) {
    if (!custom) return null;
    var preview = templateConfig(template).preview;
    return {
      x: finiteNumber(custom.x, 0) / 100 * preview.width,
      y: finiteNumber(custom.y, 0) / 100 * preview.height
    };
  }

  function nativeLayerDesignPosition(node, face, side, layer, template) {
    if (!node || !face) return null;
    var preview = templateConfig(template).preview;
    var base = elementOffsetInside(node, face);
    var placement = placementFor(side, layer);
    return {
      x: base.x / Math.max(1, face.offsetWidth) * preview.width + finiteNumber(placement.x, 0) / 100 * preview.width,
      y: base.y / Math.max(1, face.offsetHeight) * preview.height + finiteNumber(placement.y, 0) / 100 * preview.height
    };
  }

  function layerDesignSize(node, face, side, layer, template) {
    var custom = customLayerById(layer);
    if (custom) return customShapeSizeToDesignPx(custom, template);
    if (!node || !face) return { width: 0, height: 0 };
    var preview = templateConfig(template).preview;
    var width = node.offsetWidth / Math.max(1, face.offsetWidth) * preview.width;
    var height = node.offsetHeight / Math.max(1, face.offsetHeight) * preview.height;
    if (TEXT_LAYER_KEYS.indexOf(layer) >= 0) return { width: width, height: height };
    var placement = placementFor(side, layer);
    return {
      width: width * finiteNumber(placement.scaleX, 1),
      height: height * finiteNumber(placement.scaleY, 1)
    };
  }

  function setLayerDesignSize(axis, value, node, face, side, layer, template) {
    var custom = customLayerById(layer);
    if (custom) {
      var percent = customShapeSizeFromDesignPx(axis, value, template);
      var minimum = custom.type === "shape" ? 3 : custom.type === "image" ? .01
        : ((custom.styledRuns || []).length || (custom.styledShapes || []).length) ? .25 : 3;
      custom[axis === "width" ? "w" : "h"] = clamp(percent, minimum, MAX_OBJECT_SIZE_PERCENT);
      if (custom.type === "text") custom.autoHeight = false;
      return;
    }
    if (!node || !face) return;
    var preview = templateConfig(template).preview;
    var dimension = axis === "width" ? "offsetWidth" : "offsetHeight";
    if (TEXT_LAYER_KEYS.indexOf(layer) >= 0) {
      var textPlacement = writablePlacementFor(side, layer);
      textPlacement.boxW = textPlacement.boxW || Math.max(16, node.offsetWidth || 16);
      textPlacement.boxH = textPlacement.boxH || Math.max(12, node.offsetHeight || 12);
      var faceBasis = axis === "width" ? face.offsetWidth : face.offsetHeight;
      var previewBasis = axis === "width" ? preview.width : preview.height;
      var cssValue = finiteNumber(value, 0) / Math.max(1, previewBasis) * Math.max(1, faceBasis);
      if (axis === "width") textPlacement.boxW = clamp(cssValue, 16, MAX_TEXT_BOX_SIZE_PX);
      else textPlacement.boxH = clamp(cssValue, 12, MAX_TEXT_BOX_SIZE_PX);
      textPlacement.boxMode = "area";
      return;
    }
    var base = node[dimension] / Math.max(1, axis === "width" ? face.offsetWidth : face.offsetHeight)
      * (axis === "width" ? preview.width : preview.height);
    var placement = writablePlacementFor(side, layer);
    placement[axis === "width" ? "scaleX" : "scaleY"] = clamp(finiteNumber(value, 0) / Math.max(.01, base), .1, MAX_NATIVE_OBJECT_SCALE);
  }

  function setCustomLayerDesignPosition(axis, value, custom, template) {
    if (!custom) return;
    var preview = templateConfig(template).preview;
    var basis = axis === "x" ? preview.width : preview.height;
    custom[axis] = clamp(finiteNumber(value, 0) / Math.max(1, basis) * 100, -50, 100);
  }

  function setNativeLayerDesignPosition(axis, value, node, face, side, layer, template) {
    if (isProtectedLayer(layer)) {
      var attributionPreview = templateConfig(template).preview;
      var attributionBasePoint = attributionBasePosition(template, attributionPreview.width, attributionPreview.height, isBothView(state));
      var attributionBase = axis === "x" ? attributionBasePoint.x : attributionBasePoint.y + 8;
      var attributionBasis = axis === "x" ? attributionPreview.width : attributionPreview.height;
      writablePlacementFor(side, layer)[axis] = clamp((finiteNumber(value, attributionBase) - attributionBase) / Math.max(1, attributionBasis) * 100, -100, 100);
      return;
    }
    if (!node || !face) return;
    var preview = templateConfig(template).preview;
    var basis = axis === "x" ? preview.width : preview.height;
    var base = elementOffsetInside(node, face);
    var baseDesign = axis === "x"
      ? base.x / Math.max(1, face.offsetWidth) * preview.width
      : base.y / Math.max(1, face.offsetHeight) * preview.height;
    writablePlacementFor(side, layer)[axis] = clamp((finiteNumber(value, 0) - baseDesign) / Math.max(1, basis) * 100, -100, 100);
  }

  function renderObjectTransformHandles() {
    $$(".object-transform-active").forEach(function (node) { node.classList.remove("object-transform-active"); });
    $$(".selection-proxied").forEach(function (node) { node.classList.remove("selection-proxied"); });
    selectionOverlay.replaceChildren();
    selectionOverlay.hidden = true;
    var selectionKeys = selectedLayerKeys();
    if (!selectionKeys.length) return;

    var face = state.side === "front" ? frontFace : backFace;
    var faceOffset = elementOffsetInside(face, ticket);
    var faceSpace = document.createElement("div");
    faceSpace.className = "selection-face-space";
    faceSpace.style.left = faceOffset.x + "px";
    faceSpace.style.top = faceOffset.y + "px";
    faceSpace.style.width = face.offsetWidth + "px";
    faceSpace.style.height = face.offsetHeight + "px";
    copyTransformSpace(face, faceSpace);

    var proxyCount = 0;
    var validSelectionItems = multiSelectionItems();
    var selectionAnchorKey = validSelectionItems.length ? validSelectionItems[0].key : selectionKeys[0];
    selectionKeys.forEach(function (key) {
      if (isLayerHidden(key, state.side)) return;
      var node = face.querySelector('[data-canvas-layer="' + key + '"]');
      if (!node || !node.offsetWidth || !node.offsetHeight) return;
      var nodeOffset = elementOffsetInside(node, face);
      var proxy = document.createElement("div");
      proxy.className = "selection-proxy " + (key === selectionAnchorKey ? "selection-anchor" : "selection-secondary")
        + (key === state.selectedLayer ? " selection-primary" : "");
      proxy.dataset.selectionLayer = key;
      proxy.dataset.selectionSide = state.side;
      proxy.style.left = nodeOffset.x + "px";
      proxy.style.top = nodeOffset.y + "px";
      proxy.style.width = node.offsetWidth + "px";
      proxy.style.height = node.offsetHeight + "px";
      copyTransformSpace(node, proxy);

      var custom = customLayerById(key);
      var placement = custom ? null : placementFor(state.side, key);
      var handleScaleX = custom && custom.type === "text" ? finiteNumber(custom.scaleX, 1) : custom ? 1 : finiteNumber(placement.scaleX, 1);
      var handleScaleY = custom && custom.type === "text" ? finiteNumber(custom.scaleY, 1) : custom ? 1 : finiteNumber(placement.scaleY, 1);
      proxy.style.setProperty("--handle-inverse-x", String(1 / Math.max(.1, handleScaleX)));
      proxy.style.setProperty("--handle-inverse-y", String(1 / Math.max(.1, handleScaleY)));
      node.classList.add("selection-proxied");
      node.classList.remove("canvas-selected");

      var primary = key === state.selectedLayer;
      var interactive = primary && isMovableLayer(key) && !isLayerLocked(key, state.side);
      if (interactive) {
        var textObject = TEXT_LAYER_KEYS.indexOf(key) >= 0 || Boolean(custom && custom.type === "text");
        node.classList.add("object-transform-active");
        var handles = [
          { mode: "resize", title: textObject ? "드래그: 텍스트 칸 재배치 · Alt+드래그: 글자와 칸 함께 확대" : "모서리를 드래그하여 크기 조절" },
          { mode: "rotate", title: "드래그하여 오브젝트 회전" },
          { mode: "skew", title: "Alt+가로 드래그: 오브젝트 평행사변형 기울기" }
        ];
        if (isProtectedLayer(key)) handles = [];
        handles.forEach(function (config) {
          var handle = document.createElement("i");
          handle.className = "object-transform-handle object-" + config.mode + "-handle";
          handle.dataset.objectHandle = config.mode;
          handle.dataset.objectLayer = key;
          handle.dataset.objectSide = state.side;
          handle.title = config.title;
          proxy.appendChild(handle);
        });
        bindCanvasLayerNode(proxy);
      }

      faceSpace.appendChild(proxy);
      proxyCount += 1;
    });
    if (!proxyCount) return;
    selectionOverlay.appendChild(faceSpace);
    selectionOverlay.hidden = false;
  }

  function resolvedFrontTitle() {
    return templateConfig(state.template).autoPairTitle && !state.title
      ? [state.botName, state.personaName].filter(Boolean).join(" × ")
      : state.title;
  }

  function refreshTrainFrameArtwork() {
    if (state.template !== "train") {
      trainFrameRenderPromise = Promise.resolve();
      return;
    }
    var renderer = window.LOG_TICKET_TRAIN_FRAME_RENDERER;
    if (!renderer || typeof renderer.apply !== "function") return;
    var framePromise = renderer.apply({
      mainFront: effectiveLayerColor("main-frame", "front"),
      mainBack: effectiveLayerColor("main-frame", "back"),
      recordDividerTop: effectiveLayerColor("record-divider-top", "back"),
      stubFront: effectiveLayerColor("stub-frame", "front"),
      stubBack: effectiveLayerColor("stub-frame", "back"),
      dividerFront: effectiveLayerColor("stub-divider", "front"),
      dividerBack: effectiveLayerColor("stub-divider", "back"),
      backImageFrame: effectiveLayerColor("back-image-frame", "back")
    });
    trainFrameRenderPromise = Promise.resolve(framePromise).catch(function (error) {
      console.warn("Train frame color rendering failed", error);
    });
  }
  function refreshTrainLogoArtwork() {
    var renderer = window.LOG_TICKET_TRAIN_LOGO_RENDERER;
    var config = state.template === "train" && state.blocks && state.blocks.frontStub;
    if (!renderer || typeof renderer.tint !== "function" || !blockUsesAccentTint("frontStub", config)) {
      trainLogoRenderPromise = Promise.resolve();
      return;
    }
    var source = rawBlockImageSource("frontStub", config);
    trainLogoRenderPromise = Promise.all(["front", "back"].map(function (side) {
      var color = effectiveLayerColor("image-stub", side);
      return renderer.tint(source, color).then(function (dataUrl) {
        var current = state.template === "train" && state.blocks && state.blocks.frontStub;
        if (!current || rawBlockImageSource("frontStub", current) !== source || current.tintMode !== "accent" || effectiveLayerColor("image-stub", side) !== color) return;
        renderedTrainLogos[side] = { base: source, color: color, source: dataUrl };
      });
    })).then(function () {
      requestAnimationFrame(renderBlockImages);
    }).catch(function (error) {
      console.warn("Train logo color rendering failed", error);
    });
  }

  var CODE39_PATTERNS = {
    "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw",
    "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn",
    A: "wnnnnwnnw", B: "nnwnnwnnw", C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn",
    F: "nnwnwwnnn", G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn",
    K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww", O: "wnnnwnnwn",
    P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn",
    U: "wwnnnnnnw", V: "nwwnnnnnw", W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn",
    Z: "nwwnwnnnn", "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "$": "nwnwnwnnn",
    "/": "nwnwnnnwn", "+": "nwnnnwnwn", "%": "nnnwnwnwn", "*": "nwnnwnwnn"
  };
  function normalizeBarcodeData(value) {
    var normalized = String(value || "").toUpperCase().replace(/[^0-9A-Z. $/+%\-]/g, "").trim();
    return (normalized || "LT07192348").slice(0, 24);
  }
  function renderCode39Barcode(node, value, hideCaption) {
    if (!node) return;
    var namespace = "http://www.w3.org/2000/svg";
    var data = normalizeBarcodeData(value);
    var encoded = "*" + data + "*";
    var narrow = 1;
    var wide = 3;
    var characterGap = narrow;
    var symbolWidth = 0;
    Array.from(encoded).forEach(function (character, characterIndex) {
      var pattern = CODE39_PATTERNS[character] || CODE39_PATTERNS["-"];
      Array.from(pattern).forEach(function (unit) { symbolWidth += unit === "w" ? wide : narrow; });
      if (characterIndex < encoded.length - 1) symbolWidth += characterGap;
    });
    /* Code 39 requires clear space on both sides. Ten narrow modules is the
       minimum; long values receive ten percent so the bars never touch trim. */
    var quietZone = Math.max(narrow * 10, symbolWidth * .1);
    var svg = document.createElementNS(namespace, "svg");
    svg.setAttribute("class", "code39-barcode");
    var viewWidth = symbolWidth + quietZone * 2;
    svg.setAttribute("viewBox", "0 0 " + viewWidth + " " + (hideCaption ? 34 : 44));
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("shape-rendering", "crispEdges");
    var x = quietZone;
    Array.from(encoded).forEach(function (character, characterIndex) {
      var pattern = CODE39_PATTERNS[character] || CODE39_PATTERNS["-"];
      Array.from(pattern).forEach(function (unit, index) {
        var width = unit === "w" ? wide : narrow;
        if (index % 2 === 0) {
          var bar = document.createElementNS(namespace, "rect");
          bar.setAttribute("x", x);
          bar.setAttribute("y", 0);
          bar.setAttribute("width", width);
          bar.setAttribute("height", 34);
          svg.appendChild(bar);
        }
        x += width;
      });
      if (characterIndex < encoded.length - 1) x += characterGap;
    });
    if (!hideCaption) {
      var caption = document.createElementNS(namespace, "text");
      caption.setAttribute("x", viewWidth / 2);
      caption.setAttribute("y", 43);
      caption.setAttribute("text-anchor", "middle");
      caption.textContent = data;
      svg.appendChild(caption);
    }
    node.replaceChildren(svg);
    node.setAttribute("aria-label", "CODE 39 " + data);
  }

  function renderBackKickerPreview(value, splitCinemaHeader) {
    var node = $("#backKickerPreview");
    var textValue = String(value || "").trim();
    node.classList.toggle("cinema-split-kicker", Boolean(splitCinemaHeader));
    if (!splitCinemaHeader) {
      node.textContent = textValue;
      return;
    }
    renderCinemaBackKickerInline(node, textValue, [], false);
  }

  function cinemaCastText() {
    return [state.botName, state.personaName].map(function (value) {
      return String(value || "").trim();
    }).filter(Boolean).join("\n") || "—";
  }

  function renderPostcardWritingPreview(value) {
    var node = $("#backBodyPreview");
    var textValue = String(value || "").replace(/\r/g, "");
    node.removeAttribute("aria-label");
    node.textContent = textValue;
  }

  function renderPolaroidRepeat(node, value, count, fallback) {
    var textValue = String(value || fallback || "").trim() || fallback;
    var fragment = document.createDocumentFragment();
    for (var index = 0; index < count; index += 1) {
      var repeat = document.createElement("span");
      repeat.className = "polaroid-repeat-item";
      var content = document.createElement("span");
      content.className = "native-inline-text-content";
      content.textContent = textValue;
      repeat.appendChild(content);
      fragment.appendChild(repeat);
    }
    node.replaceChildren(fragment);
    node.dataset.repeatCount = String(count);
    node.setAttribute("aria-label", textValue);
  }
  function renderPolaroidInlineRepeat(node, value, count, fallback, runs, suppressColor) {
    var textValue = String(value || fallback || "").trim() || fallback;
    var fragment = document.createDocumentFragment();
    for (var index = 0; index < count; index += 1) {
      var repeat = document.createElement("span");
      repeat.className = "polaroid-repeat-item";
      var content = document.createElement("span");
      content.className = "native-inline-text-content";
      appendInlineText(content, textValue, runs, suppressColor);
      repeat.appendChild(content);
      fragment.appendChild(repeat);
    }
    node.replaceChildren(fragment);
    node.dataset.repeatCount = String(count);
    node.setAttribute("aria-label", textValue);
  }
  function renderCinemaRatingInlineRepeat(node, value, count, runs, suppressColor) {
    var textValue = Array.from(String(value || "☆"))[0] || "☆";
    var fragment = document.createDocumentFragment();
    for (var index = 0; index < count; index += 1) {
      var repeat = document.createElement("span");
      repeat.className = "cinema-rating-repeat-item";
      appendInlineText(repeat, textValue, runs, suppressColor);
      fragment.appendChild(repeat);
    }
    node.replaceChildren(fragment);
    node.setAttribute("aria-label", textValue + " " + count + "개");
  }

  function renderAttributionPreview() {
    var preview = $("#ticketAttributionPreview");
    if (!preview || !ticket) return;
    var side = state.side === "back" ? "back" : "front";
    var placement = placementFor(side, ATTRIBUTION_LAYER_KEY);
    var style = layerStyleEntry(side, ATTRIBUTION_LAYER_KEY, false) || {};
    var base = attributionBasePosition(state.template, Math.max(1, ticket.offsetWidth), Math.max(1, ticket.offsetHeight), isBothView(state));
    preview.textContent = ATTRIBUTION_TEXT;
    preview.style.color = /^#[0-9a-f]{6}$/i.test(String(style.color || "")) ? style.color : "#000000";
    preview.style.left = base.x + "px";
    preview.style.top = base.y + 8 + "px";
    preview.style.marginLeft = finiteNumber(placement.x, 0) / 100 * Math.max(1, ticket.offsetWidth) + "px";
    preview.style.marginTop = finiteNumber(placement.y, 0) / 100 * Math.max(1, ticket.offsetHeight) + "px";
    preview.classList.toggle("canvas-selected", isProtectedLayer(state.selectedLayer));
  }

  function render() {
    enforceProtectedAttribution(state);
    var postcardStatic = state.template === "postcard";
    if (["front", "back", "both"].indexOf(state.postcardViewMode) < 0) {
      state.postcardViewMode = postcardStatic ? "both" : state.side;
    }
    state.postcardTopSide = state.postcardTopSide === "back" ? "back" : "front";
    var bothStatic = isBothView(state);
    var faceViewActive = ["front", "back", "both"].indexOf(state.postcardViewMode) >= 0;
    var staticFaces = postcardStatic || bothStatic;
    if (staticFaces) {
      flipPhase = "";
      animateFade = false;
      if (state.postcardViewMode !== "both") state.side = state.postcardViewMode;
      if (state.postcardViewMode === "both") state.side = postcardExportSide || state.postcardTopSide;
    } else state.postcardViewMode = state.side;
    document.body.classList.toggle("ui-dark", state.uiTheme === "dark");
    document.body.classList.toggle("postcard-static", postcardStatic);
    document.body.classList.toggle("both-static", bothStatic);
    document.body.classList.toggle("face-shadow-active", faceViewActive);
    $("#uiThemeBtn").textContent = state.uiTheme === "dark" ? "라이트 모드" : "다크 모드";
    var postcardViewClass = faceViewActive
      ? " postcard-view-" + state.postcardViewMode + " postcard-top-" + state.postcardTopSide + " postcard-active-" + state.side
        + " face-view-" + state.postcardViewMode + " face-top-" + state.postcardTopSide + " face-active-" + state.side
      : "";
    var showBackClass = faceViewActive ? state.postcardViewMode === "back" : state.side === "back";
    var textureVisible = state.texture && (bothStatic
      ? ["front", "back"].some(function (side) { return layerAvailableOnSide("texture", side) && !isLayerHidden("texture", side); })
      : layerAvailableOnSide("texture", state.side) && !isLayerHidden("texture", state.side));
    ticket.className = "ticket " + state.template + " " + state.theme + " quote-effect-" + nativeTextColorMode("quote", "front") + (showBackClass ? " is-back" : "") + postcardViewClass + (textureVisible ? " texture-on" : "") + (state.freeform ? " freeform-mode" : "") + (flipPhase ? " " + flipPhase : "") + (animateFade ? " play-fade" : "");
    renderAttributionPreview();
    ticket.dataset.postcardView = faceViewActive ? state.postcardViewMode : "";
    ticket.dataset.postcardTop = faceViewActive ? state.postcardTopSide : "";
    ticket.dataset.postcardActive = faceViewActive ? state.side : "";
    ticket.dataset.faceView = state.postcardViewMode;
    ticket.dataset.faceTop = state.postcardTopSide;
    applyBothGeometryVariables(state.template);
    var keepsakeBackMainFrame = backFace.querySelector(".back-record-rules");
    if (keepsakeBackMainFrame) {
      keepsakeBackMainFrame.removeAttribute("data-canvas-layer");
      keepsakeBackMainFrame.classList.remove("canvas-selected", "hidden-layer", "template-unavailable", "freeform-movable");
    }
    var faceClipPath = state.template === "train"
      ? trainSilhouettePolygon()
      : (state.template === "cinema" ? cinemaSilhouettePolygon() : "");
    [frontFace, backFace].forEach(function (face) {
      face.style.clipPath = faceClipPath;
      face.style.webkitClipPath = faceClipPath;
    });
    syncFaceShadowMasks(faceClipPath);
    document.body.classList.toggle("freeform-active", state.freeform);
    document.body.dataset.selectedLayer = state.selectedLayer || "";
    document.body.dataset.template = state.template;
    document.body.dataset.side = state.side;
    ticket.style.setProperty("--ticket-accent", state.accent);
    var trainMainOpeningMaskSource = window.LOG_TICKET_TRAIN_MAIN_OPENING_MASK_ASSET || "";
    if (trainMainOpeningMaskSource) blockDom.frontMain.node.style.setProperty("--train-main-opening-mask", 'url("' + trainMainOpeningMaskSource + '")');
    else blockDom.frontMain.node.style.removeProperty("--train-main-opening-mask");
    var trainBackOpeningMaskSource = window.LOG_TICKET_TRAIN_BACK_OPENING_MASK_ASSET || "";
    if (trainBackOpeningMaskSource) blockDom.backMain.node.style.setProperty("--train-back-opening-mask", 'url("' + trainBackOpeningMaskSource + '")');
    else blockDom.backMain.node.style.removeProperty("--train-back-opening-mask");
    ticket.style.setProperty("--ticket-quote", state.quoteColor);
    ticket.style.setProperty("--ticket-muted", state.muted);
    [10, 11, 12, 14, 24, 28, 32, 36, 42, 48, 55, 62, 64, 68, 78, 86].forEach(function (opacity) {
      ticket.style.setProperty("--ticket-accent-" + opacity, hexToRgba(state.accent, opacity));
    });
    ticket.style.setProperty("--texture-strength", state.textureStrength / 100);
    refreshTrainFrameArtwork();
    refreshTrainLogoArtwork();
    ticket.style.setProperty("--duration", state.duration + "ms");
    ticket.style.setProperty("--half-duration", Math.max(120, Math.round(state.duration / 2)) + "ms");
    updateTicketGeometry();

    var runtimeFontClass = FONT_FAMILY_MAP[state.font] ? " " + state.font : "";
    var runtimeFontFamily = fontFamilyForKey(state.font);
    $("#frontQuoteLayer").className = "quote-layer runtime-font" + runtimeFontClass;
    $("#backQuoteLayer").className = "back-copy quote-layer runtime-font" + runtimeFontClass;
    $("#frontQuoteLayer").style.setProperty("--runtime-font-family", runtimeFontFamily);
    $("#backQuoteLayer").style.setProperty("--runtime-font-family", runtimeFontFamily);
    $("#quotePreview").textContent = state.quote;
    $("#speakerPreview").className = "speaker-layer runtime-font" + runtimeFontClass;
    $("#speakerPreview").style.setProperty("--runtime-font-family", runtimeFontFamily);
    $("#speakerPreview").textContent = "— " + (state.speaker || "이름 없음");
    $("#trainHandwrittenNotePreview").textContent = state.handwrittenNote;
    $("#templateKicker").textContent = state.kicker;
    $("#ticketTitleText").textContent = resolvedFrontTitle();
    $("#ticketSubtitlePreview").textContent = state.subtitle;
    $("#stubTitlePreview").textContent = state.stubTitle;
    $("#botLabelPreview").textContent = state.botLabel;
    $("#personaLabelPreview").textContent = state.personaLabel;
    $("#dateLabelPreview").textContent = state.dateLabel;
    $("#botNamePreview").textContent = state.botName || "BOT";
    $("#personaNamePreview").textContent = state.personaName || "PERSONA";
    $("#datePreview").textContent = state.date || "—";
    $("#sealTextPreview").textContent = state.sealText;
    $("#coachLabelPreview").textContent = state.coachLabel;
    $("#coachNumberPreview").textContent = state.coachNumber;
    $("#stubToplinePreview").textContent = state.stubTopline;
    $("#admitTextPreview").textContent = state.admitText;
    $("#platformTextPreview").textContent = state.platformText;
    $("#validationTextPreview").textContent = state.validationText;
    var mirrorTrainCoupon = state.template === "train";
    renderBackKickerPreview(mirrorTrainCoupon ? state.kicker : state.backKicker, state.template === "cinema");
    $("#backHeadingText").textContent = mirrorTrainCoupon ? resolvedFrontTitle() : state.backHeading;
    $("#backSubtitlePreview").textContent = state.subtitle;
    $("#backBotLabelPreview").textContent = state.botLabel;
    $("#backPersonaLabelPreview").textContent = state.personaLabel;
    $("#backDateLabelPreview").textContent = state.dateLabel;
    if (state.template === "polaroid") {
      renderPolaroidRepeat($("#backBotPreview"), state.botName, 5, "Bot name");
      renderPolaroidRepeat($("#backPersonaPreview"), state.personaName, 3, "Persona name");
    } else {
      $("#backBotPreview").removeAttribute("aria-label");
      $("#backPersonaPreview").removeAttribute("aria-label");
      $("#backBotPreview").textContent = state.template === "cinema" ? state.postcardPrompt : (state.botName || "BOT");
      $("#backPersonaPreview").textContent = state.template === "cinema" ? cinemaCastText() : (state.personaName || "PERSONA");
    }
    $("#backDatePreview").textContent = state.date || "—";
    $("#cinemaEtcLabelPreview").textContent = state.cinemaEtcLabel;
    $("#cinemaEtcPreview").textContent = state.postcardModel;
    $("#postcardModelLabelPreview").textContent = state.postcardModelLabel;
    $("#postcardModelPreview").textContent = state.postcardModel;
    $("#postcardPromptLabelPreview").textContent = state.postcardPromptLabel;
    $("#postcardPromptPreview").textContent = state.postcardPrompt;
    $("#postcardCardTitlePreview").textContent = state.postcardCardTitle;
    $("#postcardCardSubtitlePreview").textContent = state.postcardCardSubtitle;
    $("#postcardFromLabelPreview").textContent = state.botLabel;
    $("#postcardFromValuePreview").textContent = state.botName;
    $("#postcardToLabelPreview").textContent = state.personaLabel;
    $("#postcardToValuePreview").textContent = state.personaName;
    $("#postcardDateLabelPreview").textContent = state.dateLabel;
    $("#postcardDateValuePreview").textContent = state.date;
    $("#postcardModelLabelLayerPreview").textContent = state.postcardModelLabel;
    $("#postcardModelValueLayerPreview").textContent = state.postcardModel;
    $("#postcardPromptLabelLayerPreview").textContent = state.postcardPromptLabel;
    $("#postcardPromptValueLayerPreview").textContent = state.postcardPrompt;
    [1, 2, 3, 4].forEach(function (number) {
      $("#postcardWriting" + number + "Preview").textContent = state["postcardWriting" + number];
    });
    $("#backRecordBotLabelPreview").textContent = state.botLabel;
    $("#backRecordPersonaLabelPreview").textContent = state.personaLabel;
    $("#backRecordDateLabelPreview").textContent = state.dateLabel;
    $("#backRecordBotPreview").textContent = state.botName || "BOT";
    $("#backRecordPersonaPreview").textContent = state.personaName || "PERSONA";
    $("#backRecordDatePreview").textContent = state.date || "—";
    $("#backCoachLabelPreview").textContent = state.coachLabel;
    $("#backCoachNumberPreview").textContent = state.coachNumber;
    $("#backStubToplinePreview").textContent = state.stubTopline;
    $("#backAdmitTextPreview").textContent = state.admitText;
    $("#backStubTitlePreview").textContent = state.stubTitle;
    $("#backPlatformTextPreview").textContent = state.platformText;
    $("#backValidationTextPreview").textContent = state.backStamp;
    $("#backCopyLabelPreview").textContent = state.backCopyLabel;
    var sourceLabel = state.sourceLabel || templateConfig(state.template).sourceLabel || "REFERENCE";
    $("#sourcePreview .coupon-label").textContent = sourceLabel;
    $("#backSourcePreview .coupon-label").textContent = sourceLabel;
    $("#backSourceLabelPreview").textContent = sourceLabel;
    $("#sourcePreviewValue").textContent = state.source || "출처 없음";
    $("#frontSerialLabelPreview").textContent = state.serialLabel;
    $("#serialPreview").textContent = state.serial;
    $("#serialCopyLabelPreview").textContent = state.serialCopyLabel;
    $("#serialCopyValue").textContent = state.serial;
    $("#backTitlePreview").textContent = state.backTitle;
    renderPostcardWritingPreview(state.backBody);
    $("#ratingLabelPreview").textContent = state.ratingLabel;
    $("#ratingGlyphsPreview").textContent = Array(5).fill(state.ratingMark || "☆").join("");
    $("#ratingScorePreview").textContent = state.ratingScore;
    $("#backNoteLabelPreview").textContent = state.backNoteLabel;
    $("#backNotePreview").textContent = state.backNote;
    $("#backSerialLabelPreview").textContent = state.serialLabel;
    $("#backSerial").textContent = state.serial;
    $("#backSourcePreviewValue").textContent = state.source || "출처 없음";
    $("#backSerialCopyLabelPreview").textContent = state.serialCopyLabel;
    $("#backSerialCopyValue").textContent = state.serial;
    renderNativeInlineTextStyles();

    setInputValue("#quoteInput", state.quote);
    setInputValue("#speakerInput", state.speaker);
    setInputValue("#kickerInput", state.kicker);
    setInputValue("#titleInput", state.title);
    setInputValue("#subtitleInput", state.subtitle);
    setInputValue("#backKickerInput", mirrorTrainCoupon ? state.kicker : state.backKicker);
    setInputValue("#backHeadingInput", mirrorTrainCoupon ? state.title : state.backHeading);
    setInputValue("#botLabelInput", state.botLabel);
    setInputValue("#personaLabelInput", state.personaLabel);
    setInputValue("#dateLabelInput", state.dateLabel);
    setInputValue("#botNameInput", state.botName);
    setInputValue("#personaNameInput", state.personaName);
    setInputValue("#dateInput", state.date);
    setInputValue("#sourceInput", state.source);
    setInputValue("#serialInput", state.serial);
    setInputValue("#backTitleInput", state.backTitle);
    setInputValue("#backBodyInput", state.backBody);
    setInputValue("#backNoteInput", state.backNote);
    setInputValue("#backCopyLabelInput", state.backCopyLabel);
    setInputValue("#sealTextInput", state.sealText);
    setInputValue("#coachLabelInput", state.coachLabel);
    setInputValue("#coachNumberInput", state.coachNumber);
    setInputValue("#stubToplineInput", state.stubTopline);
    setInputValue("#admitTextInput", state.admitText.replace(/\n/g, " "));
    setInputValue("#stubTitleInput", state.stubTitle);
    setInputValue("#platformTextInput", state.platformText);
    setInputValue("#validationTextInput", state.validationText.replace(/\n/g, " "));
    setInputValue("#backIndexInput", state.backIndex);
    setInputValue("#backStampInput", state.backStamp);
    $("#quoteFieldLabel").textContent = state.template === "cinema" && state.side === "front" ? "대표 대사" : "문장";
    $("#speakerFields").hidden = state.template === "cinema" && state.side === "front";
    setInputValue("#fontSizeInput", pxToPt(activeLayout().quoteSize));
    $("#quoteColor").value = state.quoteColor;
    $("#quoteColorValue").textContent = state.quoteColor.toUpperCase();
    $("#accentColor").value = state.accent;
    $("#accentColorDetails").value = state.accent;
    $("#accentColorStub").value = state.accent;
    $("#accentColorFrame").value = state.accent;
    $("#accentCode").textContent = state.accent.toUpperCase();
    $("#accentCodeFrame").textContent = state.accent.toUpperCase();
    $("#mutedColor").value = state.muted;
    $("#textureToggle").checked = state.texture;
    $("#textureStrengthRange").value = state.textureStrength;
    $("#textureStrengthOut").textContent = state.textureStrength + "%";

    var effect = activeEffect() || defaultEffect();
    var uiBrightness = clamp(effect.brightness - 100, -100, 100);
    var uiSaturation = clamp(effect.saturation - 100, -100, 100);
    var uiContrast = clamp(effect.contrast - 100, -100, 100);
    $("#blurRange").value = effect.blur;
    $("#brightRange").value = uiBrightness;
    $("#satRange").value = uiSaturation;
    $("#contrastRange").value = uiContrast;
    $("#hueRange").value = effect.hue;
    setInputValue("#sepiaInput", effect.sepia);
    setInputValue("#grayscaleInput", effect.grayscale);
    $("#vignetteRange").value = effect.vignette;
    $("#overlayRange").value = effect.overlay;
    $("#overlayColorInput").value = effect.overlayColor;
    $("#overlayBlendInput").value = effect.overlayBlend;
    setInputValue("#blurOut", effect.blur);
    setInputValue("#brightOut", uiBrightness);
    setInputValue("#satOut", uiSaturation);
    setInputValue("#contrastOut", uiContrast);
    setInputValue("#hueOut", effect.hue);
    setInputValue("#vignetteOut", effect.vignette);
    setInputValue("#overlayOut", effect.overlay);

    $("#durationRange").value = state.duration;
    $("#durationOut").textContent = state.duration + "ms";
    $("#viewZoomRange").value = Math.round(state.viewZoom * 100);
    setInputValue("#viewZoomInput", Math.round(state.viewZoom * 100));
    $("#viewZoomOut").textContent = Math.round(state.viewZoom * 100) + "%";
    var displayRotation = Math.round(normalizedRotation(state.viewRotation) * 100) / 100;
    $("#viewRotationRange").value = displayRotation;
    setInputValue("#viewRotationInput", displayRotation);
    $("#viewRotationOut").textContent = displayRotation + "°";
    $("#freeformBtn").classList.toggle("active", state.freeform);
    $("#freeformBtn").setAttribute("aria-pressed", String(state.freeform));
    $("#freeformBtn").setAttribute("title", state.freeform ? "자유 배치 끄기" : "자유 배치 켜기");
    $("#freeformBtn").setAttribute("aria-label", state.freeform ? "자유 배치 끄기" : "자유 배치 켜기");
    var gridSnapButton = $("#snapToggle");
    gridSnapButton.classList.toggle("active", Boolean(state.snapToGrid));
    gridSnapButton.setAttribute("aria-pressed", String(Boolean(state.snapToGrid)));
    gridSnapButton.setAttribute("title", state.snapToGrid ? "0.5% 격자 스냅 끄기" : "0.5% 격자 스냅 켜기");
    gridSnapButton.setAttribute("aria-label", state.snapToGrid ? "격자 스냅 끄기" : "격자 스냅 켜기");
    [
      { selector: "#objectSnapBtn", enabled: state.snapToObjects, on: "오브젝트 스냅 끄기", off: "오브젝트 스냅 켜기" },
      { selector: "#centerSnapBtn", enabled: state.snapToCanvasCenter, on: "템플릿 중앙 스냅 끄기", off: "템플릿 중앙 스냅 켜기" }
    ].forEach(function (config) {
      var button = $(config.selector);
      button.classList.toggle("active", Boolean(config.enabled));
      button.setAttribute("aria-pressed", String(Boolean(config.enabled)));
      button.setAttribute("aria-label", config.enabled ? config.on : config.off);
    });
    var exportSize = templateConfig(state.template).export;
    $("#canvasSize").textContent = exportSize.width + " × " + exportSize.height;
    var activeTemplateConfig = templateConfig(state.template);
    var sideLabel = activeTemplateConfig.sideLabels[state.side] || "FRONT";
    $("#faceStatus").textContent = faceViewActive ? activeTemplateConfig.sideLabels[state.postcardViewMode] : sideLabel;
    $("#layerFaceTitle").textContent = sideLabel + " LAYERS";
    $("#documentName").textContent = activeTemplateConfig.documentName;
    renderLayoutPresetControls();

    $(".side-switch").hidden = false;
    var motionTab = $('[data-tab="motion"]');
    if (motionTab) motionTab.hidden = bothStatic || postcardStatic;
    if ((bothStatic || postcardStatic) && motionTab && motionTab.classList.contains("active")) {
      var propertiesTab = $('[data-tab="properties"]');
      if (propertiesTab) propertiesTab.click();
    }
    $$(".side-switch [data-side]").forEach(function (button) {
      var view = button.dataset.side;
      button.hidden = false;
      button.textContent = activeTemplateConfig.sideLabels[view] || view.toUpperCase();
      button.classList.toggle("active", faceViewActive ? view === state.postcardViewMode : view === state.side);
      button.disabled = Boolean(flipPhase);
    });
    var postcardTopSwitch = $("#postcardTopSwitch");
    postcardTopSwitch.hidden = state.postcardViewMode !== "both";
    $$('[data-postcard-top]').forEach(function (button) {
      button.classList.toggle("active", button.dataset.postcardTop === state.postcardTopSide);
    });
    $$("[data-font]").forEach(function (button) { button.classList.toggle("selected", button.dataset.font === state.font); });
    syncFontSourceTab("global", state.font);
    $$("[data-motion]").forEach(function (button) { button.classList.toggle("selected", button.dataset.motion === state.motion); });
    $("#undoBtn").disabled = history.length === 0 || Boolean(flipPhase);
    $("#redoBtn").disabled = future.length === 0 || Boolean(flipPhase);
    $("#playBtn").hidden = bothStatic || postcardStatic;
    $("#playBtn").disabled = bothStatic || postcardStatic || Boolean(flipPhase);

    renderCustomLayers();
    buildLayerList();
    applyLayouts();
    renderLayerState();
    renderInspector();
    paintTrainPerforations();
    syncColorCodeInputs();
    $$(".panel-scroll").forEach(function (panel) { if (panel.scrollLeft) panel.scrollLeft = 0; });
    scheduleSave();
    requestAnimationFrame(function () {
      renderBlockImages();
      paintTrainPerforations();
    });
    syncInstalledLayerClippingSources(state);
    if (!drag) queueLayerClippingPreview(1, false);
  }

  function layoutPresetsForTemplate(template) {
    return LAYOUT_PRESETS.filter(function (preset) {
      return preset && preset.template === template;
    });
  }

  function activeLayoutPreset() {
    var select = $("#layoutPresetSelect");
    if (!select) return null;
    return layoutPresetsForTemplate(state.template).find(function (preset) {
      return preset.id === select.value;
    }) || null;
  }

  function renderLayoutPresetControls() {
    var controls = $("#layoutPresetControls");
    var select = $("#layoutPresetSelect");
    if (!controls || !select) return;
    var presets = layoutPresetsForTemplate(state.template);
    controls.hidden = presets.length === 0;
    if (!presets.length) return;

    var signature = state.template + "|" + presets.map(function (preset) { return preset.id; }).join("|");
    if (select.dataset.signature !== signature) {
      var previous = select.value;
      select.replaceChildren();
      presets.forEach(function (preset) {
        var option = document.createElement("option");
        option.value = preset.id;
        option.textContent = preset.name;
        select.appendChild(option);
      });
      select.dataset.signature = signature;
      select.value = presets.some(function (preset) { return preset.id === previous; }) ? previous : presets[0].id;
    }

    var active = activeLayoutPreset() || presets[0];
    $("#layoutPresetCount").textContent = String(presets.length) + "개";
    $("#applyLayoutPresetBtn").disabled = !active;
  }

  function runtimeLayoutPreset(preset) {
    var next = clone(preset && preset.document ? preset.document : preset);
    var idMap = {};
    ["front", "back"].forEach(function (side) {
      (next.customLayers[side] || []).forEach(function (item) {
        var previousId = item.id;
        var nextId = String(previousId || "").indexOf("custom-") === 0 ? previousId : "custom-" + previousId;
        idMap[previousId] = nextId;
        item.id = nextId;
        item.side = side;
      });
    });

    function remapToken(value) {
      if (typeof value !== "string") return value;
      if (idMap[value]) return idMap[value];
      var oldIds = Object.keys(idMap);
      for (var index = 0; index < oldIds.length; index += 1) {
        var oldId = oldIds[index];
        if (value.slice(-(oldId.length + 2)) === "::" + oldId) {
          return value.slice(0, -oldId.length) + idMap[oldId];
        }
      }
      return value;
    }

    function remapRecord(record) {
      return Object.keys(record || {}).reduce(function (result, key) {
        result[remapToken(key)] = record[key];
        return result;
      }, {});
    }

    next.hidden = (next.hidden || []).map(remapToken);
    next.locked = (next.locked || []).map(remapToken);
    next.clipping = (next.clipping || []).map(remapToken);
    ["front", "back"].forEach(function (side) {
      next.layerOrders[side] = (next.layerOrders[side] || []).map(remapToken);
      next.layerStyles[side] = remapRecord(next.layerStyles[side]);
      next.inlineTextStyles[side] = remapRecord(next.inlineTextStyles[side]);
      next.sideShadows[side] = remapRecord(next.sideShadows[side]);
    });
    next.shadows = remapRecord(next.shadows);
    /* A hidden user layer in a saved example is an abandoned draft, not part
       of the selectable layout. Remove it and every presentation reference
       before normalization so it cannot reappear in the layer list. */
    var removedIds = [];
    ["front", "back"].forEach(function (side) {
      next.customLayers[side] = (next.customLayers[side] || []).filter(function (item) {
        var hidden = (next.hidden || []).indexOf(item.id) >= 0 || (next.hidden || []).indexOf(side + "::" + item.id) >= 0;
        if (hidden) removedIds.push(item.id);
        return !hidden;
      });
    });
    function referencesRemovedLayer(value) {
      return removedIds.some(function (id) { return value === id || value === "front::" + id || value === "back::" + id; });
    }
    next.hidden = (next.hidden || []).filter(function (value) { return !referencesRemovedLayer(value); });
    next.locked = (next.locked || []).filter(function (value) { return !referencesRemovedLayer(value); });
    next.clipping = (next.clipping || []).filter(function (value) { return !referencesRemovedLayer(value); });
    next.layerOrder = (next.layerOrder || []).filter(function (value) { return removedIds.indexOf(value) < 0; });
    ["front", "back"].forEach(function (side) {
      next.layerOrders[side] = (next.layerOrders[side] || []).filter(function (value) { return removedIds.indexOf(value) < 0; });
      removedIds.forEach(function (id) {
        delete next.layerStyles[side][id];
        delete next.inlineTextStyles[side][id];
        delete next.sideShadows[side][id];
      });
    });
    removedIds.forEach(function (id) { delete next.shadows[id]; });
    next.removedLayers = (next.removedLayers || []).concat(next.hidden || []);
    next.hidden = [];
    return next;
  }

  function applyLayoutPreset(preset) {
    if (!preset || preset.template !== state.template) return;
    var runtime = runtimeLayoutPreset(preset);
    if (!runtime || runtime.template !== state.template) return;
    var confirmed = window.confirm("배치 예시를 불러오면 현재 템플릿의 레이어, 글, 이미지와 배치가 모두 사라지고 선택한 예시로 대체됩니다. 계속할까요?");
    if (!confirmed) return;
    var preservedUi = {
      uiTheme: state.uiTheme,
      viewZoom: state.viewZoom,
      viewRotation: state.viewRotation,
      snapToGrid: state.snapToGrid,
      snapToObjects: state.snapToObjects,
      snapToCanvasCenter: state.snapToCanvasCenter
    };
    commit(function () {
      state = normalizeDocument(runtime, preset.template);
      Object.keys(preservedUi).forEach(function (key) { state[key] = preservedUi[key]; });
      clearLayerSelection();
    });
    showToast("‘" + preset.name + "’ 배치로 현재 작업을 교체했어요. Ctrl+Z로 되돌릴 수 있어요.");
  }

  function bindInput(selector, apply, parser) {
    var node = $(selector);
    node.addEventListener("focus", startEdit);
    node.addEventListener("pointerdown", startEdit);
    node.addEventListener("input", function () {
      if (parser === Number && node.type === "number" && !Number.isFinite(node.valueAsNumber)) return;
      var value = parser ? parser(node.value) : node.value;
      apply(value);
      render();
    });
    node.addEventListener("change", function () {
      if (parser === Number && node.type === "number" && !Number.isFinite(node.valueAsNumber)) render();
      finishEdit();
    });
    node.addEventListener("blur", function () {
      if (parser === Number && node.type === "number" && !Number.isFinite(node.valueAsNumber)) render();
      finishEdit();
    });
    if (parser === Number && node.type === "number") {
      node.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        var current = Number.isFinite(node.valueAsNumber) ? node.valueAsNumber : finiteNumber(node.value, 0);
        var step = finiteNumber(node.step, 1);
        var minimum = node.min === "" ? -Infinity : finiteNumber(node.min, -Infinity);
        var maximum = node.max === "" ? Infinity : finiteNumber(node.max, Infinity);
        var decimals = String(node.step || "1").split(".")[1];
        var next = clamp(current + (event.key === "ArrowUp" ? step : -step), minimum, maximum);
        node.value = decimals ? next.toFixed(decimals.length) : String(next);
        node.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
  }

  function applyTemplate(template) {
    if (!isTemplateId(template)) return;
    templateDocuments[state.template] = clone(state);
    var currentUiTheme = state.uiTheme;
    var currentZoom = state.viewZoom;
    var currentRotation = state.viewRotation;
    state = clone(templateDocuments[template] || createTemplateDefaults(template));
    state.uiTheme = currentUiTheme;
    state.viewZoom = currentZoom;
    state.viewRotation = currentRotation;
    state.side = state.postcardViewMode === "both" ? state.postcardTopSide : state.postcardViewMode;
    state.selectedLayer = "";
    trackedTextSelection = null;
    history = [];
    future = [];
  }

  $$(".tabs button").forEach(function (button) {
    button.addEventListener("click", function () {
      $$(".tabs button").forEach(function (item) { item.classList.toggle("active", item === button); });
      $$(".tab-panel").forEach(function (panel) { panel.classList.toggle("active", panel.dataset.panel === button.dataset.tab); });
    });
  });

  $$("[data-start-template]").forEach(function (button) {
    button.addEventListener("click", function () {
      applyTemplate(button.dataset.startTemplate);
      $("#templateEntry").classList.add("hidden");
      render();
      requestAnimationFrame(fitPreview);
    });
  });
  $("#openTemplateBtn").addEventListener("click", function () { $("#templateEntry").classList.remove("hidden"); });
  $("#layoutPresetSelect").addEventListener("change", renderLayoutPresetControls);
  $("#applyLayoutPresetBtn").addEventListener("click", function () {
    applyLayoutPreset(activeLayoutPreset());
  });
  $("#freeformBtn").addEventListener("click", function () {
    commit(function () { state.freeform = !state.freeform; });
    showToast(state.freeform ? "자유 배치 모드: 레이어를 직접 옮길 수 있어요." : "선택 모드로 돌아왔어요.");
  });
  $("#snapToggle").addEventListener("click", function () {
    commit(function () { state.snapToGrid = !state.snapToGrid; });
  });
  $("#objectSnapBtn").addEventListener("click", function () {
    commit(function () { state.snapToObjects = !state.snapToObjects; });
  });
  $("#centerSnapBtn").addEventListener("click", function () {
    commit(function () { state.snapToCanvasCenter = !state.snapToCanvasCenter; });
  });
  $("#resetPlacementBtn").addEventListener("click", function () {
    commit(function () {
      var templateDefaults = createTemplateDefaults(state.template);
      state.layouts[state.side].quoteX = templateDefaults.layouts[state.side].quoteX;
      state.layouts[state.side].quoteY = templateDefaults.layouts[state.side].quoteY;
      state.layouts[state.side].detailsX = templateDefaults.layouts[state.side].detailsX;
      state.layouts[state.side].detailsY = templateDefaults.layouts[state.side].detailsY;
      state.placements[state.side] = {};
      resetLegacyCompositeTransformsForSide(state.side);
    });
    showToast((state.side === "front" ? "앞면" : "뒷면") + " 템플릿 레이어의 위치만 복원했어요.");
  });
  $("#resetTemplateBtn").addEventListener("click", function () {
    if (!window.confirm("현재 " + templateConfig(state.template).resetName + " 템플릿을 처음 상태로 되돌릴까요? 사용자 추가 레이어도 제거되며 Ctrl+Z로 복구할 수 있습니다.")) return;
    commit(function () {
      var editorState = {
        uiTheme: state.uiTheme, side: state.side, viewZoom: state.viewZoom, viewRotation: state.viewRotation,
        freeform: state.freeform, snapToGrid: state.snapToGrid,
        snapToObjects: state.snapToObjects, snapToCanvasCenter: state.snapToCanvasCenter,
        postcardViewMode: state.postcardViewMode, postcardTopSide: state.postcardTopSide
      };
      state = createTemplateDefaults(state.template);
      Object.assign(state, editorState);
      state.selectedLayer = "";
      trackedTextSelection = null;
    });
    clearTemplateImageAssets(state.template);
    showToast("현재 템플릿을 처음 상태로 초기화했어요.");
  });
  $("#addTextLayerBtn").addEventListener("click", function () {
    commit(function () { addCustomLayer(defaultCustomLayer("text")); });
    showToast("템플릿과 독립된 텍스트 레이어를 추가했어요.");
  });
  $("#addShapeLayerBtn").addEventListener("click", function (event) {
    var menu = $("#shapeAddMenu");
    var open = menu.hasAttribute("hidden");
    menu.toggleAttribute("hidden", !open);
    $("#addShapeLayerBtn").setAttribute("aria-expanded", String(open));
    event.stopPropagation();
  });
  $$('[data-add-shape]').forEach(function (button) {
    button.addEventListener("click", function (event) {
      commit(function () { addCustomLayer(defaultCustomShape(button.dataset.addShape)); });
      $("#shapeAddMenu").setAttribute("hidden", "");
      $("#addShapeLayerBtn").setAttribute("aria-expanded", "false");
      showToast("도형 레이어를 추가했어요.");
      event.stopPropagation();
    });
  });
  $("#addImageLayerInput").addEventListener("change", function (event) {
    var input = event.currentTarget;
    var file = input.files && input.files[0];
    if (!file) return;
    readImageFile(file, function (dataUrl, image) {
      commit(function () {
        var layer = defaultCustomLayer("image");
        fitNewCustomImageFrame(layer, image.naturalWidth, image.naturalHeight, state.template);
        layer.imageData = dataUrl;
        layer.imageAssetStored = true;
        layer.imageName = file.name;
        layer.imageType = file.type;
        addCustomLayer(layer);
      });
      var addedLayer = customLayerById(state.selectedLayer);
      if (addedLayer) putImageAsset({
        id: imageCustomAssetId(state.template, addedLayer.side, addedLayer.id), data: addedLayer.imageData,
        name: addedLayer.imageName || "", type: addedLayer.imageType || ""
      });
      input.value = "";
      showToast("이미지 레이어를 추가했어요. 투명 배경은 그대로 유지됩니다.");
    });
  });
  $("#uiThemeBtn").addEventListener("click", function () {
    commit(function () { state.uiTheme = state.uiTheme === "dark" ? "light" : "dark"; });
  });
  $("#exportHelpBtn").addEventListener("click", function (event) {
    var help = $("#exportHelp");
    var open = help.hasAttribute("hidden");
    help.toggleAttribute("hidden", !open);
    $("#exportHelpBtn").setAttribute("aria-expanded", String(open));
    event.stopPropagation();
  });
  $("#exportHelp").addEventListener("click", function (event) { event.stopPropagation(); });
  document.addEventListener("click", function () {
    $("#exportHelp").setAttribute("hidden", "");
    $("#exportHelpBtn").setAttribute("aria-expanded", "false");
    $("#shapeAddMenu").setAttribute("hidden", "");
    $("#addShapeLayerBtn").setAttribute("aria-expanded", "false");
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    $("#exportHelp").setAttribute("hidden", "");
    $("#exportHelpBtn").setAttribute("aria-expanded", "false");
  });

  var panelMedia = window.matchMedia("(max-width: 900px)");
  function setPanelCollapsed(panel, collapsed, refit) {
    var button = panel === "layers" ? $("#toggleLayersBtn") : $("#toggleInspectorBtn");
    var label = panel === "layers" ? "레이어" : "속성";
    document.body.classList.toggle(panel + "-collapsed", collapsed);
    button.setAttribute("aria-pressed", String(collapsed));
    button.setAttribute("aria-label", label + " 패널 " + (collapsed ? "펼치기" : "접기"));
    button.setAttribute("title", label + " 패널 " + (collapsed ? "펼치기" : "접기"));
    if (refit) window.setTimeout(fitPreview, 240);
  }
  function togglePanel(panel) {
    var collapsed = document.body.classList.contains(panel + "-collapsed");
    if (panelMedia.matches && collapsed) {
      setPanelCollapsed(panel === "layers" ? "editor" : "layers", true, false);
    }
    setPanelCollapsed(panel, !collapsed, true);
  }
  $("#toggleLayersBtn").addEventListener("click", function () { togglePanel("layers"); });
  $("#toggleInspectorBtn").addEventListener("click", function () { togglePanel("editor"); });
  if (panelMedia.matches) {
    setPanelCollapsed("layers", true, false);
    setPanelCollapsed("editor", true, false);
  }
  if (panelMedia.addEventListener) {
    panelMedia.addEventListener("change", function (event) {
      if (!event.matches) return;
      setPanelCollapsed("layers", true, false);
      setPanelCollapsed("editor", true, true);
    });
  }
  $$(".export-menu-popover > .btn").forEach(function (button) {
    button.addEventListener("click", function () {
      window.setTimeout(function () {
        var menu = button.closest(".export-menu");
        if (menu) menu.removeAttribute("open");
      }, 0);
    });
  });

  $$(".side-switch [data-side]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (flipPhase) return;
      var nextSide = button.dataset.side;
      state.postcardViewMode = nextSide;
      if (nextSide === "front" || nextSide === "back") state.side = nextSide;
      else state.side = state.postcardTopSide;
      flipPhase = "";
      animateFade = false;
      state.selectedLayer = "";
      trackedTextSelection = null;
      render();
    });
  });
  $$('[data-postcard-top]').forEach(function (button) {
    button.addEventListener("click", function () {
      if (state.postcardViewMode !== "both") return;
      state.postcardTopSide = button.dataset.postcardTop === "back" ? "back" : "front";
      state.side = state.postcardTopSide;
      state.selectedLayer = "";
      trackedTextSelection = null;
      render();
    });
  });

  $("#layerList").addEventListener("click", function (event) {
    var select = event.target.closest("[data-layer-select]");
    if (select) {
      setPrimarySelection(select.dataset.layerSelect, event.ctrlKey || event.metaKey);
      render();
      return;
    }
    var visible = event.target.closest("[data-visible]");
    if (visible) {
      if (isProtectedLayer(visible.dataset.visible)) { showToast("출처 레이어는 숨길 수 없습니다."); return; }
      commit(function () { toggleLayerFlag(state.hidden, visible.dataset.visible, state.side, state); });
      return;
    }
    var lock = event.target.closest("[data-lock]");
    if (lock) commit(function () { toggleLayerFlag(state.locked, lock.dataset.lock, state.side, state); });
  });

  function moveSelectedLayer(mode) {
    if (isProtectedLayer(state.selectedLayer)) { showToast("출처 레이어는 항상 최상단에 유지됩니다."); return; }
    var activeOrder = layerOrderFor(state.side, state);
    var index = activeOrder.indexOf(state.selectedLayer);
    if (index < 0) return;
    var visibleIndexes = activeOrder.map(function (key, orderIndex) {
      return layerAvailableOnSide(key, state.side) ? orderIndex : -1;
    }).filter(function (orderIndex) { return orderIndex >= 0; });
    var target;
    if (mode === "top") target = visibleIndexes[visibleIndexes.length - 1];
    else if (mode === "bottom") target = visibleIndexes[0];
    else {
      target = index + mode;
      while (target >= 0 && target < activeOrder.length && !layerAvailableOnSide(activeOrder[target], state.side)) target += mode;
    }
    if (!Number.isFinite(target) || target < 0 || target >= activeOrder.length || target === index) return;
    commit(function () {
      var order = layerOrderFor(state.side, state);
      var item = order.splice(index, 1)[0];
      order.splice(target, 0, item);
      syncFlatLayerOrder(state);
    });
  }
  $("#layerBottom").addEventListener("click", function () { moveSelectedLayer("bottom"); });
  $("#layerBackward").addEventListener("click", function () { moveSelectedLayer(-1); });
  $("#layerForward").addEventListener("click", function () { moveSelectedLayer(1); });
  $("#layerTop").addEventListener("click", function () { moveSelectedLayer("top"); });

  function rgbToHex(value, fallback) {
    if (/^#[0-9a-f]{6}$/i.test(String(value || ""))) return value;
    var match = String(value || "").match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if (!match) return fallback;
    return "#" + [match[1], match[2], match[3]].map(function (part) { return clamp(Number(part), 0, 255).toString(16).padStart(2, "0"); }).join("");
  }
  function layerRectPercent(node, face, preserveTextScale) {
    var x = 0;
    var y = 0;
    var current = node;
    while (current && current !== face) {
      x += current.offsetLeft || 0;
      y += current.offsetTop || 0;
      current = current.offsetParent;
    }
    var placement = placementFor(state.side, node.dataset.canvasLayer);
    var baseWidth = Math.max(0, node.offsetWidth || 0);
    var baseHeight = Math.max(0, node.offsetHeight || 0);
    var scaleX = placement ? clamp(finiteNumber(placement.scaleX, 1), .1, MAX_NATIVE_OBJECT_SCALE) : 1;
    var scaleY = placement ? clamp(finiteNumber(placement.scaleY, 1), .1, MAX_NATIVE_OBJECT_SCALE) : 1;
    var scaledWidth = baseWidth * scaleX;
    var scaledHeight = baseHeight * scaleY;
    if (placement) {
      x += finiteNumber(placement.x, 0) / 100 * ticket.offsetWidth;
      y += finiteNumber(placement.y, 0) / 100 * ticket.offsetHeight;
    }
    if (preserveTextScale) {
      return {
        x: clamp(x / Math.max(1, ticket.offsetWidth) * 100, -50, 100),
        y: clamp(y / Math.max(1, ticket.offsetHeight) * 100, -50, 100),
        w: clamp(baseWidth / Math.max(1, ticket.offsetWidth) * 100, .25, MAX_OBJECT_SIZE_PERCENT),
        h: clamp(baseHeight / Math.max(1, ticket.offsetHeight) * 100, .25, MAX_OBJECT_SIZE_PERCENT),
        scaleX: scaleX,
        scaleY: scaleY,
        rotation: placement ? clamp(finiteNumber(placement.rotation, 0), -360, 360) : 0,
        skewX: placement ? clamp(finiteNumber(placement.skewX, 0), -70, 70) : 0
      };
    }
    /* Native layers scale around their center. A pasted layer stores its size
       directly instead of retaining a second scale transform, so move the
       scaled box back around that same center before converting to percent. */
    x += (baseWidth - scaledWidth) / 2;
    y += (baseHeight - scaledHeight) / 2;
    return {
      x: clamp(x / Math.max(1, ticket.offsetWidth) * 100, -50, 100),
      y: clamp(y / Math.max(1, ticket.offsetHeight) * 100, -50, 100),
      w: clamp(scaledWidth / Math.max(1, ticket.offsetWidth) * 100, .25, MAX_OBJECT_SIZE_PERCENT),
      h: clamp(scaledHeight / Math.max(1, ticket.offsetHeight) * 100, .25, MAX_OBJECT_SIZE_PERCENT),
      rotation: placement ? clamp(finiteNumber(placement.rotation, 0), -360, 360) : 0,
      skewX: placement ? clamp(finiteNumber(placement.skewX, 0), -70, 70) : 0
    };
  }
  function capturedBoxStyle(node) {
    var computed = window.getComputedStyle(node);
    var inlinePlacementTransform = /^translate\(/i.test(String(node.style.transform || "").trim());
    return normalizeBoxStyle({
      background: computed.background,
      borderTop: computed.borderTop,
      borderRight: computed.borderRight,
      borderBottom: computed.borderBottom,
      borderLeft: computed.borderLeft,
      borderRadius: computed.borderRadius,
      boxShadow: computed.boxShadow,
      clipPath: computed.clipPath || computed.webkitClipPath,
      overflow: computed.overflow,
      transform: inlinePlacementTransform ? "none" : computed.transform,
      rotate: computed.rotate,
      transformOrigin: computed.transformOrigin,
      mixBlendMode: computed.mixBlendMode
    });
  }
  function directTextContent(node) {
    return Array.prototype.slice.call(node.childNodes).filter(function (child) {
      return child.nodeType === Node.TEXT_NODE;
    }).map(function (child) { return child.nodeValue || ""; }).join("").replace(/^\s+|\s+$/g, "");
  }
  function layoutOffset(node) {
    var x = 0;
    var y = 0;
    var current = node;
    while (current) {
      x += current.offsetLeft || 0;
      y += current.offsetTop || 0;
      current = current.offsetParent;
    }
    return { x: x, y: y };
  }
  function relativeElementRect(node, root) {
    if (node === root) return { x: 0, y: 0, w: 100, h: 100 };
    var nodeOffset = layoutOffset(node);
    var rootOffset = layoutOffset(root);
    var rootWidth = Math.max(1, root.offsetWidth);
    var rootHeight = Math.max(1, root.offsetHeight);
    return {
      x: (nodeOffset.x - rootOffset.x) / rootWidth * 100,
      y: (nodeOffset.y - rootOffset.y) / rootHeight * 100,
      w: Math.max(1, node.offsetWidth) / rootWidth * 100,
      h: Math.max(1, node.offsetHeight) / rootHeight * 100
    };
  }
  function effectiveNestedOpacity(node, root) {
    if (node === root) return 1;
    var opacity = 1;
    var current = node;
    while (current && current !== root) {
      opacity *= clamp(finiteNumber(window.getComputedStyle(current).opacity, 1), 0, 1);
      current = current.parentElement;
    }
    return opacity;
  }
  function captureStyledRuns(root) {
    var candidates = [root].concat(Array.prototype.slice.call(root.querySelectorAll("*")));
    var runs = [];
    candidates.forEach(function (node) {
      var text = directTextContent(node);
      if (!text) return;
      var computed = window.getComputedStyle(node);
      if (computed.display === "none" || computed.visibility === "hidden") return;
      var rect = relativeElementRect(node, root);
      var isRoot = node === root;
      runs.push({
        text: text,
        x: rect.x, y: rect.y, w: rect.w, h: rect.h,
        color: rgbToHex(computed.color, state.quoteColor),
        background: isRoot ? "transparent" : computed.background,
        borderTop: isRoot ? "0px none rgba(0, 0, 0, 0)" : computed.borderTop,
        borderRight: isRoot ? "0px none rgba(0, 0, 0, 0)" : computed.borderRight,
        borderBottom: isRoot ? "0px none rgba(0, 0, 0, 0)" : computed.borderBottom,
        borderLeft: isRoot ? "0px none rgba(0, 0, 0, 0)" : computed.borderLeft,
        borderRadius: isRoot ? "0px" : computed.borderRadius,
        boxShadow: isRoot ? "none" : computed.boxShadow,
        fontFamily: computed.fontFamily,
        fontSize: parseFloat(computed.fontSize) || 28,
        fontWeight: computed.fontWeight,
        fontStyle: computed.fontStyle,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        textAlign: computed.textAlign,
        textTransform: computed.textTransform,
        whiteSpace: computed.whiteSpace,
        display: computed.display,
        alignItems: computed.alignItems,
        justifyContent: computed.justifyContent,
        justifyItems: computed.justifyItems,
        transform: computed.transform,
        transformOrigin: computed.transformOrigin,
        opacity: effectiveNestedOpacity(node, root)
      });
    });
    return normalizeStyledRuns(runs);
  }
  function scaleCapturedCssPixelMetric(value, scale) {
    var match = String(value == null ? "" : value).trim().match(/^(-?(?:\d+\.?\d*|\.\d+))px$/i);
    if (!match) return value;
    return Math.round(Number(match[1]) * scale * 1000) / 1000 + "px";
  }
  function scaleCapturedTextMetrics(runs, scaleX, scaleY, writingMode) {
    var horizontalScale = clamp(finiteNumber(scaleX, 1), .1, MAX_NATIVE_OBJECT_SCALE);
    var verticalScale = clamp(finiteNumber(scaleY, 1), .1, MAX_NATIVE_OBJECT_SCALE);
    var verticalWriting = writingMode === "vertical-rl";
    var fontScale = verticalWriting ? horizontalScale : verticalScale;
    var letterScale = verticalWriting ? verticalScale : horizontalScale;
    return normalizeStyledRuns((runs || []).map(function (run) {
      var scaled = Object.assign({}, run);
      scaled.fontSize = clamp(finiteNumber(run.fontSize, 28) * fontScale, 4, MAX_FONT_SIZE_PX);
      scaled.lineHeight = scaleCapturedCssPixelMetric(run.lineHeight, fontScale);
      scaled.letterSpacing = scaleCapturedCssPixelMetric(run.letterSpacing, letterScale);
      return scaled;
    }));
  }
  function visibleBackgroundColor(value) {
    var text = String(value || "").toLowerCase();
    if (!text || text === "transparent") return false;
    var alpha = text.match(/rgba\([^)]*,\s*([\d.]+)\s*\)$/);
    return !alpha || Number(alpha[1]) > 0;
  }
  function captureStyledShapes(root) {
    var shapes = [];
    Array.prototype.slice.call(root.querySelectorAll("*")).forEach(function (node) {
      if (node.classList.contains("resize-handle") || node.closest(".resize-handle") || node.classList.contains("object-transform-handle") || node.closest(".object-transform-handle")) return;
      if (directTextContent(node)) return;
      var computed = window.getComputedStyle(node);
      if (computed.display === "none" || computed.visibility === "hidden" || !node.offsetWidth || !node.offsetHeight) return;
      var visible = computed.backgroundImage !== "none"
        || visibleBackgroundColor(computed.backgroundColor)
        || computed.boxShadow !== "none"
        || [computed.borderTop, computed.borderRight, computed.borderBottom, computed.borderLeft].some(function (border) {
          return parseFloat(border) > 0 && border.indexOf("none") < 0;
        });
      if (!visible) return;
      var rect = relativeElementRect(node, root);
      shapes.push({
        x: rect.x, y: rect.y, w: rect.w, h: rect.h,
        background: computed.background,
        borderTop: computed.borderTop,
        borderRight: computed.borderRight,
        borderBottom: computed.borderBottom,
        borderLeft: computed.borderLeft,
        borderRadius: computed.borderRadius,
        boxShadow: computed.boxShadow,
        opacity: effectiveNestedOpacity(node, root)
      });
    });
    return normalizeStyledShapes(shapes);
  }
  function layerSnapshotEnvelope(layer, sourceLayer) {
    return {
      version: 2,
      layer: clone(layer),
      presentation: {
        shadow: clone(shadowFor(sourceLayer || state.selectedLayer)),
        clipToBelow: isLayerClipped(sourceLayer || state.selectedLayer, state.side)
      }
    };
  }
  function selectedLayerSnapshot(layerKey) {
    var captureKey = layerKey || state.selectedLayer;
    var custom = customLayerById(captureKey);
    if (custom) return layerSnapshotEnvelope(custom, custom.id);
    var definition = layerDefinition(captureKey);
    var face = state.side === "front" ? frontFace : backFace;
    var node = captureKey ? face.querySelector('[data-canvas-layer="' + captureKey + '"]') : null;
    if (!definition || !node) return null;
    /* Old composite labels can still use a shared transform origin. Convert
       that legacy pivot to each leaf's center before capturing the snapshot,
       otherwise the copied custom layer preserves the scale/rotation but
       jumps because its transform origin is always its own center. */
    materializeLegacyCompositeTransform(state.side, captureKey);
    var wasCanvasSelected = node.classList.contains("canvas-selected");
    var wasTextDifference = node.classList.contains("layer-text-difference");
    var wasQuoteDifference = captureKey === "quote" && state.side === "front" && ticket.classList.contains("quote-effect-difference");
    if (wasCanvasSelected) node.classList.remove("canvas-selected");
    if (wasTextDifference) node.classList.remove("layer-text-difference");
    if (wasQuoteDifference) {
      ticket.classList.remove("quote-effect-difference");
      ticket.classList.add("quote-effect-solid");
    }
    try {
      if (captureKey === "image-main" || captureKey === "image-stub") {
        var blockKeyName = blockKey(state.side, captureKey);
        var block = state.blocks && state.blocks[blockKeyName];
        if (!block || !block.imageData) return null;
        var imageLayer = defaultCustomLayer("image");
        var imageRect = layerRectPercent(node, face);
        var imageFrame = node.querySelector(".block-image-frame") || node;
        Object.assign(imageLayer, imageRect, {
          name: (layerLabel(definition, state.side, state) || ["이미지"])[0] || "이미지",
          imageData: effectiveBlockImageSource(blockKeyName, block), imageName: block.imageName, imageType: block.imageType,
          fit: block.fit, zoom: block.zoom, panX: block.panX, panY: block.panY,
          effect: clone(block.effect || defaultEffect()),
          boxStyle: capturedBoxStyle(imageFrame)
        });
        return layerSnapshotEnvelope(imageLayer, captureKey);
      }
      if (["SURFACE", "STRUCTURE", "IMAGE"].indexOf(definition.group) >= 0 || captureKey === "effects") return null;
      var textLayer = defaultCustomLayer("text");
      var rect = layerRectPercent(node, face, true);
      var computed = window.getComputedStyle(node);
      var writingMode = computed.writingMode === "vertical-rl" ? "vertical-rl" : "horizontal-tb";
      /* Keep a native text object's non-uniform transform as a transform. If
         it is baked into font metrics and the outer box, horizontal and
         vertical glyph proportions are lost when the copy becomes a custom
         layer (and large text can be clipped by the font-size ceiling). */
      var fontScale = 1;
      var letterScale = 1;
      var styledRuns = scaleCapturedTextMetrics(captureStyledRuns(node), 1, 1, writingMode);
      var styledShapes = captureStyledShapes(node);
      var representative = styledRuns[0] || {};
      var textBoxStyle = capturedBoxStyle(node);
      textBoxStyle.mixBlendMode = "normal";
      Object.assign(textLayer, rect, {
        name: (layerLabel(definition, state.side, state) || ["텍스트"])[0] || "텍스트",
        text: styledRuns.length ? styledRuns.map(function (run) { return run.text; }).join("\n") : node.textContent || "",
        autoHeight: false,
        fontSize: clamp(finiteNumber(representative.fontSize, (parseFloat(computed.fontSize) || 28) * fontScale), 8, MAX_FONT_SIZE_PX),
        fontWeight: computed.fontWeight,
        fontStyle: computed.fontStyle,
        lineHeight: scaleCapturedCssPixelMetric(computed.lineHeight, fontScale),
        letterSpacing: scaleCapturedCssPixelMetric(computed.letterSpacing, letterScale),
        textTransform: computed.textTransform,
        whiteSpace: computed.whiteSpace,
        color: rgbToHex(computed.color, state.quoteColor),
        colorMode: nativeTextColorMode(captureKey, state.side),
        align: ["left", "center", "right"].indexOf(computed.textAlign) >= 0 ? computed.textAlign : "left",
        writingMode: writingMode,
        font: state.font,
        opacity: clamp(finiteNumber(computed.opacity, 1) * 100, 0, 100),
        styledRuns: styledRuns,
        styledShapes: styledShapes,
        boxStyle: textBoxStyle
      });
      return layerSnapshotEnvelope(textLayer, captureKey);
    } finally {
      if (wasQuoteDifference) {
        ticket.classList.remove("quote-effect-solid");
        ticket.classList.add("quote-effect-difference");
      }
      if (wasTextDifference) node.classList.add("layer-text-difference");
      if (wasCanvasSelected) node.classList.add("canvas-selected");
    }
  }
  function pasteLayerSnapshot(snapshot, labelSuffix) {
    if (!snapshot) return false;
    var payload = snapshot.layer && typeof snapshot.layer === "object" ? snapshot : { layer: snapshot, presentation: null };
    var layer = clone(payload.layer);
    layer.id = nextCustomLayerId();
    layer.side = state.side;
    layer.name = String(layer.name || (layer.type === "image" ? "사용자 이미지" : layer.type === "shape" ? "사용자 도형" : "사용자 텍스트")) + (labelSuffix || " 복사본");
    layer.x = clamp(finiteNumber(layer.x, 12) + 2, -50, 100);
    layer.y = clamp(finiteNumber(layer.y, 12) + 2, -50, 100);
    addCustomLayer(layer, payload.presentation && payload.presentation.shadow);
    if (payload.presentation && payload.presentation.clipToBelow) {
      if (!state.clipping) state.clipping = [];
      var clipToken = layerFlagToken(layer.id, layer.side, state);
      if (state.clipping.indexOf(clipToken) < 0) state.clipping.push(clipToken);
    }
    return layer.id;
  }
  function selectedOperationKeys() {
    var keys = selectedLayerKeys();
    return keys.length ? keys : state.selectedLayer ? [state.selectedLayer] : [];
  }
  function snapshotsForLayerKeys(keys) {
    var snapshots = (keys || []).map(function (key) { return selectedLayerSnapshot(key); });
    return snapshots.length && snapshots.every(Boolean) ? snapshots : null;
  }
  function selectCreatedLayerGroup(createdKeys) {
    var keys = (createdKeys || []).filter(Boolean);
    if (!keys.length) return;
    multiSelectedLayerKeys = keys.slice();
    multiSelectionSide = state.side;
    multiSelectionStateRef = state;
    state.selectedLayer = keys[keys.length - 1];
    trackedTextSelection = null;
  }
  function pasteLayerSnapshots(snapshots, labelSuffix) {
    var created = (snapshots || []).map(function (snapshot) {
      return pasteLayerSnapshot(snapshot, labelSuffix);
    }).filter(Boolean);
    selectCreatedLayerGroup(created);
    return created;
  }
  function removeLayerKeys(keys) {
    (keys || []).forEach(function (key) {
      if (isProtectedLayer(key)) return;
      if (!purgeCustomLayer(key) && !isLayerHidden(key, state.side)) {
        state.hidden.push(layerFlagToken(key, state.side, state));
      }
    });
    clearLayerSelection();
    trackedTextSelection = null;
  }
  function copySelectedLayer(cut) {
    var selectedKeys = selectedOperationKeys();
    if (selectedKeys.some(isProtectedLayer)) { showToast("출처 레이어는 복사하거나 잘라낼 수 없습니다."); return false; }
    var snapshots = snapshotsForLayerKeys(selectedKeys);
    if (!snapshots) { showToast("선택 항목에 복사할 수 없는 구조 레이어가 있어요. 텍스트·이미지·사용자 레이어만 복사할 수 있어요."); return false; }
    layerClipboard = { version: 1, snapshots: clone(snapshots) };
    if (cut) {
      commit(function () { removeLayerKeys(selectedKeys); });
      showToast(selectedKeys.length + "개 레이어를 잘라냈어요. Ctrl+V로 함께 붙여넣을 수 있어요.");
    } else {
      showToast(selectedKeys.length + "개 레이어를 복사했어요. Ctrl+V로 함께 붙여넣을 수 있어요.");
    }
    return true;
  }
  function pasteCopiedLayer() {
    if (!layerClipboard) { showToast("먼저 레이어를 복사해 주세요."); return; }
    var snapshots = Array.isArray(layerClipboard.snapshots) ? layerClipboard.snapshots : [layerClipboard];
    var created = [];
    commit(function () { created = pasteLayerSnapshots(snapshots, " 복사본"); });
    showToast(created.length + "개 레이어를 현재 면에 함께 붙여넣었어요.");
  }
  function duplicateSelectedLayer() {
    var selectedKeys = selectedOperationKeys();
    if (selectedKeys.some(isProtectedLayer)) { showToast("출처 레이어는 복제할 수 없습니다."); return; }
    var snapshots = snapshotsForLayerKeys(selectedKeys);
    if (!snapshots) { showToast("선택 항목에 복제할 수 없는 구조 레이어가 있어요."); return; }
    var created = [];
    commit(function () { created = pasteLayerSnapshots(snapshots, " 복사본"); });
    showToast(created.length + "개 레이어를 함께 복제했어요.");
  }
  function deleteSelectedLayer() {
    var selectedKeys = selectedOperationKeys();
    if (!selectedKeys.length) return;
    if (selectedKeys.some(isProtectedLayer)) {
      selectedKeys = selectedKeys.filter(function (key) { return !isProtectedLayer(key); });
      if (!selectedKeys.length) { showToast("출처 레이어는 삭제하거나 숨길 수 없습니다."); return; }
    }
    var customCount = selectedKeys.filter(function (key) { return isCustomLayer(key); }).length;
    commit(function () { removeLayerKeys(selectedKeys); });
    showToast(selectedKeys.length === 1
      ? customCount ? "사용자 레이어를 삭제했어요." : "템플릿 레이어를 숨겼어요. 템플릿 초기화 없이 다시 표시할 수 있어요."
      : selectedKeys.length + "개 레이어를 함께 " + (customCount === selectedKeys.length ? "삭제했어요." : "삭제하거나 숨겼어요."));
  }
  $("#duplicateLayerBtn").addEventListener("click", duplicateSelectedLayer);
  $("#duplicateLayerInspectorBtn").addEventListener("click", duplicateSelectedLayer);
  $("#deleteLayerBtn").addEventListener("click", deleteSelectedLayer);
  $("#deleteLayerInspectorBtn").addEventListener("click", deleteSelectedLayer);

  var draggedLayerKey = "";
  var pointerLayerDrag = null;
  function clearLayerDropState() {
    $$("[data-layer-row]").forEach(function (row) {
      row.classList.remove("dragging", "drop-before", "drop-after");
    });
  }
  function reorderedLayerOrder(order, layerKey, targetKey, after) {
    var source = Array.isArray(order) ? order : [];
    var displayOrder = source.slice().reverse();
    var layerIndex = displayOrder.indexOf(layerKey);
    var targetIndex = displayOrder.indexOf(targetKey);
    if (layerIndex < 0 || targetIndex < 0 || layerKey === targetKey) return source.slice();
    displayOrder.splice(layerIndex, 1);
    targetIndex = displayOrder.indexOf(targetKey);
    displayOrder.splice(targetIndex + (after ? 1 : 0), 0, layerKey);
    return displayOrder.reverse();
  }
  function moveLayerToDropTarget(layerKey, targetKey, after) {
    if (!layerKey || !targetKey || layerKey === targetKey) return;
    if (isProtectedLayer(layerKey) || isProtectedLayer(targetKey)) { showToast("출처 레이어는 항상 최상단에 유지됩니다."); return; }
    commit(function () {
      var updated = reorderedLayerOrder(layerOrderFor(state.side, state), layerKey, targetKey, after);
      if (!state.layerOrders) state.layerOrders = createSideLayerOrders(state.layerOrder, state);
      state.layerOrders[state.side] = updated;
      syncFlatLayerOrder(state);
    });
  }
  function markLayerDropTarget(target, clientY) {
    if (!target || !draggedLayerKey || draggedLayerKey === target.dataset.layerRow) return null;
    clearLayerDropState();
    var after = clientY > target.getBoundingClientRect().top + target.offsetHeight / 2;
    target.classList.add(after ? "drop-after" : "drop-before");
    var dragged = $('[data-layer-row="' + draggedLayerKey + '"]');
    if (dragged) dragged.classList.add("dragging");
    return { targetKey: target.dataset.layerRow, after: after };
  }
  $("#layerList").addEventListener("pointerdown", function (event) {
    var row = event.target.closest("[data-layer-row]");
    if (!row || event.button !== 0 || event.target.closest("[data-visible], [data-lock]")) return;
    if (isProtectedLayer(row.dataset.layerRow)) return;
    pointerLayerDrag = {
      pointerId: event.pointerId,
      layerKey: row.dataset.layerRow,
      startY: event.clientY,
      active: false,
      targetKey: "",
      after: false
    };
  });
  $("#layerList").addEventListener("click", function (event) {
    var folderButton = event.target.closest("[data-layer-folder]");
    if (!folderButton) return;
    var folder = folderButton.dataset.layerFolder;
    commit(function () {
      if (!state.layerFolders) state.layerFolders = defaultLayerFolders();
      state.layerFolders[folder] = !state.layerFolders[folder];
      $("#layerList").dataset.signature = "";
    });
  });
  document.addEventListener("pointermove", function (event) {
    if (!pointerLayerDrag || pointerLayerDrag.pointerId !== event.pointerId) return;
    if (!pointerLayerDrag.active && Math.abs(event.clientY - pointerLayerDrag.startY) < 6) return;
    if (!pointerLayerDrag.active) {
      pointerLayerDrag.active = true;
      draggedLayerKey = pointerLayerDrag.layerKey;
      state.selectedLayer = draggedLayerKey;
    }
    var target = document.elementFromPoint(event.clientX, event.clientY);
    var targetRow = target && target.closest ? target.closest("[data-layer-row]") : null;
    var drop = markLayerDropTarget(targetRow, event.clientY);
    if (drop) {
      pointerLayerDrag.targetKey = drop.targetKey;
      pointerLayerDrag.after = drop.after;
    }
    event.preventDefault();
  }, true);
  function finishPointerLayerDrag(event) {
    if (!pointerLayerDrag || pointerLayerDrag.pointerId !== event.pointerId) return;
    var drop = pointerLayerDrag;
    pointerLayerDrag = null;
    draggedLayerKey = "";
    if (drop.active && drop.targetKey) moveLayerToDropTarget(drop.layerKey, drop.targetKey, drop.after);
    clearLayerDropState();
  }
  document.addEventListener("pointerup", finishPointerLayerDrag, true);
  document.addEventListener("pointercancel", finishPointerLayerDrag, true);

  bindInput("#quoteInput", function (value) { setNativeTextProperty("quote", value); });
  $$('input[name="layerTextColorMode"]').forEach(function (input) {
    input.addEventListener("change", function () {
      var value = input.value;
      var custom = activeCustomLayer();
      var customText = custom && custom.type === "text";
      if (!input.checked || TEXT_COLOR_MODES.indexOf(value) < 0 || !customText && TEXT_LAYER_KEYS.indexOf(state.selectedLayer) < 0) return;
      commit(function () {
        if (customText) { custom.colorMode = value; return; }
        var style = layerStyleEntry(state.side, state.selectedLayer, true);
        style.colorMode = value;
        if (state.selectedLayer === "quote" && state.side === "front") state.quoteEffect = value;
      });
    });
  });
  bindInput("#speakerInput", function (value) { setNativeTextProperty("speaker", value); });
  bindInput("#kickerInput", function (value) { setNativeTextProperty("kicker", value); });
  bindInput("#titleInput", function (value) { setNativeTextProperty("title", value); });
  bindInput("#subtitleInput", function (value) { setNativeTextProperty("subtitle", value); });
  bindInput("#backKickerInput", function (value) { setNativeTextProperty(state.template === "train" ? "kicker" : "backKicker", value); });
  bindInput("#backHeadingInput", function (value) { setNativeTextProperty(state.template === "train" ? "title" : "backHeading", value); });
  bindInput("#botLabelInput", function (value) { setNativeTextProperty("botLabel", value); });
  bindInput("#personaLabelInput", function (value) { setNativeTextProperty("personaLabel", value); });
  bindInput("#dateLabelInput", function (value) { setNativeTextProperty("dateLabel", value); });
  bindInput("#botNameInput", function (value) { setNativeTextProperty("botName", value); });
  bindInput("#personaNameInput", function (value) { setNativeTextProperty("personaName", value); });
  bindInput("#dateInput", function (value) { setNativeTextProperty("date", value); });
  bindInput("#sourceInput", function (value) { setNativeTextProperty("source", value); });
  bindInput("#serialInput", function (value) { setNativeTextProperty("serial", value); });
  bindInput("#backTitleInput", function (value) { setNativeTextProperty("backTitle", value); });
  bindInput("#backBodyInput", function (value) {
    setNativeTextProperty("backBody", value);
    if (state.template !== "postcard") return;
    var lines = String(value || "").replace(/\r/g, "").split("\n");
    if (lines.length > 4) lines = lines.slice(0, 3).concat(lines.slice(3).join(" "));
    while (lines.length < 4) lines.push("");
    [1, 2, 3, 4].forEach(function (number) { setNativeTextProperty("postcardWriting" + number, lines[number - 1] || ""); });
  });
  bindInput("#backNoteInput", function (value) { setNativeTextProperty("backNote", value); });
  bindInput("#backCopyLabelInput", function (value) { setNativeTextProperty("backCopyLabel", value); });
  bindInput("#sealTextInput", function (value) { setNativeTextProperty("sealText", value); });
  bindInput("#coachLabelInput", function (value) { setNativeTextProperty("coachLabel", value); });
  bindInput("#coachNumberInput", function (value) { setNativeTextProperty("coachNumber", value); });
  bindInput("#stubToplineInput", function (value) { setNativeTextProperty("stubTopline", value); });
  bindInput("#admitTextInput", function (value) { setNativeTextProperty("admitText", String(value).trim().replace(/\s+/, "\n")); });
  bindInput("#stubTitleInput", function (value) { setNativeTextProperty("stubTitle", value); });
  bindInput("#platformTextInput", function (value) { setNativeTextProperty("platformText", value); });
  bindInput("#validationTextInput", function (value) { setNativeTextProperty("validationText", String(value).trim().replace(/\s+/, "\n")); });
  bindInput("#backIndexInput", function (value) { setNativeTextProperty("backIndex", value.replace(/\\n/g, "\n")); });
  bindInput("#backStampInput", function (value) { setNativeTextProperty("backStamp", value.replace(/\\n/g, "\n")); });
  bindInput("#fontSizeInput", function (value) { activeLayout().quoteSize = clamp(ptToPx(value), 20, MAX_FONT_SIZE_PX); }, Number);
  bindInput("#quoteColor", function (value) { state.quoteColor = value; });
  bindInput("#accentColor", function (value) { state.accent = value; });
  bindInput("#accentColorDetails", function (value) { state.accent = value; });
  bindInput("#accentColorStub", function (value) { state.accent = value; });
  bindInput("#accentColorFrame", function (value) { state.accent = value; });
  bindInput("#mutedColor", function (value) { state.muted = value; });
  bindInput("#textureStrengthRange", function (value) { state.textureStrength = clamp(value, 0, 100); }, Number);
  [0, 1].forEach(function (index) {
    var suffix = index ? "B" : "A";
    var textarea = $("#layerTextValue" + suffix);
    ["select", "keyup", "mouseup", "focus"].forEach(function (eventName) {
      textarea.addEventListener(eventName, function () { trackTextareaSelection(textarea, "native", index); });
    });
    bindInput("#layerTextValue" + suffix, function (value) {
      var field = textFieldsForLayer(state.selectedLayer, state.side)[index];
      if (!field) return;
      var previous = state[field.prop] == null ? "" : String(state[field.prop]);
      var nextValue = field.prop === "ratingMark" ? (Array.from(String(value).trim())[0] || "☆") : value;
      rebaseNativeInlineProperty(field.prop, previous, nextValue, textarea.selectionStart);
      state[field.prop] = nextValue;
      if (/^postcardWriting[1-4]$/.test(field.prop)) {
        state.backBody = [state.postcardWriting1, state.postcardWriting2, state.postcardWriting3, state.postcardWriting4].join("\n");
      }
    });
  });
  bindInput("#layerColorInput", function (value) {
    var custom = activeCustomLayer();
    if (custom && custom.type === "text") {
      if (customTextColorMode(custom) === "difference") return;
      if (trackedTextSelectionMatches("custom") && applyInlineStyleToTrackedSelection({ color: value })) return;
      removeCustomInlineStyleProperty(custom, "color");
      custom.color = value;
      (custom.styledRuns || []).forEach(function (run) { run.color = value; });
      return;
    }
    if (FRAME_COLOR_LAYER_KEYS.indexOf(state.selectedLayer) >= 0 && !isIndependentFrameColor(state.selectedLayer, state.side, state) && !$("#layerColorMode").checked) return;
    if (trackedTextSelectionMatches("native")) { applyInlineStyleToTrackedSelection({ color: value }); return; }
    if (TEXT_LAYER_KEYS.indexOf(state.selectedLayer) >= 0 && nativeTextColorMode(state.selectedLayer, state.side) === "difference") return;
    if (TEXT_LAYER_KEYS.indexOf(state.selectedLayer) >= 0) removeNativeInlineStyleProperty(state.side, state.selectedLayer, "color");
    var style = layerStyleEntry(state.side, state.selectedLayer, true);
    style.color = value;
  });
  $("#layerColorMode").addEventListener("change", function () {
    commit(function () {
      if (isIndependentFrameColor(state.selectedLayer, state.side, state)) return;
      var style = layerStyleEntry(state.side, state.selectedLayer, $("#layerColorMode").checked);
      if (!style) return;
      if ($("#layerColorMode").checked) style.color = $("#layerColorInput").value || state.accent;
      else delete style.color;
    });
  });
  bindInput("#layerFontSize", function (value) {
    var custom = activeCustomLayer();
    if (custom && custom.type === "text") {
      var customSize = clamp(ptToPx(value), 8, MAX_FONT_SIZE_PX);
      if (trackedTextSelectionMatches("custom") && applyInlineStyleToTrackedSelection({ fontSize: customSize })) return;
      removeCustomInlineStyleProperty(custom, "fontSize");
      var customRatio = customSize / Math.max(1, custom.fontSize);
      (custom.styledRuns || []).forEach(function (run) { run.fontSize = clamp(run.fontSize * customRatio, 4, MAX_FONT_SIZE_PX); });
      custom.fontSize = customSize;
      return;
    }
    if (trackedTextSelectionMatches("native") && applyInlineStyleToTrackedSelection({ fontSize: clamp(ptToPx(value), 2, MAX_FONT_SIZE_PX) })) return;
    removeNativeInlineStyleProperty(state.side, state.selectedLayer, "fontSize");
    var style = layerStyleEntry(state.side, state.selectedLayer, true);
    style.fontSize = clamp(ptToPx(value), 2, MAX_FONT_SIZE_PX);
  }, Number);
  bindInput("#layerFontFamily", function (value) {
    var custom = activeCustomLayer();
    if (custom && custom.type === "text") {
      var customFont = fontKeyAllowed(value) ? value : "noto-serif";
      if (trackedTextSelectionMatches("custom")) { applyInlineStyleToTrackedSelection({ fontFamily: fontKeyAllowed(value) ? value : null }); return; }
      removeCustomInlineStyleProperty(custom, "fontFamily");
      custom.font = customFont;
      (custom.styledRuns || []).forEach(function (run) { run.fontFamily = fontFamilyForKey(customFont); });
      return;
    }
    if (trackedTextSelectionMatches("native")) {
      applyInlineStyleToTrackedSelection({ fontFamily: fontKeyAllowed(value) ? value : null });
      return;
    }
    removeNativeInlineStyleProperty(state.side, state.selectedLayer, "fontFamily");
    var style = layerStyleEntry(state.side, state.selectedLayer, true);
    if (fontKeyAllowed(value)) style.fontFamily = value;
    else delete style.fontFamily;
  });
  $("#layerBoldToggle").addEventListener("change", function () {
    var enabled = $("#layerBoldToggle").checked;
    commit(function () {
      var custom = activeCustomLayer();
      if (custom && custom.type === "text") {
        if (trackedTextSelectionMatches("custom")) { applyInlineStyleToTrackedSelection({ fontWeight: enabled ? "700" : "400" }); return; }
        removeCustomInlineStyleProperty(custom, "fontWeight");
        custom.fontWeight = enabled ? "700" : "400";
        (custom.styledRuns || []).forEach(function (run) { run.fontWeight = custom.fontWeight; });
        return;
      }
      if (trackedTextSelectionMatches("native")) { applyInlineStyleToTrackedSelection({ fontWeight: enabled ? "700" : "400" }); return; }
      removeNativeInlineStyleProperty(state.side, state.selectedLayer, "fontWeight");
      var style = layerStyleEntry(state.side, state.selectedLayer, true);
      style.fontWeight = enabled ? "700" : "400";
    });
  });
  $("#layerItalicToggle").addEventListener("change", function () {
    var enabled = $("#layerItalicToggle").checked;
    commit(function () {
      var custom = activeCustomLayer();
      if (custom && custom.type === "text") {
        if (trackedTextSelectionMatches("custom")) { applyInlineStyleToTrackedSelection({ fontStyle: enabled ? "italic" : "normal" }); return; }
        removeCustomInlineStyleProperty(custom, "fontStyle");
        custom.fontStyle = enabled ? "italic" : "normal";
        (custom.styledRuns || []).forEach(function (run) { run.fontStyle = custom.fontStyle; });
        return;
      }
      if (trackedTextSelectionMatches("native")) { applyInlineStyleToTrackedSelection({ fontStyle: enabled ? "italic" : "normal" }); return; }
      removeNativeInlineStyleProperty(state.side, state.selectedLayer, "fontStyle");
      var style = layerStyleEntry(state.side, state.selectedLayer, true);
      style.fontStyle = enabled ? "italic" : "normal";
    });
  });
  bindInput("#layerTextAlign", function (value) {
    var custom = activeCustomLayer();
    if (custom && custom.type === "text") {
      custom.align = ["left", "center", "right"].indexOf(value) >= 0 ? value : "left";
      (custom.styledRuns || []).forEach(function (run) { run.textAlign = custom.align; });
      return;
    }
    var style = layerStyleEntry(state.side, state.selectedLayer, true);
    if (["left", "center", "right"].indexOf(value) >= 0) style.textAlign = value;
    else delete style.textAlign;
  });
  bindInput("#layerWritingMode", function (value) {
    var custom = activeCustomLayer();
    if (custom && custom.type === "text") { custom.writingMode = value === "vertical-rl" ? "vertical-rl" : "horizontal-tb"; return; }
    var style = layerStyleEntry(state.side, state.selectedLayer, true);
    style.writingMode = value === "vertical-rl" ? "vertical-rl" : "horizontal-tb";
  });
  bindInput("#layerLetterSpacing", function (value) {
    var custom = activeCustomLayer();
    if (custom && custom.type === "text") {
      var spacing = clamp(value, -300, 300);
      if (trackedTextSelectionMatches("custom") && applyInlineStyleToTrackedSelection({ letterSpacing: spacing })) return;
      removeCustomInlineStyleProperty(custom, "letterSpacing");
      custom.letterSpacing = spacing + "px";
      (custom.styledRuns || []).forEach(function (run) { run.letterSpacing = custom.letterSpacing; });
      return;
    }
    if (trackedTextSelectionMatches("native") && applyInlineStyleToTrackedSelection({ letterSpacing: clamp(value, -300, 300) })) return;
    removeNativeInlineStyleProperty(state.side, state.selectedLayer, "letterSpacing");
    var style = layerStyleEntry(state.side, state.selectedLayer, true);
    style.letterSpacing = clamp(value, -300, 300);
  }, Number);
  bindInput("#layerLineHeight", function (value) {
    var custom = activeCustomLayer();
    if (custom && custom.type === "text") {
      var lineHeight = clamp(value, .6, 3);
      if (trackedTextSelectionMatches("custom") && applyInlineStyleToTrackedSelection({ lineHeight: lineHeight })) return;
      removeCustomInlineStyleProperty(custom, "lineHeight");
      custom.lineHeight = String(lineHeight);
      (custom.styledRuns || []).forEach(function (run) { run.lineHeight = custom.lineHeight; });
      return;
    }
    if (trackedTextSelectionMatches("native") && applyInlineStyleToTrackedSelection({ lineHeight: clamp(value, .6, 3) })) return;
    removeNativeInlineStyleProperty(state.side, state.selectedLayer, "lineHeight");
    var style = layerStyleEntry(state.side, state.selectedLayer, true);
    style.lineHeight = clamp(value, .6, 3);
  }, Number);
  bindInput("#commonAccentColor", function (value) { state.accent = value; });
  $("#layerColorReset").addEventListener("click", function () {
    commit(function () {
      var custom = activeCustomLayer();
      if (custom && custom.type === "text") {
        if (trackedTextSelectionMatches("custom")) { applyInlineStyleToTrackedSelection({ color: null }); return; }
        removeCustomInlineStyleProperty(custom, "color");
        custom.color = state.quoteColor;
        (custom.styledRuns || []).forEach(function (run) { run.color = custom.color; });
        return;
      }
      if (trackedTextSelectionMatches("native")) {
        applyInlineStyleToTrackedSelection({ color: null });
        return;
      }
      removeNativeInlineStyleProperty(state.side, state.selectedLayer, "color");
      var style = layerStyleEntry(state.side, state.selectedLayer, false);
      if (style) delete style.color;
    });
  });
  function resetCustomTextTypography(custom) {
    if (!custom || custom.type !== "text") return;
    custom.font = state.font || "noto-serif";
    custom.fontSize = 28;
    custom.fontWeight = "400";
    custom.fontStyle = "normal";
    custom.align = "left";
    custom.writingMode = "horizontal-tb";
    custom.letterSpacing = "normal";
    custom.lineHeight = "1.35";
    custom.color = state.quoteColor || "#684b47";
    custom.colorMode = "solid";
    custom.inlineTextStyles = [];
    custom.typingStyle = {};
    (custom.styledRuns || []).forEach(function (run) {
      run.fontFamily = fontFamilyForKey(custom.font);
      run.fontSize = custom.fontSize;
      run.fontWeight = custom.fontWeight;
      run.fontStyle = custom.fontStyle;
      run.textAlign = custom.align;
      run.letterSpacing = custom.letterSpacing;
      run.lineHeight = custom.lineHeight;
      run.color = custom.color;
    });
  }
  $("#layerStyleReset").addEventListener("click", function () {
    commit(function () {
      var custom = activeCustomLayer();
      if (custom && custom.type === "text") {
        if (trackedTextSelectionMatches("custom")) { clearTrackedInlineStyles(); return; }
        resetCustomTextTypography(custom);
        return;
      }
      if (trackedTextSelectionMatches("native")) {
        clearTrackedInlineStyles();
        return;
      }
      var side = canonicalTrainCouponSide(state.side, state.selectedLayer, state);
      if (state.layerStyles && state.layerStyles[side]) delete state.layerStyles[side][state.selectedLayer];
      if (state.inlineTextStyles && state.inlineTextStyles[side]) delete state.inlineTextStyles[side][state.selectedLayer];
      if (state.textTypingStyles && state.textTypingStyles[side]) delete state.textTypingStyles[side][state.selectedLayer];
      if (state.selectedLayer === "quote" && state.side === "front") state.quoteEffect = createTemplateDefaults(state.template).quoteEffect;
    });
  });
  $("#clearLayerPartialStyle").addEventListener("click", function () {
    if (!trackedTextSelectionMatches("native")) return;
    commit(function () { clearTrackedInlineStyles(); });
  });
  $("#clearCustomPartialStyle").addEventListener("click", function () {
    if (!trackedTextSelectionMatches("custom")) return;
    commit(function () { clearTrackedInlineStyles(); });
  });
  $("#commonAccentReset").addEventListener("click", function () {
    commit(function () { state.accent = createTemplateDefaults(state.template).accent; });
  });
  $("#blockColorReset").addEventListener("click", function () {
    commit(function () {
      var key = activeBlockKey();
      if (key && state.blocks[key]) setBlockColorForKey(key, createTemplateDefaults(state.template).blocks[key].color, state);
    });
  });
  bindInput("#customLayerNameInput", function (value) { var layer = activeCustomLayer(); if (layer) layer.name = String(value).slice(0, 80); });
  ["select", "keyup", "mouseup", "focus"].forEach(function (eventName) {
    $("#customTextInput").addEventListener(eventName, function () { trackTextareaSelection($("#customTextInput"), "custom", 0); });
  });
  bindInput("#customTextInput", function (value) {
    var layer = activeCustomLayer();
    if (!layer || layer.type !== "text") return;
    var previous = String(layer.text || "");
    if (previous.length && !value.length) {
      var remembered = normalizeInlineStylePatch(inlineRunStyleAt(canonicalInlineRuns(layer.inlineTextStyles || [], previous.length), previous.length - 1));
      if (Object.keys(remembered).length) layer.typingStyle = remembered;
    }
    rebaseInlineRunsForTextEdit(layer.inlineTextStyles || [], previous, value, $("#customTextInput").selectionStart, false, layer.typingStyle);
    layer.text = value;
    if (layer.styledRuns && layer.styledRuns.length) {
      var parts = String(value).split("\n");
      layer.styledRuns.forEach(function (run, index) {
        run.text = index === layer.styledRuns.length - 1 ? parts.slice(index).join("\n") : (parts[index] || "");
      });
    }
  });
  bindInput("#customTextColor", function (value) {
    var layer = activeCustomLayer();
    if (!layer || layer.type !== "text") return;
    if (trackedTextSelectionMatches("custom") && applyInlineStyleToTrackedSelection({ color: value })) return;
    removeCustomInlineStyleProperty(layer, "color");
    layer.color = value;
    (layer.styledRuns || []).forEach(function (run) { run.color = value; });
  });
  $$('input[name="customTextColorMode"]').forEach(function (input) {
    input.addEventListener("change", function () {
      var value = input.value;
      if (!input.checked || TEXT_COLOR_MODES.indexOf(value) < 0) return;
      commit(function () {
        var layer = activeCustomLayer();
        if (layer && layer.type === "text") layer.colorMode = value;
      });
    });
  });
  bindInput("#customLetterSpacing", function (value) {
    var layer = activeCustomLayer();
    if (!layer || layer.type !== "text") return;
    if (trackedTextSelectionMatches("custom") && applyInlineStyleToTrackedSelection({ letterSpacing: clamp(value, -300, 300) })) return;
    removeCustomInlineStyleProperty(layer, "letterSpacing");
    layer.letterSpacing = clamp(value, -300, 300) + "px";
    (layer.styledRuns || []).forEach(function (run) { run.letterSpacing = layer.letterSpacing; });
  }, Number);
  bindInput("#customLineHeight", function (value) {
    var layer = activeCustomLayer();
    if (!layer || layer.type !== "text") return;
    if (trackedTextSelectionMatches("custom") && applyInlineStyleToTrackedSelection({ lineHeight: clamp(value, .6, 3) })) return;
    removeCustomInlineStyleProperty(layer, "lineHeight");
    layer.lineHeight = String(clamp(value, .6, 3));
    (layer.styledRuns || []).forEach(function (run) { run.lineHeight = layer.lineHeight; });
  }, Number);
  $("#customTextColorReset").addEventListener("click", function () {
    commit(function () {
      var layer = activeCustomLayer();
      if (!layer || layer.type !== "text") return;
      if (trackedTextSelectionMatches("custom")) {
        applyInlineStyleToTrackedSelection({ color: null });
        return;
      }
      removeCustomInlineStyleProperty(layer, "color");
      layer.color = state.quoteColor;
      (layer.styledRuns || []).forEach(function (run) { run.color = state.quoteColor; });
    });
  });
  bindInput("#customTextAlign", function (value) {
    var layer = activeCustomLayer();
    if (!layer || layer.type !== "text") return;
    layer.align = value;
    (layer.styledRuns || []).forEach(function (run) { run.textAlign = value; });
  });
  bindInput("#customWritingMode", function (value) {
    var layer = activeCustomLayer();
    if (!layer || layer.type !== "text") return;
    layer.writingMode = value === "vertical-rl" ? "vertical-rl" : "horizontal-tb";
  });
  bindInput("#customTextFont", function (value) {
    var layer = activeCustomLayer();
    if (!layer || layer.type !== "text") return;
    var nextFont = fontKeyAllowed(value) ? value : "noto-serif";
    if (trackedTextSelectionMatches("custom")) {
      applyInlineStyleToTrackedSelection({ fontFamily: fontKeyAllowed(value) ? value : null });
      return;
    }
    removeCustomInlineStyleProperty(layer, "fontFamily");
    layer.font = nextFont;
    (layer.styledRuns || []).forEach(function (run) { run.fontFamily = fontFamilyForKey(layer.font); });
  });
  $("#customBoldToggle").addEventListener("change", function () {
    var enabled = $("#customBoldToggle").checked;
    commit(function () {
      var layer = activeCustomLayer();
      if (!layer || layer.type !== "text") return;
      if (trackedTextSelectionMatches("custom")) { applyInlineStyleToTrackedSelection({ fontWeight: enabled ? "700" : "400" }); return; }
      removeCustomInlineStyleProperty(layer, "fontWeight");
      layer.fontWeight = enabled ? "700" : "400";
      (layer.styledRuns || []).forEach(function (run) { run.fontWeight = layer.fontWeight; });
    });
  });
  $("#customItalicToggle").addEventListener("change", function () {
    var enabled = $("#customItalicToggle").checked;
    commit(function () {
      var layer = activeCustomLayer();
      if (!layer || layer.type !== "text") return;
      if (trackedTextSelectionMatches("custom")) { applyInlineStyleToTrackedSelection({ fontStyle: enabled ? "italic" : "normal" }); return; }
      removeCustomInlineStyleProperty(layer, "fontStyle");
      layer.fontStyle = enabled ? "italic" : "normal";
      (layer.styledRuns || []).forEach(function (run) { run.fontStyle = layer.fontStyle; });
    });
  });
  bindInput("#customFontSizePt", function (value) {
    var layer = activeCustomLayer();
    if (!layer || layer.type !== "text") return;
    var nextSize = clamp(ptToPx(value), 8, MAX_FONT_SIZE_PX);
    if (trackedTextSelectionMatches("custom") && applyInlineStyleToTrackedSelection({ fontSize: nextSize })) return;
    removeCustomInlineStyleProperty(layer, "fontSize");
    var ratio = nextSize / Math.max(1, layer.fontSize);
    (layer.styledRuns || []).forEach(function (run) { run.fontSize = clamp(run.fontSize * ratio, 4, MAX_FONT_SIZE_PX); });
    layer.fontSize = nextSize;
  }, Number);
  bindInput("#customImageFit", function (value) { var layer = activeCustomLayer(); if (layer && layer.type === "image") layer.fit = value === "cover" ? "cover" : "contain"; });
  bindInput("#customShapeType", function (value) {
    var layer = activeCustomLayer();
    if (!isCustomShapeLayer(layer) || ["rectangle", "ellipse", "triangle", "star"].indexOf(value) < 0) return;
    layer.shapeKind = value;
    layer.cornerRadii = Array(shapeCornerCount(value)).fill(layer.cornerRadius || 0);
  });
  $("#customShapeFillMode").addEventListener("change", function (event) {
    var fillMode = event.currentTarget.value === "image" ? "image" : "color";
    commit(function () {
      var layer = activeCustomLayer();
      if (isCustomShapeLayer(layer)) layer.fillMode = fillMode;
    });
  });
  bindInput("#customShapeFillColor", function (value) { var layer = activeCustomLayer(); if (isCustomShapeLayer(layer)) layer.fillColor = value; });
  bindInput("#customShapeImageFit", function (value) { var layer = activeCustomLayer(); if (isCustomShapeLayer(layer)) layer.fit = value === "contain" ? "contain" : "cover"; });
  bindInput("#customShapeZoomRange", function (value) { var layer = activeCustomLayer(); if (isCustomShapeLayer(layer)) layer.zoom = clamp(value / 100, 1, 3); }, Number);
  bindInput("#customShapePanXRange", function (value) { var layer = activeCustomLayer(); if (isCustomShapeLayer(layer)) layer.panX = clamp(value / 100, -1, 1); }, Number);
  bindInput("#customShapePanYRange", function (value) { var layer = activeCustomLayer(); if (isCustomShapeLayer(layer)) layer.panY = clamp(value / 100, -1, 1); }, Number);
  bindInput("#customShapeCornerAll", function (value) {
    var layer = activeCustomLayer();
    if (!isCustomShapeLayer(layer)) return;
    layer.cornerRadius = clamp(value, 0, 50);
    layer.cornerRadii = Array(shapeCornerCount(layer.shapeKind)).fill(layer.cornerRadius);
  }, Number);
  bindInput("#customShapeCornerAllNumber", function (value) {
    var layer = activeCustomLayer();
    if (!isCustomShapeLayer(layer) || !Number.isFinite(value)) return;
    layer.cornerRadius = clamp(value, 0, 50);
    layer.cornerRadii = Array(shapeCornerCount(layer.shapeKind)).fill(layer.cornerRadius);
  }, Number);
  $("#customShapeCornerMode").addEventListener("change", function () {
    var individual = $("#customShapeCornerMode").checked;
    commit(function () {
      var layer = activeCustomLayer();
      if (!isCustomShapeLayer(layer)) return;
      layer.cornerMode = individual ? "individual" : "all";
      if (individual) layer.cornerRadii = Array(shapeCornerCount(layer.shapeKind)).fill(layer.cornerRadius || 0);
    });
  });
  $("#customShapeCornerIndividual").addEventListener("input", function (event) {
    var input = event.target.closest('[data-shape-corner-index]');
    var layer = activeCustomLayer();
    if (!input || !isCustomShapeLayer(layer)) return;
    startEdit();
    layer.cornerRadii[Number(input.dataset.shapeCornerIndex)] = clamp(Number(input.value), 0, 50);
    render();
  });
  $("#customShapeCornerIndividual").addEventListener("change", finishEdit);
  bindInput("#customOpacityRange", function (value) { var layer = activeCustomLayer(); if (layer) layer.opacity = clamp(value, 0, 100); }, Number);

  $("#customImageReplaceInput").addEventListener("change", function (event) {
    var input = event.currentTarget;
    var file = input.files && input.files[0];
    var layerId = state.selectedLayer;
    if (!file || !customLayerById(layerId) || customLayerById(layerId).type !== "image") return;
    readImageFile(file, function (dataUrl, image) {
      commit(function () {
        var layer = customLayerById(layerId);
        if (!layer) return;
        layer.imageData = dataUrl;
        layer.imageAssetStored = true;
        layer.imageName = file.name;
        layer.imageType = file.type;
        fitCustomImageFrameToSource(layer, image.naturalWidth, image.naturalHeight, state.template, true);
      });
      var replacedLayer = customLayerById(layerId);
      if (replacedLayer) putImageAsset({
        id: imageCustomAssetId(state.template, replacedLayer.side, replacedLayer.id), data: replacedLayer.imageData,
        name: replacedLayer.imageName || "", type: replacedLayer.imageType || ""
      });
      input.value = "";
      showToast("이미지를 교체했어요. 투명 배경은 그대로 유지됩니다.");
    });
  });
  $("#customShapeImageInput").addEventListener("change", function (event) {
    var input = event.currentTarget;
    var file = input.files && input.files[0];
    var layerId = state.selectedLayer;
    if (!file || !isCustomShapeLayer(customLayerById(layerId))) return;
    readImageFile(file, function (dataUrl) {
      commit(function () {
        var layer = customLayerById(layerId);
        if (!isCustomShapeLayer(layer)) return;
        layer.imageData = dataUrl;
        layer.imageAssetStored = true;
        layer.imageName = file.name;
        layer.imageType = file.type;
        layer.fillMode = "image";
        resetImagePlacementToOriginal(layer);
      });
      var savedLayer = customLayerById(layerId);
      if (savedLayer) putImageAsset({ id: imageCustomAssetId(state.template, savedLayer.side, savedLayer.id), data: savedLayer.imageData, name: savedLayer.imageName || "", type: savedLayer.imageType || "" });
      input.value = "";
      showToast("도형 안에 이미지를 넣었어요.");
    });
  });
  $("#removeCustomShapeImageBtn").addEventListener("click", function () {
    var layer = activeCustomLayer();
    if (!isCustomShapeLayer(layer)) return;
    var assetId = imageCustomAssetId(state.template, layer.side, layer.id);
    commit(function () {
      layer.imageData = "";
      layer.imageAssetStored = false;
      layer.imageName = "";
      layer.imageType = "";
      layer.fillMode = "color";
    });
    deleteImageAsset(assetId);
    showToast("도형 이미지를 제거했어요. 단색 채우기는 유지됩니다.");
  });

  $$("[data-font]").forEach(function (button) {
    button.addEventListener("click", function () { commit(function () { state.font = button.dataset.font; }); });
  });
  $$("[data-font-tab]").forEach(function (button) {
    button.addEventListener("click", function () {
      var target = button.dataset.fontTarget || "global";
      var source = button.dataset.fontTab || "app";
      selectFontSourceTab(target, source);
      if (source === "system" && !systemFontPermissionLoaded) browseSystemFonts(target);
    });
  });
  $$("[data-system-font-browse]").forEach(function (button) {
    button.addEventListener("click", function () { browseSystemFonts(button.dataset.systemFontBrowse || "global"); });
  });
  $$("[data-system-font-select]").forEach(function (select) {
    select.addEventListener("change", function () {
      var key = select.value;
      if (!key) return;
      select.style.fontFamily = fontFamilyForKey(key);
      applySystemFontToTarget(key, select.dataset.systemFontSelect || "global");
    });
  });

  $("#textureToggle").addEventListener("change", function () {
    commit(function () { state.texture = $("#textureToggle").checked; });
  });

  $("#blockColor").addEventListener("input", function () {
    var block = activeBlock();
    if (!block) return;
    startEdit();
    setBlockColorForKey(activeBlockKey(), $("#blockColor").value, state);
    render();
  });
  $("#blockColor").addEventListener("change", finishEdit);

  $("#imageInput").addEventListener("change", function (event) {
    var file = event.target.files && event.target.files[0];
    var key = activeBlockKey();
    if (!file || !state.blocks[key]) return;
    if (!file.type.match(/^image\//)) { showToast("이미지 파일만 사용할 수 있어요."); return; }
    var reader = new FileReader();
    reader.onload = function () {
      commit(function () {
        var block = state.blocks[key];
        block.imageData = String(reader.result);
        block.imageAssetStored = true;
        block.imageName = file.name;
        block.imageType = file.type;
        block.tintMode = "none";
        /* A newly chosen image starts as an uncropped, unscaled original.
           Users can still opt into Cover or zoom after it is loaded. */
        resetImagePlacementToOriginal(block);
      });
      putImageAsset({
        id: imageBlockAssetId(state.template, key), data: state.blocks[key].imageData,
        name: state.blocks[key].imageName || "", type: state.blocks[key].imageType || "",
        tintMode: state.blocks[key].tintMode || "none"
      });
      $("#imageInput").value = "";
    };
    reader.readAsDataURL(file);
  });

  $("#removeImageBtn").addEventListener("click", function () {
    var block = activeBlock();
    if (!block || !block.imageData) return;
    var removedBlockKey = activeBlockKey();
    commit(function () {
      block.imageAssetStored = false;
      if (state.template === "train" && state.selectedLayer === "image-stub") {
        block.imageData = window.LOG_TICKET_TRAIN_LOGO_ASSET || "";
        block.imageName = "train-travel-logo-v4.png";
        block.imageType = "image/png";
        block.fit = "contain";
        block.tintMode = "accent";
      } else {
        block.imageData = "";
        block.imageName = "";
        block.imageType = "";
        block.tintMode = "none";
      }
      block.panX = 0;
      block.panY = 0;
      block.zoom = 1;
    });
    deleteImageAsset(imageBlockAssetId(state.template, removedBlockKey));
    if (state.template === "postcard" && removedBlockKey === "backStub") {
      deleteImageAsset(imageBlockAssetId("postcard", "frontStub"));
    }
  });

  $("#logoTintToggle").addEventListener("change", function () {
    var block = activeBlock();
    if (!block || state.template !== "train" || state.selectedLayer !== "image-stub") return;
    commit(function () { block.tintMode = $("#logoTintToggle").checked ? "accent" : "none"; });
  });
  bindInput("#logoAccentColor", function (value) { state.accent = value; });

  $$("[data-fit]").forEach(function (button) {
    button.addEventListener("click", function () {
      var block = activeBlock();
      if (!block) return;
      commit(function () { block.fit = button.dataset.fit; block.panX = 0; block.panY = 0; });
    });
  });
  bindInput("#blockZoomRange", function (value) { var block = activeBlock(); if (block) block.zoom = clamp(value, 1, 3); }, Number);
  bindInput("#imagePanXRange", function (value) { var block = activeBlock(); if (block) block.panX = clamp(value / 100, -1, 1); }, Number);
  bindInput("#imagePanYRange", function (value) { var block = activeBlock(); if (block) block.panY = clamp(value / 100, -1, 1); }, Number);

  function mutateActiveEffect(apply) {
    var effect = activeEffect();
    if (effect) apply(effect);
  }
  bindInput("#blurRange", function (value) { mutateActiveEffect(function (effect) { effect.blur = value; }); }, Number);
  bindInput("#brightRange", function (value) { mutateActiveEffect(function (effect) { effect.brightness = clamp(value, -100, 100) + 100; }); }, Number);
  bindInput("#satRange", function (value) { mutateActiveEffect(function (effect) { effect.saturation = clamp(value, -100, 100) + 100; }); }, Number);
  bindInput("#contrastRange", function (value) { mutateActiveEffect(function (effect) { effect.contrast = clamp(value, -100, 100) + 100; }); }, Number);
  bindInput("#hueRange", function (value) { mutateActiveEffect(function (effect) { effect.hue = value; }); }, Number);
  function bindEffectNumber(selector, min, max, apply) {
    var node = $(selector);
    node.addEventListener("focus", startEdit);
    node.addEventListener("pointerdown", startEdit);
    node.addEventListener("input", function () {
      if (!Number.isFinite(node.valueAsNumber)) return;
      apply(clamp(node.valueAsNumber, min, max));
      render();
    });
    node.addEventListener("change", function () {
      if (Number.isFinite(node.valueAsNumber)) node.value = clamp(node.valueAsNumber, min, max);
      finishEdit();
    });
    node.addEventListener("blur", function () {
      if (Number.isFinite(node.valueAsNumber)) node.value = clamp(node.valueAsNumber, min, max);
      finishEdit();
      render();
    });
    node.addEventListener("keydown", function (event) { if (event.key === "Enter") node.blur(); });
  }
  bindEffectNumber("#blurOut", 0, 12, function (value) { mutateActiveEffect(function (effect) { effect.blur = value; }); });
  bindEffectNumber("#brightOut", -100, 100, function (value) { mutateActiveEffect(function (effect) { effect.brightness = value + 100; }); });
  bindEffectNumber("#satOut", -100, 100, function (value) { mutateActiveEffect(function (effect) { effect.saturation = value + 100; }); });
  bindEffectNumber("#contrastOut", -100, 100, function (value) { mutateActiveEffect(function (effect) { effect.contrast = value + 100; }); });
  bindEffectNumber("#hueOut", -180, 180, function (value) { mutateActiveEffect(function (effect) { effect.hue = value; }); });
  bindEffectNumber("#vignetteOut", -100, 100, function (value) { mutateActiveEffect(function (effect) { effect.vignette = clamp(value, -100, 100); }); });
  bindEffectNumber("#overlayOut", 0, 100, function (value) { mutateActiveEffect(function (effect) { effect.overlay = clamp(value, 0, 100); }); });
  bindInput("#sepiaInput", function (value) { mutateActiveEffect(function (effect) { effect.sepia = clamp(finiteNumber(value, 0), 0, 100); }); }, Number);
  bindInput("#grayscaleInput", function (value) { mutateActiveEffect(function (effect) { effect.grayscale = clamp(finiteNumber(value, 0), 0, 100); }); }, Number);
  bindInput("#vignetteRange", function (value) { mutateActiveEffect(function (effect) { effect.vignette = clamp(value, -100, 100); }); }, Number);
  bindInput("#overlayRange", function (value) { mutateActiveEffect(function (effect) { effect.overlay = clamp(value, 0, 100); }); }, Number);
  bindInput("#overlayColorInput", function (value) { mutateActiveEffect(function (effect) {
    effect.overlayColor = value;
    if (effect.overlay <= 0) effect.overlay = 35;
  }); });
  bindInput("#overlayBlendInput", function (value) { mutateActiveEffect(function (effect) { effect.overlayBlend = value; }); });
  $("#resetEffectsBtn").addEventListener("click", function () {
    if (!activeEffectTarget()) return;
    commit(function () { activeEffectTarget().effect = defaultEffect(); });
  });

  function bindMetric(selector, keyQuote, keyDetails) {
    bindInput(selector, function (value) {
      if (isLayerLocked(state.selectedLayer, state.side)) return;
      value = finiteNumber(value, 0);
      var layout = activeLayout();
      var custom = activeCustomLayer();
      if (["#inspectX", "#inspectY"].indexOf(selector) >= 0) {
        var positionAxis = selector === "#inspectX" ? "x" : "y";
        var positionFace = state.side === "front" ? frontFace : backFace;
        var positionNode = positionFace.querySelector('[data-canvas-layer="' + state.selectedLayer + '"]');
        if (custom) setCustomLayerDesignPosition(positionAxis, value, custom, state.template);
        else setNativeLayerDesignPosition(positionAxis, value, positionNode, positionFace, state.side, state.selectedLayer, state.template);
        return;
      }
      if (isProtectedLayer(state.selectedLayer)) return;
      if (["#inspectW", "#inspectH"].indexOf(selector) >= 0) {
        var sizeFace = state.side === "front" ? frontFace : backFace;
        var sizeNode = sizeFace.querySelector('[data-canvas-layer="' + state.selectedLayer + '"]');
        setLayerDesignSize(selector === "#inspectW" ? "width" : "height", value, sizeNode, sizeFace, state.side, state.selectedLayer, state.template);
        return;
      }
      if (custom) {
        var customUsesDesignPixels = custom.type === "shape" || custom.type === "image";
        if (selector === "#inspectW") {
          var widthValue = customUsesDesignPixels ? customShapeSizeFromDesignPx("width", value, state.template) : value;
          custom.w = custom.type === "shape"
            ? clamp(widthValue, 3, MAX_OBJECT_SIZE_PERCENT)
            : custom.type === "image"
              ? clamp(widthValue, .01, MAX_OBJECT_SIZE_PERCENT)
              : clamp(widthValue, ((custom.styledRuns || []).length || (custom.styledShapes || []).length) ? .25 : 3, MAX_OBJECT_SIZE_PERCENT);
          if (custom.type === "text") custom.autoHeight = false;
        }
        if (selector === "#inspectH") {
          var heightValue = customUsesDesignPixels ? customShapeSizeFromDesignPx("height", value, state.template) : value;
          custom.h = custom.type === "shape"
            ? clamp(heightValue, 3, MAX_OBJECT_SIZE_PERCENT)
            : custom.type === "image"
              ? clamp(heightValue, .01, MAX_OBJECT_SIZE_PERCENT)
              : clamp(heightValue, ((custom.styledRuns || []).length || (custom.styledShapes || []).length) ? .25 : 3, MAX_OBJECT_SIZE_PERCENT);
          if (custom.type === "text") custom.autoHeight = false;
        }
        if (selector === "#inspectRotate") custom.rotation = clamp(value, -360, 360);
        return;
      }
      if (TEXT_LAYER_KEYS.indexOf(state.selectedLayer) >= 0 && ["#inspectW", "#inspectH"].indexOf(selector) >= 0) {
        var textPlacement = writablePlacementFor(state.side, state.selectedLayer);
        var textNode = (state.side === "front" ? frontFace : backFace).querySelector('[data-canvas-layer="' + state.selectedLayer + '"]');
        textPlacement.boxW = textPlacement.boxW || Math.max(16, textNode && textNode.offsetWidth || 16);
        textPlacement.boxH = textPlacement.boxH || Math.max(12, textNode && textNode.offsetHeight || 12);
        if (selector === "#inspectW") {
          textPlacement.boxW = clamp(value, 16, MAX_TEXT_BOX_SIZE_PX);
        } else {
          textPlacement.boxH = clamp(value, 12, MAX_TEXT_BOX_SIZE_PX);
        }
        textPlacement.boxMode = "area";
        return;
      }
      if (state.selectedLayer === "quote" && keyQuote && selector === "#inspectW") { layout[keyQuote] = value; return; }
      if (state.selectedLayer === "details" && keyDetails && selector === "#inspectW") { layout[keyDetails] = value; return; }
      if (MOVABLE_LAYERS.indexOf(state.selectedLayer) < 0) return;
      var placement = writablePlacementFor(state.side, state.selectedLayer);
      if (selector === "#inspectW") placement.scaleX = clamp(value / 100, .1, MAX_NATIVE_OBJECT_SCALE);
      if (selector === "#inspectH") placement.scaleY = clamp(value / 100, .1, MAX_NATIVE_OBJECT_SCALE);
      if (selector === "#inspectRotate") placement.rotation = clamp(value, -360, 360);
    }, Number);
  }
  bindMetric("#inspectX", "quoteX", "detailsX");
  bindMetric("#inspectY", "quoteY", "detailsY");
  bindMetric("#inspectW", "quoteW", "detailsW");
  bindMetric("#inspectH");
  bindMetric("#inspectRotate");

  function transformedSelectionBounds(width, height, scaleX, scaleY, rotation, skewX) {
    var angle = finiteNumber(rotation, 0) * Math.PI / 180;
    var skew = Math.tan(clamp(finiteNumber(skewX, 0), -70, 70) * Math.PI / 180);
    var cosine = Math.cos(angle);
    var sine = Math.sin(angle);
    var sx = Math.max(.0001, Math.abs(finiteNumber(scaleX, 1)));
    var sy = Math.max(.0001, Math.abs(finiteNumber(scaleY, 1)));
    /* CSS applies scale, then skewX, then rotation for our transform list. */
    var a = cosine * sx;
    var b = sine * sx;
    var c = sy * (cosine * skew - sine);
    var d = sy * (sine * skew + cosine);
    return {
      width: Math.abs(a) * width + Math.abs(c) * height,
      height: Math.abs(b) * width + Math.abs(d) * height
    };
  }

  var SMART_SNAP_SCREEN_THRESHOLD = 6;
  var SMART_SNAP_EXCLUDED_LAYERS = ["face-shadow", "block-main", "block-stub", "texture", "effects"];

  function layerVisualBoundsInFace(key, side, face) {
    if (!face || !key || !layerAvailableOnSide(key, side, state) || isLayerHidden(key, side)) return null;
    var node = face.querySelector('[data-canvas-layer="' + key + '"]');
    if (!node || !node.offsetWidth || !node.offsetHeight) return null;
    var custom = customLayerById(key);
    /* Custom objects own their position in document percentages. Reading their
       offset chain after CSS zoom/rotation can return a rounded compositor
       coordinate, which made OBJ/CNTR snapping miss even inside the 6px
       threshold. Use the document geometry as the authoritative face-local
       origin; native template objects still use their layout offset. */
    var offset = custom ? {
      x: finiteNumber(custom.x, 0) / 100 * Math.max(1, face.offsetWidth),
      y: finiteNumber(custom.y, 0) / 100 * Math.max(1, face.offsetHeight)
    } : elementOffsetInside(node, face);
    var placement = custom ? null : placementFor(side, key);
    var appliedScaleX = custom ? custom.type === "text" ? finiteNumber(custom.scaleX, 1) : 1 : finiteNumber(placement.scaleX, 1);
    var appliedScaleY = custom ? custom.type === "text" ? finiteNumber(custom.scaleY, 1) : 1 : finiteNumber(placement.scaleY, 1);
    var rotation = custom ? finiteNumber(custom.rotation, 0) : finiteNumber(placement.rotation, 0);
    var skewX = custom ? finiteNumber(custom.skewX, 0) : finiteNumber(placement.skewX, 0);
    var projected = transformedSelectionBounds(node.offsetWidth, node.offsetHeight, appliedScaleX, appliedScaleY, rotation, skewX);
    /* Every smart-alignment calculation stays in the active face's local
       coordinate system. This matters in BOTH, where the face is projected
       into the composite at its own scale and rotation. */
    var centerX = offset.x + node.offsetWidth / 2 + (custom ? 0 : finiteNumber(placement.x, 0) / 100 * face.offsetWidth);
    var centerY = offset.y + node.offsetHeight / 2 + (custom ? 0 : finiteNumber(placement.y, 0) / 100 * face.offsetHeight);
    return {
      key: key,
      node: node,
      x: centerX - projected.width / 2,
      y: centerY - projected.height / 2,
      w: projected.width,
      h: projected.height
    };
  }

  function unionVisualBounds(items) {
    if (!items.length) return null;
    var left = Math.min.apply(null, items.map(function (item) { return item.x; }));
    var top = Math.min.apply(null, items.map(function (item) { return item.y; }));
    var right = Math.max.apply(null, items.map(function (item) { return item.x + item.w; }));
    var bottom = Math.max.apply(null, items.map(function (item) { return item.y + item.h; }));
    return { x: left, y: top, w: right - left, h: bottom - top };
  }

  function multiSelectionItems() {
    var face = state.side === "back" ? backFace : frontFace;
    var preview = templateConfig(state.template).preview;
    var scaleX = preview.width / Math.max(1, face.offsetWidth);
    var scaleY = preview.height / Math.max(1, face.offsetHeight);
    return selectedLayerKeys().map(function (key) {
      if (!isMovableLayer(key) || isLayerLocked(key, state.side)) return null;
      var bounds = layerVisualBoundsInFace(key, state.side, face);
      if (!bounds) return null;
      return {
        key: key,
        x: bounds.x * scaleX,
        y: bounds.y * scaleY,
        w: bounds.w * scaleX,
        h: bounds.h * scaleY
      };
    }).filter(Boolean);
  }

  function captureMoveSnapContext(side, face, movingKeys, faceScale) {
    var moving = movingKeys.map(function (key) { return layerVisualBoundsInFace(key, side, face); }).filter(Boolean);
    var movingBounds = unionVisualBounds(moving);
    if (!movingBounds) return null;
    var movingNodes = moving.map(function (item) { return item.node; });
    var seen = Object.create(null);
    var candidates = { x: [], y: [] };
    Array.prototype.slice.call(face.querySelectorAll("[data-canvas-layer]")).forEach(function (node) {
      var key = node.dataset.canvasLayer || "";
      if (!key || seen[key] || movingKeys.indexOf(key) >= 0 || SMART_SNAP_EXCLUDED_LAYERS.indexOf(key) >= 0) return;
      if (movingNodes.some(function (movingNode) { return movingNode.contains(node) || node.contains(movingNode); })) return;
      seen[key] = true;
      var bounds = layerVisualBoundsInFace(key, side, face);
      if (!bounds) return;
      [bounds.x, bounds.x + bounds.w / 2, bounds.x + bounds.w].forEach(function (value) {
        candidates.x.push({ value: value, key: key, source: "object" });
      });
      [bounds.y, bounds.y + bounds.h / 2, bounds.y + bounds.h].forEach(function (value) {
        candidates.y.push({ value: value, key: key, source: "object" });
      });
    });
    return {
      side: side,
      face: face,
      faceW: Math.max(1, face.offsetWidth),
      faceH: Math.max(1, face.offsetHeight),
      movingBounds: movingBounds,
      candidates: candidates,
      threshold: SMART_SNAP_SCREEN_THRESHOLD / Math.max(.1, state.viewZoom) / Math.max(.01, finiteNumber(faceScale, 1))
    };
  }

  function bestSmartSnapForAxis(context, axis, rawDelta) {
    var startKey = axis === "x" ? "x" : "y";
    var sizeKey = axis === "x" ? "w" : "h";
    var faceSize = axis === "x" ? context.faceW : context.faceH;
    var start = context.movingBounds[startKey];
    var size = context.movingBounds[sizeKey];
    var movingPoints = [start + rawDelta, start + size / 2 + rawDelta, start + size + rawDelta];
    var best = null;
    function consider(target, movingPoint, priority, source) {
      var correction = target - movingPoint;
      var distance = Math.abs(correction);
      if (distance > context.threshold + .0001) return;
      if (!best || distance < best.distance - .0001 || Math.abs(distance - best.distance) <= .0001 && priority < best.priority) {
        best = { delta: rawDelta + correction, guide: target, distance: distance, priority: priority, source: source };
      }
    }
    if (state.snapToCanvasCenter) consider(faceSize / 2, movingPoints[1], 0, "center");
    if (state.snapToObjects) {
      context.candidates[axis].forEach(function (candidate) {
        movingPoints.forEach(function (movingPoint) { consider(candidate.value, movingPoint, 1, candidate.source); });
      });
    }
    return best;
  }

  function resolveSmartMoveSnap(context, rawDx, rawDy, event, axisLock) {
    var result = { x: rawDx, y: rawDy, snappedX: false, snappedY: false, guideX: null, guideY: null };
    if (!context || event && event.altKey || !state.snapToObjects && !state.snapToCanvasCenter) return result;
    var waitingForAxis = Boolean(event && event.shiftKey && !axisLock);
    var allowX = !waitingForAxis && axisLock !== "y";
    var allowY = !waitingForAxis && axisLock !== "x";
    var snapX = allowX ? bestSmartSnapForAxis(context, "x", rawDx) : null;
    var snapY = allowY ? bestSmartSnapForAxis(context, "y", rawDy) : null;
    if (snapX) {
      result.x = snapX.delta;
      result.snappedX = true;
      result.guideX = snapX.guide;
    }
    if (snapY) {
      result.y = snapY.delta;
      result.snappedY = true;
      result.guideY = snapY.guide;
    }
    return result;
  }

  function clearSnapGuides() {
    activeSnapGuides = { x: null, y: null };
    snapGuideOverlay.replaceChildren();
    snapGuideOverlay.hidden = true;
  }

  function renderSnapGuides(activeDrag) {
    snapGuideOverlay.replaceChildren();
    if (!activeDrag || !activeDrag.snapContext || activeSnapGuides.x == null && activeSnapGuides.y == null) {
      snapGuideOverlay.hidden = true;
      return;
    }
    var context = activeDrag.snapContext;
    var face = context.face;
    var faceOffset = elementOffsetInside(face, ticket);
    var faceSpace = document.createElement("div");
    faceSpace.className = "snap-guide-face-space";
    faceSpace.style.left = faceOffset.x + "px";
    faceSpace.style.top = faceOffset.y + "px";
    faceSpace.style.width = context.faceW + "px";
    faceSpace.style.height = context.faceH + "px";
    copyTransformSpace(face, faceSpace);
    if (activeSnapGuides.x != null) {
      var vertical = document.createElement("i");
      vertical.className = "snap-guide-line snap-guide-line-x";
      vertical.style.left = activeSnapGuides.x + "px";
      faceSpace.appendChild(vertical);
    }
    if (activeSnapGuides.y != null) {
      var horizontal = document.createElement("i");
      horizontal.className = "snap-guide-line snap-guide-line-y";
      horizontal.style.top = activeSnapGuides.y + "px";
      faceSpace.appendChild(horizontal);
    }
    snapGuideOverlay.appendChild(faceSpace);
    snapGuideOverlay.hidden = false;
  }

  function translateSelectedLayerByDesignPixels(key, dx, dy) {
    var preview = templateConfig(state.template).preview;
    var percentX = finiteNumber(dx, 0) / Math.max(1, preview.width) * 100;
    var percentY = finiteNumber(dy, 0) / Math.max(1, preview.height) * 100;
    var custom = customLayerById(key);
    if (custom) {
      custom.x = finiteNumber(custom.x, 0) + percentX;
      custom.y = finiteNumber(custom.y, 0) + percentY;
      return;
    }
    var layout = activeLayout();
    if (key === "quote") {
      layout.quoteX = finiteNumber(layout.quoteX, 0) + percentX;
      layout.quoteY = finiteNumber(layout.quoteY, 0) + percentY;
      return;
    }
    if (key === "details") {
      layout.detailsX = finiteNumber(layout.detailsX, 0) + percentX;
      layout.detailsY = finiteNumber(layout.detailsY, 0) + percentY;
      return;
    }
    var placement = writablePlacementFor(state.side, key);
    placement.x = finiteNumber(placement.x, 0) + percentX;
    placement.y = finiteNumber(placement.y, 0) + percentY;
  }

  function alignMultiSelection(axis, edge) {
    var items = multiSelectionItems();
    if (items.length < 2) { showToast("이동 가능한 오브젝트를 2개 이상 선택해 주세요."); return; }
    /* multiSelectionItems preserves Ctrl-selection order after removing hidden,
       locked and unavailable entries, so index 0 is the first valid anchor. */
    var anchor = items[0];
    var startKey = axis === "x" ? "x" : "y";
    var sizeKey = axis === "x" ? "w" : "h";
    var factor = edge === "center" || edge === "middle" ? .5
      : edge === "right" || edge === "bottom" ? 1 : 0;
    var anchorCoordinate = anchor[startKey] + anchor[sizeKey] * factor;
    commit(function () {
      items.forEach(function (item) {
        if (item.key === anchor.key) return;
        var delta = anchorCoordinate - (item[startKey] + item[sizeKey] * factor);
        translateSelectedLayerByDesignPixels(item.key, axis === "x" ? delta : 0, axis === "y" ? delta : 0);
      });
    });
  }

  function distributeMultiSelection(axis) {
    var items = multiSelectionItems();
    if (items.length < 3) { showToast("균등 분배할 오브젝트를 3개 이상 선택해 주세요."); return; }
    var startKey = axis === "x" ? "x" : "y";
    var sizeKey = axis === "x" ? "w" : "h";
    /* Modern sort is stable, so exact ties keep the user's selection order. */
    items.sort(function (a, b) { return a[startKey] - b[startKey]; });
    var first = items[0];
    var last = items[items.length - 1];
    var middleSize = items.slice(1, -1).reduce(function (total, item) { return total + item[sizeKey]; }, 0);
    var gap = (last[startKey] - first[startKey] - first[sizeKey] - middleSize) / (items.length - 1);
    var cursor = first[startKey] + first[sizeKey] + gap;
    var targets = items.slice(1, -1).map(function (item) {
      var target = { item: item, delta: cursor - item[startKey] };
      cursor += item[sizeKey] + gap;
      return target;
    });
    if (!targets.some(function (target) { return Math.abs(target.delta) > .0001; })) return;
    commit(function () {
      targets.forEach(function (target) {
        translateSelectedLayerByDesignPixels(target.item.key, axis === "x" ? target.delta : 0, axis === "y" ? target.delta : 0);
      });
    });
  }

  function applyMultiSelectionGap(axis, value) {
    var items = multiSelectionItems();
    if (items.length < 2) { showToast("이동 가능한 오브젝트를 2개 이상 선택해 주세요."); return; }
    var gap = finiteNumber(value, 0);
    var startKey = axis === "x" ? "x" : "y";
    var sizeKey = axis === "x" ? "w" : "h";
    items.sort(function (a, b) { return a[startKey] - b[startKey]; });
    var targets = [];
    var cursor = items[0][startKey] + items[0][sizeKey] + gap;
    items.slice(1).forEach(function (item) {
      targets.push({ item: item, delta: cursor - item[startKey] });
      cursor += item[sizeKey] + gap;
    });
    commit(function () {
      targets.forEach(function (target) {
        translateSelectedLayerByDesignPixels(target.item.key, axis === "x" ? target.delta : 0, axis === "y" ? target.delta : 0);
      });
    });
  }

  $("#alignSelectionX").addEventListener("click", function () { alignMultiSelection("x", "left"); });
  $("#alignSelectionCenterX").addEventListener("click", function () { alignMultiSelection("x", "center"); });
  $("#alignSelectionRight").addEventListener("click", function () { alignMultiSelection("x", "right"); });
  $("#alignSelectionY").addEventListener("click", function () { alignMultiSelection("y", "top"); });
  $("#alignSelectionCenterY").addEventListener("click", function () { alignMultiSelection("y", "middle"); });
  $("#alignSelectionBottom").addEventListener("click", function () { alignMultiSelection("y", "bottom"); });
  $("#distributeSelectionX").addEventListener("click", function () { distributeMultiSelection("x"); });
  $("#distributeSelectionY").addEventListener("click", function () { distributeMultiSelection("y"); });
  $("#applyHorizontalGap").addEventListener("click", function () { applyMultiSelectionGap("x", $("#horizontalGapInput").valueAsNumber); });
  $("#applyVerticalGap").addEventListener("click", function () { applyMultiSelectionGap("y", $("#verticalGapInput").valueAsNumber); });
  ["#horizontalGapInput", "#verticalGapInput"].forEach(function (selector) {
    $(selector).addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      applyMultiSelectionGap(selector === "#horizontalGapInput" ? "x" : "y", event.currentTarget.valueAsNumber);
    });
  });

  $("#resetObjectShapeBtn").addEventListener("click", function () {
    if (!state.selectedLayer || isLayerLocked(state.selectedLayer, state.side)) return;
    commit(function () {
      var custom = activeCustomLayer();
      if (custom) {
        custom.w = custom.type === "text" ? 34 : 30;
        custom.h = custom.type === "text" ? 12 : 30;
        custom.rotation = 0;
        custom.skewX = 0;
        if (custom.type === "text") {
          custom.scaleX = 1;
          custom.scaleY = 1;
          custom.autoHeight = true;
        }
        if (custom.type === "shape") {
          custom.cornerMode = "all";
          custom.cornerRadius = 0;
          custom.cornerRadii = Array(shapeCornerCount(custom.shapeKind)).fill(0);
        }
        return;
      }
      var side = canonicalTrainCouponSide(state.side, state.selectedLayer, state);
      var current = placementFor(side, state.selectedLayer);
      var x = finiteNumber(current.x, 0);
      var y = finiteNumber(current.y, 0);
      if (!state.placements[side]) state.placements[side] = {};
      delete state.placements[side][state.selectedLayer];
      if (x || y) state.placements[side][state.selectedLayer] = {
        x: x, y: y, scaleX: 1, scaleY: 1, rotation: 0,
        boxW: 0, boxH: 0, boxMode: "width", skewX: 0
      };
    });
    showToast("선택한 오브젝트의 모양을 원래대로 되돌렸어요.");
  });
  bindInput("#inspectSize", function (value) {
    if (isLayerLocked(state.selectedLayer, state.side)) return;
    var custom = activeCustomLayer();
    if (custom) {
      if (custom.type === "text") {
        var nextSize = clamp(ptToPx(value), 8, MAX_FONT_SIZE_PX);
        var ratio = nextSize / Math.max(1, custom.fontSize);
        (custom.styledRuns || []).forEach(function (run) { run.fontSize = clamp(run.fontSize * ratio, 4, MAX_FONT_SIZE_PX); });
        custom.fontSize = nextSize;
      }
      return;
    }
    if (state.selectedLayer === "quote") activeLayout().quoteSize = clamp(ptToPx(value), 20, MAX_FONT_SIZE_PX);
  }, Number);

  $("#layerClippingToggle").addEventListener("change", function () {
    if (!state.selectedLayer || state.selectedLayer === "effects") return;
    var enabled = $("#layerClippingToggle").checked;
    if (enabled && !clippingTargetFor(state.selectedLayer, state.side, state)) {
      $("#layerClippingToggle").checked = false;
      showToast("클리핑할 아래 레이어가 없습니다.");
      return;
    }
    commit(function () {
      if (!state.clipping) state.clipping = [];
      var token = layerFlagToken(state.selectedLayer, state.side, state);
      var index = state.clipping.indexOf(token);
      if (enabled && index < 0) state.clipping.push(token);
      if (!enabled && index >= 0) state.clipping.splice(index, 1);
    });
  });

  $("#shadowEnabled").addEventListener("change", function () {
    if (!state.selectedLayer) return;
    commit(function () { shadowFor(state.selectedLayer).enabled = $("#shadowEnabled").checked; });
  });
  bindInput("#shadowColor", function (value) { if (state.selectedLayer) shadowFor(state.selectedLayer).color = value; });
  $("#shadowColorReset").addEventListener("click", function () {
    if (!state.selectedLayer) return;
    commit(function () { shadowFor(state.selectedLayer).color = defaultShadow().color; });
  });
  bindInput("#shadowOpacityRange", function (value) { if (state.selectedLayer) shadowFor(state.selectedLayer).opacity = clamp(value, 0, 100); }, Number);
  bindInput("#shadowAngle", function (value) {
    if (state.selectedLayer) shadowFor(state.selectedLayer).angle = ((value % 360) + 360) % 360;
  }, Number);
  bindInput("#shadowDistance", function (value) {
    if (state.selectedLayer) shadowFor(state.selectedLayer).distance = clamp(value, 0, 120);
  }, Number);
  bindInput("#shadowBlur", function (value) { if (state.selectedLayer) shadowFor(state.selectedLayer).blur = clamp(value, 0, 120); }, Number);
  bindInput("#shadowSpread", function (value) { if (state.selectedLayer) shadowFor(state.selectedLayer).spread = clamp(value, -40, 80); }, Number);

  var shadowDialDrag = null;
  function updateShadowAngleFromPointer(event) {
    if (!state.selectedLayer) return;
    var dial = $("#shadowAngleDial");
    var rect = dial.getBoundingClientRect();
    var angle = Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI;
    shadowFor(state.selectedLayer).angle = Math.round((angle + 360) % 360);
    render();
  }
  $("#shadowAngleDial").addEventListener("pointerdown", function (event) {
    if (!state.selectedLayer) return;
    startEdit();
    shadowDialDrag = event.pointerId;
    $("#shadowAngleDial").setPointerCapture(event.pointerId);
    updateShadowAngleFromPointer(event);
    event.preventDefault();
  });
  $("#shadowAngleDial").addEventListener("pointermove", function (event) {
    if (shadowDialDrag !== event.pointerId) return;
    updateShadowAngleFromPointer(event);
  });
  function finishShadowDial(event) {
    if (shadowDialDrag !== event.pointerId) return;
    shadowDialDrag = null;
    finishEdit();
  }
  $("#shadowAngleDial").addEventListener("pointerup", finishShadowDial);
  $("#shadowAngleDial").addEventListener("pointercancel", finishShadowDial);
  $("#shadowAngleDial").addEventListener("keydown", function (event) {
    if (!state.selectedLayer || !["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"].includes(event.key)) return;
    var delta = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 1;
    commit(function () {
      var shadow = shadowFor(state.selectedLayer);
      shadow.angle = (shadow.angle + delta + 360) % 360;
    });
    event.preventDefault();
  });

  $$("[data-motion]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (state.template === "postcard" || isBothView(state)) return;
      commit(function () { state.motion = button.dataset.motion; });
    });
  });
  bindInput("#durationRange", function (value) { state.duration = value; }, Number);

  function centerStage() {
    stage.scrollLeft = Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2);
    stage.scrollTop = Math.max(0, (stage.scrollHeight - stage.clientHeight) / 2);
  }
  function setViewZoom(value, recenter) {
    var centerX = (stage.scrollLeft + stage.clientWidth / 2) / Math.max(1, stage.scrollWidth);
    var centerY = (stage.scrollTop + stage.clientHeight / 2) / Math.max(1, stage.scrollHeight);
    state.viewZoom = clamp(finiteNumber(value, state.viewZoom), .1, 8);
    render();
    requestAnimationFrame(function () {
      if (recenter) centerStage();
      else {
        stage.scrollLeft = centerX * stage.scrollWidth - stage.clientWidth / 2;
        stage.scrollTop = centerY * stage.scrollHeight - stage.clientHeight / 2;
      }
    });
  }
  function fitPreview() {
    var baseWidth = ticket.offsetWidth;
    var baseHeight = ticket.offsetHeight;
    var radians = state.viewRotation * Math.PI / 180;
    var rotatedWidth = Math.abs(baseWidth * Math.cos(radians)) + Math.abs(baseHeight * Math.sin(radians));
    var rotatedHeight = Math.abs(baseWidth * Math.sin(radians)) + Math.abs(baseHeight * Math.cos(radians));
    var horizontalGap = window.innerWidth <= 900 ? 48 : 80;
    var fit = Math.min((stage.clientWidth - horizontalGap) / rotatedWidth, (stage.clientHeight - 128) / rotatedHeight);
    setViewZoom(clamp(fit, .1, 8), true);
  }
  function setViewRotation(value) {
    state.viewRotation = finiteNumber(value, state.viewRotation);
    render();
    requestAnimationFrame(centerStage);
  }
  $("#viewZoomRange").addEventListener("input", function () { setViewZoom(Number($("#viewZoomRange").value) / 100, false); });
  $("#viewZoomInput").addEventListener("change", function () { setViewZoom(Number($("#viewZoomInput").value) / 100, false); });
  $("#viewZoomInput").addEventListener("keydown", function (event) { if (event.key === "Enter") { setViewZoom(Number($("#viewZoomInput").value) / 100, false); $("#viewZoomInput").blur(); } });
  $("#zoomMinus").addEventListener("click", function () { setViewZoom(Math.round((state.viewZoom - .1) * 10) / 10, false); });
  $("#zoomPlus").addEventListener("click", function () { setViewZoom(Math.round((state.viewZoom + .1) * 10) / 10, false); });
  $("#zoomActual").addEventListener("click", function () { setViewZoom(1, true); });
  $("#zoomFit").addEventListener("click", fitPreview);
  $("#viewRotationRange").addEventListener("input", function () {
    var currentTurn = Math.round((state.viewRotation - normalizedRotation(state.viewRotation)) / 360);
    setViewRotation(currentTurn * 360 + Number($("#viewRotationRange").value));
  });
  function setRotationFromInput() {
    var rawValue = Number($("#viewRotationInput").value);
    setViewRotation(rawValue);
    $("#viewRotationInput").value = Math.round(normalizedRotation(rawValue) * 100) / 100;
  }
  $("#viewRotationInput").addEventListener("change", setRotationFromInput);
  $("#viewRotationInput").addEventListener("keydown", function (event) { if (event.key === "Enter") { setRotationFromInput(); $("#viewRotationInput").blur(); } });
  $("#rotateLeft").addEventListener("click", function () { setViewRotation(state.viewRotation - 90); });
  $("#rotateRight").addEventListener("click", function () { setViewRotation(state.viewRotation + 90); });
  $("#rotateReset").addEventListener("click", function () { setViewRotation(0); });
  stage.addEventListener("wheel", function (event) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setViewZoom(state.viewZoom + (event.deltaY < 0 ? .05 : -.05), false);
  }, { passive: false });

  function isEditingTarget(target) {
    if (!target) return false;
    var tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
  }
  function editorKeyboardShortcutsEnabled() {
    var templateEntry = $("#templateEntry");
    return !templateEntry || templateEntry.classList.contains("hidden");
  }
  window.addEventListener("keydown", function (event) {
    if (!editorKeyboardShortcutsEnabled()) return;
    if (exportInProgress) { event.preventDefault(); return; }
    if (isEditingTarget(event.target)) return;
    var command = event.ctrlKey || event.metaKey;
    if (command && event.code === "KeyZ") {
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
      return;
    }
    if (command && event.code === "KeyY") { event.preventDefault(); redo(); return; }
    if (command && event.code === "KeyC") { event.preventDefault(); copySelectedLayer(false); return; }
    if (command && event.code === "KeyV") { event.preventDefault(); pasteCopiedLayer(); return; }
    if (command && event.code === "KeyX") { event.preventDefault(); copySelectedLayer(true); return; }
    if (command && event.code === "KeyD") { event.preventDefault(); duplicateSelectedLayer(); return; }
    if (!command && (event.code === "Delete" || event.code === "Backspace")) {
      event.preventDefault();
      deleteSelectedLayer();
    }
  });
  function releaseSpace() {
    spacePressed = false;
    stage.classList.remove("is-pannable");
  }
  window.addEventListener("keydown", function (event) {
    if (!editorKeyboardShortcutsEnabled()) return;
    if (exportInProgress) { event.preventDefault(); return; }
    if (event.code !== "Space" || isEditingTarget(event.target)) return;
    spacePressed = true;
    stage.classList.add("is-pannable");
    event.preventDefault();
  });
  window.addEventListener("keyup", function (event) { if (event.code === "Space") releaseSpace(); });
  window.addEventListener("blur", releaseSpace);

  stage.addEventListener("pointerdown", function (event) {
    var layerTarget = event.target.closest && event.target.closest("[data-canvas-layer], [data-object-handle]");
    if (!layerTarget && !spacePressed && event.button !== 1) {
      clearLayerSelection();
      render();
    }
    if (!spacePressed && event.button !== 1) return;
    event.preventDefault();
    event.stopPropagation();
    panDrag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: stage.scrollLeft, top: stage.scrollTop };
    stage.classList.add("is-panning");
    stage.setPointerCapture(event.pointerId);
  }, true);
  stage.addEventListener("pointermove", function (event) {
    if (!panDrag || panDrag.pointerId !== event.pointerId) return;
    stage.scrollLeft = panDrag.left - (event.clientX - panDrag.x);
    stage.scrollTop = panDrag.top - (event.clientY - panDrag.y);
  });
  function endStagePan(event) {
    if (!panDrag || panDrag.pointerId !== event.pointerId) return;
    panDrag = null;
    stage.classList.remove("is-panning");
  }
  stage.addEventListener("pointerup", endStagePan);
  stage.addEventListener("pointercancel", endStagePan);

  Object.keys(blockDom).forEach(function (key) {
    blockDom[key].image.addEventListener("load", function () {
      delete failedBlockImageSources[key];
      blockDom[key].node.classList.remove("image-load-error");
      renderBlockImages();
    });
    blockDom[key].image.addEventListener("error", function () {
      var config = blockConfigForDomKey(key);
      var source = effectiveBlockImageSource(key, config);
      if (source) failedBlockImageSources[key] = source;
      blockDom[key].node.classList.add("image-load-error");
      blockDom[key].node.classList.remove("has-image");
      blockDom[key].image.style.display = "none";
      blockDom[key].node.style.setProperty("--image-alpha-mask", "none");
      renderBlockImages();
    });
  });
  window.addEventListener("resize", function () {
    updateTicketGeometry();
    renderBlockImages();
  });

  function groupMoveEntries(side) {
    var layout = state.layouts && state.layouts[side];
    return selectedLayerKeys().map(function (key) {
      if (!layerAvailableOnSide(key, side, state) || isLayerHidden(key, side) || isLayerLocked(key, side) || !isMovableLayer(key, state)) return null;
      var custom = customLayerById(key);
      if (custom) return {
        key: key, kind: "custom", startX: finiteNumber(custom.x, 0), startY: finiteNumber(custom.y, 0),
        minX: -50, maxX: 100, minY: -50, maxY: 100
      };
      if (key === "quote" && layout) return {
        key: key, kind: "quote", startX: finiteNumber(layout.quoteX, 0), startY: finiteNumber(layout.quoteY, 0),
        minX: -100, maxX: 100, minY: -20, maxY: 100
      };
      if (key === "details" && layout) return {
        key: key, kind: "details", startX: finiteNumber(layout.detailsX, 0), startY: finiteNumber(layout.detailsY, 0),
        minX: -20, maxX: 100, minY: -20, maxY: 100
      };
      var placement = placementFor(side, key);
      return {
        key: key, kind: "placement", startX: finiteNumber(placement.x, 0), startY: finiteNumber(placement.y, 0),
        minX: -100, maxX: 100, minY: -100, maxY: 100
      };
    }).filter(Boolean);
  }

  function clampSharedGroupDelta(entries, axis, desired) {
    var startKey = axis === "x" ? "startX" : "startY";
    var minKey = axis === "x" ? "minX" : "minY";
    var maxKey = axis === "x" ? "maxX" : "maxY";
    var minimum = -Infinity;
    var maximum = Infinity;
    entries.forEach(function (entry) {
      var start = entry[startKey];
      var lower = entry[minKey] - start;
      var upper = entry[maxKey] - start;
      /* Alignment and direct coordinate input may intentionally leave an
         object outside the old drag bounds. Keep zero in that object's
         interval so the first group drag never snaps it back to an edge. */
      if (start < entry[minKey]) lower = 0;
      if (start > entry[maxKey]) upper = 0;
      minimum = Math.max(minimum, lower);
      maximum = Math.min(maximum, upper);
    });
    if (minimum > maximum) return 0;
    return clamp(desired, minimum, maximum);
  }

  function applyGroupMove(entries, side, deltaX, deltaY) {
    var layout = state.layouts && state.layouts[side];
    entries.forEach(function (entry) {
      var nextX = entry.startX + deltaX;
      var nextY = entry.startY + deltaY;
      if (entry.kind === "custom") {
        var custom = customLayerById(entry.key);
        if (custom) { custom.x = nextX; custom.y = nextY; }
      } else if (entry.kind === "quote" && layout) {
        layout.quoteX = nextX;
        layout.quoteY = nextY;
      } else if (entry.kind === "details" && layout) {
        layout.detailsX = nextX;
        layout.detailsY = nextY;
      } else {
        var placement = writablePlacementFor(side, entry.key);
        placement.x = nextX;
        placement.y = nextY;
      }
    });
  }

  function pointerLayerDown(event) {
    clearSnapGuides();
    var target = event.currentTarget;
    var selectionLayer = target.dataset.selectionLayer || "";
    var layer = selectionLayer || target.dataset.canvasLayer;
    var targetFace = selectionLayer
      ? (target.dataset.selectionSide === "back" ? backFace : frontFace)
      : target.closest(".ticket-face");
    var targetSide = selectionLayer ? target.dataset.selectionSide : (targetFace === backFace ? "back" : "front");
    if (selectionLayer) {
      target = targetFace.querySelector('[data-canvas-layer="' + selectionLayer + '"]');
      if (!target) return;
    }
    if (isBothView(state) && state.side !== targetSide) {
      state.side = targetSide;
      clearLayerSelection();
    }
    var objectHandleNode = event.target.closest && event.target.closest("[data-object-handle]");
    var objectHandle = objectHandleNode ? objectHandleNode.dataset.objectHandle : "";
    if (event.altKey && state.selectedLayer && layerAvailableOnSide(state.selectedLayer, state.side)) {
      var activeFace = state.side === "front" ? frontFace : backFace;
      var selectedTarget = activeFace.querySelector('[data-canvas-layer="' + state.selectedLayer + '"]');
      if (selectedTarget && !isLayerHidden(state.selectedLayer, state.side)) {
        var selectedRect = selectedTarget.getBoundingClientRect();
        if (event.clientX >= selectedRect.left && event.clientX <= selectedRect.right && event.clientY >= selectedRect.top && event.clientY <= selectedRect.bottom) {
          target = selectedTarget;
          layer = state.selectedLayer;
        }
      }
    }
    var selectionChanged = state.selectedLayer !== layer || state.side !== targetSide;
    var hadMultipleSelection = selectedLayerCount() > 1;
    if (state.template === "postcard" || isBothView(state)) state.side = targetSide;
    var commandHeld = event.ctrlKey || event.metaKey;
    var groupEntries = commandHeld && !objectHandle && hadMultipleSelection
      && isLayerSelected(layer, targetSide) && !isLayerLocked(layer, targetSide) && isMovableLayer(layer, state)
      ? groupMoveEntries(targetSide) : [];
    var groupCommandDrag = groupEntries.length > 0;
    if (commandHeld && !objectHandle && !groupCommandDrag) {
      setPrimarySelection(layer, true);
      render();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!objectHandle && !groupCommandDrag) setPrimarySelection(layer, false);
    if (!groupCommandDrag && (selectionChanged || hadMultipleSelection && !objectHandle)) render();
    if (isLayerLocked(layer, state.side)) return;

    var layout = activeLayout();
    var custom = customLayerById(layer);
    var activeFaceWidth = Math.max(1, targetFace.offsetWidth || ticket.offsetWidth);
    var activeFaceHeight = Math.max(1, targetFace.offsetHeight || ticket.offsetHeight);
    if (groupCommandDrag) {
      startEdit();
      groupEntries.forEach(function (entry) {
        if (entry.kind === "placement") materializeLegacyCompositeTransform(targetSide, entry.key);
      });
      groupEntries = groupMoveEntries(targetSide);
      var bothGeometry = isBothView(state) ? projectedBothGeometryFor(state.template, targetSide) : null;
      drag = {
        mode: "move-group", layer: layer, pointerId: event.pointerId, target: target, side: targetSide,
        startX: event.clientX, startY: event.clientY, entries: groupEntries,
        ticketW: activeFaceWidth,
        ticketH: activeFaceHeight,
        faceScale: bothGeometry ? bothGeometry.scale : 1,
        faceRotation: bothGeometry ? bothGeometry.rotation : 0
      };
    } else if (objectHandle && isMovableLayer(layer)) {
      startEdit();
      if (!custom && (objectHandle !== "skew" || event.altKey)) materializeLegacyCompositeTransform(state.side, layer);
      var objectRect = target.getBoundingClientRect();
      var objectPlacement = custom ? null : placementFor(state.side, layer);
      var startRotation = custom ? finiteNumber(custom.rotation, 0) : finiteNumber(objectPlacement.rotation, 0);
      var textObject = TEXT_LAYER_KEYS.indexOf(layer) >= 0 || Boolean(custom && custom.type === "text");
      if (objectHandle === "skew") {
        if (!event.altKey) {
          showToast("기울기 핸들은 Alt를 누른 채 가로로 드래그해 주세요.");
          finishEdit();
          return;
        }
        drag = {
          mode: "skew-object", layer: layer, pointerId: event.pointerId, target: target,
          startX: event.clientX, startY: event.clientY, custom: Boolean(custom),
          skewX: custom ? finiteNumber(custom.skewX, 0) : finiteNumber(objectPlacement.skewX, 0)
        };
      } else if (objectHandle === "resize") {
        var transformCustomText = Boolean(custom && custom.type === "text" && event.altKey);
        var resizeProxy = objectHandleNode.closest(".selection-proxy");
        drag = {
          mode: textObject && !event.altKey ? "resize-text-box" : "resize-object", layer: layer, pointerId: event.pointerId, target: target,
          proxy: resizeProxy,
          startX: event.clientX, startY: event.clientY, custom: Boolean(custom),
          startW: custom ? custom.w : Math.max(1, target.offsetWidth * finiteNumber(objectPlacement.scaleX, 1)),
          startH: custom ? custom.h : Math.max(1, target.offsetHeight * finiteNumber(objectPlacement.scaleY, 1)),
          startPixelW: Math.max(1, target.offsetWidth), startPixelH: Math.max(1, target.offsetHeight),
          baseW: custom ? 100 : Math.max(1, target.offsetWidth),
          baseH: custom ? 100 : Math.max(1, target.offsetHeight),
          customW: custom ? custom.w : 0, customH: custom ? custom.h : 0,
          customFontSize: custom && custom.type === "text" ? custom.fontSize : 0,
          customRunSizes: custom && custom.type === "text" ? (custom.styledRuns || []).map(function (run) { return run.fontSize; }) : [],
          transformCustomText: transformCustomText,
          customScaleX: custom && custom.type === "text" ? clamp(finiteNumber(custom.scaleX, 1), .1, MAX_NATIVE_OBJECT_SCALE) : 1,
          customScaleY: custom && custom.type === "text" ? clamp(finiteNumber(custom.scaleY, 1), .1, MAX_NATIVE_OBJECT_SCALE) : 1,
          scaleX: custom && custom.type === "text" ? clamp(finiteNumber(custom.scaleX, 1), .1, MAX_NATIVE_OBJECT_SCALE) : custom ? 1 : finiteNumber(objectPlacement.scaleX, 1),
          scaleY: custom && custom.type === "text" ? clamp(finiteNumber(custom.scaleY, 1), .1, MAX_NATIVE_OBJECT_SCALE) : custom ? 1 : finiteNumber(objectPlacement.scaleY, 1),
          skewX: custom ? finiteNumber(custom.skewX, 0) : finiteNumber(objectPlacement.skewX, 0),
          customX: custom ? finiteNumber(custom.x, 0) : 0,
          customY: custom ? finiteNumber(custom.y, 0) : 0,
          placementX: custom ? 0 : finiteNumber(objectPlacement.x, 0),
          placementY: custom ? 0 : finiteNumber(objectPlacement.y, 0),
          proxyStartLeft: resizeProxy ? parseFloat(resizeProxy.style.left) || 0 : 0,
          proxyStartTop: resizeProxy ? parseFloat(resizeProxy.style.top) || 0 : 0,
          rotation: startRotation, ticketW: activeFaceWidth, ticketH: activeFaceHeight
        };
      } else {
        drag = {
          mode: "rotate-object", layer: layer, pointerId: event.pointerId, target: target,
          startX: event.clientX, startY: event.clientY,
          centerX: objectRect.left + objectRect.width / 2,
          centerY: objectRect.top + objectRect.height / 2,
          startAngle: Math.atan2(event.clientY - (objectRect.top + objectRect.height / 2), event.clientX - (objectRect.left + objectRect.width / 2)) * 180 / Math.PI,
          rotation: startRotation, custom: Boolean(custom)
        };
      }
    } else if (isMovableLayer(layer) && (layer !== "image-main" && layer !== "image-stub" || state.freeform || Boolean(custom))) {
      startEdit();
      if (!custom) materializeLegacyCompositeTransform(state.side, layer);
      if (custom) {
        drag = {
          mode: "move-custom", layer: layer, pointerId: event.pointerId, target: target,
          startX: event.clientX, startY: event.clientY, customX: custom.x, customY: custom.y,
          ticketW: activeFaceWidth, ticketH: activeFaceHeight
        };
      } else if (layer === "quote") {
        drag = {
          mode: event.target.classList.contains("resize-handle") ? "resize-quote" : "move-quote",
          pointerId: event.pointerId, target: target, startX: event.clientX, startY: event.clientY,
          quoteX: layout.quoteX, quoteY: layout.quoteY, quoteW: layout.quoteW, quoteSize: layout.quoteSize,
          ticketW: activeFaceWidth, ticketH: activeFaceHeight
        };
      } else if (layer === "details") {
        drag = {
          mode: "move-details", pointerId: event.pointerId, target: target,
          startX: event.clientX, startY: event.clientY, detailsX: layout.detailsX, detailsY: layout.detailsY,
          ticketW: activeFaceWidth, ticketH: activeFaceHeight
        };
      } else {
        var placement = placementFor(state.side, layer);
        drag = {
          mode: "move-layer", layer: layer, pointerId: event.pointerId, target: target,
          startX: event.clientX, startY: event.clientY, placementX: placement.x, placementY: placement.y,
          ticketW: activeFaceWidth, ticketH: activeFaceHeight
        };
      }
    } else if (layer === "image-main" || layer === "image-stub") {
      var block = activeBlock();
      if (!block || !block.imageData) return;
      startEdit();
      var blockRect = target.querySelector(".block-image-frame").getBoundingClientRect();
      drag = { mode: "pan-image", pointerId: event.pointerId, target: target, startX: event.clientX, startY: event.clientY, panX: block.panX, panY: block.panY, blockW: blockRect.width, blockH: blockRect.height };
    } else {
      return;
    }
    var faceLocalDragModes = [
      "move-group", "move-custom", "move-quote", "resize-quote", "move-details", "move-layer",
      "resize-text-box", "resize-object", "skew-object"
    ];
    if (drag && isBothView(state) && faceLocalDragModes.indexOf(drag.mode) >= 0) {
      var activeBothGeometry = projectedBothGeometryFor(state.template, targetSide);
      drag.faceScale = activeBothGeometry.scale;
      drag.faceRotation = activeBothGeometry.rotation;
    }
    var smartMoveModes = ["move-group", "move-custom", "move-quote", "move-details", "move-layer"];
    if (drag && smartMoveModes.indexOf(drag.mode) >= 0) {
      var movingKeys = drag.mode === "move-group"
        ? drag.entries.map(function (entry) { return entry.key; })
        : [drag.layer];
      drag.snapContext = captureMoveSnapContext(targetSide, targetFace, movingKeys, drag.faceScale || 1);
    }
    var captureTarget = target;
    if (selectionLayer) {
      drag.portal = true;
      captureTarget = ticket;
    }
    captureTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function textBoxAnchorOffset(deltaWidth, deltaHeight, scaleX, scaleY, rotation, skewX) {
    var halfWidth = finiteNumber(deltaWidth, 0) / 2;
    var halfHeight = finiteNumber(deltaHeight, 0) / 2;
    var safeScaleX = clamp(finiteNumber(scaleX, 1), .1, MAX_NATIVE_OBJECT_SCALE);
    var safeScaleY = clamp(finiteNumber(scaleY, 1), .1, MAX_NATIVE_OBJECT_SCALE);
    var skew = Math.tan(clamp(finiteNumber(skewX, 0), -70, 70) * Math.PI / 180);
    var radians = finiteNumber(rotation, 0) * Math.PI / 180;
    var cos = Math.cos(radians);
    var sin = Math.sin(radians);
    /* CSS uses a centered R*K*S transform. Resizing the untransformed area
       changes that center, so translate by (R*K*S - I) * deltaSize / 2 to
       keep the transformed top-left (the opposite handle) motionless. */
    var scaledX = halfWidth * safeScaleX;
    var scaledY = halfHeight * safeScaleY;
    var skewedX = scaledX + skew * scaledY;
    return {
      x: cos * skewedX - sin * scaledY - halfWidth,
      y: sin * skewedX + cos * scaledY - halfHeight
    };
  }

  function updateTextBoxDragPreview(activeDrag) {
    if (!activeDrag || !activeDrag.target) return;
    var node = activeDrag.target;
    if (activeDrag.custom) {
      var custom = customLayerById(activeDrag.layer);
      if (!custom) return;
      node.style.width = custom.w + "%";
      node.style.height = custom.h + "%";
      node.style.left = custom.x + "%";
      node.style.top = custom.y + "%";
      node.style.minHeight = "0";
      node.style.overflow = "hidden";
    } else {
      var placement = placementFor(state.side, activeDrag.layer);
      node.classList.add("text-box-layer", "text-box-resized");
      node.dataset.textBoxMode = "area";
      node.style.setProperty("--text-box-width", placement.boxW + "px");
      node.style.setProperty("--text-box-height", placement.boxH + "px");
      node.style.setProperty("width", placement.boxW + "px", "important");
      node.style.setProperty("height", placement.boxH + "px", "important");
      node.style.setProperty("overflow", "hidden", "important");
      node.style.transform = "translate(" + (finiteNumber(placement.x, 0) * activeDrag.ticketW / 100).toFixed(2) + "px," + (finiteNumber(placement.y, 0) * activeDrag.ticketH / 100).toFixed(2) + "px) rotate(" + finiteNumber(placement.rotation, 0) + "deg) skewX(" + clamp(finiteNumber(placement.skewX, 0), -70, 70) + "deg) scale(" + clamp(finiteNumber(placement.scaleX, 1), .1, MAX_NATIVE_OBJECT_SCALE) + "," + clamp(finiteNumber(placement.scaleY, 1), .1, MAX_NATIVE_OBJECT_SCALE) + ")";
    }
    if (activeDrag.proxy) {
      activeDrag.proxy.style.width = activeDrag.previewWidth + "px";
      activeDrag.proxy.style.height = activeDrag.previewHeight + "px";
      if (activeDrag.custom) {
        activeDrag.proxy.style.left = activeDrag.customX / 100 * activeDrag.ticketW + activeDrag.anchorOffsetX + "px";
        activeDrag.proxy.style.top = activeDrag.customY / 100 * activeDrag.ticketH + activeDrag.anchorOffsetY + "px";
      }
      copyTransformSpace(node, activeDrag.proxy);
    }
  }

  function pointerLayerMove(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    retainLayerClippingForDrag(drag);
    var screenDx = event.clientX - drag.startX;
    var screenDy = event.clientY - drag.startY;
    if (drag.mode === "move-group" && !drag.groupMoved) {
      if (Math.hypot(screenDx, screenDy) < 3) return;
      drag.groupMoved = true;
    }
    var radians = state.viewRotation * Math.PI / 180;
    var cos = Math.cos(radians);
    var sin = Math.sin(radians);
    var dx = (screenDx * cos + screenDy * sin) / Math.max(.1, state.viewZoom);
    var dy = (-screenDx * sin + screenDy * cos) / Math.max(.1, state.viewZoom);
    if (drag.faceRotation || drag.faceScale && drag.faceScale !== 1) {
      var faceRadians = finiteNumber(drag.faceRotation, 0) * Math.PI / 180;
      var faceCos = Math.cos(faceRadians);
      var faceSin = Math.sin(faceRadians);
      var faceScale = Math.max(.01, finiteNumber(drag.faceScale, 1));
      var faceDx = (dx * faceCos + dy * faceSin) / faceScale;
      var faceDy = (-dx * faceSin + dy * faceCos) / faceScale;
      dx = faceDx;
      dy = faceDy;
    }
    var constrainedDx = dx;
    var constrainedDy = dy;
    var shiftConstrainedMove = ["move-quote", "move-details", "move-layer", "move-custom", "move-group"].indexOf(drag.mode) >= 0;
    if (shiftConstrainedMove && event.shiftKey) {
      if (!drag.axisLock && Math.max(Math.abs(dx), Math.abs(dy)) >= 1) {
        drag.axisLock = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      }
      if (drag.axisLock === "x") constrainedDy = 0;
      if (drag.axisLock === "y") constrainedDx = 0;
    } else if (shiftConstrainedMove) {
      drag.axisLock = "";
    }
    var smartMoveModes = ["move-group", "move-custom", "move-quote", "move-details", "move-layer"];
    var smartMove = smartMoveModes.indexOf(drag.mode) >= 0
      ? resolveSmartMoveSnap(drag.snapContext, constrainedDx, constrainedDy, event, drag.axisLock)
      : null;
    if (smartMove) activeSnapGuides = { x: smartMove.guideX, y: smartMove.guideY };
    var layout = activeLayout();
    if (drag.mode === "resize-text-box") {
      var textRotationRadians = finiteNumber(drag.rotation, 0) * Math.PI / 180;
      var textDx = dx * Math.cos(textRotationRadians) + dy * Math.sin(textRotationRadians);
      var textDy = -dx * Math.sin(textRotationRadians) + dy * Math.cos(textRotationRadians);
      var textScaleX = Math.max(.1, Math.abs(finiteNumber(drag.scaleX, 1)));
      var textScaleY = Math.max(.1, Math.abs(finiteNumber(drag.scaleY, 1)));
      var textSkew = Math.tan(clamp(finiteNumber(drag.skewX, 0), -70, 70) * Math.PI / 180);
      var baseTextDy = textDy / textScaleY;
      var baseTextDx = (textDx - textSkew * textDy) / textScaleX;
      var desiredWidth = clamp(drag.startPixelW + baseTextDx, 16, MAX_TEXT_BOX_SIZE_PX);
      var desiredHeight = clamp(drag.startPixelH + baseTextDy, 12, MAX_TEXT_BOX_SIZE_PX);
      if (drag.custom) {
        var textCustom = customLayerById(drag.layer);
        if (textCustom) {
          textCustom.w = snapMetric(clamp(desiredWidth / drag.ticketW * 100, .25, MAX_OBJECT_SIZE_PERCENT), event);
          textCustom.h = snapMetric(clamp(desiredHeight / drag.ticketH * 100, .25, MAX_OBJECT_SIZE_PERCENT), event);
          textCustom.autoHeight = false;
          drag.previewWidth = textCustom.w / 100 * drag.ticketW;
          drag.previewHeight = textCustom.h / 100 * drag.ticketH;
          var customAnchorOffset = textBoxAnchorOffset(drag.previewWidth - drag.startPixelW, drag.previewHeight - drag.startPixelH, drag.scaleX, drag.scaleY, drag.rotation, drag.skewX);
          drag.anchorOffsetX = customAnchorOffset.x;
          drag.anchorOffsetY = customAnchorOffset.y;
          textCustom.x = drag.customX + customAnchorOffset.x / Math.max(1, drag.ticketW) * 100;
          textCustom.y = drag.customY + customAnchorOffset.y / Math.max(1, drag.ticketH) * 100;
        }
      } else {
        var textPlacement = writablePlacementFor(state.side, drag.layer);
        textPlacement.boxW = Math.round(desiredWidth * 100) / 100;
        textPlacement.boxH = Math.round(desiredHeight * 100) / 100;
        textPlacement.boxMode = "area";
        drag.previewWidth = textPlacement.boxW;
        drag.previewHeight = textPlacement.boxH;
        var nativeAnchorOffset = textBoxAnchorOffset(textPlacement.boxW - drag.startPixelW, textPlacement.boxH - drag.startPixelH, drag.scaleX, drag.scaleY, drag.rotation, drag.skewX);
        drag.anchorOffsetX = nativeAnchorOffset.x;
        drag.anchorOffsetY = nativeAnchorOffset.y;
        textPlacement.x = drag.placementX + nativeAnchorOffset.x / Math.max(1, drag.ticketW) * 100;
        textPlacement.y = drag.placementY + nativeAnchorOffset.y / Math.max(1, drag.ticketH) * 100;
      }
    } else if (drag.mode === "resize-object") {
      var rotationRadians = finiteNumber(drag.rotation, 0) * Math.PI / 180;
      var objectDx = dx * Math.cos(rotationRadians) + dy * Math.sin(rotationRadians);
      var objectDy = -dx * Math.sin(rotationRadians) + dy * Math.cos(rotationRadians);
      var objectSkew = Math.tan(clamp(finiteNumber(drag.skewX, 0), -70, 70) * Math.PI / 180);
      objectDx -= objectSkew * objectDy;
      if (drag.custom) {
        var resizeCustom = customLayerById(drag.layer);
        if (resizeCustom) {
          if (drag.transformCustomText && resizeCustom.type === "text") {
            var customTextBaseWidth = Math.max(1, drag.startPixelW);
            var customTextBaseHeight = Math.max(1, drag.startPixelH);
            var nextTextScaleX = clamp(drag.customScaleX + objectDx / customTextBaseWidth, .1, MAX_NATIVE_OBJECT_SCALE);
            var nextTextScaleY = clamp(drag.customScaleY + objectDy / customTextBaseHeight, .1, MAX_NATIVE_OBJECT_SCALE);
            if (event.shiftKey) {
              var customTextRatio = Math.abs(nextTextScaleX / drag.customScaleX - 1) >= Math.abs(nextTextScaleY / drag.customScaleY - 1)
                ? nextTextScaleX / drag.customScaleX : nextTextScaleY / drag.customScaleY;
              nextTextScaleX = clamp(drag.customScaleX * customTextRatio, .1, MAX_NATIVE_OBJECT_SCALE);
              nextTextScaleY = clamp(drag.customScaleY * customTextRatio, .1, MAX_NATIVE_OBJECT_SCALE);
            }
            resizeCustom.scaleX = Math.round(nextTextScaleX * 1000) / 1000;
            resizeCustom.scaleY = Math.round(nextTextScaleY * 1000) / 1000;
          } else {
          var customResizeMinimum = resizeCustom.type === "image" ? .01 : 2;
          var customResizeMaximum = MAX_OBJECT_SIZE_PERCENT;
          var rawCustomW = drag.customW + objectDx / drag.ticketW * 100;
          var rawCustomH = drag.customH + objectDy / drag.ticketH * 100;
          var nextCustomW = clamp(rawCustomW, customResizeMinimum, customResizeMaximum);
          var nextCustomH = clamp(rawCustomH, customResizeMinimum, customResizeMaximum);
          if (event.shiftKey) {
            var startCustomW = Math.max(.0001, drag.customW);
            var startCustomH = Math.max(.0001, drag.customH);
            var widthRatio = rawCustomW / startCustomW;
            var heightRatio = rawCustomH / startCustomH;
            var widthDominant = Math.abs(widthRatio - 1) >= Math.abs(heightRatio - 1);
            var customRatio = widthDominant ? widthRatio : heightRatio;
            var minimumRatio = Math.max(customResizeMinimum / startCustomW, customResizeMinimum / startCustomH);
            var maximumRatio = Math.min(customResizeMaximum / startCustomW, customResizeMaximum / startCustomH);
            customRatio = clamp(customRatio, minimumRatio, maximumRatio);
            var snappedDominant = snapMetric((widthDominant ? startCustomW : startCustomH) * customRatio, event);
            customRatio = clamp(snappedDominant / (widthDominant ? startCustomW : startCustomH), minimumRatio, maximumRatio);
            nextCustomW = Math.round(startCustomW * customRatio * 10000) / 10000;
            nextCustomH = Math.round(startCustomH * customRatio * 10000) / 10000;
          } else {
            nextCustomW = snapMetric(nextCustomW, event);
            nextCustomH = snapMetric(nextCustomH, event);
          }
          resizeCustom.w = nextCustomW;
          resizeCustom.h = nextCustomH;
          resizeCustom.autoHeight = false;
          if (resizeCustom.type === "text") {
            var fontScale = Math.max(nextCustomW / Math.max(1, drag.customW), nextCustomH / Math.max(1, drag.customH));
            resizeCustom.fontSize = clamp(drag.customFontSize * fontScale, 8, MAX_FONT_SIZE_PX);
            (resizeCustom.styledRuns || []).forEach(function (run, index) {
              run.fontSize = clamp(finiteNumber(drag.customRunSizes[index], run.fontSize) * fontScale, 4, MAX_FONT_SIZE_PX);
            });
          }
          }
        }
      } else {
        var resizePlacement = writablePlacementFor(state.side, drag.layer);
        var nextScaleX = clamp((drag.startW + objectDx) / drag.baseW, .1, MAX_NATIVE_OBJECT_SCALE);
        var nextScaleY = clamp((drag.startH + objectDy) / drag.baseH, .1, MAX_NATIVE_OBJECT_SCALE);
        if (event.shiftKey) {
          var nativeRatioX = nextScaleX / Math.max(.1, drag.scaleX);
          var nativeRatioY = nextScaleY / Math.max(.1, drag.scaleY);
          var scaleRatio = Math.abs(nativeRatioX - 1) >= Math.abs(nativeRatioY - 1) ? nativeRatioX : nativeRatioY;
          nextScaleX = clamp(drag.scaleX * scaleRatio, .1, MAX_NATIVE_OBJECT_SCALE);
          nextScaleY = clamp(drag.scaleY * scaleRatio, .1, MAX_NATIVE_OBJECT_SCALE);
        }
        resizePlacement.scaleX = Math.round(nextScaleX * 1000) / 1000;
        resizePlacement.scaleY = Math.round(nextScaleY * 1000) / 1000;
      }
    } else if (drag.mode === "skew-object") {
      var nextSkew = clamp(drag.skewX + dx / Math.max(18, drag.target.offsetHeight) * 45, -70, 70);
      if (!event.altKey) nextSkew = Math.round(nextSkew / 5) * 5;
      var skewCustom = drag.custom ? customLayerById(drag.layer) : null;
      if (skewCustom) skewCustom.skewX = Math.round(nextSkew * 10) / 10;
      else writablePlacementFor(state.side, drag.layer).skewX = Math.round(nextSkew * 10) / 10;
    } else if (drag.mode === "rotate-object") {
      var pointerAngle = Math.atan2(event.clientY - drag.centerY, event.clientX - drag.centerX) * 180 / Math.PI;
      var nextRotation = drag.rotation + pointerAngle - drag.startAngle;
      var rotationStep = event.altKey ? 0 : event.shiftKey ? 15 : 5;
      if (rotationStep) nextRotation = Math.round(nextRotation / rotationStep) * rotationStep;
      nextRotation = clamp(nextRotation, -360, 360);
      var rotateCustom = drag.custom ? customLayerById(drag.layer) : null;
      if (rotateCustom) rotateCustom.rotation = nextRotation;
      else writablePlacementFor(state.side, drag.layer).rotation = nextRotation;
    } else if (drag.mode === "move-group") {
      var waitingForAxis = event.shiftKey && !drag.axisLock;
      var desiredGroupX = waitingForAxis || drag.axisLock === "y" ? 0 : smartMove && smartMove.snappedX
        ? smartMove.x / Math.max(1, drag.ticketW) * 100
        : snapMetric(constrainedDx / Math.max(1, drag.ticketW) * 100, event);
      var desiredGroupY = waitingForAxis || drag.axisLock === "x" ? 0 : smartMove && smartMove.snappedY
        ? smartMove.y / Math.max(1, drag.ticketH) * 100
        : snapMetric(constrainedDy / Math.max(1, drag.ticketH) * 100, event);
      var groupDeltaX = clampSharedGroupDelta(drag.entries, "x", desiredGroupX);
      var groupDeltaY = clampSharedGroupDelta(drag.entries, "y", desiredGroupY);
      if (Math.abs(groupDeltaX - desiredGroupX) > .0001) activeSnapGuides.x = null;
      if (Math.abs(groupDeltaY - desiredGroupY) > .0001) activeSnapGuides.y = null;
      applyGroupMove(drag.entries, drag.side, groupDeltaX, groupDeltaY);
    } else if (drag.mode === "move-quote") {
      layout.quoteX = clamp(constrainedMoveMetric(drag.quoteX, constrainedDx, drag.ticketW, event, drag.axisLock, "x", smartMove), -100, 100);
      layout.quoteY = clamp(constrainedMoveMetric(drag.quoteY, constrainedDy, drag.ticketH, event, drag.axisLock, "y", smartMove), -20, 100);
    } else if (drag.mode === "resize-quote") {
      layout.quoteW = clamp(snapMetric(drag.quoteW + dx / drag.ticketW * 100, event), 12, MAX_OBJECT_SIZE_PERCENT);
      layout.quoteSize = clamp(Math.round(drag.quoteSize + dy / drag.ticketH * 80), 12, MAX_FONT_SIZE_PX);
    } else if (drag.mode === "move-details") {
      layout.detailsX = clamp(constrainedMoveMetric(drag.detailsX, constrainedDx, drag.ticketW, event, drag.axisLock, "x", smartMove), -20, 100);
      layout.detailsY = clamp(constrainedMoveMetric(drag.detailsY, constrainedDy, drag.ticketH, event, drag.axisLock, "y", smartMove), -20, 100);
    } else if (drag.mode === "move-layer") {
      var placement = writablePlacementFor(state.side, drag.layer);
      placement.x = clamp(constrainedMoveMetric(drag.placementX, constrainedDx, drag.ticketW, event, drag.axisLock, "x", smartMove), -100, 100);
      placement.y = clamp(constrainedMoveMetric(drag.placementY, constrainedDy, drag.ticketH, event, drag.axisLock, "y", smartMove), -100, 100);
    } else if (drag.mode === "move-custom") {
      var custom = customLayerById(drag.layer);
      if (custom) {
        custom.x = clamp(constrainedMoveMetric(drag.customX, constrainedDx, drag.ticketW, event, drag.axisLock, "x", smartMove), -50, 100);
        custom.y = clamp(constrainedMoveMetric(drag.customY, constrainedDy, drag.ticketH, event, drag.axisLock, "y", smartMove), -50, 100);
      }
    } else if (drag.mode === "pan-image") {
      var block = activeBlock();
      if (block) {
        block.panX = clamp(drag.panX + dx / drag.blockW * 2, -1, 1);
        block.panY = clamp(drag.panY + dy / drag.blockH * 2, -1, 1);
      }
    }
    if (drag.mode === "resize-text-box") {
      updateTextBoxDragPreview(drag);
      return;
    }
    render();
    updateRetainedLayerClippingForDrag(drag);
    if (smartMove) renderSnapGuides(drag);
  }

  function pointerLayerUp(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    var completedDrag = drag;
    drag = null;
    clearSnapGuides();
    if (completedDrag.mode === "move-group" && !completedDrag.groupMoved && event.type !== "pointercancel") {
      editSnapshot = null;
      setPrimarySelection(completedDrag.layer, true);
      render();
      return;
    }
    finishEdit();
  }

  function bindCanvasLayerNode(node) {
    if (!node || node.dataset.pointerBound === "true") return;
    node.dataset.pointerBound = "true";
    node.addEventListener("pointerdown", pointerLayerDown);
    node.addEventListener("pointermove", pointerLayerMove);
    node.addEventListener("pointerup", pointerLayerUp);
    node.addEventListener("pointercancel", pointerLayerUp);
  }
  $$("[data-canvas-layer]").forEach(bindCanvasLayerNode);
  var attributionPreviewDrag = null;
  $("#ticketAttributionPreview").addEventListener("pointerdown", function (event) {
    if (event.button !== 0) return;
    setPrimarySelection(ATTRIBUTION_LAYER_KEY, false);
    startEdit();
    var placement = placementFor(state.side, ATTRIBUTION_LAYER_KEY);
    var radians = finiteNumber(state.viewRotation, 0) * Math.PI / 180;
    attributionPreviewDrag = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: finiteNumber(placement.x, 0),
      startY: finiteNumber(placement.y, 0),
      width: Math.max(1, ticket.offsetWidth * state.viewZoom),
      height: Math.max(1, ticket.offsetHeight * state.viewZoom),
      cosine: Math.cos(radians),
      sine: Math.sin(radians)
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    render();
    event.preventDefault();
    event.stopPropagation();
  });
  $("#ticketAttributionPreview").addEventListener("pointermove", function (event) {
    if (!attributionPreviewDrag || attributionPreviewDrag.pointerId !== event.pointerId) return;
    var placement = writablePlacementFor(state.side, ATTRIBUTION_LAYER_KEY);
    var screenX = event.clientX - attributionPreviewDrag.startClientX;
    var screenY = event.clientY - attributionPreviewDrag.startClientY;
    var localX = screenX * attributionPreviewDrag.cosine + screenY * attributionPreviewDrag.sine;
    var localY = -screenX * attributionPreviewDrag.sine + screenY * attributionPreviewDrag.cosine;
    placement.x = clamp(attributionPreviewDrag.startX + localX / attributionPreviewDrag.width * 100, -100, 100);
    placement.y = clamp(attributionPreviewDrag.startY + localY / attributionPreviewDrag.height * 100, -100, 100);
    render();
    event.preventDefault();
  });
  function finishAttributionPreviewDrag(event) {
    if (!attributionPreviewDrag || attributionPreviewDrag.pointerId !== event.pointerId) return;
    attributionPreviewDrag = null;
    finishEdit();
  }
  $("#ticketAttributionPreview").addEventListener("pointerup", finishAttributionPreviewDrag);
  $("#ticketAttributionPreview").addEventListener("pointercancel", finishAttributionPreviewDrag);
  ticket.addEventListener("pointermove", function (event) {
    if (drag && drag.portal) pointerLayerMove(event);
  });
  ticket.addEventListener("pointerup", function (event) {
    if (drag && drag.portal) pointerLayerUp(event);
  });
  ticket.addEventListener("pointercancel", function (event) {
    if (drag && drag.portal) pointerLayerUp(event);
  });

  $("#undoBtn").addEventListener("click", undo);
  $("#redoBtn").addEventListener("click", redo);

  $("#playBtn").addEventListener("click", function () {
    if (state.template === "postcard" || isBothView(state)) return;
    if (state.motion === "none") { showToast("정지 상태로 표시 중입니다."); return; }
    state.selectedLayer = "";
    if (state.motion === "flip") {
      if (flipPhase) return;
      history.push(clone(state));
      if (history.length > 40) history.shift();
      future = [];
      var half = Math.max(120, Math.round(state.duration / 2));
      flipPhase = "flip-out";
      render();
      setTimeout(function () {
        state.side = state.side === "front" ? "back" : "front";
        state.selectedLayer = "";
        flipPhase = "flip-reset";
        render();
        void ticket.offsetWidth;
        requestAnimationFrame(function () {
          flipPhase = "flip-in";
          render();
          setTimeout(function () { flipPhase = ""; render(); }, half + 30);
        });
      }, half);
      return;
    }
    animateFade = false;
    render();
    void ticket.offsetWidth;
    animateFade = true;
    render();
    setTimeout(function () { animateFade = false; render(); }, state.duration + 40);
  });

  function serializedBlock(key, assetPaths) {
    var block = state.blocks[key];
    var imageSource = effectiveBlockImageSource(key, block);
    return {
      color: blockColorForKey(key, state),
      image: imageSource ? (assetPaths ? (assetPaths[key] || imageSource) : imageSource) : null,
      tintMode: block.tintMode,
      fit: block.fit,
      zoom: block.zoom,
      panX: block.panX,
      panY: block.panY,
      effect: clone(block.effect || defaultEffect())
    };
  }

  function serializedCustomLayers(side, assetPaths) {
    return (state.customLayers && state.customLayers[side] || []).map(function (item) {
      var layer = clone(item);
      if (customLayerCanStoreImage(layer)) {
        layer.image = layer.imageData ? (assetPaths && assetPaths[layer.id] ? assetPaths[layer.id] : layer.imageData) : null;
        delete layer.imageData;
      }
      return layer;
    });
  }

  function serializedPlacements(side) {
    var placements = clone(state.placements && state.placements[side] || {});
    if (state.template !== "train" || side !== "back") return placements;
    TRAIN_MIRRORED_COUPON_LAYERS.forEach(function (key) {
      if (state.placements.front && state.placements.front[key]) placements[key] = clone(state.placements.front[key]);
      else delete placements[key];
    });
    return placements;
  }

  function serializedFaceStyleStore(store) {
    var serialized = clone(store || { front: {}, back: {} });
    serialized.front = serialized.front || {};
    serialized.back = serialized.back || {};
    if (state.template !== "train") return serialized;
    TRAIN_MIRRORED_COUPON_LAYERS.forEach(function (key) {
      if (serialized.front[key]) serialized.back[key] = clone(serialized.front[key]);
      else delete serialized.back[key];
    });
    return serialized;
  }

  function cinemaRecordPayload() {
    if (state.template !== "cinema") return null;
    return {
      directorLabel: state.botLabel,
      director: state.postcardPrompt,
      castLabel: state.personaLabel,
      cast: cinemaCastText(),
      etcLabel: state.cinemaEtcLabel,
      etc: state.postcardModel,
      theaterLabel: state.backNoteLabel,
      theater: state.backNote,
      screenLabel: state.serialLabel,
      screen: state.serial,
      seatLabel: state.sourceLabel,
      seat: state.source
    };
  }

  function ticketPayload(assetPaths) {
    var config = templateConfig(state.template);
    var backBlocks = {
      main: serializedBlock("backMain", assetPaths),
      stub: serializedBlock(state.template === "train" ? "frontStub" : "backStub", assetPaths)
    };
    if (state.template === "train") backBlocks.logo = serializedBlock("frontStub", assetPaths);
    return {
      packageVersion: 14,
      compositeTextLayerVersion: COMPOSITE_TEXT_LAYER_VERSION,
      templateId: config.templateId,
      templateVersion: config.templateVersion,
      faces: {
        front: { text: { kicker: state.kicker, title: resolvedFrontTitle(), subtitle: state.subtitle, botLabel: state.botLabel, botName: state.botName, personaLabel: state.personaLabel, personaName: state.personaName, dateLabel: state.dateLabel, date: state.date, routeFrom: state.routeFrom, routeTo: state.routeTo, routeIndex: state.routeIndex, sealText: state.sealText, coachLabel: state.coachLabel, coachNumber: state.coachNumber, stubTopline: state.stubTopline, admitText: state.admitText, stubTitle: state.stubTitle, platformText: state.platformText, validationText: state.validationText, barcode: state.barcode, quote: state.quote, speaker: state.speaker, handwrittenNote: state.handwrittenNote, sourceLabel: state.sourceLabel, source: state.source, serialLabel: state.serialLabel, serial: state.serial, serialCopyLabel: state.serialCopyLabel, serialCopy: state.serial }, blocks: { main: serializedBlock("frontMain", assetPaths), stub: serializedBlock("frontStub", assetPaths) }, customLayers: serializedCustomLayers("front", assetPaths), layout: clone(state.layouts.front), placements: serializedPlacements("front") },
        back: { text: { kicker: state.template === "train" ? state.kicker : state.backKicker, heading: state.template === "train" ? resolvedFrontTitle() : state.backHeading, subtitle: state.subtitle, botLabel: state.botLabel, botName: state.botName, personaLabel: state.personaLabel, personaName: state.personaName, dateLabel: state.dateLabel, date: state.date, postcardCardTitle: state.postcardCardTitle, postcardCardSubtitle: state.postcardCardSubtitle, postcardModelLabel: state.postcardModelLabel, postcardModel: state.postcardModel, postcardPromptLabel: state.postcardPromptLabel, postcardPrompt: state.postcardPrompt, postcardWritingLines: [state.postcardWriting1, state.postcardWriting2, state.postcardWriting3, state.postcardWriting4], routeFrom: state.backRouteFrom, routeTo: state.backRouteTo, copyLabel: state.backCopyLabel, title: state.backTitle, body: state.backBody, backNoteLabel: state.backNoteLabel, note: state.backNote, sourceLabel: state.sourceLabel, source: state.source, coachLabel: state.coachLabel, coachNumber: state.coachNumber, stubTopline: state.stubTopline, admitText: state.admitText, stubTitle: state.stubTitle, platformText: state.platformText, barcode: state.template === "train" ? state.barcode : state.backBarcode, serialLabel: state.serialLabel, serial: state.serial, serialCopyLabel: state.serialCopyLabel, serialCopy: state.serial, ratingLabel: state.ratingLabel, ratingMark: state.ratingMark, ratingScore: state.ratingScore, cinemaEtcLabel: state.cinemaEtcLabel }, record: cinemaRecordPayload(), blocks: backBlocks, customLayers: serializedCustomLayers("back", assetPaths), layout: clone(state.layouts.back), placements: serializedPlacements("back") }
      },
      style: { quoteColor: state.quoteColor, quoteEffect: state.quoteEffect, accentColor: state.accent, mutedColor: state.muted, font: state.font, layerStyles: serializedFaceStyleStore(state.layerStyles), inlineTextVersion: INLINE_TEXT_STYLE_VERSION, inlineTextStyles: serializedFaceStyleStore(state.inlineTextStyles), textTypingStyles: serializedFaceStyleStore(state.textTypingStyles), material: state.texture && state.template !== "cinema" ? { id: "paper-fiber-v2", version: 2, asset: "template://textures/ticket-paper-fiber-v2.png", strength: state.textureStrength } : null },
      effects: { mode: "per-image", version: 1 },
      layers: {
        order: clone(layerOrderFor(state.side, state).filter(function (key) { return key !== "route-copy" && key !== "route-index"; })),
        orders: clone(state.layerOrders),
        hidden: state.hidden,
        locked: state.locked,
        clipping: state.clipping,
        shadows: clone(state.sideShadows),
        legacyCompositeTransforms: clone(state.legacyCompositeTransforms)
      },
      view: { mode: state.postcardViewMode, topSide: state.postcardTopSide, activeSide: state.side },
      motion: exportedMotion()
    };
  }

  function safeName(name) { return String(name || "").replace(/[\\/:*?"<>|]/g, "-"); }
  function exportTimestamp(date) {
    var value = date instanceof Date ? date : new Date();
    function pad(number, size) { return String(number).padStart(size || 2, "0"); }
    return value.getFullYear() + pad(value.getMonth() + 1) + pad(value.getDate()) + "-"
      + pad(value.getHours()) + pad(value.getMinutes()) + pad(value.getSeconds()) + "-" + pad(value.getMilliseconds(), 3);
  }
  function exportFileStem(template, date) {
    return safeName("memorial-log-" + safeTemplateId(template) + "-" + exportTimestamp(date));
  }
  function exportedMotion() {
    if (isBothView(state)) return { id: "none", version: 1, durationMs: 0, staticSide: state.postcardTopSide };
    if (state.motion === "flip") return { id: "ticket-flip-v1", version: 1, durationMs: state.duration, staticSide: state.side };
    if (state.motion === "fade") return { id: "ticket-fade-in-v1", version: 1, durationMs: state.duration, staticSide: state.side };
    return { id: "none", version: 1, durationMs: 0, staticSide: state.side };
  }
  function editableJsonPayload() {
    var payload = ticketPayload();
    var documentState = clone(state);
    var documents = {};
    documents[state.template] = documentState;
    removeImageDataFromDocuments(documents);
    payload.editor = {
      format: "log-ticket-editor-document",
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      template: state.template,
      document: documentState
    };
    payload.editorDigest = editorDocumentDigest(documentState);
    payload.editorDigestAlgorithm = "fnv1a32-utf16-v1";
    return payload;
  }
  function editorDocumentDigest(value) {
    var input = JSON.stringify(value);
    var hash = 2166136261;
    for (var index = 0; index < input.length; index++) hash = Math.imul(hash ^ input.charCodeAt(index), 16777619) >>> 0;
    return ("00000000" + hash.toString(16)).slice(-8);
  }
  function isPlainJsonObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }
  function validateImportedJsonTree(value, depth, budget) {
    if (depth > 80) throw new Error("JSON 구조가 너무 깊습니다.");
    if (!value || typeof value !== "object") return;
    budget.count++;
    if (budget.count > 100000) throw new Error("JSON 항목이 너무 많습니다.");
    Object.keys(value).forEach(function (key) {
      if (key === "__proto__" || key === "prototype" || key === "constructor") {
        throw new Error("안전하지 않은 JSON 키가 포함되어 있습니다.");
      }
      if (typeof value[key] === "string" && key !== "image" && key !== "imageData" && value[key].length > 2 * 1024 * 1024) {
        throw new Error("JSON 문자열 항목이 허용 크기를 초과합니다.");
      }
      validateImportedJsonTree(value[key], depth + 1, budget);
    });
  }
  function templateFromExportPayload(payload) {
    var template = TEMPLATE_IDS.find(function (candidate) {
      return TEMPLATE_CONFIG[candidate].templateId === payload.templateId;
    });
    if (!template) throw new Error("지원하지 않는 템플릿 JSON입니다.");
    var packageVersion = Number(payload.packageVersion);
    if (!Number.isInteger(packageVersion) || packageVersion < 1 || packageVersion > 14) {
      throw new Error("지원하지 않는 편집 데이터 버전입니다.");
    }
    var templateVersion = Number(payload.templateVersion);
    if (!Number.isInteger(templateVersion) || templateVersion < 1 || templateVersion > TEMPLATE_CONFIG[template].templateVersion) {
      throw new Error("현재 편집기보다 새로운 템플릿 데이터입니다.");
    }
    if (!isPlainJsonObject(payload.faces) || !isPlainJsonObject(payload.faces.front) || !isPlainJsonObject(payload.faces.back)) {
      throw new Error("FRONT/BACK 편집 데이터가 없습니다.");
    }
    return template;
  }
  function importedImageData(value, label) {
    if (value == null || value === "") return "";
    if (typeof value !== "string") throw new Error(label + " 이미지 데이터가 올바르지 않습니다.");
    if (/^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value)) {
      var comma = value.indexOf(",");
      var raw = value.slice(comma + 1).replace(/\s/g, "");
      if (!raw || raw.length > 171 * 1024 * 1024 || raw.length % 4 !== 0) {
        throw new Error(label + " 이미지 데이터 크기가 올바르지 않습니다.");
      }
      try {
        var decoded = window.atob(raw);
        var normalized = window.btoa(decoded).replace(/=+$/, "");
        if (normalized !== raw.replace(/=+$/, "")) throw new Error("invalid base64");
      } catch (error) {
        throw new Error(label + " 이미지 Base64가 손상되었습니다.");
      }
      return value;
    }
    if (/^(?:assets\/|\.\.?\/|https?:\/\/|blob:|file:)/i.test(value)) {
      throw new Error(label + " 이미지가 외부 경로를 가리킵니다. 이미지가 포함된 JSON을 불러와 주세요.");
    }
    throw new Error(label + " 이미지 형식을 지원하지 않습니다.");
  }
  function importedImageMime(dataUrl) {
    var match = /^data:(image\/(?:png|jpe?g|webp|gif));base64,/i.exec(dataUrl || "");
    return match ? match[1].toLowerCase().replace("image/jpg", "image/jpeg") : "";
  }
  function applyImportedBlockImage(block, serialized, label, keepBundledLogo) {
    if (!block || !isPlainJsonObject(serialized)) return;
    var imageData = importedImageData(serialized.image, label);
    if (!imageData || keepBundledLogo) return;
    block.imageData = imageData;
    block.imageAssetStored = true;
    block.imageType = importedImageMime(imageData);
    block.imageName = block.imageName || label.toLowerCase().replace(/\s+/g, "-") + ".png";
  }
  function importedCustomLayers(layers, side) {
    if (!Array.isArray(layers)) return [];
    return layers.map(function (item, index) {
      if (!isPlainJsonObject(item)) return item;
      var layer = clone(item);
      if (customLayerCanStoreImage(layer)) {
        var imageData = importedImageData(layer.image, "사용자 레이어 " + (index + 1));
        delete layer.image;
        if (imageData) {
          layer.imageData = imageData;
          layer.imageAssetStored = true;
          layer.imageType = layer.imageType || importedImageMime(imageData);
          layer.imageName = layer.imageName || "imported-layer-" + (index + 1) + ".png";
        }
      }
      layer.side = side;
      return layer;
    });
  }
  function assignImportedText(target, source, mapping) {
    if (!isPlainJsonObject(source)) return;
    Object.keys(mapping).forEach(function (sourceKey) {
      if (Object.prototype.hasOwnProperty.call(source, sourceKey)) target[mapping[sourceKey]] = source[sourceKey];
    });
  }
  function applyImportedLayerPresentation(documentState, layers) {
    if (!isPlainJsonObject(layers)) return documentState;
    if (Array.isArray(layers.order)) documentState.layerOrder = clone(layers.order);
    if (isPlainJsonObject(layers.orders)) documentState.layerOrders = clone(layers.orders);
    else if (Array.isArray(layers.order)) delete documentState.layerOrders;
    if (Array.isArray(layers.hidden)) documentState.hidden = clone(layers.hidden);
    if (Array.isArray(layers.locked)) documentState.locked = clone(layers.locked);
    if (Array.isArray(layers.clipping)) documentState.clipping = clone(layers.clipping);
    if (isPlainJsonObject(layers.legacyCompositeTransforms)) {
      documentState.legacyCompositeTransforms = clone(layers.legacyCompositeTransforms);
    }
    if (isPlainJsonObject(layers.shadows)) {
      if (isPlainJsonObject(layers.shadows.front) || isPlainJsonObject(layers.shadows.back)) {
        documentState.sideShadows = clone(layers.shadows);
      } else {
        documentState.shadows = clone(layers.shadows);
        delete documentState.sideShadows;
      }
    }
    return documentState;
  }
  function exportedPayloadHasSplitCompositeLayers(payload, template) {
    var targetKeys = [];
    var splitMap = compositeTextSplitMap(template);
    Object.keys(splitMap).forEach(function (sourceKey) {
      splitMap[sourceKey].forEach(function (targetKey) {
        if (targetKeys.indexOf(targetKey) < 0) targetKeys.push(targetKey);
      });
    });
    var layers = isPlainJsonObject(payload.layers) ? payload.layers : {};
    var orders = [];
    if (Array.isArray(layers.order)) orders = orders.concat(layers.order);
    if (isPlainJsonObject(layers.orders)) {
      ["front", "back"].forEach(function (side) {
        if (Array.isArray(layers.orders[side])) orders = orders.concat(layers.orders[side]);
      });
    }
    if (orders.some(function (key) { return targetKeys.indexOf(key) >= 0; })) return true;
    return ["front", "back"].some(function (side) {
      var face = payload.faces && payload.faces[side];
      var placements = face && isPlainJsonObject(face.placements) ? face.placements : {};
      return targetKeys.some(function (key) { return Object.prototype.hasOwnProperty.call(placements, key); });
    });
  }
  function documentFromLegacyExportPayload(payload, template) {
    var documentState = createTemplateDefaults(template);
    /* Old package payloads need the split migration. Packages produced after
       the split already contain target layer keys; do not copy a value-only
       hidden/locked/clipped state back onto its independent label. */
    documentState.compositeTextLayerVersion = finiteNumber(payload.compositeTextLayerVersion, 0) >= COMPOSITE_TEXT_LAYER_VERSION
      || exportedPayloadHasSplitCompositeLayers(payload, template)
      ? COMPOSITE_TEXT_LAYER_VERSION : 0;
    var front = payload.faces.front || {};
    var back = payload.faces.back || {};
    assignImportedText(documentState, front.text, {
      kicker: "kicker", title: "title", subtitle: "subtitle", botLabel: "botLabel", botName: "botName",
      personaLabel: "personaLabel", personaName: "personaName", dateLabel: "dateLabel", date: "date",
      routeFrom: "routeFrom", routeTo: "routeTo", routeIndex: "routeIndex", sealText: "sealText",
      coachLabel: "coachLabel", coachNumber: "coachNumber", stubTopline: "stubTopline", admitText: "admitText",
      stubTitle: "stubTitle", platformText: "platformText", validationText: "validationText", barcode: "barcode",
      quote: "quote", speaker: "speaker", handwrittenNote: "handwrittenNote",
      sourceLabel: "sourceLabel", source: "source", serialLabel: "serialLabel", serial: "serial", serialCopyLabel: "serialCopyLabel"
    });
    assignImportedText(documentState, back.text, {
      kicker: "backKicker", heading: "backHeading", botLabel: "botLabel", botName: "botName",
      personaLabel: "personaLabel", personaName: "personaName", dateLabel: "dateLabel", date: "date",
      postcardCardTitle: "postcardCardTitle", postcardCardSubtitle: "postcardCardSubtitle",
      postcardModelLabel: "postcardModelLabel", postcardModel: "postcardModel",
      postcardPromptLabel: "postcardPromptLabel", postcardPrompt: "postcardPrompt",
      routeFrom: "backRouteFrom", routeTo: "backRouteTo", copyLabel: "backCopyLabel", title: "backTitle",
      body: "backBody", backNoteLabel: "backNoteLabel", note: "backNote", sourceLabel: "sourceLabel", source: "source", coachLabel: "coachLabel", coachNumber: "coachNumber",
      stubTopline: "stubTopline", admitText: "admitText", stubTitle: "stubTitle", platformText: "platformText",
      barcode: "backBarcode", serialLabel: "serialLabel", serial: "serial", serialCopyLabel: "serialCopyLabel",
      ratingLabel: "ratingLabel", ratingMark: "ratingMark", ratingScore: "ratingScore", cinemaEtcLabel: "cinemaEtcLabel"
    });
    if (back.text && Array.isArray(back.text.postcardWritingLines)) {
      ["postcardWriting1", "postcardWriting2", "postcardWriting3", "postcardWriting4"].forEach(function (key, index) {
        if (index < back.text.postcardWritingLines.length) documentState[key] = back.text.postcardWritingLines[index];
      });
    }
    if (isPlainJsonObject(back.record)) {
      assignImportedText(documentState, back.record, {
        directorLabel: "botLabel", director: "postcardPrompt", castLabel: "personaLabel",
        etcLabel: "cinemaEtcLabel", etc: "postcardModel", theaterLabel: "backNoteLabel", theater: "backNote",
        screenLabel: "serialLabel", screen: "serial", seatLabel: "sourceLabel", seat: "source"
      });
    }
    function importBlock(serialized, key, label) {
      if (!isPlainJsonObject(serialized)) return;
      ["color", "tintMode", "fit", "zoom", "panX", "panY", "effect"].forEach(function (property) {
        if (Object.prototype.hasOwnProperty.call(serialized, property)) documentState.blocks[key][property] = clone(serialized[property]);
      });
      applyImportedBlockImage(documentState.blocks[key], serialized, label, false);
    }
    importBlock(front.blocks && front.blocks.main, "frontMain", "FRONT MAIN");
    importBlock(front.blocks && front.blocks.stub, "frontStub", "FRONT STUB");
    importBlock(back.blocks && back.blocks.main, "backMain", "BACK MAIN");
    if (template !== "train") importBlock(back.blocks && back.blocks.stub, "backStub", "BACK STUB");
    documentState.customLayers = {
      front: importedCustomLayers(front.customLayers, "front"),
      back: importedCustomLayers(back.customLayers, "back")
    };
    if (isPlainJsonObject(front.layout)) documentState.layouts.front = clone(front.layout);
    if (isPlainJsonObject(back.layout)) documentState.layouts.back = clone(back.layout);
    if (isPlainJsonObject(front.placements)) documentState.placements.front = clone(front.placements);
    if (isPlainJsonObject(back.placements)) documentState.placements.back = clone(back.placements);
    if (isPlainJsonObject(payload.style)) {
      if (payload.style.quoteColor != null) documentState.quoteColor = payload.style.quoteColor;
      if (payload.style.quoteEffect != null) documentState.quoteEffect = payload.style.quoteEffect;
      if (payload.style.accentColor != null) documentState.accent = payload.style.accentColor;
      if (payload.style.mutedColor != null) documentState.muted = payload.style.mutedColor;
      if (payload.style.font != null) documentState.font = payload.style.font;
      if (isPlainJsonObject(payload.style.layerStyles)) documentState.layerStyles = clone(payload.style.layerStyles);
      if (isPlainJsonObject(payload.style.inlineTextStyles)) documentState.inlineTextStyles = clone(payload.style.inlineTextStyles);
      if (isPlainJsonObject(payload.style.textTypingStyles)) documentState.textTypingStyles = clone(payload.style.textTypingStyles);
      documentState.texture = Boolean(payload.style.material);
      if (payload.style.material && payload.style.material.strength != null) documentState.textureStrength = payload.style.material.strength;
    }
    applyImportedLayerPresentation(documentState, payload.layers);
    if (isPlainJsonObject(payload.view)) {
      if (payload.view.activeSide === "front" || payload.view.activeSide === "back") documentState.side = payload.view.activeSide;
      if (["front", "back", "both"].indexOf(payload.view.mode) >= 0) documentState.postcardViewMode = payload.view.mode;
      if (payload.view.topSide === "front" || payload.view.topSide === "back") documentState.postcardTopSide = payload.view.topSide;
    }
    if (isPlainJsonObject(payload.motion)) {
      documentState.motion = payload.motion.id === "ticket-flip-v1" ? "flip" : payload.motion.id === "ticket-fade-in-v1" ? "fade" : "none";
      if (payload.motion.durationMs != null) documentState.duration = payload.motion.durationMs;
    }
    documentState.template = template;
    return normalizeDocument(documentState, template);
  }
  function hydrateEditorDocumentImages(documentState, payload, template) {
    var next = clone(documentState);
    next.blocks = next.blocks && typeof next.blocks === "object" ? next.blocks : {};
    next.customLayers = next.customLayers && typeof next.customLayers === "object" ? next.customLayers : { front: [], back: [] };
    var front = payload.faces.front || {};
    var back = payload.faces.back || {};
    [
      { key: "frontMain", source: front.blocks && front.blocks.main, label: "FRONT MAIN" },
      { key: "frontStub", source: front.blocks && front.blocks.stub, label: "FRONT STUB" },
      { key: "backMain", source: back.blocks && back.blocks.main, label: "BACK MAIN" },
      { key: "backStub", source: back.blocks && back.blocks.stub, label: "BACK STUB" }
    ].forEach(function (entry) {
      if (template === "train" && entry.key === "backStub") return;
      var block = next.blocks[entry.key];
      if (!block) return;
      var bundledTrainLogo = template === "train" && entry.key === "frontStub"
        && block.imageAssetStored !== true && block.imageName === "train-travel-logo-v4.png";
      applyImportedBlockImage(block, entry.source, entry.label, bundledTrainLogo);
      if (!bundledTrainLogo && blockReferencesImageAsset(template, entry.key, block) && !block.imageData) {
        throw new Error(entry.label + " 원본 이미지가 JSON에 포함되어 있지 않습니다.");
      }
    });
    ["front", "back"].forEach(function (side) {
      var runtimeLayers = (payload.faces[side] && payload.faces[side].customLayers) || [];
      var runtimeById = {};
      if (Array.isArray(runtimeLayers)) runtimeLayers.forEach(function (item) { if (item && item.id) runtimeById[item.id] = item; });
      var sourceLayers = Array.isArray(next.customLayers[side]) ? next.customLayers[side] : [];
      sourceLayers.forEach(function (item, index) {
        if (!customLayerCanStoreImage(item) || item.type === "shape" && item.fillMode !== "image") return;
        var runtime = runtimeById[item.id] || {};
        var imageData = importedImageData(runtime.image, "사용자 레이어 " + (index + 1));
        if (imageData) {
          item.imageData = imageData;
          item.imageAssetStored = true;
          item.imageType = item.imageType || importedImageMime(imageData);
          item.imageName = item.imageName || "imported-layer-" + (index + 1) + ".png";
        } else if (metadataReferencesImageAsset(item)) {
          throw new Error("사용자 레이어 " + (index + 1) + " 원본 이미지가 JSON에 포함되어 있지 않습니다.");
        }
      });
    });
    next.template = template;
    return normalizeDocument(next, template);
  }
  function validateRawImportedDocumentImages(documentState, template) {
    Object.keys(documentState.blocks || {}).forEach(function (key) {
      var block = documentState.blocks[key];
      if (!block) return;
      var imageData = importedImageData(block.imageData, template + " " + key);
      if (imageData) block.imageData = imageData;
      var bundledTrainLogo = template === "train" && key === "frontStub"
        && block.imageAssetStored !== true && block.imageName === "train-travel-logo-v4.png";
      if (!bundledTrainLogo && blockReferencesImageAsset(template, key, block) && !imageData) {
        throw new Error(template + " " + key + " 원본 이미지가 JSON에 포함되어 있지 않습니다.");
      }
    });
    ["front", "back"].forEach(function (side) {
      (((documentState.customLayers || {})[side]) || []).forEach(function (item, index) {
        if (!customLayerCanStoreImage(item) || item.type === "shape" && item.fillMode !== "image") return;
        var imageData = importedImageData(item.imageData, template + " 사용자 레이어 " + (index + 1));
        if (imageData) item.imageData = imageData;
        if (metadataReferencesImageAsset(item) && !imageData) {
          throw new Error(template + " 사용자 레이어 " + (index + 1) + " 원본 이미지가 JSON에 포함되어 있지 않습니다.");
        }
      });
    });
    return documentState;
  }
  function normalizeImportedEditorPayload(payload) {
    if (!isPlainJsonObject(payload)) throw new Error("JSON 최상위 값은 객체여야 합니다.");
    validateImportedJsonTree(payload, 0, { count: 0 });
    var currentDocuments = statePackage(false).documents;
    var importedDocuments = {};
    var activeTemplate;
    if (isPlainJsonObject(payload.documents)) {
      var sourceVersion = Number(payload.version);
      if (!Number.isInteger(sourceVersion) || sourceVersion < 1 || sourceVersion > DESIGN_VERSION) {
        throw new Error("지원하지 않는 편집 문서 버전입니다.");
      }
      activeTemplate = safeTemplateId(payload.activeTemplate);
      if (payload.activeTemplate !== activeTemplate || !isPlainJsonObject(payload.documents[activeTemplate])) {
        throw new Error("활성 템플릿 문서가 없습니다.");
      }
      TEMPLATE_IDS.forEach(function (template) {
        if (!Object.prototype.hasOwnProperty.call(payload.documents, template)) return;
        if (!isPlainJsonObject(payload.documents[template])) throw new Error(template + " 문서가 올바르지 않습니다.");
        var rawDocument = validateRawImportedDocumentImages(clone(payload.documents[template]), template);
        importedDocuments[template] = normalizeDocument(rawDocument, template);
      });
    } else {
      var template = templateFromExportPayload(payload);
      activeTemplate = template;
      if (payload.editor != null) {
        if (!isPlainJsonObject(payload.editor)
          || payload.editor.format !== "log-ticket-editor-document"
          || Number(payload.editor.schemaVersion) !== 1
          || payload.editor.template !== template
          || payload.editorDigestAlgorithm !== "fnv1a32-utf16-v1"
          || !isPlainJsonObject(payload.editor.document)) {
          throw new Error("편집 데이터 스키마가 올바르지 않습니다.");
        }
        if (typeof payload.editorDigest !== "string" || payload.editorDigest !== editorDocumentDigest(payload.editor.document)) {
          throw new Error("편집 데이터 검증값이 일치하지 않습니다.");
        }
        importedDocuments[template] = hydrateEditorDocumentImages(payload.editor.document, payload, template);
      } else {
        function assertLegacyCustomImagesEmbedded(layers, side) {
          if (!Array.isArray(layers)) return;
          layers.forEach(function (item, index) {
            if (!item || typeof item !== "object") return;
            if (item.type !== "image" && !(item.type === "shape" && item.fillMode === "image")) return;
            if (!item.image) throw new Error(side.toUpperCase() + " 사용자 레이어 " + (index + 1) + " 원본 이미지가 없습니다.");
          });
        }
        assertLegacyCustomImagesEmbedded(payload.faces.front.customLayers, "front");
        assertLegacyCustomImagesEmbedded(payload.faces.back.customLayers, "back");
        importedDocuments[template] = documentFromLegacyExportPayload(payload, template);
      }
    }
    var mergedDocuments = {};
    TEMPLATE_IDS.forEach(function (template) {
      mergedDocuments[template] = importedDocuments[template]
        ? clone(importedDocuments[template])
        : clone(currentDocuments[template] || createTemplateDefaults(template));
    });
    return { activeTemplate: activeTemplate, documents: mergedDocuments, importedDocuments: importedDocuments };
  }
  function importedImageAssetRecords(documents) {
    var records = [];
    Object.keys(documents || {}).forEach(function (template) {
      var documentState = documents[template];
      Object.keys(documentState.blocks || {}).forEach(function (key) {
        var block = documentState.blocks[key];
        if (!block) return;
        var bundledTrainLogo = template === "train" && key === "frontStub"
          && block.imageData === window.LOG_TICKET_TRAIN_LOGO_ASSET
          && block.imageAssetStored !== true
          && block.imageName === "train-travel-logo-v4.png";
        if (bundledTrainLogo) return;
        if (!block.imageData) {
          if (blockReferencesImageAsset(template, key, block)) throw new Error(template + " " + key + " 원본 이미지가 없습니다.");
          return;
        }
        block.imageAssetStored = true;
        records.push({
          id: imageBlockAssetId(template, key), data: block.imageData,
          name: block.imageName || "", type: block.imageType || importedImageMime(block.imageData), tintMode: block.tintMode || "none"
        });
      });
      ["front", "back"].forEach(function (side) {
        (((documentState.customLayers || {})[side]) || []).forEach(function (item) {
          if (!customLayerCanStoreImage(item) || item.type === "shape" && item.fillMode !== "image") return;
          if (!item.imageData) {
            if (metadataReferencesImageAsset(item)) throw new Error(template + " 사용자 이미지 원본이 없습니다.");
            return;
          }
          item.imageAssetStored = true;
          records.push({
            id: imageCustomAssetId(template, side, item.id), data: item.imageData,
            name: item.imageName || "", type: item.imageType || importedImageMime(item.imageData)
          });
        });
      });
    });
    return records;
  }
  function persistImportedImageAssets(documents) {
    var records;
    try { records = importedImageAssetRecords(documents); } catch (error) { return Promise.reject(error); }
    if (!records.length) return Promise.resolve({ saved: 0, rollback: function () { return Promise.resolve(); } });
    if (!window.indexedDB) return Promise.reject(imageAssetSaveError(imageAssetBlockedError()));
    return openImageAssetDb().then(function (db) {
      if (!db) throw imageAssetSaveError(imageAssetDbOpenError);
      var ids = {};
      records.forEach(function (record) { ids[record.id] = true; });
      return new Promise(function (resolve, reject) {
        var request;
        try { request = db.transaction(IMAGE_ASSET_STORE, "readonly").objectStore(IMAGE_ASSET_STORE).getAll(); }
        catch (error) { reject(imageAssetSaveError(error)); return; }
        request.onsuccess = function () {
          var previous = {};
          (request.result || []).forEach(function (record) { if (record && ids[record.id]) previous[record.id] = record; });
          var transaction;
          var failure = null;
          try {
            transaction = db.transaction(IMAGE_ASSET_STORE, "readwrite");
            records.forEach(function (record) {
              var putRequest = transaction.objectStore(IMAGE_ASSET_STORE).put(record);
              putRequest.onerror = function () { failure = putRequest.error || failure; };
            });
          } catch (error) {
            reject(imageAssetSaveError(error));
            return;
          }
          transaction.oncomplete = function () {
            resolve({
              saved: records.length,
              rollback: function () {
                return new Promise(function (rollbackResolve, rollbackReject) {
                  var rollbackTransaction;
                  try {
                    rollbackTransaction = db.transaction(IMAGE_ASSET_STORE, "readwrite");
                    var store = rollbackTransaction.objectStore(IMAGE_ASSET_STORE);
                    records.forEach(function (record) {
                      if (previous[record.id]) store.put(previous[record.id]);
                      else store.delete(record.id);
                    });
                  } catch (error) { rollbackReject(imageAssetSaveError(error)); return; }
                  rollbackTransaction.oncomplete = function () { rollbackResolve(); };
                  rollbackTransaction.onerror = rollbackTransaction.onabort = function () {
                    rollbackReject(imageAssetSaveError(rollbackTransaction.error));
                  };
                });
              }
            });
          };
          transaction.onerror = transaction.onabort = function () {
            reject(imageAssetSaveError(failure || transaction.error));
          };
        };
        request.onerror = function () { reject(imageAssetSaveError(request.error)); };
      });
    });
  }
  async function applyImportedEditorPayload(imported) {
    var previousState = state;
    var previousDocuments = templateDocuments;
    var previousHistory = history;
    var previousFuture = future;
    var previousEditSnapshot = editSnapshot;
    var previousMultiSelection = multiSelectedLayerKeys;
    var previousMultiSide = multiSelectionSide;
    var previousMultiStateRef = multiSelectionStateRef;
    var previousTrackedSelection = trackedTextSelection;
    var previousSuspendAutoSave = suspendAutoSave;
    var importedAssetTransaction = null;
    clearTimeout(saveTimer);
    /* Cancel not only the pending debounce, but also an autosave that may be
       awaiting IndexedDB. Otherwise its stale orphan-prune pass could race the
       imported document's image transaction. */
    saveRequestId += 1;
    suspendAutoSave = true;
    try {
      importedAssetTransaction = await persistImportedImageAssets(imported.importedDocuments);
      templateDocuments = imported.documents;
      state = clone(templateDocuments[imported.activeTemplate]);
      templateDocuments[imported.activeTemplate] = clone(state);
      history = [];
      future = [];
      editSnapshot = null;
      multiSelectedLayerKeys = [];
      multiSelectionSide = state.side;
      multiSelectionStateRef = state;
      trackedTextSelection = null;
      flipPhase = "";
      animateFade = false;
      hydrateSystemFontRecords();
      render();
      requestAnimationFrame(fitPreview);
    } catch (error) {
      state = previousState;
      templateDocuments = previousDocuments;
      history = previousHistory;
      future = previousFuture;
      editSnapshot = previousEditSnapshot;
      multiSelectedLayerKeys = previousMultiSelection;
      multiSelectionSide = previousMultiSide;
      multiSelectionStateRef = previousMultiStateRef;
      trackedTextSelection = previousTrackedSelection;
      if (importedAssetTransaction) {
        try { await importedAssetTransaction.rollback(); }
        catch (rollbackError) { console.error("Imported image rollback failed", rollbackError); }
      }
      try { render(); }
      catch (restoreError) { console.error("Imported document view rollback failed", restoreError); }
      throw error;
    } finally {
      suspendAutoSave = previousSuspendAutoSave;
      if (!previousSuspendAutoSave) scheduleSave();
    }
    return state.template;
  }
  function readImportedJsonFile(file) {
    if (!file) return Promise.reject(new Error("JSON 파일을 선택해 주세요."));
    if (file.size > 192 * 1024 * 1024) return Promise.reject(new Error("JSON 파일이 192MB를 초과합니다."));
    if (file.name && !/\.json$/i.test(file.name) && file.type !== "application/json") {
      return Promise.reject(new Error("JSON 파일만 불러올 수 있습니다."));
    }
    if (typeof file.text === "function") return file.text();
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { reject(reader.error || new Error("JSON 파일을 읽지 못했습니다.")); };
      reader.readAsText(file, "utf-8");
    });
  }
  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var downloadDocument = document;
    var anchor = null;
    try {
      if (window.top && window.top !== window && window.top.document) downloadDocument = window.top.document;
    } catch (_) {
      downloadDocument = document;
    }
    try {
      anchor = downloadDocument.createElement("a");
      anchor.href = url;
      anchor.download = name;
      anchor.style.display = "none";
      (downloadDocument.body || downloadDocument.documentElement).appendChild(anchor);
      anchor.click();
    } catch (error) {
      if (anchor) anchor.remove();
      anchor = null;
      if (downloadDocument === document) {
        URL.revokeObjectURL(url);
        throw error;
      }
      anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      anchor.style.display = "none";
      (document.body || document.documentElement).appendChild(anchor);
      try {
        anchor.click();
      } catch (fallbackError) {
        anchor.remove();
        URL.revokeObjectURL(url);
        throw fallbackError;
      }
    }
    anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    return name;
  }

  function setExportBusy(busy, activeButton) {
    exportInProgress = Boolean(busy);
    document.body.classList.toggle("exporting-download", exportInProgress);
    var appShell = $(".app-shell");
    if (appShell) appShell.inert = exportInProgress;
    exportButtonIds.forEach(function (id) {
      var button = $("#" + id);
      if (!button) return;
      button.disabled = exportInProgress;
      if (exportInProgress && button === activeButton) button.setAttribute("aria-busy", "true");
      else button.removeAttribute("aria-busy");
    });
    var importInput = $("#importJsonInput");
    if (importInput) importInput.disabled = exportInProgress;
  }

  async function beginExport(button) {
    if (exportInProgress) return false;
    setExportBusy(true, button);
    try {
      await imageAssetHydrationPromise;
      if (imageAssetHydrationError) throw imageAssetHydrationError;
      if (!imageAssetsReady) throw new Error("저장된 이미지 준비가 끝나지 않았습니다.");
      return true;
    } catch (error) {
      setExportBusy(false);
      showToast("내보낼 이미지 자료를 준비하지 못했습니다: " + (error && error.message ? error.message : String(error)));
      return false;
    }
  }

  function endExport() {
    setExportBusy(false);
  }

  function loadDataImage(dataUrl) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(new Error("삽입 이미지를 읽지 못했습니다.")); };
      image.src = dataUrl;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      try {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error("이미지 데이터를 변환하지 못했습니다."));
        }, type, quality);
      } catch (error) {
        reject(error);
      }
    });
  }

  function waitForEditorPaint() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () { requestAnimationFrame(resolve); });
    });
  }
  async function createAllViewImageArchive() {
    var exportStateRef = state;
    var exportTemplate = state.template;
    var savedSide = state.side;
    var savedViewMode = state.postcardViewMode;
    var savedSelection = state.selectedLayer;
    var savedMultiSelection = multiSelectedLayerKeys.slice();
    var savedMultiSelectionSide = multiSelectionSide;
    var savedMultiSelectionStateRef = multiSelectionStateRef;
    var savedTrackedTextSelection = trackedTextSelection;
    var savedSuspendAutoSave = suspendAutoSave;
    var savedPostcardExportSide = postcardExportSide;
    var files = {};
    var exportedImageCount = 0;
    var stem = exportFileStem(exportTemplate, new Date());
    var canvas = null;
    clearTimeout(saveTimer);
    suspendAutoSave = true;
    try {
      var views = ["front", "back", "both"];
      for (var index = 0; index < views.length; index++) {
        if (state !== exportStateRef) throw new Error("내보내기 중 문서가 변경되었습니다.");
        var view = views[index];
        showToast("전체 이미지 생성 중 · " + (index + 1) + "/" + views.length);
        state.postcardViewMode = view;
        state.side = view === "both" ? state.postcardTopSide : view;
        state.selectedLayer = "";
        multiSelectedLayerKeys = [];
        trackedTextSelection = null;
        render();
        await waitForEditorPaint();
        canvas = await drawVisibleTicketFromPreview();
        var blob = await canvasToBlob(canvas, "image/png");
        var fileName = safeName(exportTemplate + "-" + view + ".png");
        files[fileName] = new Uint8Array(await blob.arrayBuffer());
        exportedImageCount += 1;
        canvas.width = canvas.height = 1;
        canvas = null;
      }
      return {
        blob: new Blob([makeZip(files)], { type: "application/zip" }),
        name: stem + "-all-images.zip",
        count: exportedImageCount
      };
    } finally {
      if (canvas) canvas.width = canvas.height = 1;
      if (state === exportStateRef) {
        state.side = savedSide;
        state.postcardViewMode = savedViewMode;
        state.selectedLayer = savedSelection;
        multiSelectedLayerKeys = savedMultiSelection;
        multiSelectionSide = savedMultiSelectionSide;
        multiSelectionStateRef = savedMultiSelectionStateRef;
        trackedTextSelection = savedTrackedTextSelection;
      }
      postcardExportSide = savedPostcardExportSide;
      suspendAutoSave = savedSuspendAutoSave;
      if (state === exportStateRef) render();
      if (!savedSuspendAutoSave) scheduleSave();
    }
  }

  async function optimizePackageAssets() {
    var exportStateRef = state;
    var files = {};
    var paths = {};
    var meta = [];
    var keys = Object.keys(state.blocks).filter(function (key) { return Boolean(state.blocks[key].imageData); });
    for (var index = 0; index < keys.length; index++) {
      if (state !== exportStateRef) throw new Error("내보내기 중 문서가 변경되었습니다.");
      var key = keys[index];
      var block = state.blocks[key];
      var image = await loadDataImage(effectiveBlockImageSource(key, block));
      var maxEdge = 1600;
      var ratio = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
      var width = Math.max(1, Math.round(image.naturalWidth * ratio));
      var height = Math.max(1, Math.round(image.naturalHeight * ratio));
      var canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      var context = canvas.getContext("2d", { alpha: true });
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, width, height);
      var blob = await canvasToBlob(canvas, "image/webp", .84);
      canvas.width = canvas.height = 1;
      var extension = blob.type === "image/webp" ? "webp" : "png";
      var base = safeName(block.imageName || "image").replace(/\.[^.]+$/, "") || "image";
      var path = "assets/" + key + "-" + base + "." + extension;
      files[path] = new Uint8Array(await blob.arrayBuffer());
      paths[key] = path;
      meta.push({
        layer: key,
        path: path,
        mime: blob.type || "image/png",
        width: width,
        height: height,
        originalWidth: image.naturalWidth,
        originalHeight: image.naturalHeight,
        bytes: blob.size
      });
    }
    var customImages = (state.customLayers.front || []).concat(state.customLayers.back || []).filter(customLayerHasImageAsset);
    for (var customIndex = 0; customIndex < customImages.length; customIndex++) {
      if (state !== exportStateRef) throw new Error("내보내기 중 문서가 변경되었습다.");
      var custom = customImages[customIndex];
      var customImage = await loadDataImage(custom.imageData);
      var customMaxEdge = 1600;
      var customRatio = Math.min(1, customMaxEdge / Math.max(customImage.naturalWidth, customImage.naturalHeight));
      var customWidth = Math.max(1, Math.round(customImage.naturalWidth * customRatio));
      var customHeight = Math.max(1, Math.round(customImage.naturalHeight * customRatio));
      var customCanvas = document.createElement("canvas");
      customCanvas.width = customWidth;
      customCanvas.height = customHeight;
      var customContext = customCanvas.getContext("2d", { alpha: true });
      customContext.clearRect(0, 0, customWidth, customHeight);
      customContext.imageSmoothingEnabled = true;
      customContext.imageSmoothingQuality = "high";
      customContext.drawImage(customImage, 0, 0, customWidth, customHeight);
      var customBlob = await canvasToBlob(customCanvas, "image/webp", .9);
      customCanvas.width = customCanvas.height = 1;
      var customBase = safeName(custom.imageName || "custom-image").replace(/\.[^.]+$/, "") || "custom-image";
      var customPath = "assets/" + custom.id + "-" + customBase + ".webp";
      files[customPath] = new Uint8Array(await customBlob.arrayBuffer());
      paths[custom.id] = customPath;
      meta.push({ layer: custom.id, path: customPath, mime: customBlob.type || "image/webp", width: customWidth, height: customHeight, originalWidth: customImage.naturalWidth, originalHeight: customImage.naturalHeight, bytes: customBlob.size });
    }
    return { files: files, paths: paths, meta: meta };
  }

  $("#importJsonBtn").addEventListener("click", function () {
    if (exportInProgress) return;
    var input = $("#importJsonInput");
    input.value = "";
    input.click();
  });

  $("#importJsonInput").addEventListener("change", async function (event) {
    var input = event.currentTarget;
    var file = input.files && input.files[0];
    if (!file) return;
    var button = $("#importJsonBtn");
    if (!await beginExport(button)) { input.value = ""; return; }
    try {
      showToast("편집 데이터 확인 중…");
      var text = await readImportedJsonFile(file);
      var parsed;
      try { parsed = JSON.parse(text); }
      catch (error) { throw new Error("JSON 문법이 올바르지 않습니다."); }
      var imported = normalizeImportedEditorPayload(parsed);
      var importedTemplate = await applyImportedEditorPayload(imported);
      showToast(templateConfig(importedTemplate).resetName + " 편집 데이터를 불러왔습니다.");
    } catch (error) {
      console.error("JSON import failed", error);
      showToast("불러오기 실패: " + (error && error.message ? error.message : String(error)) + " 기존 편집 내용은 유지됩니다.");
    } finally {
      input.value = "";
      endExport();
    }
  });

  $("#jsonBtn").addEventListener("click", async function () {
    var button = $("#jsonBtn");
    if (!await beginExport(button)) return;
    try {
      var jsonName = exportFileStem(state.template, new Date()) + "-edit.json";
      download(new Blob([JSON.stringify(editableJsonPayload(), null, 2)], { type: "application/json;charset=utf-8" }), jsonName);
      showToast(jsonName + " 다운로드를 시작했습니다.");
    } catch (error) {
      console.error("JSON export failed", error);
      showToast("JSON export failed: " + (error && error.message ? error.message : String(error)));
    } finally {
      endExport();
    }
  });

  $("#pngBtn").addEventListener("click", async function () {
    var button = $("#pngBtn");
    if (!await beginExport(button)) return;
    var exportTemplate = state.template;
    var exportView = isBothView(state) ? "both" : state.side;
    var canvas = null;
    showToast("고화질 PNG를 만들고 있어요.");
    try {
      canvas = await drawVisibleTicketFromPreview();
      ticket.dataset.lastExportSize = canvas.width + "x" + canvas.height;
      var blob = await canvasToBlob(canvas, "image/png");
      var pngName = exportFileStem(exportTemplate, new Date()) + "-" + exportView + ".png";
      download(blob, pngName);
      showToast(pngName + " 다운로드를 시작했습니다.");
    } catch (error) {
      console.error("PNG export failed", error);
      showToast("PNG를 만드는 중 문제가 생겼어요: " + (error && error.message ? error.message : String(error)));
    } finally {
      if (canvas) canvas.width = canvas.height = 1;
      endExport();
    }
  });

  $("#allPngBtn").addEventListener("click", async function () {
    var button = $("#allPngBtn");
    if (!await beginExport(button)) return;
    try {
      var archive = await createAllViewImageArchive();
      download(archive.blob, archive.name);
      showToast("FRONT · BACK · BOTH 이미지 " + archive.count + "장을 한 번에 저장했습니다.");
    } catch (error) {
      console.error("All-image export failed", error);
      showToast("전체 이미지를 만드는 중 문제가 생겼습니다: " + (error && error.message ? error.message : String(error)));
    } finally {
      endExport();
    }
  });

  $("#zipBtn").addEventListener("click", async function () {
    var button = $("#zipBtn");
    if (!await beginExport(button)) return;
    try {
      var optimized = await optimizePackageAssets();
      var payload = ticketPayload(optimized.paths);
      var files = { "ticket.json": utf8(JSON.stringify(payload, null, 2)) };
      Object.keys(optimized.files).forEach(function (path) { files[path] = optimized.files[path]; });
      var manifest = {
        format: "log-ticket-package",
        packageVersion: payload.packageVersion,
        createdAt: new Date().toISOString(),
        template: { id: payload.templateId, version: payload.templateVersion },
        motion: { id: payload.motion.id, version: payload.motion.version },
        assets: optimized.meta,
        output: { purpose: "article-runtime-parts", flattenedPreviewIncluded: false },
        files: Object.keys(files).concat(["manifest.json"]),
        compatibility: { fallback: "static", archiveMinimumVersion: 1 }
      };
      files["manifest.json"] = utf8(JSON.stringify(manifest, null, 2));
      var zipName = exportFileStem(state.template, new Date()) + "-package.zip";
      download(new Blob([makeZip(files)], { type: "application/zip" }), zipName);
      showToast(zipName + " 다운로드를 시작했습니다.");
    } catch (error) {
      console.error("ZIP export failed", error);
      showToast("ZIP을 만드는 중 문제가 생겼어요: " + (error && error.message ? error.message : String(error)));
    } finally {
      endExport();
    }
  });

  var EXPORT_IMAGE_WAIT_MS = 8000;

  function waitForExportImage(image) {
    if (image.complete) {
      return image.naturalWidth > 0
        ? Promise.resolve()
        : Promise.reject(new Error("내보낼 이미지를 읽지 못했습니다."));
    }
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = null;
      function finish(ok) {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        image.removeEventListener("load", finish);
        image.removeEventListener("error", fail);
        if (ok !== false && image.naturalWidth > 0) resolve();
        else reject(new Error("내보낼 이미지를 읽지 못했습니다."));
      }
      function fail() { finish(false); }
      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", fail, { once: true });
      timer = setTimeout(fail, EXPORT_IMAGE_WAIT_MS);
      if (typeof image.decode === "function") image.decode().then(finish, fail);
    });
  }

  async function waitForPreviewImages() {
    var activeFace = state.side === "front" ? frontFace : backFace;
    var images = Array.prototype.slice.call(activeFace.querySelectorAll("img[src]")).filter(function (image) {
      var layer = image.closest("[data-canvas-layer]");
      return !layer || (!layer.classList.contains("hidden-layer") && !layer.classList.contains("template-unavailable"));
    });
    await Promise.all(images.map(waitForExportImage));
  }

  function cinemaSilhouetteShape() {
    /* Nine smaller semicircle punches sit between four clearly larger,
       true quarter-circle corner cuts. Preview and export share this die. */
    var centers = [.12, .215, .31, .405, .5, .595, .69, .785, .88];
    var topRadiusX = 14 / 520;
    var topRadiusY = 14 / 900;
    var cornerRadiusX = 24 / 520;
    var cornerRadiusY = 24 / 900;
    var steps = 24;
    var points = [[cornerRadiusX, 0]];
    function horizontalNotch(center, bottom) {
      for (var index = 0; index <= steps; index++) {
        var angle = bottom ? index * Math.PI / steps : Math.PI - index * Math.PI / steps;
        points.push([
          center + Math.cos(angle) * topRadiusX,
          bottom ? 1 - Math.sin(angle) * topRadiusY : Math.sin(angle) * topRadiusY
        ]);
      }
    }
    centers.forEach(function (center) { horizontalNotch(center, false); });
    function cornerCutArc(centerX, centerY, startAngle, endAngle) {
      for (var index = 0; index <= steps; index++) {
        var angle = startAngle + (endAngle - startAngle) * index / steps;
        points.push([
          centerX + Math.cos(angle) * cornerRadiusX,
          centerY + Math.sin(angle) * cornerRadiusY
        ]);
      }
    }
    cornerCutArc(1, 0, Math.PI, Math.PI / 2);
    points.push([1, 1 - cornerRadiusY]);
    cornerCutArc(1, 1, -Math.PI / 2, -Math.PI);
    centers.slice().reverse().forEach(function (center) { horizontalNotch(center, true); });
    cornerCutArc(0, 1, 0, -Math.PI / 2);
    points.push([0, cornerRadiusY]);
    cornerCutArc(0, 0, Math.PI / 2, 0);
    return points;
  }

  function cinemaSilhouettePolygon() {
    return "polygon(" + cinemaSilhouetteShape().map(function (point) {
      return (point[0] * 100).toFixed(4) + "% " + (point[1] * 100).toFixed(4) + "%";
    }).join(",") + ")";
  }

  function fallbackExportShape() {
    var silhouette = templateConfig(state.template).silhouette;
    if (silhouette === "train") return trainSilhouetteShape();
    if (silhouette === "cinema") return cinemaSilhouetteShape();
    return [[0, 0], [1, 0], [1, 1], [0, 1]];
  }

  function parseClipPolygon(value, width, height) {
    var match = /^polygon\((.*)\)$/i.exec(String(value || "").trim());
    if (!match) return null;
    var body = match[1].replace(/^\s*(evenodd|nonzero)\s*,/i, "");
    var pairs = body.split(",");
    var points = [];
    for (var index = 0; index < pairs.length; index++) {
      var metrics = pairs[index].trim().split(/\s+/);
      if (metrics.length < 2) return null;
      var xRaw = metrics[0];
      var yRaw = metrics[1];
      var x = xRaw.endsWith("%") ? parseFloat(xRaw) / 100 : parseFloat(xRaw) / Math.max(1, width);
      var y = yRaw.endsWith("%") ? parseFloat(yRaw) / 100 : parseFloat(yRaw) / Math.max(1, height);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      points.push([x, y]);
    }
    return points.length >= 3 ? points : null;
  }

  function captureExportGeometry() {
    var activeFace = state.side === "front" ? frontFace : backFace;
    var faceRect = activeFace.getBoundingClientRect();
    var computed = getComputedStyle(activeFace);
    var points = parseClipPolygon(computed.clipPath || computed.webkitClipPath, faceRect.width, faceRect.height) || fallbackExportShape();
    return { points: points };
  }
  function applyExportSilhouette(context, width, height, points) {
    context.save();
    context.globalCompositeOperation = "destination-in";
    context.beginPath();
    points.forEach(function (point, index) {
      var x = point[0] * width;
      var y = point[1] * height;
      if (index) context.lineTo(x, y); else context.moveTo(x, y);
    });
    context.closePath();
    context.fillStyle = "#000";
    context.fill();
    context.restore();
  }

  function finalizeExportCanvas(rendered, targetWidth, targetHeight) {
    var output = document.createElement("canvas");
    output.width = targetWidth;
    output.height = targetHeight;
    var context = output.getContext("2d", { alpha: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(rendered, 0, 0, targetWidth, targetHeight);
    return output;
  }

  function drawAlphaMaskedEffectLayer(baseCanvas, paint, composite, opacity) {
    if (opacity <= 0) return;
    var layerCanvas = document.createElement("canvas");
    layerCanvas.width = baseCanvas.width;
    layerCanvas.height = baseCanvas.height;
    var layerContext = layerCanvas.getContext("2d", { alpha: true });
    paint(layerContext, layerCanvas.width, layerCanvas.height);
    layerContext.globalCompositeOperation = "destination-in";
    layerContext.drawImage(baseCanvas, 0, 0);
    var context = baseCanvas.getContext("2d", { alpha: true });
    context.save();
    context.globalCompositeOperation = composite || "source-over";
    context.globalAlpha = clamp(opacity, 0, 1);
    context.drawImage(layerCanvas, 0, 0);
    context.restore();
    layerCanvas.width = 1;
    layerCanvas.height = 1;
  }

  function bakeImageEffects(image, config, frameWidth, frameHeight, requestedScale, shadow, openingMask, openingMaskScaleX, openingMaskScaleY) {
    var cssWidth = Math.max(1, frameWidth);
    var cssHeight = Math.max(1, frameHeight);
    var renderScale = Math.min(Math.max(1, requestedScale), 4096 / cssWidth, 4096 / cssHeight);
    var canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(cssWidth * renderScale));
    canvas.height = Math.max(1, Math.round(cssHeight * renderScale));
    var context = canvas.getContext("2d", { alpha: true });
    var effect = config.effect || defaultEffect();
    var crop = calculateCrop(config, image.naturalWidth, image.naturalHeight, canvas.width, canvas.height, renderScale);
    context.save();
    var bakedEffectFilter = effectFilterString(effect, true, renderScale);
    context.filter = ((bakedEffectFilter === "none" ? "" : bakedEffectFilter + " ") + imageShadowFilter(shadow, renderScale)).trim() || "none";
    context.drawImage(image, crop.x, crop.y, crop.width, crop.height);
    context.restore();

    drawAlphaMaskedEffectLayer(canvas, function (layerContext, width, height) {
      layerContext.fillStyle = effect.overlayColor;
      layerContext.fillRect(0, 0, width, height);
    }, effect.overlayBlend === "normal" ? "source-over" : effect.overlayBlend, effect.overlay / 100);

    drawImageVignette(canvas, effect);

    if (openingMask && openingMask.complete && openingMask.naturalWidth) {
      context.save();
      context.globalCompositeOperation = "destination-in";
      var maskScaleX = finiteNumber(openingMaskScaleX, 1);
      var maskScaleY = finiteNumber(openingMaskScaleY, 1);
      var maskBleedX = canvas.width * (maskScaleX - 1) / 2;
      var maskBleedY = canvas.height * (maskScaleY - 1) / 2;
      context.drawImage(openingMask, -maskBleedX, -maskBleedY, canvas.width + maskBleedX * 2, canvas.height + maskBleedY * 2);
      context.restore();
    }
    var dataUrl = canvas.toDataURL("image/png");
    canvas.width = canvas.height = 1;
    return dataUrl;
  }

  function bakeStretchedCustomImage(image, config, frameWidth, frameHeight, requestedScale, shadow) {
    var cssWidth = Math.max(1, frameWidth);
    var cssHeight = Math.max(1, frameHeight);
    var renderScale = Math.min(Math.max(1, requestedScale), 4096 / cssWidth, 4096 / cssHeight);
    var canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(cssWidth * renderScale));
    canvas.height = Math.max(1, Math.round(cssHeight * renderScale));
    var context = canvas.getContext("2d", { alpha: true });
    var effect = config.effect || defaultEffect();
    context.save();
    var bakedEffectFilter = effectFilterString(effect, true, renderScale);
    context.filter = ((bakedEffectFilter === "none" ? "" : bakedEffectFilter + " ") + imageShadowFilter(shadow, renderScale)).trim() || "none";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.restore();
    drawAlphaMaskedEffectLayer(canvas, function (layerContext, width, height) {
      layerContext.fillStyle = effect.overlayColor;
      layerContext.fillRect(0, 0, width, height);
    }, effect.overlayBlend === "normal" ? "source-over" : effect.overlayBlend, effect.overlay / 100);
    drawImageVignette(canvas, effect);
    var dataUrl = canvas.toDataURL("image/png");
    canvas.width = canvas.height = 1;
    return dataUrl;
  }

  function imageEffectNeedsRasterBake(effect, shadow) {
    var value = effect || defaultEffect();
    return effectFilterString(value, true) !== "none"
      || finiteNumber(value.overlay, 0) > 0
      || finiteNumber(value.vignette, 0) !== 0
      || Boolean(shadow && shadow.enabled);
  }

  async function prepareExportImageBakes(exportScale) {
    var activeFace = state.side === "front" ? frontFace : backFace;
    var useFrontOpeningMask = templateHasFeature(state.template, "mainImageOpeningMask") && state.side === "front";
    var useBackOpeningMask = state.template === "train" && state.side === "back";
    var trainMainOpeningMask = useFrontOpeningMask ? await loadTrainMainOpeningMask() : null;
    var trainBackOpeningMask = useBackOpeningMask ? await loadTrainBackOpeningMask() : null;
    var records = [];
    Object.keys(blockDom).forEach(function (key) {
      var side = key.indexOf("front") === 0 ? "front" : "back";
      var layer = key.endsWith("Main") ? "image-main" : "image-stub";
      var dom = blockDom[key];
      var config = blockConfigForDomKey(key);
      if (side !== state.side || isLayerHidden(layer, side) || !config.imageData || !dom.image.complete || !dom.image.naturalWidth) return;
      var openingMask = key === "frontMain" ? trainMainOpeningMask : key === "backMain" ? trainBackOpeningMask : null;
      var openingMaskScaleX = key === "frontMain" ? TRAIN_MAIN_OPENING_MASK_SCALE_X : 1;
      var openingMaskScaleY = key === "frontMain" ? TRAIN_MAIN_OPENING_MASK_SCALE_Y : 1;
      var layerShadow = shadowFor(layer, side);
      /* A neutral polaroid photograph is already browser-ready. Rasterizing it
         through an intermediate canvas needlessly color-converts embedded ICC
         profiles and was the source of the darker exported photograph. */
      if (state.template === "polaroid" && !imageEffectNeedsRasterBake(config.effect, layerShadow)) return;
      records.push({
        selector: "#" + dom.image.id,
        dataUrl: bakeImageEffects(dom.image, config, dom.frame.clientWidth, dom.frame.clientHeight, exportScale, layerShadow, openingMask, openingMaskScaleX, openingMaskScaleY)
      });
    });
    (state.customLayers[state.side] || []).forEach(function (item) {
      if (item.type !== "image" || !item.imageData || isLayerHidden(item.id, state.side)) return;
      var node = activeFace.querySelector('[data-canvas-layer="' + item.id + '"]');
      var image = node && node.querySelector("img.custom-image-source");
      if (!node || !image || !image.complete || !image.naturalWidth) return;
      records.push({
        selector: '[data-canvas-layer="' + item.id + '"] img.custom-image-source',
        dataUrl: bakeStretchedCustomImage(image, item, node.clientWidth, node.clientHeight, exportScale, shadowFor(item.id))
      });
    });
    if (state.template === "postcard" && state.side === "back" && !isLayerHidden("image-stub", "back")) {
      var stampNode = activeFace.querySelector('[data-canvas-layer="image-stub"]');
      if (stampNode && stampNode.clientWidth > 0 && stampNode.clientHeight > 0) {
        var stampComputed = getComputedStyle(stampNode);
        var stampPoints = parseClipPolygon(
          stampComputed.clipPath || stampComputed.webkitClipPath,
          stampNode.clientWidth,
          stampNode.clientHeight
        );
        if (stampPoints) {
          var stampScale = Math.max(1, finiteNumber(exportScale, 1));
          var stampCanvas = document.createElement("canvas");
          stampCanvas.width = Math.max(1, Math.round(stampNode.clientWidth * stampScale));
          stampCanvas.height = Math.max(1, Math.round(stampNode.clientHeight * stampScale));
          var stampContext = stampCanvas.getContext("2d", { alpha: true });
          stampContext.beginPath();
          stampPoints.forEach(function (point, pointIndex) {
            var pointX = point[0] * stampCanvas.width;
            var pointY = point[1] * stampCanvas.height;
            if (pointIndex) stampContext.lineTo(pointX, pointY);
            else stampContext.moveTo(pointX, pointY);
          });
          stampContext.closePath();
          stampContext.fillStyle = stampComputed.backgroundColor || "#fff";
          stampContext.fill();
          var stampDataUrl = stampCanvas.toDataURL("image/png");
          stampCanvas.width = stampCanvas.height = 1;
          records.push({
            selector: '.ticket-back [data-canvas-layer="image-stub"]',
            backgroundDataUrl: stampDataUrl
          });
        }
      }
    }
    return records;
  }

  function normalizeExportCloneRotations(clonedDocument, clonedRoot) {
    if (!clonedRoot || !clonedDocument.defaultView) return;
    var view = clonedDocument.defaultView;
    var nodes = [clonedRoot].concat(Array.prototype.slice.call(clonedRoot.querySelectorAll("*")));
    nodes.forEach(function (node) {
      if (!node.style) return;
      var computed = view.getComputedStyle(node);
      var rotation = String(computed.rotate || "none").trim();
      if (!rotation || rotation === "none" || /^0(?:deg|rad|turn)?$/i.test(rotation)) return;
      var angleMatch = rotation.match(/(-?(?:\d+\.?\d*|\.\d+)(?:deg|rad|turn))\s*$/i);
      if (!angleMatch) return;
      var existing = computed.transform && computed.transform !== "none" ? computed.transform : "";
      node.style.setProperty("transform", "rotate(" + angleMatch[1] + ")" + (existing ? " " + existing : ""), "important");
      node.style.setProperty("rotate", "none", "important");
    });
  }

  function normalizeExportCloneArtifacts(clonedTicket) {
    if (!clonedTicket) return;
    /* Empty image frames are editor affordances, not document ink. Their
       placeholder label was already suppressed during export, but template
       CSS could still leave the frame's tinted matte behind (for example the
       large train-front rectangle). Inline export normalization is
       deliberately shared by the base and overlay passes so later template
       CSS changes cannot reintroduce the matte through cascade order. */
    Array.prototype.forEach.call(clonedTicket.querySelectorAll(".image-main:not(.has-image)"), function (slot) {
      slot.style.setProperty("background", "transparent", "important");
      Array.prototype.forEach.call(slot.querySelectorAll(".block-image-frame"), function (frame) {
        frame.style.setProperty("background", "transparent", "important");
        frame.style.setProperty("background-image", "none", "important");
      });
    });
    Array.prototype.forEach.call(clonedTicket.querySelectorAll(".image-placeholder"), function (placeholder) {
      placeholder.style.setProperty("display", "none", "important");
      placeholder.style.setProperty("visibility", "hidden", "important");
    });
    /* A neutral polaroid photo must reach html2canvas without any template or
       stale runtime color treatment. Non-neutral inspector effects are baked
       separately and intentionally skip this guard. */
    if (state.template === "polaroid") {
      var polaroidImageConfig = blockConfigForDomKey("frontMain");
      var polaroidImageShadow = shadowFor("image-main", "front");
      if (polaroidImageConfig && !imageEffectNeedsRasterBake(polaroidImageConfig.effect, polaroidImageShadow)) {
        var polaroidImageSlot = clonedTicket.querySelector(".ticket-front .image-main");
        if (polaroidImageSlot) {
          polaroidImageSlot.style.setProperty("--image-overlay", "0", "important");
          polaroidImageSlot.style.setProperty("--image-vignette", "0", "important");
          polaroidImageSlot.style.setProperty("--image-vignette-edge", "rgba(0,0,0,0)", "important");
          var polaroidImageFrame = polaroidImageSlot.querySelector(".block-image-frame");
          var polaroidImage = polaroidImageSlot.querySelector("img");
          if (polaroidImageFrame) polaroidImageFrame.style.setProperty("box-shadow", "none", "important");
          if (polaroidImage) polaroidImage.style.setProperty("filter", "none", "important");
        }
      }
    }
  }

  function applyExportImageBakesToClone(clonedTicket, bakedImages) {
    bakedImages.forEach(function (record) {
      var image = clonedTicket.querySelector(record.selector);
      if (!image) return;
      if (record.backgroundDataUrl) {
        image.style.setProperty("background-color", "transparent", "important");
        image.style.setProperty("background-image", 'url("' + record.backgroundDataUrl + '")', "important");
        image.style.setProperty("background-position", "center", "important");
        image.style.setProperty("background-repeat", "no-repeat", "important");
        image.style.setProperty("background-size", "100% 100%", "important");
        image.style.setProperty("clip-path", "none", "important");
        image.style.setProperty("-webkit-clip-path", "none", "important");
        return;
      }
      var effectsHost = image.closest(".image-slot,.custom-image-layer");
      if (effectsHost) effectsHost.classList.add("image-effects-baked");
      image.src = record.dataUrl;
      image.style.setProperty("filter", "none", "important");
      image.style.setProperty("object-fit", "fill", "important");
      image.style.setProperty("width", "100%", "important");
      image.style.setProperty("height", "100%", "important");
      image.style.setProperty("left", "0", "important");
      image.style.setProperty("top", "0", "important");
      image.style.setProperty("right", "auto", "important");
      image.style.setProperty("bottom", "auto", "important");
    });
  }

  function addExportBlendNeutralizer(clonedDocument, clonedTicket, preserveLayerKey) {
    var style = clonedDocument.createElement("style");
    var wrappers = [
      ".heading-layer", ".metadata-layer", ".route-layer", ".stub-print-layer",
      ".details-layer", ".block-layer", ".image-layer", ".ticket-frame-layer",
      ".postcard-reverse-copy", ".back-record-rules"
    ];
    var escapedLayerKey = String(preserveLayerKey || "").replace(/["\\]/g, "\\$&");
    var preserveSelector = escapedLayerKey ? ':not([data-canvas-layer="' + escapedLayerKey + '"])' : "";
    var wrapperNodes = wrappers.map(function (selector) {
      return "#ticket.layer-overlay-export " + selector + preserveSelector;
    }).join(",");
    var wrapperPseudos = wrappers.reduce(function (selectors, selector) {
      selectors.push("#ticket.layer-overlay-export " + selector + preserveSelector + "::before");
      selectors.push("#ticket.layer-overlay-export " + selector + preserveSelector + "::after");
      return selectors;
    }, []).join(",");
    style.textContent = "#ticket.layer-overlay-export .ticket-face::before,#ticket.layer-overlay-export .ticket-face::after"
      + "{content:none!important;background:none!important;border:0!important;box-shadow:none!important;}"
      + wrapperNodes + "{background:transparent!important;border-color:transparent!important;box-shadow:none!important;}"
      + wrapperPseudos + "{content:none!important;background:none!important;border:0!important;box-shadow:none!important;}";
    clonedDocument.head.appendChild(style);
  }

  function shouldBakeExportTextureLast() {
    return state.texture
      && !isLayerHidden("texture", state.side)
      && state.template !== "cinema"
      && state.template !== "postcard"
      && state.template !== "polaroid";
  }

  function captureExportLayerSnapshot() {
    var activeFace = state.side === "front" ? frontFace : backFace;
    var hiddenLookup = {};
    var visibleLookup = {};
    Array.prototype.forEach.call(activeFace.querySelectorAll("[data-canvas-layer]"), function (node) {
      var key = node.dataset.canvasLayer;
      if (!key || key === "effects") return;
      if (isLayerHidden(key, state.side) || !exportLayerAvailableOnSide(key)) hiddenLookup[key] = true;
      else visibleLookup[key] = true;
    });
    var textureNode = activeFace.querySelector('[data-canvas-layer="texture"]');
    var textureComputed = textureNode ? getComputedStyle(textureNode) : null;
    var textureEnabled = Boolean(state.texture && !hiddenLookup.texture && textureNode);
    return {
      side: state.side,
      hidden: hiddenLookup,
      visible: visibleLookup,
      textureEnabled: textureEnabled,
      /* Postcard texture has a deliberately lower, rotated physical-card
         mask. Other templates use paper grain as the final press layer. */
      bakeTextureLast: textureEnabled && shouldBakeExportTextureLast(),
      textureOpacity: textureComputed ? clamp(parseFloat(textureComputed.opacity), 0, 1) : 0,
      textureBlendMode: textureComputed ? String(textureComputed.mixBlendMode || "multiply") : "multiply"
    };
  }

  function applyExportLayerSnapshot(clonedTicket, snapshot) {
    if (!snapshot) return;
    var activeFace = clonedTicket.querySelector(snapshot.side === "front" ? ".ticket-front" : ".ticket-back");
    Array.prototype.forEach.call(clonedTicket.querySelectorAll("[data-canvas-layer]"), function (node) {
      var key = node.dataset.canvasLayer;
      if (snapshot.hidden[key] || snapshot.bakeTextureLast && key === "texture") {
        node.style.setProperty("display", "none", "important");
        node.style.setProperty("visibility", "hidden", "important");
        node.style.setProperty("pointer-events", "none", "important");
      }
    });
    if (snapshot.bakeTextureLast) clonedTicket.classList.remove("texture-on");
    if (activeFace && snapshot.hidden["block-main"]) activeFace.classList.add("main-fill-hidden");
  }

  function pruneExportCloneWrappers(clonedTicket, visibleLookup, strictRoot, exportSide) {
    var selectors = [
      ".heading-layer", ".metadata-layer", ".route-layer", ".stub-print-layer",
      ".details-layer", ".block-layer", ".image-layer", ".ticket-frame-layer",
      ".postcard-reverse-copy", ".back-record-rules"
    ].join(",");
    Array.prototype.forEach.call(clonedTicket.querySelectorAll(selectors), function (wrapper) {
      var children = wrapper.querySelectorAll("[data-canvas-layer]");
      if (!children.length) return;
      var hasVisibleChild = Array.prototype.some.call(children, function (node) {
        return Boolean(visibleLookup[node.dataset.canvasLayer]);
      });
      if (!hasVisibleChild) wrapper.style.setProperty("visibility", "hidden", "important");
    });
    if (!strictRoot) return;
    var activeFace = clonedTicket.querySelector(exportSide === "back" ? ".ticket-back" : ".ticket-front");
    if (!activeFace) return;
    Array.prototype.forEach.call(activeFace.children, function (child) {
      var ownKey = child.dataset && child.dataset.canvasLayer;
      var ownsVisibleLayer = ownKey && visibleLookup[ownKey]
        || Array.prototype.some.call(child.querySelectorAll("[data-canvas-layer]"), function (node) {
          return Boolean(visibleLookup[node.dataset.canvasLayer]);
        });
      if (!ownsVisibleLayer) child.style.setProperty("visibility", "hidden", "important");
    });
  }

  function scaleExportFilter(filterValue, scale) {
    var value = String(filterValue || "none");
    if (!value || value === "none") return "none";
    return value.replace(/(-?(?:\d+\.?\d*|\.\d+))px\b/gi, function (_, number) {
      return (parseFloat(number) * scale).toFixed(3).replace(/\.?0+$/, "") + "px";
    });
  }

  function layerUsesDifference(layerKey) {
    if (isLayerHidden(layerKey, state.side) || !layerAvailableOnSide(layerKey, state.side)) return false;
    if (TEXT_LAYER_KEYS.indexOf(layerKey) >= 0) return nativeTextColorMode(layerKey, state.side) === "difference";
    var custom = customLayerById(layerKey);
    return Boolean(custom && custom.side === state.side && custom.type === "text"
      && (customTextColorMode(custom) === "difference" || custom.boxStyle && custom.boxStyle.mixBlendMode === "difference"));
  }

  function exportLayerAvailableOnSide(layerKey) {
    /* Keep the ambient soft-light wash in the base pass. Splitting this
       unregistered layer forced almost the whole document through another
       series of full-size renders. */
    return layerAvailableOnSide(layerKey, state.side);
  }

  function exportLayerCompositeSpec(layerKey) {
    if (isLayerHidden(layerKey, state.side) || !exportLayerAvailableOnSide(layerKey)) return null;
    var activeFace = state.side === "front" ? frontFace : backFace;
    var node = activeFace.querySelector('[data-canvas-layer="' + layerKey + '"]');
    if (!node) return null;
    var computed = getComputedStyle(node);
    var mode = layerUsesDifference(layerKey) ? "difference" : String(computed.mixBlendMode || "normal");
    var supportedModes = ["multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"];
    if (supportedModes.indexOf(mode) < 0) mode = "source-over";
    var filter = String(computed.filter || "none");
    /* Ordinary filters stay in the base render. Only blend modes that need
       canvas compositing justify another multi-megapixel pass. */
    return mode !== "source-over" ? { mode: mode, filter: filter } : null;
  }

  function exportLayerStackPath(node, activeFace) {
    var path = [];
    var current = node;
    while (current && current !== activeFace) {
      var computed = getComputedStyle(current);
      var rotation = String(computed.rotate || "none");
      var z = computed.zIndex === "auto" ? 0 : finiteNumber(parseFloat(computed.zIndex), 0);
      var createsContext = current === node
        || computed.zIndex !== "auto"
        || computed.transform !== "none"
        || (rotation !== "none" && !/^0(?:deg|rad|turn)?$/i.test(rotation))
        || finiteNumber(parseFloat(computed.opacity), 1) < 1
        || String(computed.mixBlendMode || "normal") !== "normal"
        || String(computed.filter || "none") !== "none"
        || computed.isolation === "isolate";
      if (createsContext) path.unshift(z);
      current = current.parentElement;
    }
    return path;
  }

  function compareExportStackPaths(left, right) {
    var length = Math.max(left.path.length, right.path.length);
    for (var index = 0; index < length; index++) {
      var leftValue = index < left.path.length ? left.path[index] : -Infinity;
      var rightValue = index < right.path.length ? right.path[index] : -Infinity;
      if (leftValue !== rightValue) return leftValue - rightValue;
    }
    return left.domIndex - right.domIndex;
  }

  function exportOrderedLayers() {
    var activeFace = state.side === "front" ? frontFace : backFace;
    var seen = {};
    var entries = [];
    Array.prototype.forEach.call(activeFace.querySelectorAll("[data-canvas-layer]"), function (node, domIndex) {
      var key = node.dataset.canvasLayer;
      if (key === "texture" && shouldBakeExportTextureLast()) return;
      if (!key || seen[key] || isLayerHidden(key, state.side) || !exportLayerAvailableOnSide(key)) return;
      var computed = getComputedStyle(node);
      if (computed.display === "none" || computed.visibility === "hidden" || finiteNumber(parseFloat(computed.opacity), 1) <= 0) return;
      if (!node.getClientRects().length) return;
      seen[key] = true;
      entries.push({ key: key, path: exportLayerStackPath(node, activeFace), domIndex: domIndex });
    });
    entries.sort(compareExportStackPaths);
    return entries.map(function (entry) { return entry.key; });
  }

  function buildExportLayerPlan() {
    /* html2canvas can leak the cinema reverse table/background through the
       transparent overlay passes used by the advanced blend compositor.
       A single pass preserves the browser's already-resolved stacking and
       avoids the large tinted rectangles/bands seen in reverse-ticket PNGs. */
    if (state.template === "cinema") return null;
    /* Clipped layers are already alpha-composited into face-sized preview
       canvases. Keep them in the dependable single-pass renderer so the
       source/mask relationship is not split across blend-mode passes. */
    if (layerClippingSpecs(state).some(function (spec) { return spec.side === state.side; })) return null;
    var order = exportOrderedLayers();
    var specs = {};
    var anchorIndex = -1;
    order.forEach(function (key, index) {
      var spec = exportLayerCompositeSpec(key);
      if (!spec) return;
      specs[key] = spec;
      if (anchorIndex < 0) anchorIndex = index;
    });
    if (anchorIndex < 0) return null;
    var deferredLayers = order.slice(anchorIndex);
    var steps = [];
    var group = [];
    function flushGroup() {
      if (!group.length) return;
      steps.push({ type: "layers", layers: group.slice() });
      group = [];
    }
    deferredLayers.forEach(function (key) {
      if (specs[key]) {
        flushGroup();
        steps.push({ type: "composite", layer: key, layers: [key], mode: specs[key].mode, filter: specs[key].filter });
      } else {
        group.push(key);
      }
    });
    flushGroup();
    /* Bound memory use for documents with many custom blend layers. A null
       plan tells the caller to use the dependable single-pass renderer. */
    if (steps.length > 4) return null;
    return { hiddenLayers: deferredLayers, steps: steps };
  }

  async function renderLayerOverlayGroup(exportScale, bakedImages, layerKeys, neutralizeBlendKeys, layerSnapshot) {
    var layerLookup = {};
    layerKeys.forEach(function (key) { layerLookup[key] = true; });
    var neutralBlendLookup = {};
    (neutralizeBlendKeys || []).forEach(function (key) { neutralBlendLookup[key] = true; });
    return window.html2canvas(ticket, {
      backgroundColor: null,
      scale: exportScale,
      useCORS: true,
      allowTaint: false,
      foreignObjectRendering: false,
      imageTimeout: 30000,
      logging: false,
      removeContainer: true,
      width: ticket.offsetWidth,
      height: ticket.offsetHeight,
      scrollX: 0,
      scrollY: 0,
      onclone: function (clonedDocument) {
        var clonedTicket = clonedDocument.getElementById("ticket");
        if (!clonedTicket) return;
        Array.prototype.forEach.call(clonedTicket.querySelectorAll('[data-canvas-layer="attribution"]'), function (node) {
          node.style.setProperty("display", "none", "important");
        });
        copyLayerClippingPreviewPixels(ticket, clonedTicket);
        clonedTicket.classList.add("effects-baked", "layer-overlay-export");
        clonedTicket.style.setProperty("background", "transparent", "important");
        normalizeExportCloneArtifacts(clonedTicket);
        var inactiveFace = clonedTicket.querySelector(layerSnapshot && layerSnapshot.side === "back" ? ".ticket-front" : ".ticket-back");
        if (inactiveFace) inactiveFace.style.setProperty("visibility", "hidden", "important");
        applyExportLayerSnapshot(clonedTicket, layerSnapshot);
        Array.prototype.forEach.call(clonedTicket.querySelectorAll(".ticket-face"), function (face) {
          face.style.setProperty("background", "transparent", "important");
          face.style.setProperty("box-shadow", "none", "important");
        });
        normalizeExportCloneRotations(clonedDocument, clonedTicket);
        Array.prototype.forEach.call(clonedTicket.querySelectorAll("[data-canvas-layer]"), function (node) {
          var key = node.dataset.canvasLayer;
          if (!layerLookup[key]) {
            node.style.setProperty("display", "none", "important");
            node.style.setProperty("visibility", "hidden", "important");
            return;
          }
          if (neutralBlendLookup[key]) {
            node.style.setProperty("mix-blend-mode", "normal", "important");
            node.style.setProperty("filter", "none", "important");
          }
        });
        addExportBlendNeutralizer(clonedDocument, clonedTicket);
        applyExportImageBakesToClone(clonedTicket, bakedImages);
        pruneExportCloneWrappers(clonedTicket, layerLookup, true, layerSnapshot && layerSnapshot.side);
      }
    });
  }

  async function compositeExportLayerPlan(output, plan, exportScale, bakedImages, layerSnapshot) {
    if (!plan) return output;
    var context = output.getContext("2d", { alpha: true });
    for (var index = 0; index < plan.steps.length; index++) {
      var step = plan.steps[index];
      var neutralize = step.type === "composite" ? [step.layer] : [];
      var layerCanvas = await renderLayerOverlayGroup(exportScale, bakedImages, step.layers, neutralize, layerSnapshot);
      context.save();
      context.globalCompositeOperation = step.type === "composite" ? step.mode : "source-over";
      if (step.type === "composite" && step.filter !== "none" && "filter" in context) {
        context.filter = scaleExportFilter(step.filter, exportScale);
      }
      context.drawImage(layerCanvas, 0, 0, output.width, output.height);
      context.restore();
      layerCanvas.width = 1;
      layerCanvas.height = 1;
    }
    return output;
  }

  async function renderTicketExportPass(exportScale, bakedImages, exportLayerPlan, layerSnapshot) {
    var baseHiddenLookup = {};
    var baseVisibleLookup = {};
    if (exportLayerPlan) exportLayerPlan.hiddenLayers.forEach(function (key) { baseHiddenLookup[key] = true; });
    exportOrderedLayers().forEach(function (key) {
      if (!baseHiddenLookup[key]) baseVisibleLookup[key] = true;
    });
    return window.html2canvas(ticket, {
      backgroundColor: null,
      scale: exportScale,
      useCORS: true,
      allowTaint: false,
      foreignObjectRendering: false,
      imageTimeout: 30000,
      logging: false,
      removeContainer: true,
      width: ticket.offsetWidth,
      height: ticket.offsetHeight,
      scrollX: 0,
      scrollY: 0,
      onclone: function (clonedDocument) {
        var clonedTicket = clonedDocument.getElementById("ticket");
        if (!clonedTicket) return;
        Array.prototype.forEach.call(clonedTicket.querySelectorAll('[data-canvas-layer="attribution"]'), function (node) {
          node.style.setProperty("display", "none", "important");
        });
        copyLayerClippingPreviewPixels(ticket, clonedTicket);
        clonedTicket.classList.add("effects-baked");
        normalizeExportCloneArtifacts(clonedTicket);
        var inactiveFace = clonedTicket.querySelector(layerSnapshot && layerSnapshot.side === "back" ? ".ticket-front" : ".ticket-back");
        if (inactiveFace) inactiveFace.style.setProperty("visibility", "hidden", "important");
        applyExportLayerSnapshot(clonedTicket, layerSnapshot);
        normalizeExportCloneRotations(clonedDocument, clonedTicket);
        if (exportLayerPlan) {
          Array.prototype.forEach.call(clonedTicket.querySelectorAll("[data-canvas-layer]"), function (node) {
            if (baseHiddenLookup[node.dataset.canvasLayer]) {
              node.style.setProperty("display", "none", "important");
              node.style.setProperty("visibility", "hidden", "important");
            }
          });
          pruneExportCloneWrappers(clonedTicket, baseVisibleLookup, false, layerSnapshot && layerSnapshot.side);
        } else if (layerSnapshot) {
          pruneExportCloneWrappers(clonedTicket, layerSnapshot.visible, false, layerSnapshot.side);
        }
        applyExportImageBakesToClone(clonedTicket, bakedImages);
        if (window.location.protocol === "file:") Array.prototype.forEach.call(clonedTicket.querySelectorAll(".decor"), function (node) { node.style.backgroundImage = "none"; });
      }
    });
  }

  var exportPaperTextureImagePromise = null;
  var exportPaperTextureFallbackTile = null;

  function loadExportPaperTextureImage() {
    if (window.location.protocol === "file:") return Promise.resolve(null);
    if (exportPaperTextureImagePromise) return exportPaperTextureImagePromise;
    exportPaperTextureImagePromise = new Promise(function (resolve) {
      var image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = function () { resolve(image); };
      image.onerror = function () { resolve(null); };
      try {
        image.src = new URL("ticket-paper-fiber-v2.png", document.baseURI || window.location.href).href;
      } catch (_) {
        resolve(null);
      }
    });
    return exportPaperTextureImagePromise;
  }

  function makeExportPaperTextureFallbackTile() {
    if (exportPaperTextureFallbackTile) return exportPaperTextureFallbackTile;
    var size = 256;
    var tile = document.createElement("canvas");
    tile.width = size;
    tile.height = size;
    var context = tile.getContext("2d", { alpha: false });
    var pixels = context.createImageData(size, size);
    var seed = 0x51f2a9d3;
    function random() {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 4294967296;
    }
    for (var offset = 0; offset < pixels.data.length; offset += 4) {
      var grain = (random() + random() + random() - 1.5) * 12;
      pixels.data[offset] = clamp(Math.round(242 + grain), 188, 255);
      pixels.data[offset + 1] = clamp(Math.round(236 + grain * 1.05), 180, 255);
      pixels.data[offset + 2] = clamp(Math.round(219 + grain * 1.2), 156, 250);
      pixels.data[offset + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    context.save();
    context.globalAlpha = .08;
    context.strokeStyle = "#796854";
    context.lineWidth = .45;
    for (var fiber = 0; fiber < 190; fiber++) {
      var x = random() * size;
      var y = random() * size;
      context.beginPath();
      context.moveTo(x, y);
      context.quadraticCurveTo(x + (random() - .5) * 18, y + (random() - .5) * 9, x + (random() - .5) * 34, y + (random() - .5) * 14);
      context.stroke();
    }
    context.restore();
    exportPaperTextureFallbackTile = tile;
    return tile;
  }

  async function drawExportPaperTexture(output, layerSnapshot) {
    if (!layerSnapshot || !layerSnapshot.bakeTextureLast || layerSnapshot.textureOpacity <= 0) return output;
    var image = await loadExportPaperTextureImage();
    var tile = image || makeExportPaperTextureFallbackTile();
    var textureCanvas = document.createElement("canvas");
    textureCanvas.width = output.width;
    textureCanvas.height = output.height;
    var textureContext = textureCanvas.getContext("2d", { alpha: true });
    textureContext.imageSmoothingEnabled = true;
    textureContext.imageSmoothingQuality = "high";
    if ("filter" in textureContext) textureContext.filter = "contrast(1.04) saturate(.78) brightness(1.01)";
    var naturalSize = Math.max(1, tile.naturalWidth || tile.width || 256);
    var tileSize = image ? Math.min(naturalSize, Math.max(720, Math.round(output.width * .75))) : naturalSize;
    var startX = (output.width % tileSize) / 2 - tileSize;
    var startY = (output.height % tileSize) / 2 - tileSize;
    for (var y = startY; y < output.height; y += tileSize) {
      for (var x = startX; x < output.width; x += tileSize) textureContext.drawImage(tile, x, y, tileSize, tileSize);
    }
    textureContext.filter = "none";
    textureContext.globalCompositeOperation = "destination-in";
    textureContext.drawImage(output, 0, 0);

    var outputContext = output.getContext("2d", { alpha: true });
    var supportedModes = ["multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"];
    outputContext.save();
    outputContext.globalCompositeOperation = supportedModes.indexOf(layerSnapshot.textureBlendMode) >= 0 ? layerSnapshot.textureBlendMode : "multiply";
    outputContext.globalAlpha = layerSnapshot.textureOpacity;
    outputContext.drawImage(textureCanvas, 0, 0);
    outputContext.restore();
    textureCanvas.width = 1;
    textureCanvas.height = 1;
    return output;
  }

  async function finishExportCanvas(output, geometry, layerSnapshot) {
    await drawExportPaperTexture(output, layerSnapshot);
    applyExportSilhouette(output.getContext("2d", { alpha: true }), output.width, output.height, geometry.points);
    output.ticketContentRect = { x: 0, y: 0, width: output.width, height: output.height };
    return output;
  }

  function addMandatoryAttributionPadding(sourceCanvas, side, documentState, bothView) {
    var source = documentState || state;
    if (!sourceCanvas) return sourceCanvas;
    var placement = source.placements && source.placements[side] && source.placements[side][ATTRIBUTION_LAYER_KEY] || {};
    var style = source.layerStyles && source.layerStyles[side] && source.layerStyles[side][ATTRIBUTION_LAYER_KEY] || {};
    var contentRect = sourceCanvas.ticketContentRect || { x: 0, y: 0, width: sourceCanvas.width, height: sourceCanvas.height };
    var previewSize = templateConfig(source.template).preview;
    var exportScale = Math.min(contentRect.width / Math.max(1, previewSize.width), contentRect.height / Math.max(1, previewSize.height));
    var fontSize = Math.max(1, 7 * exportScale);
    var gap = 8 * exportScale;
    var measureCanvas = document.createElement("canvas");
    var measureContext = measureCanvas.getContext("2d", { alpha: true });
    measureContext.font = "600 " + fontSize.toFixed(2) + "px 'Gothic A1', Pretendard, sans-serif";
    var textWidth = measureContext.measureText(ATTRIBUTION_TEXT).width;
    measureCanvas.width = measureCanvas.height = 1;
    var base = attributionBasePosition(source.template, contentRect.width, contentRect.height, Boolean(bothView));
    var desiredX = contentRect.x + base.x + finiteNumber(placement.x, 0) / 100 * contentRect.width;
    var desiredY = contentRect.y + base.y + gap + finiteNumber(placement.y, 0) / 100 * contentRect.height;
    var safeMargin = Math.max(2, exportScale * 2);
    var leftPadding = Math.max(0, Math.ceil(textWidth / 2 + safeMargin - desiredX));
    var rightPadding = Math.max(0, Math.ceil(desiredX + textWidth / 2 + safeMargin - sourceCanvas.width));
    var bottomExtent = Math.ceil(desiredY + fontSize * 1.4);
    var output = document.createElement("canvas");
    output.width = sourceCanvas.width + leftPadding + rightPadding;
    output.height = Math.max(sourceCanvas.height, bottomExtent);
    var context = output.getContext("2d", { alpha: true });
    if (!context) return sourceCanvas;
    context.drawImage(sourceCanvas, leftPadding, 0);
    context.save();
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    context.fillStyle = /^#[0-9a-f]{6}$/i.test(String(style.color || "")) ? style.color : "#000000";
    context.font = "600 " + fontSize.toFixed(2) + "px 'Gothic A1', Pretendard, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillText(ATTRIBUTION_TEXT, desiredX + leftPadding, desiredY);
    context.restore();
    sourceCanvas.width = sourceCanvas.height = 1;
    return output;
  }

  async function drawTicketFromPreview() {
    if (typeof window.html2canvas !== "function") throw new Error("고화질 PNG 렌더러를 불러오지 못했습니다.");
    await ensureReferencedSystemFontsLoaded();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    renderBlockImages();
    paintTrainPerforations();
    await Promise.all([trainFrameRenderPromise, trainLogoRenderPromise]);
    await waitForPreviewImages();
    renderBlockImages();
    paintTrainPerforations();
    await new Promise(function (resolve) { requestAnimationFrame(function () { requestAnimationFrame(resolve); }); });

    var targetSize = templateConfig(state.template).export;
    var targetWidth = targetSize.width;
    var targetHeight = targetSize.height;
    var previousTransform = ticketViewTransform.style.transform;
    var previousZoom = ticket.style.zoom;
    var previousFilter = ticket.style.filter;
    document.body.classList.add("exporting-ticket");
    ticketViewTransform.style.transform = "none";
    ticket.style.zoom = "1";
    ticket.style.filter = "none";
    try {
      await new Promise(function (resolve) { requestAnimationFrame(resolve); });
      paintTrainPerforations();
      var exportGeometry = captureExportGeometry();
      var exportLayerSnapshot = captureExportLayerSnapshot();
      var scale = targetWidth / Math.max(1, ticket.offsetWidth);
      renderCustomLayers(scale);
      await new Promise(function (resolve) { requestAnimationFrame(resolve); });
      var bakedImages = await prepareExportImageBakes(scale);
      await refreshLayerClippingPreviews(scale, bakedImages);
      var exportLayerPlan = buildExportLayerPlan();
      var rendered = null;
      var output = null;
      try {
        rendered = await renderTicketExportPass(scale, bakedImages, exportLayerPlan, exportLayerSnapshot);
        output = finalizeExportCanvas(rendered, targetWidth, targetHeight);
        rendered.width = 1;
        rendered.height = 1;
        rendered = null;
        await compositeExportLayerPlan(output, exportLayerPlan, scale, bakedImages, exportLayerSnapshot);
      } catch (compositeError) {
        if (!exportLayerPlan) throw compositeError;
        console.warn("Advanced PNG compositing failed; retrying a single-pass export.", compositeError);
        if (rendered) {
          rendered.width = 1;
          rendered.height = 1;
          rendered = null;
        }
        if (output) {
          output.width = 1;
          output.height = 1;
          output = null;
        }
        rendered = await renderTicketExportPass(scale, bakedImages, null, exportLayerSnapshot);
        output = finalizeExportCanvas(rendered, targetWidth, targetHeight);
        rendered.width = 1;
        rendered.height = 1;
      }
      return await finishExportCanvas(output, exportGeometry, exportLayerSnapshot);
    } finally {
      ticketViewTransform.style.transform = previousTransform;
      ticket.style.zoom = previousZoom;
      ticket.style.filter = previousFilter;
      document.body.classList.remove("exporting-ticket");
      renderCustomLayers();
      renderBlockImages();
      paintTrainPerforations();
      queueLayerClippingPreview(1, false);
    }
  }
  function faceShadowExportEnabled(side, documentState) {
    var source = documentState || state;
    return layerAvailableOnSide("face-shadow", side, source) && !isLayerHidden("face-shadow", side, source);
  }

  function addSingleFaceExportShadow(sourceCanvas, side, documentState) {
    if (!sourceCanvas) return sourceCanvas;
    var sourceContentRect = sourceCanvas.ticketContentRect || { x: 0, y: 0, width: sourceCanvas.width, height: sourceCanvas.height };
    if (!faceShadowExportEnabled(side, documentState)) {
      sourceCanvas.ticketContentRect = sourceContentRect;
      return sourceCanvas;
    }
    var previewSize = templateConfig((documentState || state).template).preview;
    var renderScale = Math.min(
      sourceCanvas.width / Math.max(1, previewSize.width),
      sourceCanvas.height / Math.max(1, previewSize.height)
    );
    /* Match the single-face preview's 0 11px 18px physical face shadow at
       export density. Padding is deliberately larger than the blur kernel so
       no soft alpha is clipped on any side. */
    var blur = Math.max(1, 18 * renderScale);
    var offsetY = Math.max(1, 11 * renderScale);
    var padX = Math.ceil(blur * 2.75);
    var padTop = Math.ceil(blur * 2.75);
    var padBottom = Math.ceil(blur * 2.75 + offsetY);
    var output = document.createElement("canvas");
    output.width = sourceCanvas.width + padX * 2;
    output.height = sourceCanvas.height + padTop + padBottom;
    var context = output.getContext("2d", { alpha: true });
    if (!context) return sourceCanvas;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.save();
    context.filter = "drop-shadow(0px " + offsetY.toFixed(3) + "px " + blur.toFixed(3) + "px rgba(34,27,23,.22))";
    context.drawImage(sourceCanvas, padX, padTop);
    context.restore();
    output.ticketContentRect = {
      x: padX + sourceContentRect.x,
      y: padTop + sourceContentRect.y,
      width: sourceContentRect.width,
      height: sourceContentRect.height
    };
    sourceCanvas.width = sourceCanvas.height = 1;
    return output;
  }

  function drawCompositeFace(context, faceCanvas, template, side, onTop, outputWidth, outputHeight, shadowEnabled) {
    var geometry = bothGeometryFor(template, side);
    var projection = bothProjectionFor(template);
    var width = outputWidth * geometry.scale * projection.scale;
    var height = outputHeight * geometry.scale * projection.scale;
    var centerX = outputWidth * (projection.offsetX + projection.scale * (geometry.x + geometry.scale / 2));
    var centerY = outputHeight * (projection.offsetY + projection.scale * (geometry.y + geometry.scale / 2));
    var angle = geometry.rotation * Math.PI / 180;
    var shadows = shadowEnabled ? [
      { color: "rgba(34,27,23,.2)", offsetY: outputHeight * .014 * projection.scale, blur: outputWidth * .014 * projection.scale }
    ] : [];
    if (shadowEnabled && onTop) shadows.unshift({ color: "rgba(31,24,21,.34)", offsetY: outputHeight * .0065 * projection.scale, blur: outputWidth * .0073 * projection.scale });
    context.save();
    context.translate(centerX, centerY);
    context.rotate(angle);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    /* Derive every shadow from the card's real alpha in the same draw. The
       old opaque black backing rectangle showed through rotated edge pixels
       and produced a dark stair-step fringe. */
    context.filter = shadows.map(function (shadow) {
      return "drop-shadow(0px " + shadow.offsetY + "px " + shadow.blur + "px " + shadow.color + ")";
    }).join(" ") || "none";
    context.drawImage(faceCanvas, -width / 2, -height / 2, width, height);
    context.restore();
  }
  async function drawVisibleTicketFromPreview() {
    if (!isBothView(state)) {
      var singleFaceCanvas = await drawTicketFromPreview();
      return addMandatoryAttributionPadding(addSingleFaceExportShadow(singleFaceCanvas, state.side, state), state.side, state, false);
    }
    var exportStateRef = state;
    var exportTemplate = state.template;
    var exportTopSide = state.postcardTopSide;
    var savedSide = state.side;
    var savedSelection = state.selectedLayer;
    var savedMultiSelection = multiSelectedLayerKeys.slice();
    var savedMultiSelectionSide = multiSelectionSide;
    var savedMultiSelectionStateRef = multiSelectionStateRef;
    var savedTrackedTextSelection = trackedTextSelection;
    var savedViewMode = state.postcardViewMode;
    var savedSuspendAutoSave = suspendAutoSave;
    var output = null;
    var faceCanvas = null;
    var completed = false;
    clearTimeout(saveTimer);
    suspendAutoSave = true;
    try {
      var size = templateConfig(exportTemplate).export;
      output = document.createElement("canvas");
      output.width = size.width;
      output.height = size.height;
      output.ticketContentRect = { x: 0, y: 0, width: size.width, height: size.height };
      var context = output.getContext("2d", { alpha: true });
      if (!context) throw new Error("양면 합성 캔버스를 준비하지 못했습니다.");
      var lower = exportTopSide === "front" ? "back" : "front";
      var sides = [lower, exportTopSide];
      for (var sideIndex = 0; sideIndex < sides.length; sideIndex++) {
        if (state !== exportStateRef) throw new Error("내보내기 중 문서가 변경되었습니다.");
        var side = sides[sideIndex];
        postcardExportSide = side;
        state.postcardViewMode = side;
        state.side = side;
        state.selectedLayer = "";
        render();
        await new Promise(function (resolve) { requestAnimationFrame(function () { requestAnimationFrame(resolve); }); });
        faceCanvas = await drawTicketFromPreview();
        drawCompositeFace(context, faceCanvas, exportTemplate, side, side === exportTopSide, size.width, size.height, faceShadowExportEnabled(side, exportStateRef));
        faceCanvas.width = faceCanvas.height = 1;
        faceCanvas = null;
      }
      output = addMandatoryAttributionPadding(output, exportTopSide, exportStateRef, true);
      completed = true;
      return output;
    } finally {
      if (faceCanvas) faceCanvas.width = faceCanvas.height = 1;
      if (output && !completed) output.width = output.height = 1;
      if (state === exportStateRef) {
        state.side = savedSide;
        state.selectedLayer = savedSelection;
        multiSelectedLayerKeys = savedMultiSelection;
        multiSelectionSide = savedMultiSelectionSide;
        multiSelectionStateRef = savedMultiSelectionStateRef;
        trackedTextSelection = savedTrackedTextSelection;
        state.postcardViewMode = savedViewMode;
      }
      postcardExportSide = "";
      suspendAutoSave = savedSuspendAutoSave;
      if (state === exportStateRef) render();
      if (!savedSuspendAutoSave) scheduleSave();
    }
  }
  var crcTable = (function () {
    var table = [];
    for (var number = 0; number < 256; number++) {
      var value = number;
      for (var bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1;
      table[number] = value >>> 0;
    }
    return table;
  })();
  function crc32(bytes) { var value = 0xffffffff; for (var index = 0; index < bytes.length; index++) value = crcTable[(value ^ bytes[index]) & 255] ^ value >>> 8; return (value ^ 0xffffffff) >>> 0; }
  function utf8(text) { return new TextEncoder().encode(text); }
  function dataUrlBytes(url) { var raw = atob(url.split(",")[1] || ""); var output = new Uint8Array(raw.length); for (var index = 0; index < raw.length; index++) output[index] = raw.charCodeAt(index); return output; }
  function concat(parts) { var length = parts.reduce(function (sum, part) { return sum + part.length; }, 0); var output = new Uint8Array(length); var offset = 0; parts.forEach(function (part) { output.set(part, offset); offset += part.length; }); return output; }
  function header(size, writer) { var bytes = new Uint8Array(size); var view = new DataView(bytes.buffer); writer(view); return bytes; }
  function makeZip(files) {
    var locals = [];
    var centrals = [];
    var offset = 0;
    var now = new Date();
    var time = now.getHours() << 11 | now.getMinutes() << 5 | now.getSeconds() >> 1;
    var date = now.getFullYear() - 1980 << 9 | now.getMonth() + 1 << 5 | now.getDate();
    Object.keys(files).forEach(function (name) {
      var nameBytes = utf8(name);
      var data = files[name];
      var crc = crc32(data);
      var local = header(30, function (view) { view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true); view.setUint16(8, 0, true); view.setUint16(10, time, true); view.setUint16(12, date, true); view.setUint32(14, crc, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true); view.setUint16(26, nameBytes.length, true); });
      locals.push(local, nameBytes, data);
      var central = header(46, function (view) { view.setUint32(0, 0x02014b50, true); view.setUint16(4, 20, true); view.setUint16(6, 20, true); view.setUint16(8, 0x800, true); view.setUint16(10, 0, true); view.setUint16(12, time, true); view.setUint16(14, date, true); view.setUint32(16, crc, true); view.setUint32(20, data.length, true); view.setUint32(24, data.length, true); view.setUint16(28, nameBytes.length, true); view.setUint32(42, offset, true); });
      centrals.push(central, nameBytes);
      offset += local.length + nameBytes.length + data.length;
    });
    var centralData = concat(centrals);
    var end = header(22, function (view) { view.setUint32(0, 0x06054b50, true); view.setUint16(8, Object.keys(files).length, true); view.setUint16(10, Object.keys(files).length, true); view.setUint32(12, centralData.length, true); view.setUint32(16, offset, true); });
    return concat(locals.concat([centralData, end]));
  }

  installColorCodeInputs();
  if (window.indexedDB) {
    imageAssetHydrationPromise = hydrateImageAssets().then(function (restored) {
      imageAssetsReady = true;
      if (restored) render();
    }, function (error) {
      imageAssetHydrationError = error || new Error("저장된 이미지를 복원하지 못했습니다.");
      imageAssetsReady = true;
    });
  }
  hydrateSystemFontRecords();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { render(); });
  render();
  requestAnimationFrame(fitPreview);
})();
