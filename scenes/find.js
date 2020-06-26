const rp = require('request-promise');
const { scene, StepScene, gdz, vk } = require('../app');
const { DYNAMIC_MENU, MAIN_MENU } = require('../modules/keyboard');
const { classes } = require('../config');
const { Keyboard } = require('vk-io');
const logger = require('../modules/logger');
const fs = require('fs');

const RandomAnswers = [
    "Ура. Я нашел для тебя ответ! Нужен другой ответ к этому учебнику? Жми \"Найти\".",
    "Ответ найден! Нужен другой ответ к этому учебнику? Жми \"Найти\".",
    "Я нашел решение! Нужен другой ответ к этому учебнику? Жми \"Найти\".",
    "Было сложно, но я нашел ответ! Если нужен другой жми \"Найти\"."
]

const lessons = JSON.parse(fs.readFileSync(`${__dirname}/../lessons.json`));

scene.addScene(new StepScene('find',[
    // Класс
    (ctx)=>{    
        if(ctx.scene.step.firstTime || !ctx.text){
            ctx.scene.state.key = DYNAMIC_MENU(classes, 'find');
            ctx.scene.state.page = 0;
            return ctx.send(`${ctx.user.first_name}, введите свой класс или нажмите кнопку`,{
                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
            });
        }

        if(ctx.messagePayload){
            switch(ctx.messagePayload.action){
                case 'select':{
                    ctx.scene.state.classs = classes[ctx.messagePayload.value];
                    return ctx.scene.step.next();
                }
                case 'next':{
                    ctx.scene.state.page += (ctx.scene.state.page+1 > ctx.scene.state.key.ln) ? 0 : 1;
                    return ctx.send('Следующая страница',{
                        keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                    })
                }
                case 'previous':{
                    ctx.scene.state.page -= (ctx.scene.state.page-1 < 0) ? 0 : 1;
                    return ctx.send('Предыдущая страница',{
                        keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                    })
                }
            }
        } else {
            if(/^[0-9]+$/i.test(ctx.text)){
                let les_num = ctx.text.match(/^[0-9]+$/i);
                les_num = les_num[0]-1;
                if(les_num < 0 || les_num > classes.length-1){
                    return ctx.send(`${ctx.user.first_name}, класс указан неверно!`);
                }
                ctx.scene.state.classs = classes[les_num]; 
                return ctx.scene.step.next();
            } else {
                return ctx.send(`${ctx.user.first_name}, класс указан неверно!`);
            }
        }
    },
    // Предмет
    (ctx)=>{
        let controller = 1;
        let lesson = '';
        let idsOfLessons = [];
        let keysOfLessons = [];
        for(let i = 0; i < lessons.length; i++){
            if(lessons[i].classes.indexOf(ctx.scene.state.classs) != -1){
                lesson += `${controller}. ${lessons[i].lesson}\n`;
                idsOfLessons.push(i);
                keysOfLessons.push(lessons[i].lesson);
                controller++;
            }
        }
        if(ctx.scene.step.firstTime || !ctx.text){
            ctx.scene.state.key = DYNAMIC_MENU(keysOfLessons, 'find');
            ctx.scene.state.page = Number(0);
            return ctx.send(`${ctx.user.first_name}, выберите предмет или введите его номер!\n${lesson}`,{
                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
            });
        }
        if(ctx.messagePayload){
            switch(ctx.messagePayload.action){
                case 'select':{
                    ctx.scene.state.lesson = lessons[idsOfLessons[ctx.messagePayload.value]].lesson;
                    return ctx.scene.step.next();
                }
                case 'next':{
                    ctx.scene.state.page++;
                    if(ctx.scene.state.page > ctx.scene.state.key.ln){
                        ctx.scene.state.page--;
                    }
                    return ctx.send('Следующая страница',{
                        keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                    })
                }
                case 'previous':{
                    ctx.scene.state.page -= (ctx.scene.state.page-1 < 0) ? 0 : 1;
                    return ctx.send('Предыдущая страница',{
                        keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                    })
                }
                case 'prev_page':{
                    return ctx.scene.step.previous();
                }
            }
        } else {
            if(/^[0-9]+$/i.test(ctx.text)){
                let les_num = ctx.text.match(/^[0-9]+$/i);
                les_num = les_num[0]-1;
                if(les_num < 0 || les_num > lessons.length-1){
                    return ctx.send(`${ctx.user.first_name}, неверный номер!`);
                }
                ctx.scene.state.lesson = lessons[idsOfLessons[les_num]].lesson; 
                return ctx.scene.step.next();
            } else {
                return ctx.send(`${ctx.user.first_name}, неверный номер предмета!`);
            }
        }
    },
    async (ctx)=>{
        ctx.scene.state.dbles = ctx.scene.state.lesson;
        let data = await gdz.getLesson(ctx.scene.state.dbles, ctx.scene.state.classs);
        let authors = '';
        let ARRAY_BOOKS = [];
        if(data.error){
            logger.error(`[CLASS SELECT][${ctx.scene.state.lesson}] >> ${data.code} >> ${data.error}`);
            ctx.send(`${ctx.user.first_name}, учебников для данного класса нет!`,{
                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[0])
            });
            return ctx.scene.step.previous();
        } else {
            if(data.body.total_posts){
                for(let i=0; i<data.body.data.length; i++){
                    authors +=  `${i+1}. ${data.body.data[i].title}\n&#12288;${data.body.data[i].author}\n&#13;\n`;
                    ARRAY_BOOKS.push(i+1);
                }
            } else {
                logger.warn(`[CLASS SELECT][${ctx.scene.state.lesson}] >> ${data.code} >> POSTS: ${data.body.total_posts}`)
                ctx.send(`${ctx.user.first_name}, предмет с данным классом не найден! Обратитесь к администрации!\nЛибо выберите другой класс!`,{
                    keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[0])
                });
                return ctx.scene.step.previous();
            }
        }
        if(ctx.scene.step.firstTime || !ctx.text){
            ctx.scene.state.key = DYNAMIC_MENU(ARRAY_BOOKS, 'find');
            ctx.scene.state.page = 0;
            return ctx.send(`${ctx.user.first_name}, нажмите кнопку, либо введите номер автора!\n${authors}`,{
                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
            });
        }
        if(ctx.messagePayload){
            switch(ctx.messagePayload.action){
                case 'select':{
                    ctx.scene.state.bookId = data.body.data[ctx.messagePayload.value].id;
                    // ctx.scene.state.lesson = data.body.data[ctx.messagePayload.value].title;
                    ctx.scene.state.author = data.body.data[ctx.messagePayload.value].author;
                    return ctx.scene.step.next();
                }
                case 'next':{
                    ctx.scene.state.page += (ctx.scene.state.page+1 > ctx.scene.state.key.ln) ? 0 : 1;
                    return ctx.send('Следующая страница',{
                        keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                    })
                }
                case 'previous':{
                    ctx.scene.state.page -= (ctx.scene.state.page-1 < 0) ? 0 : 1;
                    return ctx.send('Предыдущая страница',{
                        keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                    })
                }
                case 'prev_page':{
                    return ctx.scene.step.previous();
                }
            }
        } else {
            if(/^[0-9]+$/i.test(ctx.text)){
                let les_num = ctx.text.match(/^[0-9]+$/i);
                les_num = les_num[0]-1;
                if(les_num < 0 || les_num > ARRAY_BOOKS.length-1){
                    return ctx.send(`${ctx.user.first_name}, неверный номер!`);
                }
                ctx.scene.state.bookId = data.body.data[les_num].id;
                // ctx.scene.state.lesson = data.body.data[les_num].title;
                ctx.scene.state.author = data.body.data[les_num].author;
                return ctx.scene.step.next();
            } else {
                return ctx.send(`${ctx.user.first_name}, неверный номер учебника!`);
            }
        }
    },
    async (ctx)=>{
        let data = await gdz.getBook(ctx.scene.state.bookId);
        if(data.error){
            logger.error(`[FIND-BOOK][${data.body.id}][${data.body.title}] >> ${data.error}`);
            await ctx.send(`${ctx.user.first_name}, учебник не найден!`,{
                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
            });
            return ctx.scene.step.previous();
        } else if(!data.body.answers){
            logger.warn(`[FIND-BOOK][${data.body.id}][${data.body.title}] >> ${data.code} >> ${data.error}`);
            await ctx.send(`${ctx.user.first_name}, нет ответов для данного учебника!`,{
                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
            });
            return ctx.scene.step.previous();
        }
        let message = '';
        if(ctx.scene.step.firstTime || !ctx.text){
            let answers = data.body.answers;
            
            ctx.scene.state.type = getBookType(answers);    
            ctx.scene.state.answers = {}
            ctx.scene.state.keys = [];
            ctx.scene.state.page = 0;

            switch(ctx.scene.state.type){
                case 'OnlyNumber':{
                    message = 'выберите номер!\n';
                    for(let i = 0; i < answers.length; i++){
                        let split = answers[i].title.split(' / ');
                        if(!ctx.scene.state.answers[split[0]]){ctx.scene.state.answers[split[0]] = {}}
                        ctx.scene.state.answers[split[0]] = {
                            id: i,
                            img: answers[i].img_url,
                            link: answers[i].page_link
                        }
                    }
                    ctx.scene.state.keys = Object.keys(ctx.scene.state.answers);
                    let { keys } = ctx.scene.state;
                    message += `Вводи номер с ${keys[0]} по ${keys[keys.length-1]}!`;
                    ctx.scene.state.key = DYNAMIC_MENU(ctx.scene.state.keys, 'find');
                    break;
                }
                case 'UnitNumber':{
                    message = 'выберите раздел!\n';
                    for(let i = 0; i < answers.length; i++){
                        let split = answers[i].title.split(' / ');
                        if(!ctx.scene.state.answers[split[0]]){ctx.scene.state.answers[split[0]] = {}}
                        ctx.scene.state.answers[split[0]][split[1]] = {
                            id: i,
                            img: answers[i].img_url,
                            link: answers[i].page_link
                        }
                    }
                    ctx.scene.state.keys = Object.keys(ctx.scene.state.answers);
                    ctx.scene.state.key = DYNAMIC_MENU(ctx.scene.state.keys, 'find');
                    break;
                }
                case 'UnitSubunitNumber':{
                    message = 'выберите раздел!\n';
                    for(let i = 0; i < answers.length; i++){
                        let split = answers[i].title.split(' / ');
                        if(!ctx.scene.state.answers[split[0]]){ctx.scene.state.answers[split[0]] = {}}
                        if(!ctx.scene.state.answers[split[0]][split[1]]){ctx.scene.state.answers[split[0]][split[1]]={}}
                        ctx.scene.state.answers[split[0]][split[1]][split[2]]= {
                            id: i,
                            img: answers[i].img_url,
                            link: answers[i].page_link
                        }
                    }
                    ctx.scene.state.keys = Object.keys(ctx.scene.state.answers);
                    ctx.scene.state.key = DYNAMIC_MENU(ctx.scene.state.keys, 'find');
                    break;
                }
            }

            return ctx.send(`${ctx.user.first_name}, ${message}`,{
                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
            });
        }

        if(ctx.messagePayload){
            switch(ctx.messagePayload.action){
                case 'select':{
                    if(ctx.scene.state.type == 'OnlyNumber'){
                        let answer = ctx.scene.state.answers[ctx.scene.state.keys[ctx.messagePayload.value]];
                        gdz.getIMG(answer.img, ctx.senderId, (data)=>{
                            vk.upload.messagePhoto({
                                peer_id: ctx.peerId,
                                source: __dirname + `/../uploads/${ctx.senderId}.${data}`
                            }).then(async (img)=>{
                                await vk.api.messages.send({
                                    peer_id: ctx.peerId,
                                    message: `${ctx.user.first_name}, ${arrayRandEl(RandomAnswers)}\nИсточник: ${answer.link}`,
                                    attachment: img.toString(),
                                    dont_parse_links: true,
                                    keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                                }).catch(console.error);
                                gdz.addFrag(ctx.senderId, ctx.scene.state.dbles);
                                fs.unlinkSync(`${__dirname}/../uploads/${ctx.senderId}.${data}`);
                                return 1;
                            }).catch((error)=>{
                                logger.error(`Ошибка загрузки фото ${error.message}`);
                                return ctx.send(`${ctx.user.first_name}, ошибка загрузки фото\nДержи только ссылку: ${answer.link}`,{
                                    keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                                });
                            });
                        });
                        return 1;
                    } else {
                        ctx.scene.state.answers = ctx.scene.state.answers[ctx.scene.state.keys[ctx.messagePayload.value]];
                        return ctx.scene.step.next();
                    }
                }
                case 'next':{
                    ctx.scene.state.page += (ctx.scene.state.page+1 > ctx.scene.state.key.ln) ? 0 : 1;
                    return ctx.send(`Следующая страница`,{
                        keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                    })
                }
                case 'previous':{
                    ctx.scene.state.page -= (ctx.scene.state.page-1 < 0) ? 0 : 1;
                    return ctx.send(`Предыдущая страница}`,{
                        keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                    })
                }
                case 'prev_page':{
                    return ctx.scene.step.previous();
                }
            }
        } else if(/[\w\W]+/i.test(ctx.text)){
            let finder = false;
            for(let i = 0; i < ctx.scene.state.keys.length; i++){
                if(ctx.scene.state.keys[i] == ctx.text){
                    finder = ctx.scene.state.keys[i];
                }
            }
            if(finder){
                if(ctx.scene.state.type == 'OnlyNumber'){
                    let answer = ctx.scene.state.answers[finder];
                    gdz.getIMG(answer.img, ctx.senderId, (data)=>{
                        vk.upload.messagePhoto({
                            peer_id: ctx.peerId,
                            source: __dirname + `/../uploads/${ctx.senderId}.${data}`
                        }).then(async (img)=>{
                            await vk.api.messages.send({
                                peer_id: ctx.peerId,
                                message: `${ctx.user.first_name}, ${arrayRandEl(RandomAnswers)}\nИсточник: ${answer.link}`,
                                attachment: img.toString(),
                                dont_parse_links: true,
                                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                            }).catch(console.error);
                            gdz.addFrag(ctx.senderId, ctx.scene.state.dbles);
                            fs.unlinkSync(`${__dirname}/../uploads/${ctx.senderId}.${data}`);
                            return 1;
                        }).catch((error)=>{
                            logger.error(`Ошибка загрузки фото ${error.message}`);
                            return ctx.send(`${ctx.user.first_name}, ошибка загрузки фото\nДержи только ссылку: ${answer.link}`,{
                                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                            });
                        });
                    });
                    return 1;
                } 
                ctx.scene.state.prevAnswer = ctx.scene.state.answers[finder];
                ctx.scene.state.answers = ctx.scene.state.answers[finder];
                return ctx.scene.step.next();
            } else {
                let notFind = '';
                if(ctx.scene.state.type == 'OnlyNumber'){
                    notFind = 'номер не найден';
                }
                if(ctx.scene.state.type == 'UnitNumber'){
                    notFind = 'раздел не найден';
                }
                if(ctx.scene.state.type == 'UnitSubunitNumber'){
                    notFind = 'раздел не найден';
                }
                return ctx.send(`${ctx.user.first_name}, ${notFind}, попробуйте еще раз!`);
            }  
        }
    },
    (ctx)=>{
        if(ctx.scene.step.firstTime || !ctx.text){
            let message = '';
            ctx.scene.state.page = 0;
            switch(ctx.scene.state.type){
                case 'UnitNumber':{
                    message = 'выберите номер!';
                    ctx.scene.state.keys = Object.keys(ctx.scene.state.answers);
                    let { keys } = ctx.scene.state;
                    message += `Вводи номер с ${keys[0]} по ${keys[keys.length-1]}!`;
                    ctx.scene.state.key = DYNAMIC_MENU(ctx.scene.state.keys, 'find');
                    break;
                }
                case 'UnitSubunitNumber':{
                    message = 'выберите подраздел!';
                    ctx.scene.state.keys = Object.keys(ctx.scene.state.answers);
                    ctx.scene.state.key = DYNAMIC_MENU(ctx.scene.state.keys, 'find');
                    break;
                }
            }
            return ctx.send(`${ctx.user.first_name}, ${message}`,{
                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
            });
        }
        if(ctx.messagePayload){
            switch(ctx.messagePayload.action){
                case 'select':{
                    if(ctx.scene.state.type == 'UnitNumber'){
                        let answer = ctx.scene.state.answers[ctx.scene.state.keys[ctx.messagePayload.value]];
                        gdz.getIMG(answer.img, ctx.senderId, (data)=>{
                            vk.upload.messagePhoto({
                                peer_id: ctx.peerId,
                                source: __dirname + `/../uploads/${ctx.senderId}.${data}`
                            }).then(async (img)=>{
                                await vk.api.messages.send({
                                    peer_id: ctx.peerId,
                                    message: `${ctx.user.first_name}, ${arrayRandEl(RandomAnswers)}\nИсточник: ${answer.link}`,
                                    attachment: img.toString(),
                                    dont_parse_links: true,
                                    keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                                }).catch(console.error);
                                gdz.addFrag(ctx.senderId, ctx.scene.state.dbles);
                                fs.unlinkSync(`${__dirname}/../uploads/${ctx.senderId}.${data}`);
                                return 1;
                            }).catch((error)=>{
                                logger.error(`Ошибка загрузки фото ${error.message}`);
                                return ctx.send(`${ctx.user.first_name}, ошибка загрузки фото\nДержи только ссылку: ${answer.link}`,{
                                    keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                                });
                            });
                        });
                        return 1;
                    } else {
                        ctx.scene.state.answerUSN = ctx.scene.state.answers;
                        ctx.scene.state.answers = ctx.scene.state.answers[ctx.scene.state.keys[ctx.messagePayload.value]];
                        return ctx.scene.step.next();
                    }
                }
                case 'next':{
                    ctx.scene.state.page += (ctx.scene.state.page+1 > ctx.scene.state.key.ln) ? 0 : 1;
                    return ctx.send('Следующая страница',{
                        keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                    })
                }
                case 'previous':{
                    ctx.scene.state.page -= (ctx.scene.state.page-1 < 0) ? 0 : 1;
                    return ctx.send('Предыдущая страница',{
                        keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                    })
                }
                case 'prev_page':{
                    return ctx.scene.step.previous();
                }
            }
        } else if(/[\w\W]+/i.test(ctx.text)){
            let finder = false;
            for(let i = 0; i < ctx.scene.state.keys.length; i++){
                if(ctx.scene.state.keys[i] == ctx.text){
                    finder = ctx.scene.state.keys[i];
                }
            }
            if(finder){
                if(ctx.scene.state.type == 'UnitNumber'){
                    let answer = ctx.scene.state.answers[finder] || ctx.scene.state.answerUSN[finder];
                    gdz.getIMG(answer.img, ctx.senderId, (data)=>{
                        vk.upload.messagePhoto({
                            peer_id: ctx.peerId,
                            source: __dirname + `/../uploads/${ctx.senderId}.${data}`
                        }).then(async (img)=>{
                            await vk.api.messages.send({
                                peer_id: ctx.peerId,
                                message: `${ctx.user.first_name}, ${arrayRandEl(RandomAnswers)}\nИсточник: ${answer.link}`,
                                attachment: img.toString(),
                                dont_parse_links: true,
                                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                            }).catch(console.error);
                            gdz.addFrag(ctx.senderId, ctx.scene.state.dbles);
                            fs.unlinkSync(`${__dirname}/../uploads/${ctx.senderId}.${data}`);
                            return 1;
                        }).catch((error)=>{
                            logger.error(`Ошибка загрузки фото ${error.message}`);
                            return ctx.send(`${ctx.user.first_name}, ошибка загрузки фото\nДержи только ссылку: ${answer.link}`,{
                                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                            });
                        });
                    });
                    return 1;
                } 
                ctx.scene.state.answers = ctx.scene.state.answers[finder];
                return ctx.scene.step.next();
            } else {
                let notFind = '';
                if(ctx.scene.state.type == 'OnlyNumber'){
                    notFind = 'номер не найден';
                }
                if(ctx.scene.state.type == 'UnitNumber'){
                    notFind = 'номер не найден';
                }
                if(ctx.scene.state.type == 'UnitSubunitNumber'){
                    notFind = 'раздел не найден';
                }
                return ctx.send(`${ctx.user.first_name}, ${notFind}, попробуйте еще раз!`);
            }
        }
    },
    (ctx)=>{
        if(ctx.scene.step.firstTime || !ctx.text){
            ctx.scene.state.page = 0;
            ctx.scene.state.keys = Object.keys(ctx.scene.state.answers);
            ctx.scene.state.key = DYNAMIC_MENU(ctx.scene.state.keys, 'find');
            let { keys } = ctx.scene.state;
            let message  = `Вводи номер с ${keys[0]} по ${keys[keys.length-1]}!`;
            return ctx.send(`${ctx.user.first_name}, выберите номер!\n${message}`, {
                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
            });
        }

        if(ctx.messagePayload){
            switch(ctx.messagePayload.action){
                case 'select':{
                    let answer = ctx.scene.state.answers[ctx.scene.state.keys[ctx.messagePayload.value]];
                    gdz.getIMG(answer.img, ctx.senderId, (data)=>{
                        vk.upload.messagePhoto({
                            peer_id: ctx.peerId,
                            source: __dirname + `/../uploads/${ctx.senderId}.${data}`
                        }).then(async (img)=>{
                            await vk.api.messages.send({
                                peer_id: ctx.peerId,
                                message: `${ctx.user.first_name}, ${arrayRandEl(RandomAnswers)}\nИсточник: ${answer.link}`,
                                attachment: img.toString(),
                                dont_parse_links: true,
                                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                            }).catch(console.error);
                            gdz.addFrag(ctx.senderId, ctx.scene.state.dbles);
                            fs.unlinkSync(`${__dirname}/../uploads/${ctx.senderId}.${data}`);
                            return 1;
                        }).catch((error)=>{
                            logger.error(`Ошибка загрузки фото ${error.message}`);
                            return ctx.send(`${ctx.user.first_name}, ошибка загрузки фото\nДержи только ссылку: ${answer.link}`,{
                                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                            });
                        });
                    });
                    return 1;
                }
                case 'next':{
                    ctx.scene.state.page += (ctx.scene.state.page+1 > ctx.scene.state.key.ln) ? 0 : 1;
                    return ctx.send('Следующая страница',{
                        keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                    })
                }
                case 'previous':{
                    ctx.scene.state.page -= (ctx.scene.state.page-1 < 0) ? 0 : 1;
                    return ctx.send('Предыдущая страница',{
                        keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                    })
                }
                case 'prev_page':{
                    return ctx.scene.step.previous();
                }
            }
        } else if(/[\w\W]+/i.test(ctx.text)){
            let finder = false;
            for(let i = 0; i < ctx.scene.state.keys.length; i++){
                if(ctx.scene.state.keys[i] == ctx.text){
                    finder = ctx.scene.state.keys[i];
                }
            }
            if(finder){
                    let answer = ctx.scene.state.answers[finder];
                    gdz.getIMG(answer.img, ctx.senderId, (data)=>{
                        vk.upload.messagePhoto({
                            peer_id: ctx.peerId,
                            source: __dirname + `/../uploads/${ctx.senderId}.${data}`
                        }).then(async (img)=>{
                            await vk.api.messages.send({
                                peer_id: ctx.peerId,
                                message: `${ctx.user.first_name}, ${arrayRandEl(RandomAnswers)}\nИсточник: ${answer.link}`,
                                attachment: img.toString(),
                                dont_parse_links: true,
                                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                            }).catch(console.error);
                            gdz.addFrag(ctx.senderId, ctx.scene.state.dbles);
                            fs.unlinkSync(`${__dirname}/../uploads/${ctx.senderId}.${data}`);
                            return 1;
                        }).catch((error)=>{
                            logger.error(`Ошибка загрузки фото ${error.message}`);
                            return ctx.send(`${ctx.user.first_name}, ошибка загрузки фото\nДержи только ссылку: ${answer.link}`,{
                                keyboard: Keyboard.keyboard(ctx.scene.state.key.kb[ctx.scene.state.page])
                            });
                        });
                    });
                    return 1;
            } else {
                let notFind = '';
                if(ctx.scene.state.type == 'OnlyNumber'){
                    notFind = 'номер не найден';
                }
                if(ctx.scene.state.type == 'UnitNumber'){
                    notFind = 'номер не найден';
                }
                if(ctx.scene.state.type == 'UnitSubunitNumber'){
                    notFind = 'номер не найден';
                }
                return ctx.send(`${ctx.user.first_name}, ${notFind}, попробуйте еще раз!`);
            }
        }
    }
]));

process.on("unhandledRejection",(res, promise)=>{
    return 0;
});
function arrayRandEl(arr) {
    var rand = Math.floor(Math.random() * arr.length);
    return arr[rand];
}
function getBookType(answers){
    let type = answers[0].title.split(' / ');
    switch(type.length){
        case 1: {
            type = 'OnlyNumber';
            break;
        }
        case 2: {
            type = 'UnitNumber';
            break;
        }
        case 3: {
            type = 'UnitSubunitNumber';
            break;
        }
    }
    return type;
}
