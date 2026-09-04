export type Status = 'proposed' | 'open' | 'in-progress' | 'done';
export type Priority = 'high' | 'medium' | 'low';

export interface DoneWhenItem {
  text: string;
  checked: boolean;
}

export interface Task {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  feature: string;
  dependsOn: string[];
  goal: string;
  doneWhen: DoneWhenItem[];
}

export declare class TaskFileError extends Error {
  field: string;
}

export declare const STATUSES: readonly Status[];
export declare const PRIORITIES: readonly Priority[];
export declare const TASK_ID_PATTERN: RegExp;

export declare function parseTaskFile(text: string, id: string): Task;
export declare function setStatus(text: string, status: Status): string;

export interface OpenPullRequest {
  number: number;
  taskId: string | null;
}

export interface SelectionResult {
  task: Task | null;
  reasons: Record<string, string>;
}

export declare function selectTask(
  tasks: Task[],
  openPullRequests?: OpenPullRequest[],
): SelectionResult;

export declare const PROTECTED_PATHS: readonly string[];
export declare function isProtectedPath(path: string): boolean;

export interface PullRequestCheckInput {
  author: string;
  botAuthors?: string[];
  changedFiles: string[];
  taskChanges: Array<{ id: string; before: string | null; after: string | null }>;
}

export interface Violation {
  rule: 'protected-path' | 'unapproved-task' | 'task-status';
  message: string;
}

export declare function checkPullRequest(
  input: PullRequestCheckInput,
): { enforced: boolean; violations: Violation[] };
