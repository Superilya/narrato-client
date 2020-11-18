import TelegramBot from 'node-telegram-bot-api';
import fetch from 'isomorphic-fetch';

type Params = {
    url: string;
    options?: RequestInit
}

export const req = async <T>(chatId: number, auth: string, bot: TelegramBot, params: Params, debug: boolean = false) => {
    const targetParams: Params['options'] = {
        ...params.options,
        headers: {
            ...params.options?.headers,
            Authorization: `Bearer ${auth}`
        }
    };
    if (debug) {
        await bot.sendMessage(chatId, 'Request - ' + JSON.stringify({ ...params, options: targetParams }, null, 4));
    }

    const response = await fetch(params.url, targetParams);
    const text = await response.text();
    let result = null;

    try {
        result = JSON.parse(text) as T;
    } catch (e) {
        console.log(text);
    }

    if (debug) {
        await bot.sendMessage(chatId, `Response - ${response.status} - ` + JSON.stringify(result, null, 4));
    }

    return result;
}
