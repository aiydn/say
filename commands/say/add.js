const { SlashCommandBuilder } = require('discord.js');
const { addPersona, getPersona } = require('../../utils/personaManager');

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
    .addStringOption((option) =>
      option
        .setName('avatar')
        .setDescription('Avatar URL for this persona')
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
    const avatar = interaction.options.getString('avatar');

    // Uniqueness check
    const existing = getPersona(interaction.guild.id, personaName);
    if (existing) {
      return interaction.reply({
        content: `❌ A persona named **${personaName}** already exists. Use \`/modify\` to change it, or choose a different name.`,
        ephemeral: true,
      });
    }

    try {
      new URL(avatar);
    } catch {
      return interaction.reply({
        content: '❌ That doesn\'t look like a valid URL.',
        ephemeral: true,
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

    const persona = addPersona(
      interaction.guild.id,
      interaction.user.id,
      personaName,
      displayName,
      avatar,
      allowedUsers,
      allowedRoles
    );

    const userMentions = persona.allowedUsers
      .map((id) => `<@${id}>`)
      .join(', ');
    const roleMentions = persona.allowedRoles
      .map((id) => `<@&${id}>`)
      .join(', ');

    const accessLine = [
      userMentions ? `Users: ${userMentions}` : null,
      roleMentions ? `Roles: ${roleMentions}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    await interaction.reply({
      content: `✅ Persona **${personaName}** saved! (displays as **${displayName}**)\nAccess: ${accessLine}`,
      ephemeral: true,
    });
  },
};
