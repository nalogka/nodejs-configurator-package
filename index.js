const fs = require('fs');
if(!process.env.APP_ENV){ //Нужно читать из файла только если окружение еще не настроено
    require('dotenv').load();
}
const env = process.env.APP_ENV || 'dev';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const subst = function (string, data) {
    let value = function (param)  {
        if (typeof data[param] === 'undefined') {
            throw Error(`Нет данных для подстановки ${param}`);
        }
        return data[param];
    };

    return string.replace(/\{(\w+)\}/, (match, param) => value(param));
};


let getType = (val) => {
    switch (true) {
        case val && val.constructor === Array:
            return 'array';
        case val !== null && typeof val === 'object':
            return 'object';
        case !(val !== null && typeof val !== 'undefined'):
            return 'empty';
        default:
            return 'scalar';
    }
};

function AppConfig(config) {
    if (config && config.constructor !== Object) {
        throw Error('Ожидался простой объект с параметрами конфигурации');
    }
    this.merge(config || {});
}

function merge(/* {{}} */ dst, /* {{}} */ src, /* {string} */ description) {
    Object.keys(src).forEach((param) => {
        let srcType = getType(src[param]);
        let dstType = getType(dst[param]);

        if (srcType === 'empty') {
            delete dst[param];
        } else if (srcType === dstType || dstType === 'empty') {
            switch (srcType) {
                case 'object':
                    dst[param] = merge(dst[param] || {}, src[param], `${description}.${param}`);
                    break;
                case 'array':
                    dst[param] = (dst[param] || []).concat(src[param]);
                    break;
                case 'scalar':
                    dst[param] = typeof src[param] === 'string' ? subst(src[param], process.env) : src[param];
                    break;
                case 'empty': // никогда не выполнится из-за предыдущего if-а
                    // delete dst[param];
                    break;
            }
        } else {
            throw Error(`Ошибка слияния конфигурации ${description}`);
        }
    });

    return dst;
}

AppConfig.prototype.merge = function (config, description) {
    return merge(this, config, description);
};

AppConfig.create = () => new AppConfig();


module.exports = AppConfig.create()
    .merge(readJson(`config/config.json`), `config/config.json`)
    .merge(readJson(`config/config_${env}.json`), `config/config_${env}.json`);
