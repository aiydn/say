const fs = require('fs');
const path = require('path');

const DIR_PATH = path.join(__dirname, '..', 'data');

function filePath(guildId) {
  return path.join(DIR_PATH, `personas_${guildId}.json`);
}

function load(guildId) {
  // Make sure the data directory exists
  if (!fs.existsSync(DIR_PATH)) {
    fs.mkdirSync(DIR_PATH, { recursive: true });
  }

  const fp = filePath(guildId);

  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, JSON.stringify({ personas: {} }, null, 2));
  }

  return JSON.parse(fs.readFileSync(fp, 'utf-8'));
}

function save(guildId, data) {
  const fp = filePath(guildId);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
}

function key(personaName) {
  return personaName.toLowerCase();
}

// ── CRUD ──

function addPersona(guildId, userId, personaName, displayName, avatar, allowedUsers = [], allowedRoles = []) {
  const data = load(guildId);
  const k = key(personaName);
  data.personas[k] = {
    personaName,
    displayName,
    avatar,
    createdBy: userId,
    allowedUsers: [...new Set([userId, ...allowedUsers])],
    allowedRoles: [...new Set(allowedRoles)],
    webhooks: {},
  };
  save(guildId, data);
  return data.personas[k];
}

function getPersona(guildId, personaName) {
  const data = load(guildId);
  const k = key(personaName);
  return data.personas[k] ?? null;
}

function listPersonas(guildId) {
  const data = load(guildId);
  return Object.values(data.personas);
}

function deletePersona(guildId, personaName) {
  const data = load(guildId);
  const k = key(personaName);
  if (!data.personas[k]) return null;
  const persona = { ...data.personas[k] };
  delete data.personas[k];
  save(guildId, data);
  return persona;
}

function setWebhook(guildId, personaName, channelId, webhookId) {
  const data = load(guildId);
  const k = key(personaName);
  if (!data.personas[k]) return null;
  data.personas[k].webhooks[channelId] = webhookId;
  save(guildId, data);
  return data.personas[k];
}

// ── Allowlist ──

function isAllowed(guildId, personaName, userId, memberRoles = []) {
  const persona = getPersona(guildId, personaName);
  if (!persona) return false;
  if (persona.allowedUsers.includes(userId)) return true;
  if (memberRoles.some((r) => persona.allowedRoles.includes(r))) return true;
  return false;
}

function addAllowedUser(guildId, personaName, userId) {
  const data = load(guildId);
  const k = key(personaName);
  if (!data.personas[k]) return null;
  if (!data.personas[k].allowedUsers.includes(userId)) {
    data.personas[k].allowedUsers.push(userId);
  }
  save(guildId, data);
  return data.personas[k];
}

function removeAllowedUser(guildId, personaName, userId) {
  const data = load(guildId);
  const k = key(personaName);
  if (!data.personas[k]) return null;
  data.personas[k].allowedUsers = data.personas[k].allowedUsers.filter(
    (id) => id !== userId
  );
  save(guildId, data);
  return data.personas[k];
}

function addAllowedRole(guildId, personaName, roleId) {
  const data = load(guildId);
  const k = key(personaName);
  if (!data.personas[k]) return null;
  if (!data.personas[k].allowedRoles.includes(roleId)) {
    data.personas[k].allowedRoles.push(roleId);
  }
  save(guildId, data);
  return data.personas[k];
}

function removeAllowedRole(guildId, personaName, roleId) {
  const data = load(guildId);
  const k = key(personaName);
  if (!data.personas[k]) return null;
  data.personas[k].allowedRoles = data.personas[k].allowedRoles.filter(
    (id) => id !== roleId
  );
  save(guildId, data);
  return data.personas[k];
}

module.exports = {
  addPersona,
  getPersona,
  listPersonas,
  deletePersona,
  setWebhook,
  isAllowed,
  addAllowedUser,
  removeAllowedUser,
  addAllowedRole,
  removeAllowedRole,
};
