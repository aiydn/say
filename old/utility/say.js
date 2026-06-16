const { SlashCommandBuilder, ChannelType } = require('discord.js');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('say')
		.setDescription('Say it')
		.addStringOption((option) =>
			option
				.setName('text')
				.setDescription('Text to say'),
		),
	async execute(interaction) {
		await interaction.deferReply();
		await interaction.deleteReply();
		await interaction.channel.send(`${interaction.options.getString('text')}`);
	}
}