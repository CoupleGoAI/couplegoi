import {
    validateMessageText,
    createUserMessage,
    createAssistantMessage,
    MAX_CHAT_MESSAGE_LENGTH,
} from '../validation';

describe('validateMessageText', () => {
    it('rejects empty string', () => {
        expect(validateMessageText('').valid).toBe(false);
    });

    it('rejects whitespace-only string', () => {
        expect(validateMessageText('   ').valid).toBe(false);
    });

    it('accepts normal message', () => {
        const result = validateMessageText('Hello there');
        expect(result.valid).toBe(true);
        expect(result.error).toBeNull();
    });

    it('rejects message exceeding max length', () => {
        const longText = 'a'.repeat(MAX_CHAT_MESSAGE_LENGTH + 1);
        const result = validateMessageText(longText);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('too long');
    });

    it('accepts message at exactly max length', () => {
        const text = 'a'.repeat(MAX_CHAT_MESSAGE_LENGTH);
        expect(validateMessageText(text).valid).toBe(true);
    });
});

describe('createUserMessage', () => {
    it('trims whitespace from text', () => {
        const msg = createUserMessage('  hello  ');
        expect(msg.text).toBe('hello');
    });

    it('sets role to user', () => {
        expect(createUserMessage('hi').role).toBe('user');
    });

    it('generates a unique id each call', () => {
        const a = createUserMessage('hi');
        const b = createUserMessage('hi');
        expect(a.id).not.toBe(b.id);
    });

    it('sets timestamp close to now', () => {
        const before = Date.now();
        const msg = createUserMessage('hi');
        const after = Date.now();
        expect(msg.timestamp).toBeGreaterThanOrEqual(before);
        expect(msg.timestamp).toBeLessThanOrEqual(after);
    });
});

describe('createAssistantMessage', () => {
    it('sets role to assistant', () => {
        expect(createAssistantMessage('reply').role).toBe('assistant');
    });

    it('preserves text as-is', () => {
        expect(createAssistantMessage('  reply  ').text).toBe('  reply  ');
    });
});

describe('message status field', () => {
    it('createUserMessage does not set status by default', () => {
        const msg = createUserMessage('hello');
        expect(msg.status).toBeUndefined();
    });

    it('createAssistantMessage does not set status by default', () => {
        const msg = createAssistantMessage('reply');
        expect(msg.status).toBeUndefined();
    });

    it('status field is assignable after creation', () => {
        const msg = createUserMessage('hello');
        const withStatus = { ...msg, status: 'sending' as const };
        expect(withStatus.status).toBe('sending');
    });
});
