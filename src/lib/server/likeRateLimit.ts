import type { SupabaseClient } from '@supabase/supabase-js';

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS_IN_WINDOW = 48;

export type LikeGateResult = { ok: true } | { ok: false; message: string };

export async function gateLikeAction(service: SupabaseClient, ipHash: string): Promise<LikeGateResult> {
	const windowStartIso = new Date(Date.now() - WINDOW_MS).toISOString();

	const { count, error: countErr } = await service
		.from('like_action_attempts')
		.select('*', { count: 'exact', head: true })
		.eq('ip_hash', ipHash)
		.gte('attempted_at', windowStartIso);

	if (countErr) {
		console.error('like_action_attempts count', countErr);
		return { ok: false, message: '좋아요를 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.' };
	}

	if ((count ?? 0) >= MAX_ATTEMPTS_IN_WINDOW) {
		return {
			ok: false,
			message: '같은 연결에서 좋아요 요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.'
		};
	}

	return { ok: true };
}

export async function recordLikeActionAttempt(
	service: SupabaseClient,
	ipHash: string
): Promise<{ ok: boolean }> {
	const { error } = await service.from('like_action_attempts').insert({
		ip_hash: ipHash,
		attempted_at: new Date().toISOString()
	});
	if (error) {
		console.error('like_action_attempts insert', error);
		return { ok: false };
	}
	return { ok: true };
}
