const fs = require("fs-extra");

function camelToSnake(str) {
    return str.replace(str[0], str[0].toLowerCase());
}

function snakeToCamel(str) {
    return str.replace(str[0], str[0].toUpperCase());
}

async function gen() {
    const args = process.argv.slice(2);
    let extractedAttribute = [];
    let modelName = '';
    let modelAttribute = '';
    let getter = '';
    let setter = '';
    if (args.length === 0) {
        return "Please specify ModelName ...attributeName";
    }
    for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        if (index === 0) {
            modelName = snakeToCamel(arg);
            modelAttribute = camelToSnake(modelName);
        } else {
            extractedAttribute.push(arg);
            getter = getter.concat(`${modelName}.prototype.get${snakeToCamel(arg)} = function () { return ${modelAttribute}['${arg}']; };\n`);
            setter = setter.concat(`${modelName}.prototype.set${snakeToCamel(arg)} = function (${arg}) { ${modelAttribute}['${arg}'] = ${arg}; };\n`);
        }
    }
    const filePath = `./model/${modelName}.js`;
    const modelDefine = `let ${modelAttribute} = {}\n`;
    const constructor = `function ${modelName}(${extractedAttribute.toString()}) { ${modelAttribute} = {${extractedAttribute.toString()}}; return ${modelAttribute}; }\n`;
    const moduleExports = `module.exports = ${modelName};\n`;
    const content = modelDefine + constructor + getter + setter + moduleExports;
    await fs.outputFile(filePath, content);
    return content;
}

async function main() {
    const result = await gen();
    console.log(result);
}

main();
