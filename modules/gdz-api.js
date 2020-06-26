const rp = require('request-promise');
const LINK = 'API_LINK';
const fs = require('fs');


class GDZ {
    constructor(){}
    
    getLesson(_lesson, _class, _author){
        let options = {
            error: false,
            body: false,
            code: 200
        }
        return new Promise((res, err)=>{
            rp.get(LINK, {
                qs:{
                    per_page: 100,
                    s_subject: _lesson,
                    s_class: _class + ' класс',
                    s_author: _author
                }
            },(error, response, body)=>{
                if(error){
                    options.error = error;
                    options.body = false;
                } else {
                    if(response.statusCode != 200){
                        options.error = response.statusMessage;
                        options.code = response.statusCode;
                    } else {
                        options.error = false;
                        options.code = response.statusCode;
                        options.body = JSON.parse(body);
                    }
                }
                return res(options);
            });
        });
    }

    getBook(_id){
        let options = {
            error: false,
            body: false,
            code: 200
        }
        return new Promise((res, err)=>{
            rp.get(`${LINK}${_id}`,(error, response, body)=>{
                if(error){
                    options.error = error;
                    options.body = false;
                } else {
                    if(response.statusCode != 200){
                        options.error = response.statusMessage;
                        options.code = response.statusCode;
                    } else {
                        options.error = false;
                        options.code = response.statusCode;
                        options.body = JSON.parse(body);
                    }
                }
                return res(options);
            });
        });
    }

    getIMG(_url, _forId, callback){
        let format = _url.match(/png|jpg|jpeg/gi);
        format = format[0];
        _url = encodeURI(_url);
        rp.get(_url).pipe(fs.createWriteStream(`${__dirname}/../uploads/${_forId}.${format}`)).on("close", ()=>{
            callback(format);
        });
        return 1;
    }
    
    addFrag(_id, _lesson){
        let data = JSON.parse(fs.readFileSync('./users.json'));
        if(!data[_id]){
            data[_id] = {}
            data[_id][_lesson] = 0;
        }
        if(data[_id] && !data[_id][_lesson]){data[_id][_lesson] = 0;}
        data[_id][_lesson] += 1;
        fs.writeFileSync('./users.json', JSON.stringify(data, '' , 4));
        return 1;
    }

    getFrags(_id, name){
        let data = JSON.parse(fs.readFileSync('./users.json'));
        let message = `${name}, `;
        if(!data[_id]){
            data[_id]={}
        } 
        if(!Object.keys(data[_id]).length){
            message += `статистика пуста!`;
        } else {
            let keys = Object.keys(data[_id]);
            message += 'ваша статистика:\n';
            for(let i = 0; i < keys.length; i++){
                message += `${keys[i]}: ${data[_id][keys[i]]}\n`;
            }
        }
        return message;
    }
}

module.exports = { GDZ }