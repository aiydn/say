const { addPersona, getPersona } = require('../../utils/personaManager');
const { uploadFromDiscord } = require('../../utils/uploader');
const { isValidAvatar } = require('../../utils/validateAvatar');
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('persona_add')
    .setDescription('Save a new persona for use with /persona_say')
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('Persona identifier (used to pick it in /say)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('displayname')
        .setDescription('Display name shown as the webhook username')
        .setRequired(true)
    )
    .addAttachmentOption((option) =>
      option
        .setName('avatar')
        .setDescription('Upload an avatar image (PNG, JPEG, GIF, or WebP)')
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName('user1')
        .setDescription('Allow this user to use the persona')
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName('user2')
        .setDescription('Allow this user to use the persona')
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName('user3')
        .setDescription('Allow this user to use the persona')
        .setRequired(false)
    )
    .addRoleOption((option) =>
      option
        .setName('role1')
        .setDescription('Allow anyone with this role to use the persona')
        .setRequired(false)
    )
    .addRoleOption((option) =>
      option
        .setName('role2')
        .setDescription('Allow anyone with this role to use the persona')
        .setRequired(false)
    ),

  async execute(interaction) {
    const personaName = interaction.options.getString('name');
    const displayName = interaction.options.getString('displayname');
    const avatarAttachment = interaction.options.getAttachment('avatar');

    // Uniqueness check (personaName)
    const existingpersonaName = getPersona(interaction.guild.id, personaName);
    if (existingpersonaName) {
      return interaction.reply({
        content: `❌ Persona met de personaName **${personaName}** bestaat al. Gebruik een andere personaName.`,
        ephemeral: true,
      });
    }

    // Uniqueness check (displayName)
    const existingdisplayName = getPersona(interaction.guild.id, displayName);
    if (existingdisplayName) {
      return interaction.reply({
        content: `❌ Persona met de displayName **${displayName}** bestaat al. Gebruik een andere displayName.`,
        ephemeral: true,
      });
    }

    // Image-only check
    if (!isValidAvatar(avatarAttachment)) {
      return interaction.reply({
        content: '❌ Avatar moet wel een afbeelding zijn natuurlijk (PNG, JPEG, GIF, or WebP).',
        ephemeral: true,
      });
    }

    // Upload to uploader
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let uploaderUrl;
    try {
      uploaderUrl = await uploadFromDiscord(avatarAttachment.url);
    } catch (error) {
      console.error('uploader upload error:', error);
      return interaction.editReply({
        content: '❌ Avatar uploader is mislukt',
      });
    }

    const allowedUsers = [
      interaction.options.getUser('user1'),
      interaction.options.getUser('user2'),
      interaction.options.getUser('user3'),
    ]
      .filter(Boolean)
      .map((u) => u.id);

    const allowedRoles = [
      interaction.options.getRole('role1'),
      interaction.options.getRole('role2'),
    ]
      .filter(Boolean)
      .map((r) => r.id);

    addPersona(
      interaction.guild.id,
      interaction.user.id,
      personaName,
      displayName,
      uploaderUrl,
      allowedUsers,
      allowedRoles
    );

    await interaction.editReply({
      content: `✅Gelukt!\nGebruik \`/persona_say persona:${personaName}\` om berichten te sturen als **${displayName}**)\n (avatar url: ${uploaderUrl})`,
    });
  },
};
