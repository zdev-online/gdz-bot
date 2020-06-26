const { vk, gdz } = require('../app');

vk.updates.on('message',(ctx,next)=>{
    if(ctx.messagePayload && ctx.messagePayload.action == 'find'){
        return ctx.scene.enter('find');
    } else if(ctx.messagePayload && ctx.messagePayload.action == 'stats'){
        return ctx.send(gdz.getFrags(ctx.senderId, ctx.user.first_name));
    }
    return next();
}); 

vk.updates.hear(/^найти$/i, (ctx)=>{
    return ctx.scene.enter('find');
});

vk.updates.hear(/^статистика/i, (ctx, next)=>{
    return ctx.send(gdz.getFrags(ctx.senderId, ctx.user.first_name));
});