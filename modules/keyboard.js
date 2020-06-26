const { Keyboard } = require('vk-io');
const { textButton, urlButton, POSITIVE_COLOR, PRIMARY_COLOR, SECONDARY_COLOR, NEGATIVE_COLOR } = Keyboard;
const { tutotial_link, add_book_link } = require('../config');

module.exports = {
    MAIN_MENU: [
        [
            textButton({label: 'Найти', color: POSITIVE_COLOR, payload: {
                action: 'find',
                page: 'main'
            }}),
            textButton({label: 'Статистика', color: POSITIVE_COLOR, payload: {
                action: 'stats',
                page: 'main'
            }})
        ],
        [
            urlButton({label: 'Добавить учебник', url: add_book_link}),
            urlButton({label: 'Инструкция', url: tutotial_link})
        ]
    ],
    DYNAMIC_MENU: (array, page)=>{
        if(!Array.isArray(array)){return false;}
        let NEXT_BUTTON = textButton({label:'Следующая', color: POSITIVE_COLOR, payload:{
            action: 'next',
            page: page
        }});
        let PREV_BUTTON = textButton({label:'Предыдущая', color: POSITIVE_COLOR, payload:{
            action: 'previous',
            page: page
        }});
        let CANCEL_BUTTON = textButton({label: 'Выход', color: NEGATIVE_COLOR, payload:{
            action: 'cancel',
            page: page
        }});
        let PREV_STEP_BUTTON = textButton({label: 'Назад', color: NEGATIVE_COLOR, payload:{
            action: 'prev_page',
            page: page
        }});

        let PAGES = [];

        let SEPARATOR = 3;
        // if(array.length < 3){ SEPARATOR = 1}
        for (let i = 0; i < array.length; i+=SEPARATOR){
            PAGES.push(array.slice(i, i+SEPARATOR));
        }

        for (let i = 0; i < PAGES.length; i++){
            for (let j = 0; j < PAGES[i].length; j++) {
                for(let a = 0; a < array.length; a++){
                    if(PAGES[i][j] == array[a]){
                        PAGES[i][j] = String(PAGES[i][j]).slice(0,20);
                        PAGES[i][j] = textButton({label: PAGES[i][j], color: SECONDARY_COLOR, payload:{
                            action: 'select',
                            page: page,
                            value: a
                        }});
                    }
                }
            }
        }
        let TEMPKEYBOARD = [];
        for (let i = 0; i < PAGES.length; i+=2) {
            let SLICED = PAGES.slice(i,i+2);
            SLICED.push([PREV_BUTTON ,NEXT_BUTTON],[CANCEL_BUTTON, PREV_STEP_BUTTON]);
            TEMPKEYBOARD.push(SLICED);
        }
        
        return {
            kb: TEMPKEYBOARD,
            ln: TEMPKEYBOARD.length-1
        }
    }
}