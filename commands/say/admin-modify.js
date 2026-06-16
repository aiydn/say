const config = require('../../config.json');
const {
  getPersona,
  modifyPersona,
  deletePersona,
  addAllowedUser,
  removeAllowedUser,
  addAllowedRole,
  removeAllowedRole,
} = require('../../utils/personaManager');
const { uploadFromDiscord } = require('../../utils/uploader');
const { isValidAvatar } = require('../../utils/validateAvatar');
const { SlashCommandBuilder, MessageFlags } = require('discord.js');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-modify')
    .setDescription('Modify or delete any persona')
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
    .addAttachmentOption((option) =>
      option
        .setName('avatar')
        .setDescription('Upload a new avatar image')
        .setRequired(false)
    )
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
    if (interaction.user.id !== config.ownerId) {
      return interaction.reply({
        content: `Volgens mij denkt <@${interaction.user.id}> grappig te zijn, MAAR DAT IS DUS NIET ZO😭`,
        ephemeral: true,
      });
    }

    const personaName = interaction.options.getString('persona');
    const persona = getPersona(interaction.guild.id, personaName);

    if (!persona) {
      return interaction.reply({
        content: `❌ No persona named **${personaName}** found.`,
        ephemeral: true,
      });
    }

    // ── Delete mode ──
    if (interaction.options.getBoolean('delete')) {
      const deleted = deletePersona(interaction.guild.id, personaName);

      if (deleted?.webhooks) {
        for (const webhookId of Object.values(deleted.webhooks)) {
          try {
            const webhook = await interaction.client.fetchWebhook(webhookId);
            await webhook.delete();
          } catch { }
        }
      }

      return interaction.reply({
        content: `🗑️ Persona **${personaName}** deleted along with all its webhooks.`,
        ephemeral: true,
      });
    }

    // ── Modify mode ──
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const newDisplayName = interaction.options.getString('displayname');
    const avatarAttachment = interaction.options.getAttachment('avatar');
    const addUser = interaction.options.getUser('adduser');
    const removeUser = interaction.options.getUser('removeuser');
    const addRole = interaction.options.getRole('addrole');
    const removeRole = interaction.options.getRole('removerole');

    const updates = {};

    if (newDisplayName) updates.displayName = newDisplayName;

    if (avatarAttachment) {
      if (!isValidAvatar(avatarAttachment)) {
        return interaction.editReply({
          content: '❌ Avatar must be an image file (PNG, JPEG, GIF, or WebP).',
        });
      }
      try {
        updates.avatar = await uploadFromDiscord(avatarAttachment.url);
      } catch (error) {
        console.error('uploader upload error:', error);
        return interaction.editReply({
          content: '❌ Failed to upload avatar to uploader. Please try again.',
        });
      }
    }


    if (Object.keys(updates).length > 0) {
      modifyPersona(interaction.guild.id, personaName, updates);
    }

    if (addUser) addAllowedUser(interaction.guild.id, personaName, addUser.id);
    if (removeUser) removeAllowedUser(interaction.guild.id, personaName, removeUser.id);
    if (addRole) addAllowedRole(interaction.guild.id, personaName, addRole.id);
    if (removeRole) removeAllowedRole(interaction.guild.id, personaName, removeRole.id);

    if (
      Object.keys(updates).length === 0 &&
      !addUser && !removeUser && !addRole && !removeRole
    ) {
      return interaction.editReply({
        content: '❌ Nothing to change. Provide at least one option to modify.',
      });
    }

    const updated = getPersona(interaction.guild.id, personaName);

    const userMentions = updated.allowedUsers.map((id) => `<@${id}>`).join(', ');
    const roleMentions = updated.allowedRoles.map((id) => `<@&${id}>`).join(', ');

    const accessLine = [
      userMentions ? `Users: ${userMentions}` : null,
      roleMentions ? `Roles: ${roleMentions}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    await interaction.editReply({
      content: `✅ Persona **${personaName}** updated!\nDisplay: **${updated.displayName}**\nAvatar: ${updated.avatar}\nAccess: ${accessLine}`,
    });
  },

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name !== 'persona') return;

    const { listPersonas } = require('../../utils/personaManager');
    const focused = focusedOption.value;

    const personas = listPersonas(interaction.guild.id);
    const choices = personas.map((p) => ({ name: p.personaName, value: p.personaName }));
    const filtered = choices.filter((c) =>
      c.name.toLowerCase().startsWith(focused.toLowerCase())
    );

    await interaction.respond(filtered.slice(0, 25));
  },
};
