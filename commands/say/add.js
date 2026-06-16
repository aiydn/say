const { addPersona, getPersona } = require('../../utils/personaManager');
const { uploadFromDiscord } = require('../../utils/catbox');
const { isValidAvatar } = require('../../utils/validateAvatar');
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Save a new persona for use with /say')
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

    // Uniqueness check
    const existing = getPersona(interaction.guild.id, personaName);
    if (existing) {
      return interaction.reply({
        content: `❌ A persona named **${personaName}** already exists. Use \`/modify\` to change it, or choose a different name.`,
        ephemeral: true,
      });
    }

    // Image-only check
    if (!isValidAvatar(avatarAttachment)) {
      return interaction.reply({
        content: '❌ Avatar must be an image file (PNG, JPEG, GIF, or WebP).',
        ephemeral: true,
      });
    }

    // Upload to Catbox
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let catboxUrl;
    try {
      catboxUrl = await uploadFromDiscord(avatarAttachment.url);
    } catch (error) {
      console.error('Catbox upload error:', error);
      return interaction.editReply({
        content: '❌ Failed to upload avatar to Catbox. Please try again.',
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
      catboxUrl,
      allowedUsers,
      allowedRoles
    );

    await interaction.editReply({
      content: `✅ Persona **${personaName}** saved! (displays as **${displayName}**)\nAvatar: ${catboxUrl}`,
    });
  },
};
