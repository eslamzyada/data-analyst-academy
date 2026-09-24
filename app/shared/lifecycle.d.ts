// Types for shared/lifecycle.js (the browser code is TypeScript).
export declare const OUTCOME: { readonly CORRECT: 'CORRECT'; readonly INCORRECT: 'INCORRECT'; readonly EVALUATION_ERROR: 'EVALUATION_ERROR'; readonly NOT_EVALUABLE: 'NOT_EVALUABLE' };
export type Outcome = typeof OUTCOME[keyof typeof OUTCOME];
export declare const STATE: { readonly NOT_STARTED: 'not-started'; readonly IN_PROGRESS: 'in-progress'; readonly SUBMITTED: 'submitted'; readonly EVALUATED: 'evaluated'; readonly COMPLETED: 'completed' };
export type ActivityState = typeof STATE[keyof typeof STATE];
export declare const STATE_LABEL: Record<ActivityState, string>;
export declare const QUIZ_PASS: number;
export declare function isRecordable(outcome: string | null | undefined): boolean;
export declare function outcomeOf(result: any): Outcome | null;
export declare function taskState(input?: { hasAnswer?: boolean; submitting?: boolean; result?: any; selfChecked?: boolean; selfMarked?: boolean | null; solvedBefore?: boolean }): ActivityState;
export declare function quizState(input?: { started?: boolean; answered?: number; finished?: boolean; score?: number | null }): ActivityState;
export declare function projectState(input?: { drafts?: number; graded?: number; finished?: boolean }): ActivityState;
export declare function lessonState(input?: { done?: boolean; tried?: boolean }): ActivityState;
export declare function isDone(state: string): boolean;
