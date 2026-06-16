const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '..', 'personas.json');

function load() {
  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify({ personas: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
}

function save(data) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

function key(guildId, personaName) {
  return `${guildId}_${personaName.toLowerCase()}`;
}

// ── CRUD ──

function addPersona(guildId, userId, personaName, displayName, avatar, allowedUsers = [], allowedRoles = []) {
  const data = load();
  const k = key(guildId, personaName);
  data.personas[k] = {
    personaName,
    displayName,
    avatar,
    createdBy: userId,
    allowedUsers: [...new Set([userId, ...allowedUsers])],  // creator always included
    allowedRoles: [...new Set(allowedRoles)],
    webhooks: {},
  };
  save(data);
  return data.personas[k];
}

function getPersona(guildId, personaName) {
  const data = load();
  const k = key(guildId, personaName);
  return data.personas[k] ?? null;
}

function listPersonas(guildId) {
  const data = load();
  const prefix = `${guildId}_`;
  return Object.entries(data.personas)
    .filter(([k]) => k.startsWith(prefix))
    .map(([, v]) => v);
}

function deletePersona(guildId, personaName) {
  const data = load();
  const k = key(guildId, personaName);
  if (!data.personas[k]) return null;

  // Save the persona data so we can clean up its webhooks
  const persona = { ...data.personas[k] };
  delete data.personas[k];
  save(data);
  return persona;  // returns the deleted persona with webhooks map
}


function setWebhook(guildId, personaName, channelId, webhookId) {
  const data = load();
  const k = key(guildId, personaName);
  if (!data.personas[k]) return null;
  data.personas[k].webhooks[channelId] = webhookId;
  save(data);
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
  const data = load();
  const k = key(guildId, personaName);
  if (!data.personas[k]) return null;
  if (!data.personas[k].allowedUsers.includes(userId)) {
    data.personas[k].allowedUsers.push(userId);
  }
  save(data);
  return data.personas[k];
}

function removeAllowedUser(guildId, personaName, userId) {
  const data = load();
  const k = key(guildId, personaName);
  if (!data.personas[k]) return null;
  data.personas[k].allowedUsers = data.personas[k].allowedUsers.filter(
    (id) => id !== userId
  );
  save(data);
  return data.personas[k];
}

function addAllowedRole(guildId, personaName, roleId) {
  const data = load();
  const k = key(guildId, personaName);
  if (!data.personas[k]) return null;
  if (!data.personas[k].allowedRoles.includes(roleId)) {
    data.personas[k].allowedRoles.push(roleId);
  }
  save(data);
  return data.personas[k];
}

function removeAllowedRole(guildId, personaName, roleId) {
  const data = load();
  const k = key(guildId, personaName);
  if (!data.personas[k]) return null;
  data.personas[k].allowedRoles = data.personas[k].allowedRoles.filter(
    (id) => id !== roleId
  );
  save(data);
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
