const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const path = require('path');
const os = require('os');

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
    for (let index = 0; index < args.length; index++) {
        const argCamel = pascalToCamel(args[index]);
        const argPascal = camelToPascal(args[index]);
        if (index === 0) {
            modelName = argPascal;
        } else {
            extractedAttribute.push(argCamel);
            getter = getter.concat(`${modelName}.prototype.get${argPascal} = function () { return this.${argCamel} }\n`);
            setter = setter.concat(`${modelName}.prototype.set${argPascal} = function (${argCamel}) { this.${argCamel} = ${argCamel} }\n`);
            constructorAssign = constructorAssign.concat(`\tthis.${argCamel} = ${argCamel};\n`);
        }
    }
    const filePath = path.join(os.tmpdir(), modelName);
    const constructor = `function ${modelName}(${extractedAttribute.toString()}) {\n${constructorAssign}}\n`;
    const moduleExports = `module.exports = ${modelName};\n`;
    const content = constructor + getter + setter + moduleExports;
    await fs.outputFile(filePath, content);
    return filePath;
}

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

app.get('', async (request, response) => {
    try {
        if (!!request.query.model) {
            const outputPath = await gen(JSON.parse(request.query.model));
            return response.download(outputPath);
        } else {
            return response.send('Query string ?model=["ModelName", "attributeA", "attributeB", ...]');
        }
    } catch (err) {
        console.log(err);
        return response.send(err);
    }
});

app.listen(process.env.npm_package_config_port);
