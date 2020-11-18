import TelegramBot from 'node-telegram-bot-api';
import fetch from 'isomorphic-fetch';
import { List, Session, Preject } from './types';
import { req } from './req';

let auth: string | null = null;
const sessions: Record<number, { projectId: string; sessionId: string }> = {};
const debug: Record<number, boolean> = {};

(async () => {
    const response = await fetch('https://narrato.elastoo.com/api/account/login/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=UTF-8'
        },
        body: JSON.stringify({
            password: "test",
            username: "admin"
        })
    });
    const result: { token: string } = await response.json();

    auth = result.token;
})();

const bot = new TelegramBot('1414153319:AAGT44tTq_BCCHvW3-bF3aMFzHnzvT4AvIk', { polling: true });
enum Commands {
    SHOW_PROJECTS = 'Show projects',
    STOP_PROJECT = 'Stop current project',
    START_PROJECT = 'Start project',
    ENABLE_DEBUG = 'Enable debug',
    DISABLE_DEBUG = 'Disable debug'
}

enum Queries {
    SELECT_PROJECT = 'Select project',
    CHOICE = 'Make choice'
}

bot.on('message', async (msg) => {
    switch (msg.text) {
        case Commands.SHOW_PROJECTS: {
            const result = await req<List<Preject>>(msg.chat.id, auth, bot, {
                url: 'https://narrato.elastoo.com/api/projects/'
            }, debug[msg.chat.id]);

            await bot.sendMessage(msg.chat.id, Queries.SELECT_PROJECT, {
                reply_markup: {
                    inline_keyboard: [
                        result.results.map(({ label, uuid }: { label: string; uuid: string }) => ({ text: label, callback_data: uuid }))
                    ]
                }
            });

            return;
        }

        case Commands.ENABLE_DEBUG: {
            debug[msg.chat.id] = true;

            const opts = {
                reply_markup: {
                    keyboard: [
                        [
                            { text: Commands.SHOW_PROJECTS },
                            debug[msg.chat.id] ? { text: Commands.DISABLE_DEBUG } : { text: Commands.ENABLE_DEBUG }
                        ]
                    ]
                }
            };
        
            await bot.sendMessage(msg.chat.id, 'hi', opts);

            return;
        }

        case Commands.DISABLE_DEBUG: {
            debug[msg.chat.id] = false;
        }
    }

    const opts = {
        reply_markup: {
            keyboard: [
                [
                    { text: Commands.SHOW_PROJECTS },
                    debug[msg.chat.id] ? { text: Commands.DISABLE_DEBUG } : { text: Commands.ENABLE_DEBUG }
                ]
            ]
        }
    };

    await bot.sendMessage(msg.chat.id, 'hi', opts);
});

bot.on('callback_query', async (msg) => {
    switch (msg.message.text) {
        case Queries.SELECT_PROJECT: {
            let currentResult = await req<Session>(msg.message.chat.id, auth, bot, {
                url: `https://narrato.elastoo.com/api/projects/${msg.data}/session/current/`
            }, debug[msg.message.chat.id]);

            if (!currentResult.current) {
                currentResult = await req<Session>(msg.message.chat.id, auth, bot, {
                    url: `https://narrato.elastoo.com/api/projects/${msg.data}/session/new/`,
                    options: {
                        headers: {
                            Authorization: `Bearer ${auth}`
                        },
                        method: 'POST'
                    }
                }, debug[msg.message.chat.id]);
            }

            sessions[msg.message.chat.id] = {
                projectId: msg.data,
                sessionId: currentResult.current.uuid
            }

            if (currentResult.current.is_finished) {
                await bot.sendMessage(msg.message.chat.id, 'Finished, you shold stop current project ');
            }

            await bot.sendMessage(msg.message.chat.id, Queries.CHOICE, {
                reply_markup: {
                    inline_keyboard: [
                        currentResult
                            .choices
                            .map(({ label, uuid }: { label: string; uuid: string }) => ({ text: label, callback_data: uuid }))
                            .concat([{ text: 'Stop project', callback_data: 'stop' }])
                    ]
                }
            });

            return;
        }

        case Queries.CHOICE: {
            const { projectId } = sessions[msg.message.chat.id];

            if (msg.data === 'stop') {
                await req<Session>(msg.message.chat.id, auth, bot, {
                    url: `https://narrato.elastoo.com/api/projects/${projectId}/session/end/`,
                    options: {
                        method: 'DELETE'
                    }
                }, debug[msg.message.chat.id]);

                bot.sendMessage(msg.message.chat.id, 'OK you can start new project, click show projects');

                return;
            }

            let currentResult = await req<Session>(msg.message.chat.id, auth, bot, {
                url: `https://narrato.elastoo.com/api/projects/${projectId}/session/step/`,
                options: {
                    method: 'POST',
                    body: JSON.stringify({
                        uuid: msg.data
                    }),
                    headers: {
                        'Content-Type': 'application/json;charset=UTF-8'
                    }
                }
            }, debug[msg.message.chat.id]);

            if (currentResult.current.is_finished) {
                await bot.sendMessage(msg.message.chat.id, 'Finished');
            }

            await bot.sendMessage(msg.message.chat.id, Queries.CHOICE, {
                reply_markup: {
                    inline_keyboard: [
                        currentResult
                            .choices
                            .map(({ label, uuid }: { label: string; uuid: string }) => ({ text: label, callback_data: uuid }))
                            .concat([{ text: 'Stop project', callback_data: 'stop' }])
                    ]
                }
            });

            return;
        }
    }
});
