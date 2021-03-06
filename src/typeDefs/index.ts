/**
 * looks for .gql or .graphql files
 * and builds out TS types for them
 * depends on @gql2ts/from-schema && merge-graphql-schemas
 * for core functionality
 */
import * as glob from 'glob-promise';
import { mergeTypes } from 'merge-graphql-schemas';
import { generateNamespace } from '@gql2ts/from-schema';
import * as fs from 'fs-extra';
import * as R from 'ramda';

export interface IgqlTsOpts {
    globPattern?: string;
    outFile?: string;
}

const defaults: IgqlTsOpts  = {
    globPattern: '**/*.gql',
    outFile: ''
};

const readFile: (fileName: string) => Promise<string> =
    (fileName) => fs.readFile(fileName, 'utf8');

const getGlobbedFilesLoad: (globPattern: string) => Promise<string[]> = async (globPattern) => {
    const files: string[]  = await glob(globPattern);
    const load: string[] = await Promise.all(R.map(readFile, files));
    return load;
};

export const getTypeDefs: (globPattern?: string) => Promise<string> = async (globPattern = '**/*.gql') => {
    try {
        const typesLoad: string[] = await getGlobbedFilesLoad(globPattern);
        return mergeTypes(typesLoad);
    } catch (error) {
        console.error(error);
    }
};

const addAutoGeneratedWarning = (tsTypes: string): string => {
    return `// This file is auto generated by the gqlToTs.ts module\n${tsTypes}`;
 };

export const generateTsFromGql: (options?: IgqlTsOpts) =>  Promise <string | any> = async (options = {}) => {
    // check whether we have args
    const namespace =  process.argv[2] || 'DH';
    console.log('created type definitions with: ', namespace, ' namespace');
    const opts = Object.assign(defaults, options);
    try {
        const typeDefs: string = await getTypeDefs(opts.globPattern);
        const namespaceOpts = { ignoreTypeNameDeclaration: true};
        const tsNameSpace: string = generateNamespace(namespace, typeDefs, namespaceOpts, {});
        if (opts.outFile && opts.outFile.length) fs.writeFile(opts.outFile, addAutoGeneratedWarning(tsNameSpace));
        return tsNameSpace;
    } catch (error) {
        console.error(error);
    }
};

if (require.main === module && process.env.NODE_ENV !== 'test') {
    // this module was run directly from the command line as in node xxx.js
    generateTsFromGql({outFile: 'index.d.ts'});
}
