const { SlashCommandBuilder } = require('discord.js');
const { getPersona, setWebhook, isAllowed } = require('../../utils/personaManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Send a message via webhook')
    .addStringOption((option) =>
      option
        .setName('persona')
        .setDescription('Persona to speak as')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('text')
        .setDescription('Text to say')
        .setRequired(false)
    )
    .addAttachmentOption((option) =>
      option
        .setName('attachment')
        .setDescription('Attach a file or image')
        .setRequired(false)
    ),

  async execute(interaction) {
    const personaName = interaction.options.getString('persona');
    const text = interaction.options.getString('text');
    const attachment = interaction.options.getAttachment('attachment');

    if (!text && !attachment) {
      return interaction.reply({
        content: '❌ You must provide either text or an attachment.',
        ephemeral: true,
      });
    }

    const persona = getPersona(interaction.guild.id, personaName);

    if (!persona) {
      return interaction.reply({
        content: `❌ Persona **${personaName}** not found. Create it with \`/add\`.`,
        ephemeral: true,
      });
    }

    // ── Permission check ──
    const memberRoles = interaction.member.roles.cache.map((r) => r.id);
    if (!isAllowed(interaction.guild.id, personaName, interaction.user.id, memberRoles)) {
      return interaction.reply({
        content: `❌ You don't have permission to use the persona **${personaName}**.`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const name = persona.displayName;
    const avatar = persona.avatar;
    const channelId = interaction.channel.id;
    const savedWebhookId = persona.webhooks?.[channelId];
    let webhook = null;

    if (savedWebhookId) {
      try {
        webhook = await interaction.client.fetchWebhook(savedWebhookId);
      } catch {
        webhook = null;
      }
    }

    if (!webhook) {
      webhook = await interaction.channel.createWebhook({
        name,
        avatar,
      });

      setWebhook(
        interaction.guild.id,
        personaName,
        channelId,
        webhook.id
      );
    }

    const sendOptions = {
      username: name,
      avatarURL: avatar,
    };

    if (text) sendOptions.content = text;
    if (attachment) sendOptions.files = [attachment.url];

    await webhook.send(sendOptions);

    await interaction.editReply({
      content: `✅ Message sent as **${name}** in <#${channelId}>`,
    });
  },

  async autocomplete(interaction) {
    const { listPersonas, isAllowed } = require('../utils/personaManager');
    const focused = interaction.options.getFocused();
    const memberRoles = interaction.member.roles.cache.map((r) => r.id);

    const personas = listPersonas(interaction.guild.id);

    // Only show personas the user has access to
    const choices = personas
      .filter((p) => isAllowed(interaction.guild.id, p.personaName, interaction.user.id, memberRoles))
      .map((p) => ({ name: p.personaName, value: p.personaName }));

    const filtered = choices.filter((c) =>
      c.name.toLowerCase().startsWith(focused.toLowerCase())
    );

    await interaction.respond(filtered.slice(0, 25));
  },
};
