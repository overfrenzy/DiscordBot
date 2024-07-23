const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
require('dotenv').config();

const MODERATOR_ROLE_ID = process.env.MODERATOR_ROLE_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Purge messages in the chat')
    .addStringOption(option =>
      option.setName('time')
        .setDescription('The time period in minutes to purge messages from, or "all" to delete all messages')
        .setRequired(false))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose messages to purge')
        .setRequired(false)),
  
  async execute(interaction) {
    try {
      //console.log('Purge command executed');
      
      if (!interaction.member.roles.cache.has(MODERATOR_ROLE_ID)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }

      const time = interaction.options.getString('time') || '5'; // Default time is 5 minutes if not specified
      const user = interaction.options.getUser('user');

      if (isNaN(time) && time !== 'all') {
        return interaction.reply({ content: 'Invalid time format. Use a number or "all".', ephemeral: true });
      }

      const now = Date.now();
      const timeLimit = time === 'all' ? null : now - parseInt(time) * 60 * 1000;

      //console.log(`time: ${time}, user: ${user ? user.tag : 'none'}, timeLimit: ${timeLimit}`);

      if (user) {
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('local')
              .setLabel('Local')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('global')
              .setLabel('Global')
              .setStyle(ButtonStyle.Danger)
          );

        const firstMessage = await interaction.reply({
          content: `Do you want to purge messages from ${user.tag} locally (this channel) or globally (all channels)?`,
          components: [row],
          ephemeral: true,
        });

        const filter = i => i.user.id === interaction.user.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, max: 1, time: 15000 });

        collector.on('collect', async i => {
          await i.deferUpdate();

          let messagesToDelete = [];
          let channelsToPurge = [interaction.channel];

          if (i.customId === 'global') {
            channelsToPurge = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).values();
          }

          for (const channel of channelsToPurge) {
            const fetchedMessages = await channel.messages.fetch({ limit: 100 });
            fetchedMessages.forEach(message => {
              if (message.author.id === user.id && (timeLimit === null || message.createdTimestamp >= timeLimit)) {
                messagesToDelete.push(message);
              }
            });
          }

          //console.log(`messagesToDelete length: ${messagesToDelete.length}`);

          if (messagesToDelete.length === 0) {
            await firstMessage.delete();
            return interaction.followUp({ content: 'No messages found to purge.', ephemeral: true });
          }

          const rowConfirm = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('confirm')
                .setLabel('Yes')
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId('cancel')
                .setLabel('No')
                .setStyle(ButtonStyle.Secondary)
            );

          await interaction.editReply({ content: `Are you sure you want to purge ${messagesToDelete.length} messages? This action cannot be undone.`, components: [rowConfirm] });

          const confirmFilter = i => i.user.id === interaction.user.id;

          const confirmCollector = interaction.channel.createMessageComponentCollector({ filter: confirmFilter, max: 1, time: 15000 });

          confirmCollector.on('collect', async i => {
            await i.deferUpdate();
            if (i.customId === 'confirm') {
              try {
                let deletedCount = 0;
                for (const message of messagesToDelete) {
                  await message.delete();
                  deletedCount++;
                }
                //(`Deleted messages count: ${deletedCount}`);
                await i.followUp({ content: `Successfully purged ${deletedCount} messages.`, ephemeral: true });
                await firstMessage.delete(); // Delete the original confirmation message
              } catch (error) {
                console.error('Failed to delete messages:', error);
                await i.followUp({ content: 'Failed to delete messages.', ephemeral: true });
              }
            } else {
              await i.followUp({ content: 'Purge cancelled.', ephemeral: true });
              await firstMessage.delete(); // Delete the original confirmation message
            }
          });

          confirmCollector.on('end', async collected => {
            if (collected.size === 0) {
              //console.log('No response collected');
              await interaction.followUp({ content: 'No response, purge cancelled.', ephemeral: true });
              await firstMessage.delete(); // Delete the original confirmation message
            }
          });
        });

        collector.on('end', async collected => {
          if (collected.size === 0) {
            //console.log('No response collected');
            await interaction.followUp({ content: 'No response, purge cancelled.', ephemeral: true });
            await firstMessage.delete(); // Delete the original confirmation message
          }
        });

      } else {
        const fetchedMessages = await interaction.channel.messages.fetch({ limit: 100 });
        const messagesToDelete = [];

        fetchedMessages.forEach(message => {
          if (time === 'all' || message.createdTimestamp >= timeLimit) {
            messagesToDelete.push(message);
          }
        });

        //console.log(`messagesToDelete length: ${messagesToDelete.length}`);

        if (messagesToDelete.length === 0) {
          return interaction.reply({ content: 'No messages found to purge.', ephemeral: true });
        }

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('confirm')
              .setLabel('Yes')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('cancel')
              .setLabel('No')
              .setStyle(ButtonStyle.Secondary)
          );

        const firstMessage = await interaction.reply({
          content: `Are you sure you want to purge ${messagesToDelete.length} messages? This action cannot be undone.`,
          components: [row],
          ephemeral: true,
        });

        const filter = i => i.user.id === interaction.user.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, max: 1, time: 15000 });

        collector.on('collect', async i => {
          await i.deferUpdate();
          if (i.customId === 'confirm') {
            try {
              let deletedCount = 0;
              for (const message of messagesToDelete) {
                await message.delete();
                deletedCount++;
              }
              //console.log(`Deleted messages count: ${deletedCount}`);
              await i.followUp({ content: `Successfully purged ${deletedCount} messages.`, ephemeral: true });
              await firstMessage.delete(); // Delete the original confirmation message
            } catch (error) {
              console.error('Failed to delete messages:', error);
              await i.followUp({ content: 'Failed to delete messages.', ephemeral: true });
            }
          } else {
            await i.followUp({ content: 'Purge cancelled.', ephemeral: true });
            await firstMessage.delete(); // Delete the original confirmation message
          }
        });

        collector.on('end', async collected => {
          if (collected.size === 0) {
            //console.log('No response collected');
            await interaction.followUp({ content: 'No response, purge cancelled.', ephemeral: true });
            await firstMessage.delete(); // Delete the original confirmation message
          }
        });
      }

    } catch (error) {
      console.error('Error executing purge command:', error);
      interaction.reply({ content: 'An error occurred while executing the purge command.', ephemeral: true });
    }
  },
};
