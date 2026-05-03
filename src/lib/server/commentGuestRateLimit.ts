import { createHmac } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const WINDOW_MS = 10_000;
const THIRD_ATTEMPT = 3;
const BLOCK_MS = 5 * 24 * 60 * 60 * 1000;

export function hashCommentClientIp(secret: string, ip: string): string {
	return createHmac('sha256', secret).update(ip, 'utf8').digest('hex');
}

export type GuestRateResult =
	| { ok: true }
	| { ok: false; blocked: boolean; message: string };

export async function gateGuestCommentAttempt(
	service: SupabaseClient,
	ipHash: string
): Promise<GuestRateResult> {
	const now = Date.now();

	const { data: block, error: blockErr } = await service
		.from('comment_ip_blocks')
		.select('blocked_until')
		.eq('ip_hash', ipHash)
		.maybeSingle();

	if (blockErr) {
		console.error('comment_ip_blocks', blockErr);
		return { ok: false, blocked: false, message: '일시적으로 댓글을 등록할 수 없습니다.' };
	}

	if (block?.blocked_until && new Date(block.blocked_until).getTime() > now) {
		return {
			ok: false,
			blocked: true,
			message:
				'짧은 시간에 댓글을 너무 많이 시도했거나 이전에 제한되었습니다. 이 IP는 5일간 댓글 작성이 제한됩니다.'
		};
	}

	const windowStartIso = new Date(now - WINDOW_MS).toISOString();

	const { count, error: countErr } = await service
		.from('comment_submit_attempts')
		.select('*', { count: 'exact', head: true })
		.eq('ip_hash', ipHash)
		.gte('attempted_at', windowStartIso);

	if (countErr) {
		console.error('comment_submit_attempts count', countErr);
		return { ok: false, blocked: false, message: '일시적으로 댓글을 등록할 수 없습니다.' };
	}

	if ((count ?? 0) >= THIRD_ATTEMPT - 1) {
		const untilIso = new Date(now + BLOCK_MS).toISOString();
		const { error: upsertErr } = await service
			.from('comment_ip_blocks')
			.upsert({ ip_hash: ipHash, blocked_until: untilIso });
		if (upsertErr) {
			console.error('comment_ip_blocks upsert', upsertErr);
		}
		return {
			ok: false,
			blocked: true,
			message:
				'짧은 시간에 댓글을 너무 많이 시도했습니다. 이 IP는 5일간 댓글 작성이 제한됩니다.'
		};
	}

	return { ok: true };
}

export async function recordGuestCommentAttempt(
	service: SupabaseClient,
	ipHash: string
): Promise<{ ok: boolean }> {
	const { error } = await service.from('comment_submit_attempts').insert({
		ip_hash: ipHash,
		attempted_at: new Date().toISOString()
	});
	if (error) {
		console.error('comment_submit_attempts insert', error);
		return { ok: false };
	}
	return { ok: true };
}
