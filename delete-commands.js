const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');

const rest = new REST().setToken(token);

// ...

// for guild-based commands
for (const id of guildId) {

rest
	.put(Routes.applicationGuildCommands(clientId, id), { body: [] })
	.then(() => console.log('Successfully deleted all guild commands.'))
	.catch(console.error);
}
// for global commands
rest
	.put(Routes.applicationCommands(clientId), { body: [] })
	.then(() => console.log('Successfully deleted all application commands.'))
	.catch(console.error);