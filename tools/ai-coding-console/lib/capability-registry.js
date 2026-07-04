const fs = require("fs");
const path = require("path");

const ALLOWED_TYPES = new Set(["skill", "sop", "script", "prompt-template", "capability-pack"]);
const ALLOWED_RISK_LEVELS = new Set(["low", "medium", "high"]);
const ALLOWED_STATUSES = new Set(["active", "draft", "deprecated", "unavailable"]);

function normalizeAbs(p) {
  return path.resolve(p).toLowerCase();
}

function isWithinRoot(rootDir, candidatePath) {
  const root = normalizeAbs(rootDir);
  const candidate = normalizeAbs(candidatePath);
  return candidate === root || candidate.startsWith(root + path.sep);
}

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function validateRegistry(registry, options) {
  const repoRoot = options && options.repoRoot ? options.repoRoot : process.cwd();
  const errors = [];

  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    return { valid: false, errors: ["Registry root must be a JSON object."] };
  }

  if (registry.$schema !== "capability-registry-v1") {
    errors.push("Registry $schema must be capability-registry-v1.");
  }

  if (typeof registry.lastUpdated !== "string" || !registry.lastUpdated.trim()) {
    errors.push("Registry lastUpdated must be a non-empty ISO timestamp string.");
  }

  if (!registry.entries || typeof registry.entries !== "object" || Array.isArray(registry.entries)) {
    errors.push("Registry entries must be an object map.");
    return { valid: false, errors };
  }

  const ids = new Set();
  const entries = registry.entries;

  for (const [key, entry] of Object.entries(entries)) {
    const label = `Entry ${key}`;

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`${label} must be an object.`);
      continue;
    }

    if (ids.has(entry.id)) {
      errors.push(`${label} id duplicates another entry id: ${entry.id}.`);
    }
    ids.add(entry.id);

    if (entry.id !== key) {
      errors.push(`${label} id must match its registry key.`);
    }

    if (!entry.id || typeof entry.id !== "string") {
      errors.push(`${label} id must be a non-empty string.`);
    }
    if (!entry.name || typeof entry.name !== "string") {
      errors.push(`${label} name must be a non-empty string.`);
    }
    if (!ALLOWED_TYPES.has(entry.type)) {
      errors.push(`${label} has invalid type: ${entry.type}.`);
    }
    if (typeof entry.description !== "string" || !entry.description.trim()) {
      errors.push(`${label} description must be a non-empty string.`);
    }
    if (typeof entry.sourcePath !== "string" || !entry.sourcePath.trim()) {
      errors.push(`${label} sourcePath must be a non-empty string.`);
    }
    if (!Object.prototype.hasOwnProperty.call(entry, "entryFile")) {
      errors.push(`${label} entryFile must be present.`);
    }
    if (typeof entry.usage !== "string" || !entry.usage.trim()) {
      errors.push(`${label} usage must be a non-empty string.`);
    }
    if (!Array.isArray(entry.applicableProjectTypes)) {
      errors.push(`${label} applicableProjectTypes must be an array.`);
    }
    if (!ALLOWED_RISK_LEVELS.has(entry.riskLevel)) {
      errors.push(`${label} has invalid riskLevel: ${entry.riskLevel}.`);
    }
    if (typeof entry.canModifyProject !== "boolean") {
      errors.push(`${label} canModifyProject must be boolean.`);
    }
    if (typeof entry.canRunScript !== "boolean") {
      errors.push(`${label} canRunScript must be boolean.`);
    }
    if (typeof entry.requiresApproval !== "boolean") {
      errors.push(`${label} requiresApproval must be boolean.`);
    }
    if (!Array.isArray(entry.inputRequirements)) {
      errors.push(`${label} inputRequirements must be an array.`);
    }
    if (!Array.isArray(entry.expectedArtifacts)) {
      errors.push(`${label} expectedArtifacts must be an array.`);
    }
    if (!Array.isArray(entry.relatedSkills)) {
      errors.push(`${label} relatedSkills must be an array.`);
    }
    if (!Array.isArray(entry.relatedSops)) {
      errors.push(`${label} relatedSops must be an array.`);
    }
    if (!Array.isArray(entry.relatedScripts)) {
      errors.push(`${label} relatedScripts must be an array.`);
    }
    if (!Array.isArray(entry.relatedPromptTemplates)) {
      errors.push(`${label} relatedPromptTemplates must be an array.`);
    }
    if (!ALLOWED_STATUSES.has(entry.status)) {
      errors.push(`${label} has invalid status: ${entry.status}.`);
    }

    if (entry.entryFile !== null) {
      if (entry.type !== "script") {
        errors.push(`${label} entryFile must be null unless type is script.`);
      } else if (typeof entry.entryFile !== "string" || !entry.entryFile.trim()) {
        errors.push(`${label} entryFile must be a non-empty string for scripts.`);
      } else {
        const entryFileAbs = path.resolve(repoRoot, entry.entryFile);
        if (!isWithinRoot(repoRoot, entryFileAbs) || !fs.existsSync(entryFileAbs)) {
          errors.push(`${label} entryFile does not exist: ${entry.entryFile}.`);
        }
      }
    }

    if (entry.type === "script") {
      const sourceAbs = path.resolve(repoRoot, entry.sourcePath);
      if (!isWithinRoot(repoRoot, sourceAbs) || !fs.existsSync(sourceAbs)) {
        errors.push(`${label} script sourcePath does not exist: ${entry.sourcePath}.`);
      }
    } else if (entry.sourcePath.startsWith("built-in:")) {
      if (!entry.sourcePath.slice("built-in:".length).trim()) {
        errors.push(`${label} built-in sourcePath must include a real source description.`);
      }
    } else {
      const sourceAbs = path.resolve(repoRoot, entry.sourcePath);
      if (!isWithinRoot(repoRoot, sourceAbs) || !fs.existsSync(sourceAbs)) {
        errors.push(`${label} sourcePath does not exist: ${entry.sourcePath}.`);
      }
    }
  }

  for (const [key, entry] of Object.entries(entries)) {
    const label = `Entry ${key}`;
    for (const ref of [
      ...entry.relatedSkills,
      ...entry.relatedSops,
      ...entry.relatedScripts,
      ...entry.relatedPromptTemplates
    ]) {
      if (!Object.prototype.hasOwnProperty.call(entries, ref)) {
        errors.push(`${label} references missing capability id: ${ref}.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function loadCapabilityRegistry(registryPath, repoRoot) {
  if (!fs.existsSync(registryPath)) {
    return { ok: false, error: "Capability registry file not found.", statusCode: 404 };
  }

  let registry;
  try {
    registry = readJsonFile(registryPath);
  } catch (err) {
    return { ok: false, error: "Capability registry JSON is invalid.", details: [err.message], statusCode: 500 };
  }

  const validation = validateRegistry(registry, { repoRoot });
  if (!validation.valid) {
    return { ok: false, error: "Capability registry validation failed.", details: validation.errors, statusCode: 500, registry };
  }

  return { ok: true, registry, validation };
}

function getCapabilityRegistryEntry(registryPath, repoRoot, capabilityId) {
  const loaded = loadCapabilityRegistry(registryPath, repoRoot);
  if (!loaded.ok) return loaded;

  const entry = loaded.registry.entries[capabilityId];
  if (!entry) {
    return { ok: false, error: "Capability not found.", statusCode: 404 };
  }

  return { ok: true, entry };
}

module.exports = {
  getCapabilityRegistryEntry,
  loadCapabilityRegistry,
  validateRegistry
};
