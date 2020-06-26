const cfg = require('./config');

const { VK, Keyboard } = require('vk-io');
const { SessionManager } = require('@vk-io/session');
const { SceneManager, StepScene } = require('@vk-io/scenes');
const { GDZ } = require('./modules/gdz-api');
const logger = require('./modules/logger');
const { MAIN_MENU } = require('./modules/keyboard');

const vk = new VK({ token: cfg.token });
const session = new SessionManager();
const scene = new SceneManager();
const gdz = new GDZ();

vk.updates.start().then(()=>{
    logger.log(`Бот запущен`);
}).catch((e)=>{
    logger.error(e.message)
});

vk.updates.on('message', session.middleware);
vk.updates.on('message', scene.middleware);
vk.updates.on('message', async (ctx, next)=>{
    if(!ctx.isUser){ return 1; }
    ctx.user = await vk.api.users.get({ user_ids: ctx.senderId });
    ctx.user = ctx.user[0];

    let data = await vk.api.groups.isMember({group_id: ctx.$groupId, user_id: ctx.senderId});
    if(!data){
        ctx.send(`${ctx.user.first_name}, ты ещё не подписался на нашу группу! Скорей подписывайся – vk.com/spishygdz`);
    }

    if (!ctx.scene.current) {
        if(ctx.messagePayload && ctx.messagePayload.command == 'start'){
            ctx.send(`Доброго времени суток. ${ctx.user.first_name}, попробуем вместе решить твое домашнее задание? В каком классе ты учишься? Введи текст или выбери на клавиатуре!`, {
                keyboard: Keyboard.keyboard(MAIN_MENU)
            });
        } else if(ctx.messagePayload && ctx.messagePayload.page != 'main'){
            ctx.send(`Главное меню`, {
                keyboard: Keyboard.keyboard(MAIN_MENU)
            });
        }
        return next();
    }

    if (ctx.messagePayload && ctx.messagePayload.action === 'cancel') {
        ctx.send(`Главное меню`, {
            keyboard: Keyboard.keyboard(MAIN_MENU)
        });
        return ctx.scene.leave({
            canceled: true
        });
    }

    if(/\/(restart)|(заново)/i.test(ctx.text)){
        if(ctx.scene.current){
            ctx.scene.reset();
            ctx.scene.leave();
            return ctx.scene.enter('find');
        }
    }

    return ctx.scene.reenter();
});

module.exports = { vk, scene, StepScene, gdz }

require('./scenes/find');
require('./commands/user');