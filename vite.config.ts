import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

const vitestBrowser = process.env.VITEST_BROWSER === '1';

export default defineConfig(({ mode }) => ({
	plugins: [sveltekit()],
	/* Vitest browser harness가 ::1에 바인딩하면 Windows에서 EACCES가 나는 경우가 있어 IPv4로 고정 */
	server: mode === 'test' ? { host: '127.0.0.1' } : {},
	test: {
		expect: { requireAssertions: true },
		projects: [
			...(vitestBrowser
				? [
						{
							extends: './vite.config.ts',
							test: {
								name: 'client',
								browser: {
									enabled: true,
									provider: playwright(),
									instances: [{ browser: 'chromium' as const, headless: true }]
								},
								include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
								exclude: ['src/lib/server/**']
							}
						}
					]
				: []),
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
}));
