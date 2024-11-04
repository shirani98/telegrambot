const TelegramBot = require('node-telegram-bot-api');
const userController = require('../controllers/user.controller');
const withdrawController = require('../controllers/withdraw.controller');
const requestsController = require('../controllers/requests.controller');
const donorController = require('../controllers/donor.controller');
const referralController = require('../controllers/referral.controller');
const sponsorController = require('../controllers/sponsor.controller')
const fs = require('fs');
const path = require('path');


const bot = new TelegramBot(process.env.BOT_TOKEN);

// Destroy all pending updates when the bot starts
bot.deleteWebHook({ drop_pending_updates: true })
  .then(() => {
    console.log('Webhook deleted and pending updates cleared.');
    return bot.setWebHook(process.env.WEBHOOK_URL);
  })
  .then(() => {
    console.log('New webhook set successfully.');
  })
  .catch((error) => {
    console.error('Error clearing updates or setting webhook:', error);
  });



bot.setMyCommands([
  {command: '/start', description: 'Start the bot'},
  {command: '/admin', description: 'Admin panel'},
]);

const loader = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getUpdates?allowed_updates=["update_id","message","edited_message","channel_post","edited_channel_post","inline_query","chosen_inline_result","callback_query","shipping_query","pre_checkout_query","poll","poll_answer","my_chat_member","chat_member"]`

fetch(loader)
.then(res => res.json())
.then(data => console.log(data));

bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const referrerId = match[1].trim();

  try {
    let user = await userController.getUser(userId);
    if (!user) {
      user = await userController.createUser(userId, msg.from.username || 'undefined');
    } else if (user.username !== msg.from.username) {
      // Update username if it has changed
      user.username = msg.from.username || 'undefined';
      await user.save();
    }

    if (referrerId) {
      const existingReferral = await referralController.getReferral(referrerId, userId);
      if (!existingReferral) {
        console.log("the referral does not exist in database. adding new referral...");
        await referralController.addNewReferral(referrerId, userId, msg.from.username || 'undefined');
      }else {
        console.log("the referral already exist in database.");
      }
    }

    const keyboard = {
      keyboard: [
        [{text: '🔗 لینک دعوت ربات'}, {text: '📢 کانال های من'}, {text: '➕ افزودن کانال جدید'}],
        [{text: '💸 برداشت'}, {text: '💼 حساب من'}],
        [{text: '🏆 برترین دعوت های ربات'}, {text: '👥 برترین دانر ها'}],
        [{text: '📱 ارتباط با ما'}],
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    };

    bot.sendMessage(chatId, 'سلام کاربر گرامی. به ربات ما خوش آمدید. لطفا یکی از گزینه ها را انتخاب کنید', {
      reply_markup: keyboard
    });
  } catch (error) {
    console.error('Error in /start command:', error);
    bot.sendMessage(chatId, 'متاسفانه خطایی رخ داده است. لطفا بعدا دوباره تلاش کنید.');
  }
});

bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    const isAdmin = await userController.isAdmin(userId);
    if (isAdmin) {
      const adminKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'افزودن ادمین', callback_data: 'add_admin' }],
            [{ text: 'ارسال پیام سراسری', callback_data: 'global_message' }],
            [{ text: 'مشاهده زیرمجموعه ها', callback_data: 'view_channels_by_donors' }],
            [{ text: 'مشاهده کانال های اسپانسر', callback_data: 'view_sponsor_channels' }, { text: 'افزودن کانال اسپانسر', callback_data: 'add_sponsor_channel' }, { text: 'حذف کانال اسپانسر', callback_data: 'remove_sponsor_channel' }],
            [{ text: 'درخواست های برداشت در انتظار', callback_data: 'pending_withdrawals' }],
            [{ text: 'درخواست های کانال در انتظار', callback_data: 'pending_channels' }]
          ]
        }
      };
      bot.sendMessage(chatId, 'سلام مدیر عزیز. به پنل مدیریتی ربات خوش آمدید. لطفا یکی از گزینه‌های زیر را انتخاب کنید:', adminKeyboard);
    } else {
      bot.sendMessage(chatId, 'متاسفانه شما دسترسی به این بخش را ندارید.');
    }
  } catch (error) {
    console.error('Error in /admin command:', error);
    bot.sendMessage(chatId, 'متاسفانه خطایی رخ داده است. لطفا بعدا دوباره تلاش کنید.');
  }
});


bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  try {
    switch (msg.text) {
      case '🔗 لینک دعوت ربات':
        const bot_invlink = `https://t.me/Barakads_bot?start=${userId}`
        bot.sendMessage(chatId, `
لینک رفرال ربات شما: ${bot_invlink}
با اشتراک گذاشتن این لینک به دانر های دیگر میتوانید زیرمجموعه جمع کنید.`);
        break;
      case '📢 کانال های من':
        const current_user = await userController.getUser(userId);
        if (current_user && current_user.channels.length > 0) {
          let channelList = 'کانال های شما:\n\n';
          const channelKeyboard = await Promise.all(current_user.channels.map(async (channel, index) => {
            const donorCount = await userController.getDonorCountForChannel(userId, channel.invite_link);
            channelList += `${index + 1}. نام: ${channel.name}\n`;
            channelList += `   لینک دعوت: ${channel.invite_link}\n`;
            channelList += `   تعداد زیرمجموعه ها: ${donorCount}\n`;
            channelList += `   تایید شده: ${channel.isVerified ? 'بله' : 'خیر'}\n\n`;
            return [{ text: channel.name }];
          }));

          bot.sendMessage(chatId, channelList, {
            reply_markup: {
              keyboard: [...channelKeyboard, ['🔙 بازگشت']],
              resize_keyboard: true,
              one_time_keyboard: true
            }
          });

          bot.once('message', async (channelMsg) => {
            if (channelMsg.text === '🔙 بازگشت') {
              // Handle back button press
              return;
            }
            const selectedChannel = current_user.channels.find(channel => channel.name === channelMsg.text);
            if (selectedChannel) {
              try {
                // Get all sponsor channels
                const sponsorChannels = await sponsorController.getAllSponsorChannels();
                
                // Create keyboard for sponsor channels
                const sponsorKeyboard = sponsorChannels.map(sponsor => [{ text: sponsor.channel_url }]);
                sponsorKeyboard.push(['🔙 بازگشت']);

                bot.sendMessage(chatId, 'لطفا یک کانال اسپانسر را انتخاب کنید:', {
                  reply_markup: {
                    keyboard: sponsorKeyboard,
                    resize_keyboard: true,
                    one_time_keyboard: true
                  }
                });

                bot.once('message', async (sponsorMsg) => {
                  if (sponsorMsg.text === '🔙 بازگشت') {
                    // Handle back button press
                    return;
                  }

                  const selectedSponsor = sponsorChannels.find(sponsor => sponsor.channel_url === sponsorMsg.text);
                  if (selectedSponsor) {
                    try {
                      // Check if user already has a referral link for this specific channel and sponsor channel combination
                      const existingDonor = await donorController.getDonor(userId, selectedChannel.invite_link, selectedSponsor.channel_url);
                      let inviteLink;
                      if (existingDonor) {
                        inviteLink = existingDonor.referral_link;
                      } else {
                        // Create new invite link for the specific sponsor channel
                        const newInviteLink = await bot.createChatInviteLink(selectedSponsor.channel_id, {
                          name: `${selectedChannel.invite_link}`,
                          create_join_request: true
                        });
                        inviteLink = newInviteLink.invite_link;
                        await donorController.createDonor(userId, selectedChannel.invite_link, selectedSponsor.channel_url, inviteLink);
                      }

                      bot.sendMessage(chatId, `لینک اختصاصی شما برای کانال ${selectedChannel.name} در کانال اسپانسر ${selectedSponsor.channel_url}:\n${inviteLink}`);
                    } catch (error) {
                      console.error('Error creating or retrieving invite link:', error);
                      bot.sendMessage(chatId, 'متاسفانه در ایجاد یا بازیابی لینک دعوت خطایی رخ داد. لطفا بعدا دوباره تلاش کنید.');
                    }
                  } else {
                    bot.sendMessage(chatId, 'کانال اسپانسر انتخاب شده معتبر نیست.');
                  }
                });
              } catch (error) {
                console.error('Error fetching sponsor channels:', error);
                bot.sendMessage(chatId, 'متاسفانه در دریافت لیست کانال های اسپانسر خطایی رخ داد. لطفا بعدا دوباره تلاش کنید.');
              }
            } else {
              bot.sendMessage(chatId, 'کانال انتخاب شده معتبر نیست.');
            }
          });
        } else {
          bot.sendMessage(chatId, 'شما هنوز هیچ کانالی اضافه نکرده‌اید.');
        }
        break;
      case '➕ افزودن کانال جدید':
        const questions = [
          'لطفاً نام کانال را وارد کنید:',
          'لطفاً لینک دعوت کانال را وارد کنید:'
        ];
        let currentQuestion = 0;
        let channelInfo = {};

        const askQuestion = () => {
          bot.sendMessage(chatId, questions[currentQuestion], {
            reply_markup: {
              keyboard: [['🔙 انصراف']],
              resize_keyboard: true,
              one_time_keyboard: true
            }
          });
        };

        const handleAnswer = async (msg) => {
          if (msg.text === '🔙 انصراف') {
            bot.removeListener('message', handleAnswer);
            currentQuestion = questions.length; // Prevent further questions
            return;
          }

          switch (currentQuestion) {
            case 0:
              channelInfo.name = msg.text.trim();
              break;
            case 1:
              const trimmedLink = msg.text.trim();
              const telegramUrlRegex = /^(https?:\/\/)?(www\.)?t\.me\/[a-zA-Z0-9_]+$/;
              if (!telegramUrlRegex.test(trimmedLink) && !trimmedLink.startsWith('@')) {
                bot.sendMessage(chatId, 'لینک دعوت باید یک لینک معتبر تلگرام باشد یا با @ شروع شود. لطفاً دوباره وارد کنید:');
                return;
              }
              channelInfo.invite_link = trimmedLink.startsWith('@') ? `https://t.me/${trimmedLink.slice(1)}` : trimmedLink;
              // Check if the invite link is unique
              const existingChannel = await userController.getChannelByInviteLink(channelInfo.invite_link);
              if (existingChannel) {
                bot.sendMessage(chatId, 'این کانال قبلا در سیستم ثبت شده است.');
                return;
              }
              break;
          }

          currentQuestion++;

          if (currentQuestion < questions.length) {
            askQuestion();
          } else {
            // All information collected, add the channel
            try {
              const newRequest = await requestsController.createRequest(userId, channelInfo.name, channelInfo.invite_link);
              bot.sendMessage(chatId, `درخواست افزودن کانال جدید با موفقیت ثبت شد و در انتظار تایید توسط ادمین است:\n\nنام کانال: ${channelInfo.name}\nلینک دعوت: ${channelInfo.invite_link}`, {
                reply_markup: {
                  keyboard: [
                    [{text: '🔗 لینک دعوت ربات'}, {text: '📢 کانال های من'}, {text: '➕ افزودن کانال جدید'}],
                    [{text: '💸 برداشت'}, {text: '💼 حساب من'}],
                    [{text: '🏆 برترین دعوت های ربات'}, {text: '👥 برترین دانر ها'}],
                    [{text: '📱 ارتباط با ما'}],
                  ],
                  resize_keyboard: true
                }
              });

              // Notify all admins about the new channel request
              const admins = await userController.getAllAdmins();
              const adminMessage = `درخواست جدید برای افزودن کانال:\n\nنام کاربر: ${msg.from.first_name}\nشناسه کاربر: ${userId}\nنام کانال: ${channelInfo.name}\nلینک دعوت: ${channelInfo.invite_link}`;
              
              for (const admin of admins) {
                try {
                  await bot.sendMessage(admin.user_id, adminMessage, {
                    reply_markup: {
                      inline_keyboard: [
                        [
                          { text: 'تایید', callback_data: `approve:${newRequest._id}` },
                          { text: 'رد درخواست', callback_data: `reject:${newRequest._id}` }
                        ]
                      ]
                    }
                  });
                } catch (error) {
                  console.error(`Failed to send message to admin ${admin.user_id}:`, error);
                }
              }

            } catch (error) {
              console.error('Error adding new channel:', error);
              bot.sendMessage(chatId, 'خطا در افزودن کانال جدید. لطفاً دوباره تلاش کنید.', {
                reply_markup: {
                  keyboard: [
                    [{text: '🔗 لینک دعوت ربات'}, {text: '📢 کانال های من'}, {text: '➕ افزودن کانال جدید'}],
                    [{text: '💸 برداشت'}, {text: '💼 حساب من'}],
                    [{text: '🏆 برترین دعوت های ربات'}, {text: '👥 برترین دانر ها'}],
                    [{text: '📱 ارتباط با ما'}],
                  ],
                  resize_keyboard: true
                }
              });
            }
          }
        };

        askQuestion();
        bot.on('message', (msg) => {
          if (msg.from.id === userId && currentQuestion < questions.length) {
            handleAnswer(msg);
          }
        });
        break;
      case '💼 حساب من':
        const user = await userController.getUser(userId);
        bot.sendMessage(chatId, `
شناسه کاربری: ${userId}
نام: ${msg.from.first_name}
تعداد کل زیرمجموعه ها: ${user.donor_count}
تعداد کانال های ثبت شده: ${user.channels.length}
        `, {
          parse_mode: 'HTML',
        });
        break;
        case '📱 ارتباط با ما':
          bot.sendMessage(userId, `
آیدی ادمین جهت ارتباط: @barak_suport`)
        break;
        
      case '💸 برداشت':
        const w_user = await userController.getUser(userId);
        if (w_user.donor_count < 10) { // Minimum withdrawal amount
          bot.sendMessage(chatId, 'حداقل تعداد زیرمجموعه برای برداشت 10 میباشد.');
          return;
        }

        const withdrawQuestions = [
          'لطفاً روش برداشت را انتخاب کنید:',
          'لطفاً آدرس کیف پول TON خود را وارد کنید:',
          'لطفاً نام و نام خانوادگی صاحب حساب را وارد کنید:',
          'لطفاً شماره کارت بانکی خود را وارد کنید:'
        ];

        let withdrawCurrentQuestion = 0;
        let withdrawInfo = {};

        const askWithdrawQuestion = () => {
          if (withdrawCurrentQuestion === 0) {
            bot.sendMessage(chatId, withdrawQuestions[withdrawCurrentQuestion], {
              reply_markup: {
                keyboard: [
                  [{text: 'برداشت با TON'}, {text: 'برداشت با کارت بانکی'}],
                  [{text: '🔙 انصراف'}]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
              }
            });
          } else {
            bot.sendMessage(chatId, withdrawQuestions[withdrawCurrentQuestion], {
              reply_markup: {
                keyboard: [['🔙 انصراف']],
                resize_keyboard: true,
                one_time_keyboard: true
              }
            });
          }
        };

        const handleWithdrawAnswer = async (msg) => {
          if (msg.text === '🔙 انصراف') {
            bot.removeListener('message', withdrawListener);
            return;
          }

          switch (withdrawCurrentQuestion) {
            case 0:
              withdrawInfo.method = msg.text;
              if (msg.text === 'برداشت با TON') {
                // Show a pop-up notification for TON withdrawal
                withdrawCurrentQuestion = 1;
              } else if (msg.text === 'برداشت با کارت بانکی') {
                withdrawCurrentQuestion = 2;
              } else {
                bot.sendMessage(chatId, 'لطفاً یکی از گزینه های موجود را انتخاب کنید.');
                return;
              }
              break;
            case 1:
              withdrawInfo.tonAddress = msg.text.trim();
              withdrawCurrentQuestion = 4;
              break;
            case 2:
              withdrawInfo.fullName = msg.text.trim();
              withdrawCurrentQuestion = 3;
              break;
            case 3:
              withdrawInfo.cardNumber = msg.text.trim();
              withdrawCurrentQuestion = 4;
              break;
          }

          if (withdrawCurrentQuestion < 4) {
            askWithdrawQuestion();
          } else {
            // Process withdrawal
            try {
              let withdrawalResult;
              const withdrawalAmount = w_user.donor_count;
              if (withdrawInfo.method === 'برداشت با TON') {
                withdrawalResult = await withdrawController.createWithdrawal(userId, withdrawalAmount, 'TON', withdrawInfo.tonAddress);
              } else {
                withdrawalResult = await withdrawController.createWithdrawal(userId, withdrawalAmount, 'Bank', `${withdrawInfo.fullName} - ${withdrawInfo.cardNumber}`);
              }
              
              if (withdrawalResult === false) {
                bot.sendMessage(chatId, 'شما یک درخواست برداشت فعال دارید. لطفاً منتظر تأیید یا رد آن بمانید.', {
                  reply_markup: {
                    keyboard: [
                      [{text: '🔗 لینک دعوت ربات'}, {text: '📢 کانال های من'}, {text: '➕ افزودن کانال جدید'}],
                      [{text: '💸 برداشت'}, {text: '💼 حساب من'}],
                      [{text: '🏆 برترین دعوت های ربات'}, {text: '👥 برترین دانر ها'}],
                      [{text: '📱 ارتباط با ما'}],
                    ],
                    resize_keyboard: true
                  }
                });
              } else {
                await userController.setDonorCount(userId, 0);
                bot.sendMessage(chatId, `درخواست برداشت شما به تعداد ${withdrawalAmount} زیرمجموعه ثبت شد.`, {
                  reply_markup: {
                    keyboard: [
                      [{text: '🔗 لینک دعوت ربات'}, {text: '📢 کانال های من'}, {text: '➕ افزودن کانال جدید'}],
                      [{text: '💸 برداشت'}, {text: '💼 حساب من'}],
                      [{text: '🏆 برترین دعوت های ربات'}, {text: '👥 برترین دانر ها'}],
                      [{text: '📱 ارتباط با ما'}],
                    ],
                    resize_keyboard: true
                  }
                });
                
                // Notify admins about the withdrawal
                const withdrawalMethod = withdrawInfo.method === 'برداشت با TON' ? 'TON' : 'Bank';
                const accountDetails = withdrawInfo.method === 'برداشت با TON' ? withdrawInfo.tonAddress : `${withdrawInfo.fullName} - ${withdrawInfo.cardNumber}`;
                await notifyAdminsAboutWithdrawal(userId, withdrawalAmount, withdrawalMethod, accountDetails);
                await userController.setDonorCount(userId, 0);
              }
            } catch (error) {
              console.error('Error processing withdrawal:', error);
              bot.sendMessage(chatId, 'خطا در پردازش درخواست برداشت. لطفاً بعداً دوباره تلاش کنید.');
            }
            // Remove the listener after processing
            bot.removeListener('message', withdrawListener);
          }
        };

        askWithdrawQuestion();
        const withdrawListener = (msg) => {
          if (msg.from.id === userId && withdrawCurrentQuestion < 4) {
            handleWithdrawAnswer(msg);
          }
        };
        bot.on('message', withdrawListener);

        // Remove the listener after processing or timeout
        setTimeout(() => {
          bot.removeListener('message', withdrawListener);
        }, 300000); // 5 minutes timeout

        break;
      case '🔙 بازگشت':
        // Handle the back button press
        bot.sendMessage(chatId, 'بازگشت به منوی اصلی', {
          reply_markup: {
            keyboard: [
              [{text: '🔗 لینک دعوت ربات'}, {text: '📢 کانال های من'}, {text: '➕ افزودن کانال جدید'}],
              [{text: '💸 برداشت'}, {text: '💼 حساب من'}],
              [{text: '🏆 برترین دعوت های ربات'}, {text: '👥 برترین دانر ها'}],
              [{text: '📱 ارتباط با ما'}],
            ],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        });
        break;
      case '🔙 انصراف':
        // Handle the cancel button press
        bot.sendMessage(chatId, 'عملیات لغو شد. بازگشت به منوی اصلی', {
          reply_markup: {
            keyboard: [
              [{text: '🔗 لینک دعوت ربات'}, {text: '📢 کانال های من'}, {text: '➕ افزودن کانال جدید'}],
              [{text: '💸 برداشت'}, {text: '💼 حساب من'}],
              [{text: '🏆 برترین دعوت های ربات'}, {text: '👥 برترین دانر ها'}],
              [{text: '📱 ارتباط با ما'}],
            ],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        });
        break;
      case '🏆 برترین دعوت های ربات':
        try {
          const topReferrers = await referralController.getTopReferrers();
          const pageSize = 10;
          const totalPages = Math.ceil(topReferrers.length / pageSize);
          
          const sendTopReferrersPage = async (page) => {
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            let message = `برترین دعوت کنندگان ربات (صفحه ${page} از ${totalPages}):\n\n`;
            
            for (let i = startIndex; i < Math.min(endIndex, topReferrers.length); i++) {
              const referral = topReferrers[i];
              const user = await userController.getUser(referral.user_id);
              let userIdentifier;
              if(!user) {
                userIdentifier = `شناسه کاربری: ${referral.user_id}`;
              }
              else if (user.username !== "undefined") {
                userIdentifier = `کاربر @${user.username}`;
              } else {
                userIdentifier = `شناسه کاربری: ${referral.user_id}`;
              }
              message += `${i + 1}. ${userIdentifier}, تعداد دعوت: ${referral.total_referrals}\n`;
            }

            const keyboard = {
              inline_keyboard: [
                [
                  { text: 'صفحه قبل', callback_data: `top_referrers:${page - 1}` },
                  { text: 'صفحه بعد', callback_data: `top_referrers:${page + 1}` }
                ]
              ]
            };

            if (page === 1) {
              keyboard.inline_keyboard[0].shift();
            }
            if (page === totalPages) {
              keyboard.inline_keyboard[0].pop();
            }

            bot.sendMessage(chatId, message, { reply_markup: keyboard });
          };

          sendTopReferrersPage(1);
        } catch (error) {
          console.error('Error fetching top referrers:', error);
          bot.sendMessage(chatId, 'متاسفانه در دریافت اطلاعات خطایی رخ داده است. لطفا بعدا دوباره تلاش کنید.');
        }
        break;
      case '👥 برترین دانر ها':
        try {
          const topDonors = await userController.getAllUsersSortedByDonors();
          const pageSize = 10;
          const totalPages = Math.ceil(topDonors.length / pageSize);
          
          const sendTopDonorsPage = (page) => {
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            let message = `برترین دانر های ربات (صفحه ${page} از ${totalPages}):\n\n`;
            
            topDonors.slice(startIndex, endIndex).forEach((user, index) => {
              let userIdentifier;
              if(!user) {
                userIdentifier = `شناسه کاربری: ${user.user_id}`;
              }
              else if (user.username !== "undefined") {
                userIdentifier = `کاربر @${user.username}`;
              } else {
                userIdentifier = `شناسه کاربری: ${user.user_id}`;
              }
              message += `${startIndex + index + 1}. ${userIdentifier}، تعداد زیرمجموعه: ${user.donor_count}\n`;
            });

            const keyboard = {
              inline_keyboard: [
                [
                  { text: 'صفحه قبل', callback_data: `top_donors:${page - 1}` },
                  { text: 'صفحه بعد', callback_data: `top_donors:${page + 1}` }
                ]
              ]
            };

            if (page === 1) {
              keyboard.inline_keyboard[0].shift();
            }
            if (page === totalPages) {
              keyboard.inline_keyboard[0].pop();
            }

            bot.sendMessage(chatId, message, { reply_markup: keyboard });
          };

          sendTopDonorsPage(1);
        } catch (error) {
          console.error('Error fetching top donors:', error);
          bot.sendMessage(chatId, 'متاسفانه در دریافت اطلاعات خطایی رخ داده است. لطفا بعدا دوباره تلاش کنید.');
        }
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('Error handling message:', error);
    bot.sendMessage(chatId, 'متاسفانه خطایی رخ داده است. لطفا بعدا دوباره تلاش کنید.');
  }
});


bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const [action, data] = callbackQuery.data.split(':');
  if (action === 'top_referrers') {
    const page = parseInt(data);
    try {
      const topReferrers = await referralController.getTopReferrers();
      const pageSize = 2;
      const totalPages = Math.ceil(topReferrers.length / pageSize);
      
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      let message = `برترین دعوت کنندگان ربات (صفحه ${page} از ${totalPages}):\n\n`;
      
      for (let i = startIndex; i < endIndex && i < topReferrers.length; i++) {
        const referrer = topReferrers[i];
        const user = await userController.getUser(referrer.user_id);
        const userIdentifier = user.username !== 'undefined' ? user.username : user.user_id;
        message += `${i + 1}. کاربر @${userIdentifier}، تعداد دعوت: ${referrer.total_referrals}\n`;
      }

      const keyboard = {
        inline_keyboard: [
          [
            { text: 'صفحه قبل', callback_data: `top_referrers:${page - 1}` },
            { text: 'صفحه بعد', callback_data: `top_referrers:${page + 1}` }
          ]
        ]
      };

      if (page === 1) {
        keyboard.inline_keyboard[0].shift();
      }
      if (page === totalPages) {
        keyboard.inline_keyboard[0].pop();
      }

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        reply_markup: keyboard
      });

      await bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      console.error('Error fetching top referrers:', error);
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: 'متاسفانه در دریافت اطلاعات خطایی رخ داده است. لطفا بعدا دوباره تلاش کنید.',
        show_alert: true
      });
    }
    return;
  }
  if (action === 'top_donors') {
    const page = parseInt(data);
    try {
      const topDonors = await userController.getAllUsersSortedByDonors();
      const pageSize = 2;
      const totalPages = Math.ceil(topDonors.length / pageSize);
      
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      let message = `برترین دانر های ربات (صفحه ${page} از ${totalPages}):\n\n`;
      
      topDonors.slice(startIndex, endIndex).forEach((user, index) => {
        const userIdentifier = user.username !== 'undefined' ? user.username : user.user_id;
        message += `${startIndex + index + 1}. کاربر @${userIdentifier}، تعداد زیرمجموعه: ${user.donor_count}\n`;
      });

      const keyboard = {
        inline_keyboard: [
          [
            { text: 'صفحه قبل', callback_data: `top_donors:${page - 1}` },
            { text: 'صفحه بعد', callback_data: `top_donors:${page + 1}` }
          ]
        ]
      };

      if (page === 1) {
        keyboard.inline_keyboard[0].shift();
      }
      if (page === totalPages) {
        keyboard.inline_keyboard[0].pop();
      }

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        reply_markup: keyboard
      });

      await bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      console.error('Error fetching top donors:', error);
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: 'متاسفانه در دریافت اطلاعات خطایی رخ داده است. لطفا بعدا دوباره تلاش کنید.',
        show_alert: true
      });
    }
    return;
  }

  if (action === 'approve') {
    bot.answerCallbackQuery(callbackQuery.id, {
      text: 'کانال مورد نظر با موفقیت تایید شد.',
      show_alert: true
    });
    try {
      const request = await requestsController.getRequestById(data);
      await userController.addChannelToUser(request.user_id, request.channel_name, request.invite_link);
      await requestsController.deleteRequest(data);
      // Avoid sending duplicate messages
      const message = `کانال ${request.channel_name} شما تایید شد.`;
      bot.sendMessage(request.user_id, message).catch(error => {
        console.error('Error sending message:', error);
        // If the first attempt fails, try sending again
        bot.sendMessage(request.user_id, message).catch(error => {
          console.error('Failed to send message after retry:', error);
        });
      });
    } catch (error) {
      console.error('Error updating channel:', error);
      bot.sendMessage(callbackQuery.from.id, 'خطا در بروزرسانی اطلاعات کانال.');
    }
  } else if (action === 'reject') {
    bot.answerCallbackQuery(callbackQuery.id);
    try {
      const request = await requestsController.getRequestById(data);
      await requestsController.deleteRequest(data);
      bot.sendMessage(callbackQuery.from.id, `درخواست کانال ${request.channel_name} رد شد.`);
      bot.sendMessage(request.user_id, `متاسفانه درخواست افزودن کانال ${request.channel_name} شما تایید نشد.`);
    } catch (error) {
      console.error('Error rejecting channel request:', error);
      bot.sendMessage(callbackQuery.from.id, 'خطا در رد کردن درخواست کانال.');
    }
  } else if (action === 'approve_withdraw') {
    bot.answerCallbackQuery(callbackQuery.id, 'درخواست برداشت کاربر مورد نظر تایید شد', {
      show_alert: true
    });
    try {
      const withdrawalRequest = await withdrawController.getWithdrawalRequestByUserId(data);
      if (withdrawalRequest) {
        // Process the withdrawal (e.g., transfer funds)
        await withdrawController.processWithdrawal(withdrawalRequest);
        bot.sendMessage(withdrawalRequest.userId, `
*درخواست برداشت شما تایید شد.*
تعداد زیرمجموعه: ${withdrawalRequest.amount}
درآمد شما به حسابتان واریز شده است.`, {
  parse_mode: 'Markdown'
});
      } else {
        bot.sendMessage(callbackQuery.from.id, 'درخواست برداشت پیدا نشد.');
      }
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      bot.sendMessage(callbackQuery.from.id, 'خطا در تایید درخواست برداشت.');
    }
  } else if (action === 'reject_withdraw') {
    bot.answerCallbackQuery(callbackQuery.id);
    try {
      const withdrawalRequest = await withdrawController.getWithdrawalRequestByUserId(data);
      if (withdrawalRequest) {
        await withdrawController.rejectWithdrawal(data);
        
        // Refund and readd the donor count to the user's account
        await userController.updateDonorCount(withdrawalRequest.userId, withdrawalRequest.amount);
        
        bot.sendMessage(callbackQuery.from.id, 'درخواست برداشت لغو شد!');
        bot.sendMessage(withdrawalRequest.userId, `*متاسفانه درخواست برداشت شما رد شد.*
تعداد زیرمجموعه‌های شما به حساب‌تان بازگردانده شد.
میتوانید درصورت نیاز با پشتیبانی در ارتباط باشید.`, {
  parse_mode: 'Markdown'
});
      } else {
        bot.sendMessage(callbackQuery.from.id, 'درخواست برداشت پیدا نشد.');
      }
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      bot.sendMessage(callbackQuery.from.id, 'خطا در رد کردن درخواست برداشت.');
    }
  }

  if (callbackQuery.data === 'global_message') {
    bot.answerCallbackQuery(callbackQuery.id);
    let globalMessageInfo = {};
    let globalMessageCurrentStep = 0;

    const askGlobalMessageQuestion = () => {
      bot.sendMessage(callbackQuery.from.id, 'لطفا پیام خود را برای ارسال به تمام کاربران وارد کنید:', {
        reply_markup: {
          keyboard: [['🔙 انصراف']],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    };

    const handleGlobalMessageAnswer = async (msg) => {
      if (msg.text === '🔙 انصراف') {
        globalMessageCurrentStep = -1; // Set to an invalid step to prevent further processing
        return;
      }

      if (globalMessageCurrentStep === 0) {
        globalMessageInfo.message = msg.text;
        globalMessageCurrentStep++;

        try {
          const users = await userController.getAllUsers();
          let successCount = 0;
          let failCount = 0;
          for (const user of users) {
            try {
              await bot.sendMessage(user.user_id, globalMessageInfo.message);
              successCount++;
            } catch (error) {
              console.error(`Failed to send message to user ${user.user_id}:`, error);
              failCount++;
            }
          }
          bot.sendMessage(callbackQuery.from.id, `پیام با موفقیت به ${successCount} کاربر ارسال شد. ارسال به ${failCount} کاربر ناموفق بود.`);
        } catch (error) {
          console.error('Error sending global message:', error);
          bot.sendMessage(callbackQuery.from.id, 'خطا در ارسال پیام سراسری.');
        }
        globalMessageCurrentStep = -1;
      }
    };

    askGlobalMessageQuestion();
    const globalMessageListener = (msg) => {
      if (msg.from.id === callbackQuery.from.id && globalMessageCurrentStep < 1) {
        handleGlobalMessageAnswer(msg);
      }
    };
    bot.on('message', globalMessageListener);

    // Remove the listener after processing or timeout
    setTimeout(() => {
      bot.removeListener('message', globalMessageListener);
    }, 300000); // 5 minutes timeout
  }
  if(callbackQuery.data === 'view_channels_by_donors')
  {
    try {
      const isAdmin = await userController.isAdmin(userId);
      if (isAdmin) {
        const users = await userController.getAllUsersSortedByDonors();
        let message = 'کاربران بر اساس تعداد زیرمجموعه:';
        const keyboard = users.map((user, index) => {
          const userIdentifier = user.username !== "undefined" ? user.username : user.user_id;
          return [{text: `${index + 1}. کاربر ${userIdentifier}, تعداد زیرمجموعه: ${user.donor_count}`, callback_data: `user_channels_${user.user_id}`}];
        });
        bot.sendMessage(chatId, message, {
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      } else {
        bot.sendMessage(chatId, 'متاسفانه شما دسترسی به این بخش را ندارید.');
      }
    } catch (error) {
      console.error('Error in view_channels_by_referrals command:', error);
      bot.sendMessage(chatId, 'متاسفانه خطایی رخ داده است. لطفا بعدا دوباره تلاش کنید.');
    }
  }
  else if(callbackQuery.data.startsWith('user_channels_'))
  {
    try {
      const isAdmin = await userController.isAdmin(userId);
      if (isAdmin) {
        const selectedUserId = parseInt(callbackQuery.data.split('_')[2]);
        const userChannels = await userController.getUserChannels(selectedUserId);
        const user = await userController.getUser(selectedUserId);
        const userIdentifier = user.username !== "undefined" ? user.username : user.user_id;
        let message = `کانال‌های کاربر ${userIdentifier} بر اساس تعداد زیرمجموعه:\n\n`;
        const keyboard = [];
        
        for (const channel of userChannels) {
          console.log(`channel url => ${channel.invite_link}`);
          const donorCount = await donorController.getTotalReferralsForChannel(selectedUserId, channel.invite_link);
          message += `${channel.name}: ${donorCount} زیرمجموعه\n`;
          keyboard.push([{text: `دریافت لیست زیرمجموعه‌های ${channel.invite_link}`, callback_data: `channel_invites_${channel.invite_link}`}]);
        }
        
        bot.sendMessage(chatId, message, {
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      } else {
        bot.sendMessage(chatId, 'متاسفانه شما دسترسی به این بخش را ندارید.');
      }
    } catch (error) {
      console.error('Error in user_channels command:', error);
      bot.sendMessage(chatId, 'متاسفانه خطایی رخ داده است. لطفا بعدا دوباره تلاش کنید.');
    }
  }
  else if(callbackQuery.data.startsWith('channel_invites_'))
  {
    try {
      const isAdmin = await userController.isAdmin(userId);
      if (isAdmin) {
        const channelInviteLink = callbackQuery.data.split('_')[2];
        const channel = await userController.getChannelByInviteLink(channelInviteLink);
        if (!channel) {
          bot.sendMessage(chatId, 'کانال مورد نظر یافت نشد.');
          return;
        }
        const donor = await donorController.getDonors(channel.user_id);
        if (!donor) {
          bot.sendMessage(chatId, 'اطلاعات دعوت‌شدگان برای این کانال یافت نشد.');
          return;
        }
        const invitedUsers = donor.channels.find(ch => ch.channel_url === channelInviteLink)?.sponsor_channels.flatMap(sc => sc.invited_users) || [];
        let fileContent = `Invited users for channel ${channel.name}:\n\n`;
        for (const [index, user] of invitedUsers.entries()) {
          const invitedUser = await userController.getUser(user.user_id);
          const userIdentifier = invitedUser.username !== "undefined" ? invitedUser.username : invitedUser.user_id;
          fileContent += `${index + 1}. User: ${userIdentifier}\n`;
        }
        const randomNumber = Math.floor(Math.random() * (999999 - 111111 + 1)) + 111111;
        const fileName = `invited_users__${randomNumber}.txt`;
        const filePath = path.join(__dirname, fileName);
        fs.writeFileSync(filePath, fileContent);
        await bot.sendDocument(chatId, filePath, {
          caption: `لیست کاربران دعوت شده برای کانال ${channel.name}`
        });
        fs.unlinkSync(filePath);
      } else {
        bot.sendMessage(chatId, 'متاسفانه شما دسترسی به این بخش را ندارید.');
      }
    } catch (error) {
      console.error('Error in channel_invites command:', error);
      bot.sendMessage(chatId, 'متاسفانه خطایی رخ داده است. لطفا بعدا دوباره تلاش کنید.');
    }
  }
  else if (action === 'view_sponsor_channels') {
    try {
      const isAdmin = await userController.isAdmin(userId);
      if (isAdmin) {
        const sponsorChannels = await sponsorController.getAllSponsorChannels();
        let message = 'کانال های اسپانسر:\n\n';
        sponsorChannels.forEach((channel, index) => {
          message += `${index + 1}. ${channel.channel_url}\n`;
        });
        bot.sendMessage(chatId, message);
      } else {
        bot.sendMessage(chatId, 'متاسفانه شما دسترسی به این بخش را ندارید.');
      }
    } catch (error) {
      console.error('Error viewing sponsor channels:', error);
      bot.sendMessage(chatId, 'متاسفانه خطایی رخ داده است. لطفا بعدا دوباره تلاش کنید.');
    }
  }
  else if (action === 'add_sponsor_channel') {
    try {
      const isAdmin = await userController.isAdmin(userId);
      if (isAdmin) {
        const questions = [
          'لطفا آیدی عددی کانال اسپانسر را وارد کنید:',
          'لطفا لینک کانال اسپانسر را وارد کنید:'
        ];
        let currentQuestion = 0;
        const sponsorInfo = {};

        const cancelKeyboard = {
          keyboard: [[{ text: '🔙 انصراف' }]],
          resize_keyboard: true,
          one_time_keyboard: true
        };

        const askQuestion = () => {
          bot.sendMessage(chatId, questions[currentQuestion], { reply_markup: cancelKeyboard });
        };

        const handleAnswer = async (msg) => {
          if (msg.text === '🔙 انصراف') {
            bot.sendMessage(chatId, 'عملیات افزودن کانال اسپانسر لغو شد.', { reply_markup: { remove_keyboard: true } });
            bot.removeListener('message', handleAnswer);
            currentQuestion = questions.length; // This will prevent further questions
            return;
          }

          switch (currentQuestion) {
            case 0:
              sponsorInfo.name = msg.text.trim();
              break;
            case 1:
              sponsorInfo.url = msg.text.trim();
              if (sponsorInfo.url.startsWith('https://t.me/')) {
                // Valid URL, continue
              } else if (sponsorInfo.url.startsWith('@')) {
                sponsorInfo.url = 'https://t.me/' + sponsorInfo.url.substring(1);
              } else {
                bot.sendMessage(chatId, 'لطفا یک لینک تلگرام معتبر یا یک نام کاربری با @ وارد کنید. عملیات لغو شد.', { reply_markup: { remove_keyboard: true } });
                bot.removeListener('message', handleAnswer);
                currentQuestion = questions.length; // This will prevent further questions
                return;
              }
              break;
          }

          currentQuestion++;

          if (currentQuestion < questions.length) {
            askQuestion();
          } else {
            try {
              await sponsorController.addSponsorChannel(sponsorInfo.name, sponsorInfo.url);
              bot.sendMessage(chatId, 'کانال اسپانسر با موفقیت اضافه شد.', { reply_markup: { remove_keyboard: true } });
            } catch (error) {
              console.error('Error adding sponsor channel:', error);
              bot.sendMessage(chatId, 'متاسفانه خطایی در افزودن کانال اسپانسر رخ داد. لطفا بعدا دوباره تلاش کنید.', { reply_markup: { remove_keyboard: true } });
            }
          }
        };

        askQuestion();
        bot.on('message', (msg) => {
          if (msg.from.id === userId && currentQuestion < questions.length) {
            handleAnswer(msg);
          }
        });
      } else {
        bot.sendMessage(chatId, 'متاسفانه شما دسترسی به این بخش را ندارید.');
      }
    } catch (error) {
      console.error('Error in add sponsor channel process:', error);
      bot.sendMessage(chatId, 'متاسفانه خطایی رخ داده است. لطفا بعدا دوباره تلاش کنید.');
    }
  }
  else if (action === 'remove_sponsor_channel') {
    try {
      const isAdmin = await userController.isAdmin(userId);
      if (isAdmin) {
        const sponsorChannels = await sponsorController.getAllSponsorChannels();
        const keyboard = sponsorChannels.map(channel => [{text: channel.channel_url, callback_data: `remove_sponsor_:${channel.channel_id}`}]);
        bot.sendMessage(chatId, 'لطفا کانال اسپانسر مورد نظر برای حذف را انتخاب کنید:', {
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      } else {
        bot.sendMessage(chatId, 'متاسفانه شما دسترسی به این بخش را ندارید.');
      }
    } catch (error) {
      console.error('Error in remove sponsor channel process:', error);
      bot.sendMessage(chatId, 'متاسفانه خطایی رخ داده است. لطفا بعدا دوباره تلاش کنید.');
    }
  }
  else if (action === 'remove_sponsor_') {
    try {
      const isAdmin = await userController.isAdmin(userId);
      if (isAdmin) {
        const channelId = data;
        await sponsorController.removeSponsorChannel(channelId);
        bot.answerCallbackQuery(callbackQuery.id, 'کانال اسپانسر با موفقیت حذف شد.', {
          show_alert: true
        });
        
        // Update the inline keyboard
        const sponsorChannels = await sponsorController.getAllSponsorChannels();
        const keyboard = sponsorChannels.map(channel => [{text: channel.channel_url, callback_data: `remove_sponsor_${channel.channel_id}`}]);
        
        bot.editMessageReplyMarkup({
          inline_keyboard: keyboard
        }, {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id
        });
      } else {
        bot.answerCallbackQuery(callbackQuery.id, 'متاسفانه شما دسترسی به این بخش را ندارید.');
      }
    } catch (error) {
      console.error('Error in remove sponsor channel process:', error);
      bot.answerCallbackQuery(callbackQuery.id, 'متاسفانه خطایی رخ داده است. لطفا بعدا دوباره تلاش کنید.');
    }
  }
  else if (action === 'pending_withdrawals') {
    try {
      const isAdmin = await userController.isAdmin(userId);
      if (isAdmin) {
        const pendingWithdrawals = await withdrawController.getPendingWithdrawals();
        if (pendingWithdrawals.length > 0) {
          let message = 'درخواست های برداشت در انتظار:\n\n';
          const keyboard = await Promise.all(pendingWithdrawals.map(async withdrawal => {
            const user = await userController.getUser(withdrawal.userId);
            let userIdentifier = 'Unknown';
            if (user) {
              if (user.username) {
                userIdentifier = `@${user.username}`;
              } else if (user.user_id) {
                userIdentifier = `User ${user.user_id}`;
              }
            } else if (withdrawal.userId) {
              userIdentifier = withdrawal.userId;
            }
            message += `کاربر: ${userIdentifier}\n`;
            message += `مبلغ: ${withdrawal.amount}\n`;
            message += `روش: ${withdrawal.method}\n`;
            message += `جزئیات حساب: ${withdrawal.accountDetails}\n\n`;
            return [
              { text: `تایید ${userIdentifier}`, callback_data: `approve_withdraw:${withdrawal.userId}` },
              { text: `رد ${userIdentifier}`, callback_data: `reject_withdraw:${withdrawal.userId}` }
            ];
          }));
          bot.sendMessage(chatId, message, {
            
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        } else {
          bot.sendMessage(chatId, 'هیچ درخواست برداشتی در انتظار نیست.');
        }
      } else {
        bot.sendMessage(chatId, 'متاسفانه شما دسترسی به این بخش را ندارید.');
      }
    } catch (error) {
      console.error('Error fetching pending withdrawals:', error);
      bot.sendMessage(chatId, 'متاسفانه خطایی رخ داده است. لطفا بعدا دوباره تلاش کنید.');
    }
  }
  else if (action === 'pending_channels') {
    try {
      const isAdmin = await userController.isAdmin(userId);
      if (isAdmin) {
        const pendingChannels = await requestsController.getPendingChannelRequests();
        if (pendingChannels.length > 0) {
          let message = 'درخواست های کانال در انتظار:\n\n';
          const keyboard = pendingChannels.map(channel => {
            message += `کاربر: ${channel.user_id}\n`;
            message += `نام کانال: ${channel.channel_name}\n`;
            message += `لینک دعوت: ${channel.invite_link}\n\n`;
            return [
              { text: `تایید ${channel.channel_name}`, callback_data: `approve:${channel._id}` },
              { text: `رد ${channel.channel_name}`, callback_data: `reject:${channel._id}` }
            ];
          });
          bot.sendMessage(chatId, message, {
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        } else {
          bot.sendMessage(chatId, 'هیچ درخواست کانالی در انتظار نیست.');
        }
      } else {
        bot.sendMessage(chatId, 'متاسفانه شما دسترسی به این بخش را ندارید.');
      }
    } catch (error) {
      console.error('Error fetching pending channel requests:', error);
      bot.sendMessage(chatId, 'متاسفانه خطایی رخ داده است. لطفا بعدا دوباره تلاش کنید.');
    }
  }
});




bot.on('chat_member', async (msg) => {
  const chatId = msg.chat.id;
  if (msg.new_chat_member && msg.old_chat_member.status !== 'left' && msg.old_chat_member.status !== 'kicked') {
    const inviteLink = msg.invite_link ? msg.invite_link : msg.new_chat_member.invite_link;
    if (!inviteLink) {
      console.log("No invite link found in the message");
      return;
    }
    if (inviteLink) {
      try {
        const donorOwner = await donorController.getDonorOwnerByLink(inviteLink.invite_link);
        if (donorOwner) {
          const donorId = donorOwner.user_id;
          const newMemberId = msg.new_chat_member.user.id;
          const newMemberUsername = msg.new_chat_member.user.username;

          await donorController.updateDonorCount(donorId, inviteLink.name, inviteLink.invite_link, newMemberId, newMemberUsername);
          console.log(`Donor count updated for user ${donorId} in channel ${chatId}`);

          await userController.updateDonorCount(donorId, 1);
          console.log(`Donor count incremented for user ${donorId}`);

          await userController.updateDonorCountFromChannels(donorId);
          console.log(`Total donor count updated for user ${donorId}`);
        }
      } catch (error) {
        console.error('Error processing new chat member:', error);
      }
    }
  }
});





// UTLITY FUNCTIONS:

const notifyAdminsAboutWithdrawal = async (userId, amount, method, accountDetails) => {
    try {
      const admins = await userController.getAllAdmins();
      const user = await userController.getUser(userId);
      const donors = await donorController.getDonors(userId);
      
      let channelInfo = '';
      if (donors && donors.channels) {
        channelInfo = donors.channels.map(channel => 
          `کانال: ${channel.channel_url}, تعداد رفرال: ${channel.total_referrals}`
        ).join('\n');
      }
      
      const adminMessage = `
*درخواست برداشت جدید:*

شناسه کاربر: ${userId}
تعداد رفرال: ${amount}
روش برداشت: ${method}
جزئیات حساب: ${accountDetails}

اطلاعات کانال‌ها:
${channelInfo}
      `;

      const inlineKeyboard = {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'تایید', callback_data: `approve_withdraw:${userId}` },
              { text: 'رد درخواست', callback_data: `reject_withdraw:${userId}` }
            ]
          ]
        }
      };

      for (const admin of admins) {
        try {
          await bot.sendMessage(admin.user_id, adminMessage, inlineKeyboard);
        } catch (error) {
          console.error(`Failed to send withdrawal notification to admin ${admin.user_id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error notifying admins about withdrawal:', error);
    }
}





module.exports = bot;