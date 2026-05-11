/** 클라이언트 `use:enhance` — fail() 페이로드에서 메시지 추출 */
export function readActionFailureMessage(data: unknown, fallback: string): string {
	if (data && typeof data === 'object' && 'message' in data) {
		const m = (data as { message: unknown }).message;
		if (typeof m === 'string' && m.trim()) return m;
	}
	return fallback;
}

/** 서버 catch → fail({ message })에 항상 문자열이 들어가도록 (undefined면 JSON에서 키가 빠짐) */
export function thrownMessageForActionFail(error: unknown, fallback: string): string {
	if (typeof error === 'string' && error.trim()) return error;
	if (error instanceof Error && typeof error.message === 'string' && error.message.trim()) {
		return error.message;
	}
	if (typeof error === 'object' && error !== null) {
		const o = error as Record<string, unknown>;
		if (typeof o.message === 'string' && o.message.trim()) return o.message;
		const bits: string[] = [];
		if (typeof o.details === 'string' && o.details.trim()) bits.push(o.details);
		if (typeof o.hint === 'string' && o.hint.trim()) bits.push(o.hint);
		if (typeof o.code === 'string' && o.code.trim()) bits.push(o.code);
		if (bits.length) return bits.join(' · ');
	}
	return fallback;
}
