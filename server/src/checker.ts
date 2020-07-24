/* --------------------------------------------------------------------------------------------
 * Copyright (c) Ioannis Kappas. All rights reserved.
 * Licensed under the MIT License. See License.md in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
"use strict";
import * as path from "path";
import * as spawn from "cross-spawn-promise";
import * as strings from "./base/common/strings";
import * as extfs from "./base/node/extfs";
import CharCode from "./base/common/charcode";

import {
	Diagnostic,
	DiagnosticSeverity,
	Files,
	Range,
	TextDocument
} from "vscode-languageserver";

import { StringResources as SR } from "./strings";
import { CheckerSettings } from './settings';
import { DrupalCheckMessage } from './message';

export class DrupalCheck {

	private executablePath: string;

	private constructor(executablePath: string) {
		this.executablePath = executablePath;
	}

	/**
	 * Create an instance of the PhpcsLinter.
	 */
	static async create(executablePath: string): Promise<DrupalCheck> {
		try {
			return new DrupalCheck(executablePath);
		} catch (error) {
			let message = error.message ? error.message : SR.CreateCheckerErrorDefaultMessage;
			throw new Error(strings.format(SR.CreateCheckerError, message));
		}
	}

	public async check(document: TextDocument, settings: CheckerSettings): Promise<Diagnostic[]> {

		const { workspaceRoot } = settings;

		// Process linting paths.
		let filePath = Files.uriToFilePath(document.uri);

		// Make sure we capitalize the drive letter in paths on Windows.
		if (filePath !== undefined && /^win/.test(process.platform)) {
			let pathRoot: string = path.parse(filePath).root;
			let noDrivePath = filePath.slice(Math.max(pathRoot.length - 1, 0));
			filePath = path.join(pathRoot.toUpperCase(), noDrivePath);
		}

		let fileText = document.getText();

		// Return empty on empty text.
		if (fileText === '') {
			return [];
		}

		// Process linting arguments.
		let lintArgs = ['--format=json'];
		lintArgs.push('--no-progress');
		lintArgs.push(filePath);

		let text = fileText;
		const forcedKillTime = 1000 * 60 * 5; // ms * s * m: 5 minutes
		const options = {
			cwd: workspaceRoot !== null ? workspaceRoot : undefined,
			env: process.env,
			encoding: "utf8",
			timeout: forcedKillTime,
			tty: true,
			input: text,
		};


		return spawn(this.executablePath, lintArgs, options)
			.then((stdout) => {
				console.info('Success!');
				return this.processResults(filePath, document, stdout);
			})
			.catch((error) => {
				if (error && error.stdout) {
					console.error('Issues found.');
					return this.processResults(filePath, document, error.stdout);
				} else if (error.stderr) {
					console.error('Issues found.');
					console.error(error.stderr)
				}
		});
	}

	private processResults(filePath: string, document: TextDocument, results: any): Diagnostic[] {
		const data = this.parseData(results);

		let messages: Array<DrupalCheckMessage> = [];
		if (filePath !== undefined) {
			const fileRealPath = extfs.realpathSync(filePath);
			if (!data.files[fileRealPath]) {
				return [];
			}
			({ messages } = data.files[fileRealPath]);
		}

		let diagnostics: Diagnostic[] = [];
		messages.map(message => diagnostics.push(
			this.createDiagnostic(document, message)
		));
		return diagnostics;
	}

	private parseData(text: string) {
		try {
			return JSON.parse(text) as { files: any };
		} catch (error) {
			throw new Error(SR.InvalidJsonStringError);
		}
	}

	private createDiagnostic(document: TextDocument, entry: DrupalCheckMessage): Diagnostic {
		if (entry == null || entry.message == '') {
			const range: Range = Range.create(0, 0, 0, 0);
			return Diagnostic.create(range, '', DiagnosticSeverity.Information, null, 'drupalchecker');
		}

		let lines = document.getText().split("\n");
		let line = entry.line - 1;
		let lineString = lines[line];

		// Process diagnostic start and end characters.
		let startCharacter = 0;
		let endCharacter = lineString.length;
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
		let message: string = entry.message;

		// Process diagnostic severity.
		let severity: DiagnosticSeverity = DiagnosticSeverity.Error;

		return Diagnostic.create(range, message, severity, null, 'drupalchecker');
	}
}
