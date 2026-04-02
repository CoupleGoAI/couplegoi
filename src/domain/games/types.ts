export interface WyrQuestion {
    readonly id: string;
    readonly optionA: string;
    readonly optionB: string;
}

export interface TotQuestion {
    readonly id: string;
    readonly optionA: string;
    readonly optionB: string;
}

export interface CheckInPrompt {
    readonly id: string;
    readonly prompt: string;
    readonly placeholder: string;
}

export type BinaryChoice = 'A' | 'B';
