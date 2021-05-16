const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || require('./package.json').config.port;

function pascalToCamel(str = '') {
    return str.replace(str[0], str[0].toLowerCase()).replace(/\*/g, '');
}

function camelToPascal(str = '') {
    return str.replace(str[0], str[0].toUpperCase()).replace(/\*/g, '');
}

function getMandatoryFlag(str = '') {
    return str.endsWith('*') ? '' : '_';
}

async function gen(args) {
    // const args = process.argv.slice(2);
    let extractedAttribute = [];
    let modelName = '';
    let getter = '';
    let setter = '';
    let constructorAssign = '';
    let defaultGetterObject = '';
    let mapperAssign = '';
    for (let index = 0; index < args.length; index++) {
        const argPascal = camelToPascal(args[index]);
        const argCamel = pascalToCamel(args[index]);
        if (index === 0) {
            modelName = argPascal;
        } else {
            const mandatoryFlag = getMandatoryFlag(args[index]);
            extractedAttribute.push(argCamel);
            /** Getter */
            getter = getter.concat(`${modelName}.prototype.get${argPascal} = function () { return this.${argCamel} }\n`);
            /** Setter */
            setter = setter.concat(`${modelName}.prototype.set${argPascal} = function (${argCamel}) { ${argCamel} !== undefined ? this.${argCamel} = ${argCamel} : void (0) }\n`);
            constructorAssign = constructorAssign.concat(`\tthis.${argCamel} = ${argCamel};\n`);
            defaultGetterObject = defaultGetterObject.concat(`\t\t${mandatoryFlag}${argCamel}: this.${argCamel},\n`);
            mapperAssign = mapperAssign.concat(`\tobject.${argCamel} !== undefined ? this.${argCamel} = object.${argCamel} : void (0);\n`);
        }
    }
    const filePath = path.join(os.tmpdir(), `${modelName}.js`);
    /** Constructor */
    const constructor = `function ${modelName}(${extractedAttribute.map((attribute) => attribute + ' = null').join(', ')}) {\n${constructorAssign}}\n`;
    /** Mapper */
    const mapper = `${modelName}.prototype.map = function (object) {\n${mapperAssign}}\n`;
    /** Default Getter */
    const defaultGetterOptions = 'options = { mandatory: false, optional: false, present: false, compact: false }';
    const defaultGetterObjectDefine = `\n\tlet o = {\n${defaultGetterObject.slice(0, -2) + '\n'}\t};`;
    const defaultGetterMandatoryConfig = `\n\tif (options.mandatory) o = Object.fromEntries(Object.entries(o).filter(_ => !_[0].startsWith('_')));`;
    const defaultGetterOptionalConfig = `\n\tif (options.optional) o = Object.fromEntries(Object.entries(o).filter(_ => _[0].startsWith('_')));`;
    const defaultGetterPresentConfig = `\n\tif (options.present) o = Object.fromEntries(Object.entries(o).filter(_ => _[1] !== null));`;
    const defaultGetterCompactConfig = `\n\tif (options.compact) o = Object.fromEntries(Object.entries(o).filter(_ => !!_[1]));`;
    const defaultGetterReturn = `\n\treturn Object.fromEntries(Object.entries(o).map(_ => { _[0] = _[0].replace('_', ''); return _; }));`;
    const defaultGetter = `${modelName}.prototype.get = function (${defaultGetterOptions}) {${defaultGetterObjectDefine}${defaultGetterMandatoryConfig}${defaultGetterOptionalConfig}${defaultGetterPresentConfig}${defaultGetterCompactConfig}${defaultGetterReturn}\n}\n`;
    /** isEmpty Validator */
    const isEmptyValidator = `${modelName}.prototype.isEmpty = function () { return !Object.values(this).filter(_ => _ !== null).length }\n`;
    /** isFull Validator */
    const isFullValidator = `${modelName}.prototype.isFull = function () { return !Object.values(this).includes(null) }\n`;
    /** isValid Validator */
    const isValidValidatorObjectDefine = `\n\tconst o = {\n${defaultGetterObject.slice(0, -2) + '\n'}\t};`;
    const isValidValidatorReturn = `\n\treturn !Object.values(Object.fromEntries(Object.entries(o).filter(_ => !_[0].startsWith('_')))).includes(null);`;
    const isValidValidator = `${modelName}.prototype.isValid = function () {${isValidValidatorObjectDefine}${isValidValidatorReturn}\n}\n`;
    /** Module Export */
    const moduleExports = `module.exports = ${modelName};\n`;
    const content = constructor + mapper + defaultGetter + getter + setter + isEmptyValidator + isFullValidator + isValidValidator + moduleExports;
    await fs.outputFile(filePath, content);
    return filePath;
}

const app = express();
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true, limit: '3mb' }));
app.use(cors({ origin: true }));
app.set('view engine', 'ejs');

app.get('', (request, response) => {
    return response.render('main');
});

app.post('', async (request, response) => {
    try {
        if (!!request.body) {
            const outputPath = await gen(Object.values(request.body).map((item) => item.trim()).filter((item) => !!item));
            return response.download(outputPath);
        } else {
            return response.status(400).send('Empty request body');
        }
    } catch (err) {
        console.log(err);
        return response.send(err);
    }
});

app.listen(PORT);
