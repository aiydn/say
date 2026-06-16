const { SlashCommandBuilder } = require('discord.js');
const {
  getPersona,
  modifyPersona,
  deletePersona,
  isAllowed,
  addAllowedUser,
  removeAllowedUser,
  addAllowedRole,
  removeAllowedRole,
} = require('../../utils/personaManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modify')
    .setDescription('Modify or delete a saved persona')
    .addStringOption((option) =>
      option
        .setName('persona')
        .setDescription('Persona to modify')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('displayname')
        .setDescription('New display name')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('avatar')
        .setDescription('New avatar URL')
        .setRequired(false)
    )
    // ── Allowlist: Users ──
    .addUserOption((option) =>
      option
        .setName('adduser')
        .setDescription('Add a user to the allowlist')
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName('removeuser')
        .setDescription('Remove a user from the allowlist')
        .setRequired(false)
    )
    // ── Allowlist: Roles ──
    .addRoleOption((option) =>
      option
        .setName('addrole')
        .setDescription('Add a role to the allowlist')
        .setRequired(false)
    )
    .addRoleOption((option) =>
      option
        .setName('removerole')
        .setDescription('Remove a role from the allowlist')
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName('delete')
        .setDescription('Delete this persona entirely')
        .setRequired(false)
    ),

  async execute(interaction) {
    const personaName = interaction.options.getString('persona');
    const persona = getPersona(interaction.guild.id, personaName);

    if (!persona) {
      return interaction.reply({
        content: `❌ No persona named **${personaName}** found.`,
        ephemeral: true,
      });
    }

    const memberRoles = interaction.member.roles.cache.map((r) => r.id);

    // ── Permission check: must be on the allowlist ──
    if (!isAllowed(interaction.guild.id, personaName, interaction.user.id, memberRoles)) {
      return interaction.reply({
        content: `❌ You don't have permission to modify **${personaName}**.`,
        ephemeral: true,
      });
    }

    // ── Delete mode ──
    if (interaction.options.getBoolean('delete')) {
      const deleted = deletePersona(interaction.guild.id, personaName);

      // Delete all webhooks associated with this persona
      if (deleted?.webhooks) {
        for (const webhookId of Object.values(deleted.webhooks)) {
          try {
            const webhook = await interaction.client.fetchWebhook(webhookId);
            await webhook.delete();
          } catch {
            // Webhook was already deleted or inaccessible — skip it
          }
        }
      }

      return interaction.reply({
        content: `🗑️ Persona **${personaName}** deleted along with all its webhooks.`,
        ephemeral: true,
      });
    }

    // ── Modify mode ──
    const newDisplayName = interaction.options.getString('displayname');
    const newAvatar = interaction.options.getString('avatar');
    const addUser = interaction.options.getUser('adduser');
    const removeUser = interaction.options.getUser('removeuser');
    const addRole = interaction.options.getRole('addrole');
    const removeRole = interaction.options.getRole('removerole');

    const updates = {};

    if (newDisplayName) updates.displayName = newDisplayName;

    if (newAvatar) {
      try {
        new URL(newAvatar);
        updates.avatar = newAvatar;
      } catch {
        return interaction.reply({
          content: '❌ That doesn\'t look like a valid URL.',
          ephemeral: true,
        });
      }
    }

    if (Object.keys(updates).length > 0) {
      modifyPersona(interaction.guild.id, personaName, updates);
    }

    // ── Allowlist changes ──
    if (addUser) addAllowedUser(interaction.guild.id, personaName, addUser.id);
    if (removeUser) removeAllowedUser(interaction.guild.id, personaName, removeUser.id);
    if (addRole) addAllowedRole(interaction.guild.id, personaName, addRole.id);
    if (removeRole) removeAllowedRole(interaction.guild.id, personaName, removeRole.id);

    // Check if anything was actually changed
    if (
      Object.keys(updates).length === 0 &&
      !addUser && !removeUser && !addRole && !removeRole
    ) {
      return interaction.reply({
        content: '❌ Nothing to change. Provide at least one option to modify.',
        ephemeral: true,
      });
    }

    // Fetch the updated persona to show current state
    const updated = getPersona(interaction.guild.id, personaName);

    const userMentions = updated.allowedUsers.map((id) => `<@${id}>`).join(', ');
    const roleMentions = updated.allowedRoles.map((id) => `<@&${id}>`).join(', ');

    const accessLine = [
      userMentions ? `Users: ${userMentions}` : null,
      roleMentions ? `Roles: ${roleMentions}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    await interaction.reply({
      content: `✅ Persona **${personaName}** updated!\nDisplay: **${updated.displayName}**\nAvatar: ${updated.avatar}\nAccess: ${accessLine}`,
      ephemeral: true,
    });
  },

  async autocomplete(interaction) {
    const { listPersonas, isAllowed } = require('../utils/personaManager');
    const focused = interaction.options.getFocused();
    const memberRoles = interaction.member.roles.cache.map((r) => r.id);

    const personas = listPersonas(interaction.guild.id);

    const choices = personas
      .filter((p) => isAllowed(interaction.guild.id, p.personaName, interaction.user.id, memberRoles))
      .map((p) => ({ name: p.personaName, value: p.personaName }));

    const filtered = choices.filter((c) =>
      c.name.toLowerCase().startsWith(focused.toLowerCase())
    );

    await interaction.respond(filtered.slice(0, 25));
  },
};
