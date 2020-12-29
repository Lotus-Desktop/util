import {colours} from "./ANSI";

export function fillDefault<T>(object: Partial<T>, defaultValues: T): T {
    const obj: T = defaultValues;

    for (const i in object)
        if (object[i] !== undefined && object[i] !== null)
            obj[i] = typeof object[i] === 'object' ? fillDefault(object[i], defaultValues[i]) : object[i]

    return obj;
}

export interface InspectOptions {
    maxStringLength: number,
    maxDepth: number,
    indent: string,
    maxItems: number
}

export function inspectObject(obj: any, _options?: Partial<InspectOptions>, depth: number = 0): string {
    const ansi = {
        string: colours.foreground.lightGreen,
        number: colours.foreground.darkYellow,
        boolean: colours.foreground.lightYellow
    };
    const options = fillDefault(_options, {
        maxStringLength: 24,
        maxDepth: Infinity,
        indent: '  ',
        maxItems: 4
    });

    const indent = (depth: number) => new Array(Math.max(depth, 0)).fill(options.indent).join('')

    const m = new Map<(obj: any) => boolean, (obj: any) => string>();

    m.set(obj => obj instanceof Array || Object.prototype.toString.call(obj) === '[object Array]',
        (obj: any[]) => `(${obj.length}) [\n${indent(depth + 1)}${obj
            .slice(0, options.maxItems)
            .map(i => inspectObject(i, _options, depth + 1).trim())
            .join(`,\n${indent(depth + 1)}`)}${obj.length > options.maxItems ? "..." : ""}\n${indent(depth)}]`); // This method isn't detecting arrays
    m.set(obj => !obj,
        obj => printColourful(`${obj}`, colours.foreground.darkWhite));
    m.set(obj => ["string", "boolean", "number"].includes(typeof obj), (obj: string | number | boolean) => printColourful(
        obj.toString().length > options.maxStringLength ?
            `${(typeof obj === "string" ? `"${obj}"` : obj).toString().slice(0, options.maxStringLength - 3)}...` :
            (typeof obj === "string" ? `"${obj}"` : obj).toString(),
        ansi[typeof obj]));
    m.set(obj => typeof obj === "function",
        (obj: Function) => printColourful(
            obj.toString().startsWith('class') ?
                `Class (${obj.name || ""})` :
                `Function (${obj.name || ""})`,
            colours.foreground.darkMagenta));
    m.set(obj => obj instanceof Map,
        function (obj: Map<any, any>) {
        if (obj.size > 0) {
            const string: string[] = [];
            let counter: number = 0;

            for (const [a, i] of obj)
                if (counter++ > options.maxItems)
                    return `${indent(depth)}Map(${obj.size}) {\n${indent(depth + 1)}${[...string, "..."].join(`,\n${indent(depth + 1)}`)}\n${depth}}`;
                else
                    string.push(`${indent(depth + 1)}${printColourful(inspectObject(a, _options, depth + 1).trim(), colours.foreground.lightYellow)}: ${inspectObject(i, _options, depth + 1).trim()}`);

            return `${indent(depth)}Map(${obj.size}) {\n${indent(depth + 1)}${string.join(`,\n${indent(depth + 1)}`)}\n${depth}}`;
        } else
            return `${indent(depth)}(0) {}`;
    });
    m.set(obj => obj instanceof Set,
        function (obj: Set<any>) {
        if (obj.size > 0) {
            const string: string[] = [];
            let counter: number = 0;

            for (const i of obj)
                if (counter++ > options.maxItems)
                    return `${indent(depth)}Set(${obj.size}) [\n${indent(depth + 1)}${[...string, "..."].join(`,\n${indent(depth + 1)}`)}\n${indent(depth)}]`;
                else
                    string.push(inspectObject(i, _options, depth + 1).trim());

            return `${indent(depth)}Set(${obj.size}) [\n${indent(depth + 1)}${string.join(`,\n${indent(depth + 1)}`)}\n${indent(depth)}]`;
        } else
            return `${indent(depth)}(0) []`;
    });
    m.set(obj => true,
        function (obj: object) {
        if (Object.keys(obj).length > 0) {
            const string: string[] = [];
            let counter: number = 0;

            for (const a in obj)
                if (counter++ > options.maxItems)
                    return `${indent(depth)}${obj.constructor.name !== "Object" ? `${obj.constructor.name} ` : ""}(${Object.keys(obj).length}) {\n${indent(depth + 1)}${[...string, "..."].join(`,\n${indent(depth + 1)}`)}\n${indent(depth)}}`;
                else
                    string.push(`${printColourful(a, colours.foreground.lightYellow)}: ${inspectObject(obj[a], _options, depth + 1).trim()}`)


            return `${indent(depth)}${obj.constructor.name !== "Object" ? `${obj.constructor.name} ` : ""}(${Object.keys(obj).length}) {\n${indent(depth + 1)}${string.join(`,\n${indent(depth + 1)}`)}\n${indent(depth)}}`;
        } else
            return `${indent(depth)}${obj.constructor.name !== "Object" ? `${obj.constructor.name} ` : ""}(0) {}`;
    });

    for (const [a, i] of m.entries())
        if (a(obj))
            return i(obj);
    return `${colours.foreground.darkWhite}undefined\n`;
}

export function printColourful(text: string, colour: string): string {
    return `${colour}${text}${colours.default}`;
}

export {colours} from './ANSI';
