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
    .setName('persona_admin')
    .setDescription('admin stuff')
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
        content: `Volgens mij denkt <@${interaction.user.id}> grappig te zijn, MAAR DAT IS DUS NIET ZO 😭`,
        ephemeral: true,
      });
    }

    const personaName = interaction.options.getString('persona');
    const persona = getPersona(interaction.guild.id, personaName);

    if (!persona) {
      return interaction.reply({
        content: `❌ Geen persona met de naam **${personaName}** gevonden.`,
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
        content: `🗑️ Persona **${personaName}** is verwijderd.`,
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
    // Uniqueness check (displayName)
    const existingdisplayName = getPersona(interaction.guild.id, displayName);
    if (existingdisplayName) {
      return interaction.reply({
        content: `❌ Er bestaat al een persona met de personaName **${displayName}**!`,
        ephemeral: true,
      });
    }
    if (newDisplayName) updates.displayName = newDisplayName;

    if (avatarAttachment) {
      if (!isValidAvatar(avatarAttachment)) {
        return interaction.editReply({
          content: '❌ Avatar moet wel een afbeelding zijn natuurlijk (PNG, JPEG, GIF, or WebP).',
        });
      }
      try {
        updates.avatar = await uploadFromDiscord(avatarAttachment.url);
      } catch (error) {
        console.error('uploader upload error:', error);
        return interaction.editReply({
          content: '❌ Avatar uploaden is mislukt, Probeer opnieuw.',
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
        content: '❌ Er valt zo niets te veranderen. Geeft aan wat je wil veranderen.',
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
