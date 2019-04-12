/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as strings from "./base/common/strings";

import {
	createConnection,
	Diagnostic,
	DidChangeConfigurationNotification,
	Files,
	InitializeParams,
	TextDocuments,
	TextDocument,
	TextDocumentIdentifier,
	ProposedFeatures
} from 'vscode-languageserver';

import { DrupalCheck } from "./checker";
import { CheckerSettings } from "./settings";
import { StringResources as SR } from "./strings";

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
let validating = new Map();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we will fall back using global settings
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);

	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
			// Tell the client that the server supports code completion
			completionProvider: {
				resolveProvider: true
			}
		}
	};
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: CheckerSettings = {
	enable: true,
	executablePath: '/usr/local/bin/drupal-check',
	maxNumberOfProblems: 1000,
	workspaceRoot: null
 };
let globalSettings: CheckerSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<CheckerSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <CheckerSettings>(
			(change.settings.drupalCheck || defaultSettings)
		);
	}

	// Revalidate all open text documents
	validateMany(documents.all());
});

connection.onDidChangeWatchedFiles(e => {
	// Monitored files have change in VSCode
	validateMany(documents.all());
});

function getDocumentSettings(resource: string): Thenable<CheckerSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'drupalCheck'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

/**
 * Handles opening of text documents.
 *
 * @param event The text document change event.
 * @return void
 */
documents.onDidOpen( e => {
	validateSingle(e.document);
});

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(e => {
	validateSingle(e.document);
});

documents.onDidSave(e => {
	validateSingle(e.document);
});

/**
 * Validate a single text document.
 *
 * @param document The text document to validate.
 * @return void
 */
async function validateSingle(document: TextDocument): Promise<void> {
	const { uri } = document;
	let settings = await getDocumentSettings(document.uri);
	if (settings.enable) {
		let diagnostics: Diagnostic[] = [];
		sendStartValidationNotification(document);
		try {
			const drupalcheck = await DrupalCheck.create(settings.executablePath);
			diagnostics = await drupalcheck.check(document, settings);
		} catch(error) {
			throw new Error(getExceptionMessage(error, document));
		} finally {
			sendEndValidationNotification(document);
			connection.sendDiagnostics({ uri: document.uri, diagnostics });
		}
	} else {
		const diagnostics: Diagnostic[] = [];
		connection.sendDiagnostics({ uri: document.uri, diagnostics });
		documentSettings.delete(document.uri);
	}
}

/**
 * Validate a list of text documents.
 *
 * @param documents The list of text documents to validate.
 * @return void
 */
async function validateMany(documents: TextDocument[]): Promise<void> {
	for (var i = 0, len = documents.length; i < len; i++) {
		await validateSingle(documents[i]);
	}
}

/**
 * Sends a notification for starting validation of a document.
 *
 * @param document The text document on which validation started.
 */
function sendStartValidationNotification(document: TextDocument): void {
	validating.set(document.uri, document);
	const start = "textDocument/didStartValidate";
	connection.sendNotification(start,
		{ textDocument: TextDocumentIdentifier.create(document.uri) }
	);
	connection.tracer.log(strings.format(SR.DidStartValidateTextDocument, document.uri));
}

/**
 * Sends a notification for ending validation of a document.
 *
 * @param document The text document on which validation ended.
 */
function sendEndValidationNotification(document: TextDocument): void {
	validating.delete(document.uri);
	const end = strings.format(SR.DidEndValidateTextDocument, )
	connection.sendNotification(end,
		{ textDocument: TextDocumentIdentifier.create(document.uri) }
	);
	connection.tracer.log(strings.format(SR.DidEndValidateTextDocument, document.uri));
}

/**
 * Get the exception message from an exception object.
 *
 * @param exception The exception to parse.
 * @param document The document where the exception occurred.
 * @return string The exception message.
 */
function getExceptionMessage(exception: any, document: TextDocument): string {
	let message: string = null;
	if (typeof exception.message === 'string' || exception.message instanceof String) {
		message = <string>exception.message;
		message = message.replace(/\r?\n/g, ' ');
		if (/^ERROR: /.test(message)) {
			message = message.substr(5);
		}
	} else {
		message = strings.format(SR.UnknownErrorWhileValidatingTextDocument, Files.uriToFilePath(document.uri));
	}
	return message;
}

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
