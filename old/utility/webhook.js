const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('webhook')
    .setDescription('Say it')
    .addStringOption((option) =>
      option
        .setName('text')
        .setDescription('Text to say')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('Custom webhook username')
        .setRequired(false)
    )
    .addAttachmentOption((option) =>
      option
        .setName('avatar')
        .setDescription('Upload a custom avatar image')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    await interaction.deleteReply();

    const text = interaction.options.getString('text');
    const name = interaction.options.getString('name') ?? interaction.user.username;
    const avatarAttachment = interaction.options.getAttachment('avatar');

    // Use the uploaded attachment URL, or fall back to user's avatar
    const avatar = avatarAttachment
      ? avatarAttachment.url
      : interaction.user.displayAvatarURL();

    const channel = interaction.channel;
    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find((w) => w.ownerId === interaction.client.user.id);

    if (!webhook) {
      webhook = await channel.createWebhook({
        name: interaction.client.user.username,
        avatar: interaction.client.user.displayAvatarURL(),
      });
    }

    await webhook.send({
      content: text,
      username: name,
      avatarURL: avatar,
    });
  },
};
