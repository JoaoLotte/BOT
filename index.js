import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, ChannelSelectMenuBuilder, StringSelectMenuBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const products = new Map();
const paymentMethods = new Map();
const carts = new Map();
const pendingActions = new Map();
const botConfig = new Map();

client.on('ready', () => {
  console.log(`Bot está online como ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (message.content === '!setup') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('create_product')
          .setLabel('Criar Produto')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('send_embed')
          .setLabel('Enviar Embed')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('payment_methods')
          .setLabel('Configurar Métodos')
          .setStyle(ButtonStyle.Secondary)
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('send_message')
          .setLabel('Enviar Mensagens')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('remove_product')
          .setLabel('Remover Produto')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('edit_product')
          .setLabel('Editar Produto')
          .setStyle(ButtonStyle.Secondary)
      );

    const row3 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('bot_config')
          .setLabel('Configurar Bot')
          .setStyle(ButtonStyle.Secondary)
      );

    const embed = new EmbedBuilder()
      .setTitle('Painel de Vendas')
      .setDescription('Selecione uma opção abaixo:')
      .setColor('#0099ff');

    await message.channel.send({ embeds: [embed], components: [row, row2, row3] });
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (!interaction.isModalSubmit() && !interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isChannelSelectMenu()) {
      return;
    }

    if (interaction.isButton()) {
      switch (interaction.customId) {
        case 'bot_config': {
          if (!interaction.isRepliable()) {
            console.error('Interaction is not repliable');
            return;
          }

          const configModal = new ModalBuilder()
            .setCustomId('bot_config_modal')
            .setTitle('Configurar Bot');

          const avatarInput = new TextInputBuilder()
            .setCustomId('avatar_url')
            .setLabel('URL do Avatar')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const privateLogsInput = new TextInputBuilder()
            .setCustomId('private_logs_channel')
            .setLabel('ID do Canal de Logs Privadas')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const adminRoleInput = new TextInputBuilder()
            .setCustomId('admin_role')
            .setLabel('ID do Cargo de Admin')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const publicLogsInput = new TextInputBuilder()
            .setCustomId('public_logs_channel')
            .setLabel('ID do Canal de Logs Públicas')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const customerRoleInput = new TextInputBuilder()
            .setCustomId('customer_role')
            .setLabel('ID do Cargo de Cliente')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          configModal.addComponents(
            new ActionRowBuilder().addComponents(avatarInput),
            new ActionRowBuilder().addComponents(privateLogsInput),
            new ActionRowBuilder().addComponents(adminRoleInput),
            new ActionRowBuilder().addComponents(publicLogsInput),
            new ActionRowBuilder().addComponents(customerRoleInput)
          );

          try {
            await interaction.showModal(configModal);
          } catch (error) {
            console.error('Error showing modal:', error);
            await interaction.reply({
              content: 'Ocorreu um erro ao abrir o formulário.',
              flags: 64
            });
          }
          break;
        }

        case 'create_product': {
          if (!interaction.isRepliable()) {
            console.error('Interaction is not repliable');
            return;
          }

          const modal = new ModalBuilder()
            .setCustomId('product_modal')
            .setTitle('Criar Produto');

          const nameInput = new TextInputBuilder()
            .setCustomId('name')
            .setLabel('Nome do Produto')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const descriptionInput = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Descrição')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

          const priceInput = new TextInputBuilder()
            .setCustomId('price')
            .setLabel('Preço')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const idInput = new TextInputBuilder()
            .setCustomId('productId')
            .setLabel('ID do Produto')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const colorInput = new TextInputBuilder()
            .setCustomId('color')
            .setLabel('Cor (Hexadecimal)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#000000')
            .setRequired(true);

          modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(descriptionInput),
            new ActionRowBuilder().addComponents(priceInput),
            new ActionRowBuilder().addComponents(idInput),
            new ActionRowBuilder().addComponents(colorInput)
          );

          try {
            await interaction.showModal(modal);
          } catch (error) {
            console.error('Error showing modal:', error);
            await interaction.reply({
              content: 'Ocorreu um erro ao abrir o formulário.',
              flags: 64
            });
          }
          break;
        }

        case 'send_embed': {
          const productOptions = Array.from(products.entries()).map(([id, product]) => ({
            label: product.name.slice(0, 25),
            value: id,
            description: `R$ ${product.price}`.slice(0, 50)
          }));

          if (productOptions.length === 0) {
            await interaction.reply({
              content: 'Não há produtos cadastrados.',
              flags: 64
            });
            return;
          }

          const productSelect = new StringSelectMenuBuilder()
            .setCustomId('select_product_embed')
            .setPlaceholder('Selecione o produto')
            .addOptions(productOptions);

          const row = new ActionRowBuilder().addComponents(productSelect);

          await interaction.reply({
            content: 'Selecione o produto para enviar:',
            components: [row],
            flags: 64
          });
          break;
        }

        case 'send_message': {
          if (!interaction.isRepliable()) {
            console.error('Interaction is not repliable');
            return;
          }

          const messageModal = new ModalBuilder()
            .setCustomId('message_modal')
            .setTitle('Enviar Mensagem');

          const messageInput = new TextInputBuilder()
            .setCustomId('message_content')
            .setLabel('Mensagem')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

          messageModal.addComponents(
            new ActionRowBuilder().addComponents(messageInput)
          );

          try {
            await interaction.showModal(messageModal);
          } catch (error) {
            console.error('Error showing modal:', error);
            await interaction.reply({
              content: 'Ocorreu um erro ao abrir o formulário.',
              flags: 64
            });
          }
          break;
        }

        case 'remove_product': {
          if (!interaction.isRepliable()) {
            console.error('Interaction is not repliable');
            return;
          }

          const removeModal = new ModalBuilder()
            .setCustomId('remove_product_modal')
            .setTitle('Remover Produto');

          const removeIdInput = new TextInputBuilder()
            .setCustomId('remove_id')
            .setLabel('ID do Produto')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          removeModal.addComponents(
            new ActionRowBuilder().addComponents(removeIdInput)
          );

          try {
            await interaction.showModal(removeModal);
          } catch (error) {
            console.error('Error showing modal:', error);
            await interaction.reply({
              content: 'Ocorreu um erro ao abrir o formulário.',
              flags: 64
            });
          }
          break;
        }

        case 'edit_product': {
          if (!interaction.isRepliable()) {
            console.error('Interaction is not repliable');
            return;
          }

          const editModal = new ModalBuilder()
            .setCustomId('edit_product_modal')
            .setTitle('Editar Produto');

          const idInput = new TextInputBuilder()
            .setCustomId('edit_id')
            .setLabel('ID do Produto')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const nameInput = new TextInputBuilder()
            .setCustomId('edit_name')
            .setLabel('Nome do Produto')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const descriptionInput = new TextInputBuilder()
            .setCustomId('edit_description')
            .setLabel('Descrição')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

          const priceInput = new TextInputBuilder()
            .setCustomId('edit_price')
            .setLabel('Preço')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const colorInput = new TextInputBuilder()
            .setCustomId('edit_color')
            .setLabel('Cor (Hexadecimal)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          editModal.addComponents(
            new ActionRowBuilder().addComponents(idInput),
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(descriptionInput),
            new ActionRowBuilder().addComponents(priceInput),
            new ActionRowBuilder().addComponents(colorInput)
          );

          try {
            await interaction.showModal(editModal);
          } catch (error) {
            console.error('Error showing modal:', error);
            await interaction.reply({
              content: 'Ocorreu um erro ao abrir o formulário.',
              flags: 64
            });
          }
          break;
        }

        case 'payment_methods': {
          if (!interaction.isRepliable()) {
            console.error('Interaction is not repliable');
            return;
          }

          const paymentModal = new ModalBuilder()
            .setCustomId('payment_modal')
            .setTitle('Configurar Métodos de Pagamento');

          const pixInput = new TextInputBuilder()
            .setCustomId('pix_key')
            .setLabel('Chave PIX')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const paypalInput = new TextInputBuilder()
            .setCustomId('paypal_key')
            .setLabel('Email PayPal')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          paymentModal.addComponents(
            new ActionRowBuilder().addComponents(pixInput),
            new ActionRowBuilder().addComponents(paypalInput)
          );

          try {
            await interaction.showModal(paymentModal);
          } catch (error) {
            console.error('Error showing modal:', error);
            await interaction.reply({
              content: 'Ocorreu um erro ao abrir o formulário.',
              flags: 64
            });
          }
          break;
        }

        case 'buy_product': {
          const productId = interaction.message.embeds[0].footer.text;
          const product = products.get(productId);
          
          if (!product) {
            await interaction.reply({ 
              content: 'Produto não encontrado.',
              flags: 64
            });
            return;
          }

          const category = interaction.channel.parent;
          const channelName = `carrinho-${interaction.user.username}`;
          
          const cartChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category,
            permissionOverwrites: [
              {
                id: interaction.guild.id,
                deny: ['ViewChannel'],
              },
              {
                id: interaction.user.id,
                allow: ['ViewChannel', 'SendMessages'],
              },
            ],
          });

          const cart = {
            userId: interaction.user.id,
            product,
            quantity: 1,
            channelId: cartChannel.id
          };

          carts.set(cartChannel.id, cart);

          await updateCartEmbed(cartChannel, cart);
          await interaction.reply({ 
            content: `Carrinho criado em ${cartChannel}`,
            flags: 64
          });
          break;
        }

        case 'increase_quantity': {
          const increaseCart = carts.get(interaction.channel.id);
          if (increaseCart) {
            increaseCart.quantity += 1;
            await updateCartEmbed(interaction.channel, increaseCart);
            await interaction.deferUpdate();
          }
          break;
        }

        case 'decrease_quantity': {
          const decreaseCart = carts.get(interaction.channel.id);
          if (decreaseCart && decreaseCart.quantity > 1) {
            decreaseCart.quantity -= 1;
            await updateCartEmbed(interaction.channel, decreaseCart);
            await interaction.deferUpdate();
          }
          break;
        }

        case 'continue_purchase': {
          const continueCart = carts.get(interaction.channel.id);
          if (continueCart) {
            const paymentRow = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('pay_pix')
                  .setLabel('Pagar com PIX')
                  .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                  .setCustomId('pay_paypal')
                  .setLabel('Pagar com PayPal')
                  .setStyle(ButtonStyle.Primary)
              );

            await interaction.reply({
              content: 'Selecione o método de pagamento:',
              components: [paymentRow]
            });
          }
          break;
        }

        case 'pay_pix': {
          const pixKey = paymentMethods.get('pix');
          if (pixKey) {
            await interaction.reply({
              content: `Chave PIX para pagamento: \`${pixKey}\`\n\nApós o pagamento, envie o comprovante neste canal.`,
              flags: 64
            });
          }
          break;
        }

        case 'pay_paypal': {
          const paypalEmail = paymentMethods.get('paypal');
          if (paypalEmail) {
            await interaction.reply({
              content: `Email PayPal para pagamento: \`${paypalEmail}\`\n\nApós o pagamento, envie o comprovante neste canal.`,
              flags: 64
            });
          }
          break;
        }

        case 'close_cart': {
          if (interaction.channel.name.startsWith('carrinho-')) {
            carts.delete(interaction.channel.id);
            await interaction.channel.delete();
          }
          break;
        }
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'bot_config_modal') {
        const avatarUrl = interaction.fields.getTextInputValue('avatar_url');
        const privateLogsChannel = interaction.fields.getTextInputValue('private_logs_channel');
        const adminRole = interaction.fields.getTextInputValue('admin_role');
        const publicLogsChannel = interaction.fields.getTextInputValue('public_logs_channel');
        const customerRole = interaction.fields.getTextInputValue('customer_role');

        try {
          // Update bot avatar
          await client.user.setAvatar(avatarUrl);

          // Store configurations
          botConfig.set('privateLogsChannel', privateLogsChannel);
          botConfig.set('adminRole', adminRole);
          botConfig.set('publicLogsChannel', publicLogsChannel);
          botConfig.set('customerRole', customerRole);

          await interaction.reply({
            content: 'Configurações do bot atualizadas com sucesso!',
            flags: 64
          });
        } catch (error) {
          console.error('Error updating bot config:', error);
          await interaction.reply({
            content: 'Ocorreu um erro ao atualizar as configurações do bot.',
            flags: 64
          });
        }
      }

      if (interaction.customId === 'product_modal') {
        const name = interaction.fields.getTextInputValue('name');
        const description = interaction.fields.getTextInputValue('description');
        const price = interaction.fields.getTextInputValue('price');
        const productId = interaction.fields.getTextInputValue('productId');
        const color = interaction.fields.getTextInputValue('color');

        products.set(productId, {
          name,
          description,
          price,
          color
        });

        await interaction.reply({ 
          content: 'Produto criado com sucesso!',
          flags: 64
        });
      }

      if (interaction.customId === 'message_modal') {
        const messageContent = interaction.fields.getTextInputValue('message_content');
        pendingActions.set(interaction.user.id, { type: 'message', content: messageContent });

        const channelSelect = new ChannelSelectMenuBuilder()
          .setCustomId('select_channel_message')
          .setPlaceholder('Selecione o canal')
          .setChannelTypes(ChannelType.GuildText);

        const row = new ActionRowBuilder().addComponents(channelSelect);

        await interaction.reply({
          content: 'Agora selecione o canal para enviar a mensagem:',
          components: [row],
          flags: 64
        });
      }

      if (interaction.customId === 'remove_product_modal') {
        const productId = interaction.fields.getTextInputValue('remove_id');
        
        if (products.has(productId)) {
          products.delete(productId);
          await interaction.reply({ 
            content: 'Produto removido com sucesso!',
            flags: 64
          });
        } else {
          await interaction.reply({ 
            content: 'Produto não encontrado!',
            flags: 64
          });
        }
      }

      if (interaction.customId === 'edit_product_modal') {
        const productId = interaction.fields.getTextInputValue('edit_id');
        const name = interaction.fields.getTextInputValue('edit_name');
        const description = interaction.fields.getTextInputValue('edit_description');
        const price = interaction.fields.getTextInputValue('edit_price');
        const color = interaction.fields.getTextInputValue('edit_color');

        if (!products.has(productId)) {
          await interaction.reply({ 
            content: 'Produto não encontrado!',
            flags: 64
          });
          return;
        }

        products.set(productId, {
          name,
          description,
          price,
          color
        });

        await interaction.reply({ 
          content: 'Produto atualizado com sucesso!',
          flags: 64
        });
      }

      if (interaction.customId === 'payment_modal') {
        const pixKey = interaction.fields.getTextInputValue('pix_key');
        const paypalKey = interaction.fields.getTextInputValue('paypal_key');

        paymentMethods.set('pix', pixKey);
        paymentMethods.set('paypal', paypalKey);

        await interaction.reply({
          content: 'Métodos de pagamento configurados com sucesso!',
          flags: 64
        });
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_product_embed') {
        const selectedProductId = interaction.values[0];
        pendingActions.set(interaction.user.id, { type: 'embed', productId: selectedProductId });

        const channelSelect = new ChannelSelectMenuBuilder()
          .setCustomId('select_channel_embed')
          .setPlaceholder('Selecione o canal')
          .setChannelTypes(ChannelType.GuildText);

        const row = new ActionRowBuilder().addComponents(channelSelect);

        await interaction.reply({
          content: 'Agora selecione o canal para enviar a embed:',
          components: [row],
          flags: 64
        });
      }
    }

    if (interaction.isChannelSelectMenu()) {
      if (interaction.customId === 'select_channel_embed') {
        const pendingAction = pendingActions.get(interaction.user.id);
        if (!pendingAction || pendingAction.type !== 'embed') return;

        const selectedChannel = interaction.channels.first();
        const selectedProduct = products.get(pendingAction.productId);

        if (selectedProduct && selectedChannel) {
          const embed = new EmbedBuilder()
            .setTitle(selectedProduct.name)
            .setDescription(selectedProduct.description)
            .addFields({ name: 'Preço', value: `R$ ${selectedProduct.price}` })
            .setColor(selectedProduct.color)
            .setFooter({ text: pendingAction.productId });

          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('buy_product')
                .setLabel('Comprar')
                .setStyle(ButtonStyle.Success)
            );

          await selectedChannel.send({ embeds: [embed], components: [row] });
          await interaction.reply({
            content: `Embed enviada para ${selectedChannel}`,
            flags: 64
          });

          pendingActions.delete(interaction.user.id);
        }
      }

      if (interaction.customId === 'select_channel_message') {
        const pendingAction = pendingActions.get(interaction.user.id);
        if (!pendingAction || pendingAction.type !== 'message') return;

        const selectedChannel = interaction.channels.first();
        
        if (selectedChannel) {
          await selectedChannel.send(pendingAction.content);
          await interaction.reply({
            content: `Mensagem enviada para ${selectedChannel}`,
            flags: 64
          });

          pendingActions.delete(interaction.user.id);
        }
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    try {
      if (interaction.isRepliable()) {
        await interaction.reply({ 
          content: 'Ocorreu um erro ao processar sua solicitação.',
          flags: 64
        });
      }
    } catch (replyError) {
      console.error('Error sending error reply:', replyError);
    }
  }
});

