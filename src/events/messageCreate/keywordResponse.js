const { Events, ChannelType } = require("discord.js");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Define multiple sets of keywords and their corresponding emojis
    const keywordSets = [
      {
        keywords: ["league", "league of legends"],
        responses: ["1265265097215971370", "1264702327835856917"], // <:eww:1265265097215971370> <:ReallyMad:1264702327835856917>
      },
      {
        keywords: ["korin", "korinpotato"],
        responses: ["1265281958284623882"], // <a:SCHIZO:1265281958284623882>
      },
    ];

    // Define user IDs and role IDs and their corresponding emojis
    const mentionSets = [
      {
        ids: ["242289634275622912"], // KorinPotato
        responses: ["1265281958284623882"], // <a:SCHIZO:1265281958284623882>
      },
      {
        ids: ["292647011226877953"], // overfrenzy
        responses: ["1264712386263384179"], // <:SUS:1264712386263384179>
      },
    ];

    // Check if the message content includes any of the keywords from any set
    let foundResponse = null;
    for (const set of keywordSets) {
      const foundKeyword = set.keywords.find((keyword) =>
        message.content.toLowerCase().includes(keyword.toLowerCase())
      );
      if (foundKeyword) {
        // Select a random response from the corresponding set
        foundResponse =
          set.responses[Math.floor(Math.random() * set.responses.length)];
        break;
      }
    }

    // Check if the message mentions any of the specific user IDs or role IDs
    if (!foundResponse) {
      for (const set of mentionSets) {
        const foundId = set.ids.find(
          (id) =>
            message.mentions.users.has(id) || message.mentions.roles.has(id)
        );
        if (foundId) {
          // Select a random response from the corresponding set
          foundResponse =
            set.responses[Math.floor(Math.random() * set.responses.length)];
          break;
        }
      }
    }

    // React with the found response if any
    if (foundResponse) {
      //message.react(foundResponse); // React (if you react without the proper emoji it will crash)
      message.channel.send(foundResponse); // Send message
    }

    // Check if the message mentions the bot role, the bot, or is a direct message to the bot
    const botMentioned = message.mentions.has(message.client.user);
    const roleMentioned = message.mentions.roles?.has("1264427452235644985");
    const isDirectMessage = message.channel.type === ChannelType.DM;

    if (botMentioned || roleMentioned || isDirectMessage) {
      message.channel.send("<a:LaughingAtYou:1265275861460975730>");
    }
  },
};
