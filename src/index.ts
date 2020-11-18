import TelegramBot from 'node-telegram-bot-api';
import fetch from 'isomorphic-fetch';

const auths: Record<number, string> = {};

const bot = new TelegramBot('1414153319:AAGT44tTq_BCCHvW3-bF3aMFzHnzvT4AvIk', { polling: true });
enum Commands {
    SHOW_PROJECTS = 'Show projects',
    STOP_PROJECT = 'Stop current project',
    START_PROJECT = 'Start project'
}

enum Queries {
    SELECT_PROJECT = 'Select project'
}

bot.on('message', async (msg) => {
    console.log('msg', msg);

    if (msg.text.startsWith('/setauth')) {
        const [command, auth] = msg.text.split(' ');

        console.log('command', command);
        auths[msg.chat.id] = auth;

        return;
    }

    switch (msg.text) {
        case Commands.SHOW_PROJECTS: {
            const params = {
                url: 'http://narrato.elastoo.com/api/projects/',
                options: { headers: {
                    Authorization: `Bearer ${auths[msg.chat.id]}`
                } }
            }
            await bot.sendMessage(msg.chat.id, JSON.stringify(params, null, 2));
            const response = await fetch(params.url, params.options);
            const result = await response.json();

            await bot.sendMessage(msg.chat.id, JSON.stringify(result, null, 2));

            await bot.sendMessage(msg.chat.id, Queries.SELECT_PROJECT, {
                reply_markup: {
                    inline_keyboard: [
                        result.results.map(({ label, uuid }: { label: string; uuid: string }) => ({ text: label, callback_data: uuid }))
                    ]
                }
            });

            return;
        }
    }

    const opts = {
        reply_markup: {
            keyboard: [
                [
                    { text: Commands.SHOW_PROJECTS },
                    { text: Commands.STOP_PROJECT }
                ]
            ]
        }
    };

    bot.sendMessage(msg.chat.id, 'hi', opts);
});

bot.on('callback_query', async (msg) => {
    console.log('msg', msg);
    switch (msg.message.text) {
        case Queries.SELECT_PROJECT: {
            const params = {
                url: `http://narrato.elastoo.com/api/projects/${msg.data}/session/new/`,
                options: {
                    headers: {
                        Authorization: `Bearer ${auths[msg.message.chat.id]}`,
                        'Content-Type': 'application/json',
                        accept: 'application/json'
                    },
                    method: 'POST'
                }
            };
            await bot.sendMessage(msg.message.chat.id, JSON.stringify(params, null, 2));

            const response = await fetch(params.url, params.options);
            const result = await response.json();

            await bot.sendMessage(msg.message.chat.id, JSON.stringify(result, null, 2));
        }
    }
});
