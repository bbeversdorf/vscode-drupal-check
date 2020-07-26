"use strict";
import * as path from "path";
import * as strings from "./base/common/strings";
import * as extfs from "./base/node/extfs";
import * as os from 'os';
import CharCode from "./base/common/charcode";
import { spawnSync } from 'child_process';
import { StringResources as SR } from "./strings";
import { CheckerSettings } from './settings';
import { DrupalCheckMessage } from './message';

import {
    Diagnostic,
    DiagnosticSeverity,
    Files,
    Range,
    TextDocument
} from "vscode-languageserver";

const homeDirectory = os.homedir();

export class DrupalCheck {

    private executablePath: string;

    private constructor(executablePath: string) {

        this.executablePath = executablePath;
    }

    /**
	 * Create an instance of the PhpcsLinter.
	 */
    static create(executablePath: string): DrupalCheck {
        try {
            const expandedPath = executablePath.startsWith("~/") ? executablePath.replace("~", homeDirectory) : executablePath;
            return new DrupalCheck(expandedPath.toString());
        } catch (error) {
            const message = error.message ? error.message : SR.CreateCheckerErrorDefaultMessage;
            throw new Error(strings.format(SR.CreateCheckerError, message));
        }
    }

    public async check(document: TextDocument, settings: CheckerSettings): Promise<Diagnostic[]> {

        const { workspaceRoot } = settings;

        // Process linting paths.
        let filePath = Files.uriToFilePath(document.uri);

        // Make sure we capitalize the drive letter in paths on Windows.
        if (filePath !== undefined && /^win/.test(process.platform)) {
            const pathRoot: string = path.parse(filePath).root;
            const noDrivePath = filePath.slice(Math.max(pathRoot.length - 1, 0));
            filePath = path.join(pathRoot.toUpperCase(), noDrivePath);
        }

        const fileText = document.getText();

        // Return empty on empty text.
        if (fileText === '') {
            return [];
        }

        // Process linting arguments.
        const lintArgs = ['--format=json'];
        lintArgs.push('--no-progress');
        lintArgs.push(filePath);

        const text = fileText;
        const forcedKillTime = 1000 * 60 * 5; // ms * s * m: 5 minutes
        const options = {
            cwd: workspaceRoot !== null ? workspaceRoot : undefined,
            env: process.env,
            encoding: "utf8",
            timeout: forcedKillTime,
            tty: true,
            input: text,
        };

        try {
            const output = spawnSync(this.executablePath, lintArgs, options);
            console.info('Success!');
            if (!output.stdout) {
                throw new Error("Missing output");
            }
            return this.processResults(filePath, document, output.stdout.toString());
        } catch (error) {
            if (error && error.stdout) {
                console.error('Issues found.');
                return this.processResults(filePath, document, error.stdout);
            } else if (error.stderr) {
                console.error('Error could not continue.');
                console.error(error.stderr);
            }
        }
    }

    private processResults(filePath: string, document: TextDocument, results: string): Diagnostic[] {
        const data = this.parseData(results);
        let messages: Array<DrupalCheckMessage> = [];
        if (filePath !== undefined) {
            const fileRealPath = extfs.realpathSync(filePath);
            if (!data.files[fileRealPath]) {
                return [];
            }
            ({ messages } = data.files[fileRealPath]);
        }
        const diagnostics: Diagnostic[] = [];
        messages.map(message => diagnostics.push(
            this.createDiagnostic(document, message)
        ));
        return diagnostics;
    }

    private parseData(text: string) {
        try {
            return JSON.parse(text);
        } catch (error) {
            throw new Error(SR.InvalidJsonStringError);
        }
    }

    private createDiagnostic(document: TextDocument, entry: DrupalCheckMessage): Diagnostic {
        if (entry == null || entry.message == '') {
            const range: Range = Range.create(0, 0, 0, 0);
            return Diagnostic.create(range, '', DiagnosticSeverity.Information, null, 'drupalchecker');
        }

        const lines = document.getText().split("\n");
        const line = entry.line - 1;
        const lineString = lines[line];

        // Process diagnostic start and end characters.
        let startCharacter = 0;
        const endCharacter = lineString.length;
        let charCode = lineString.charCodeAt(startCharacter);
        if (CharCode.isWhiteSpace(charCode)) {
            for (let i = startCharacter + 1, len = lineString.length; i < len; i++) {
                charCode = lineString.charCodeAt(i);
                startCharacter = i;
                if (!CharCode.isWhiteSpace(charCode)) {
                    break;
                }
            }
        }

        // Process diagnostic range.
        const range: Range = Range.create(line, startCharacter, line, endCharacter);

        // Process diagnostic sources.
        const message: string = entry.message;

        // Process diagnostic severity.
        const severity: DiagnosticSeverity = DiagnosticSeverity.Error;

        return Diagnostic.create(range, message, severity, null, 'drupalchecker');
    }
}
