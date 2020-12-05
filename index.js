const express = require('express');
const parser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const PORT = process.env.npm_package_config_port || require('./package.json').config.port;

function pascalToCamel(str) {
    return str.replace(str[0], str[0].toLowerCase());
}

function camelToPascal(str) {
    return str.replace(str[0], str[0].toUpperCase());
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
        const argCamel = pascalToCamel(args[index]);
        const argPascal = camelToPascal(args[index]);
        if (index === 0) {
            modelName = argPascal;
        } else {
            extractedAttribute.push(argCamel);
            getter = getter.concat(`${modelName}.prototype.get${argPascal} = function () { return this.${argCamel} }\n`);
            setter = setter.concat(`${modelName}.prototype.set${argPascal} = function (${argCamel}) { ${argCamel} !== undefined ? this.${argCamel} = ${argCamel} : void (0) }\n`);
            constructorAssign = constructorAssign.concat(`\tthis.${argCamel} = ${argCamel};\n`);
            defaultGetterObject = defaultGetterObject.concat(`\t\t${argCamel}: this.${argCamel},\n`);
            mapperAssign = mapperAssign.concat(`\tobject.${argCamel} !== undefined ? this.${argCamel} = object.${argCamel} : void (0);\n`);
        }
    }
    const filePath = path.join(os.tmpdir(), `${modelName}.js`);
    const constructor = `function ${modelName}(${extractedAttribute.map((attribute) => attribute + ' = null').join(', ')}) {\n${constructorAssign}}\n`;
    const defaultGetter = `${modelName}.prototype.get = function () {\n\treturn {\n${defaultGetterObject.slice(0, -2) + '\n'}\t};\n}\n`;
    const mapper = `${modelName}.prototype.map = function (object) {\n${mapperAssign}}\n`;
    const moduleExports = `module.exports = ${modelName};\n`;
    const content = constructor + mapper + defaultGetter + getter + setter + moduleExports;
    await fs.outputFile(filePath, content);
    return filePath;
}

const app = express();
app.use(parser.urlencoded({ extended: false }));
app.use(parser.json());
app.use(cors({ origin: true }));
app.set ( 'view engine', 'ejs' );

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
