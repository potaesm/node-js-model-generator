const fs = require("fs-extra");

function pascalToCamel(str) {
    return str.replace(str[0], str[0].toLowerCase());
}

function camelToPascal(str) {
    return str.replace(str[0], str[0].toUpperCase());
}

async function gen() {
    const args = process.argv.slice(2);
    let extractedAttribute = [];
    let modelName = '';
    let getter = '';
    let setter = '';
    let constructorAssign = '';
    if (args.length === 0) {
        return "Please specify ModelName ...attributeName";
    }
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
    const filePath = `./model/${modelName}.js`;
    const constructor = `function ${modelName}(${extractedAttribute.toString()}) {\n${constructorAssign}}\n`;
    const moduleExports = `module.exports = ${modelName};\n`;
    const content = constructor + getter + setter + moduleExports;
    await fs.outputFile(filePath, content);
    return content;
}

async function main() {
    const result = await gen();
    console.log(result);
}

main();