async function sendFeedbackMessage(channel, user) {
  try {
    const message = await channel.send(`${user} deixe seu feedback!`);
    setTimeout(() => {
      message.delete().catch(console.error);
    }, 10000);
  } catch (error) {
    console.error('Error sending feedback message:', error);
  }
}

async function logPurchase(cart, user) {
  try {
    // Private logs
    const privateLogsChannel = client.channels.cache.get(botConfig.get('privateLogsChannel'));
    if (privateLogsChannel) {
      const adminRole = botConfig.get('adminRole');
      await privateLogsChannel.send({
        content: `<@&${adminRole}> Nova compra realizada!\nComprador: ${user}\nProduto: ${cart.product.name}\nQuantidade: ${cart.quantity}\nTotal: R$ ${(parseFloat(cart.product.price) * cart.quantity).toFixed(2)}`,
      });
    }

    // Public logs
    const publicLogsChannel = client.channels.cache.get(botConfig.get('publicLogsChannel'));
    if (publicLogsChannel) {
      await publicLogsChannel.send({
        content: `Nova compra realizada por ${user}!\nProduto: ${cart.product.name}\nTotal: R$ ${(parseFloat(cart.product.price) * cart.quantity).toFixed(2)}`,
      });
    }

    // Add customer role
    const customerRole = botConfig.get('customerRole');
    if (customerRole) {
      const member = await user.guild.members.fetch(user.id);
      await member.roles.add(customerRole);
    }

    // Send feedback message
    const feedbackChannel = client.channels.cache.get(botConfig.get('publicLogsChannel'));
    if (feedbackChannel) {
      await sendFeedbackMessage(feedbackChannel, user);
    }
  } catch (error) {
    console.error('Error logging purchase:', error);
  }
}

