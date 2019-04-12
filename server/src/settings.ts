'use strict';
export interface CheckerSettings {
	enable: boolean;
	executablePath: string | null;
	workspaceRoot: string | null;
	maxNumberOfProblems: number;
}
