const { Client } = require('discord.js-selfbot-v13');
const client = new Client();
const config = require('./config.json');
const environmentConfig = config['settings'];

function Delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

client.on('ready', async () => {
  console.log(`${client.user.username} is ready!`);

  if (!environmentConfig.user_id_of_person) {
    console.error("NEED USER ID!");
    return;
  }

  if (!environmentConfig.discord_token) {
    console.error("NEED DISCORD TOKEN");
    return;
  }

  try {
    const user = await client.users.fetch(environmentConfig.user_id_of_person);
    if (!user) return;

    const channel = await user.createDM();
    if (!channel) return;

    await channel.messages.fetch().forEach(async message => {
      if (message.author.id != environmentConfig.user_id_of_person) {
        await Delay(1000);
        await message.delete();
      }
    });
  } catch (error) {
    console.error(error);
  }
});

client.login(environmentConfig.discord_token);