async function updateCartEmbed(channel, cart) {
  const totalPrice = (parseFloat(cart.product.price) * cart.quantity).toFixed(2);
  
  const cartEmbed = new EmbedBuilder()
    .setTitle('🛒 Seu Carrinho')
    .setDescription(
      `Produto: ${cart.product.name}\n` +
      `Preço unitário: R$ ${cart.product.price}\n` +
      `Quantidade: ${cart.quantity}\n` +
      `Total: R$ ${totalPrice}`
    )
    .setColor(cart.product.color);

  const cartButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('increase_quantity')
        .setLabel('+ Quantidade')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('decrease_quantity')
        .setLabel('- Quantidade')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('continue_purchase')
        .setLabel('Continuar')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('close_cart')
        .setLabel('Fechar Carrinho')
        .setStyle(ButtonStyle.Danger)
    );

  const messages = await channel.messages.fetch({ limit: 1 });
  const firstMessage = messages.first();

  if (firstMessage) {
    await firstMessage.edit({
      content: 'Após o pagamento, envie o comprovante e aguarde, não demorará 10 minutos.',
      embeds: [cartEmbed],
      components: [cartButtons]
    });
  } else {
    await channel.send({
      content: 'Após o pagamento, envie o comprovante e aguarde, não demorará 10 minutos.',
      embeds: [cartEmbed],
      components: [cartButtons]
    });
  }
}

client.login(process.env.DISCORD_TOKEN);