const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');
const parsedEnv = dotenv.config({ path: envPath }).parsed || {};

/**
 * `$env/dynamic/public`·`private` 등은 런타임의 process.env를 본다.
 * APP_*만 넘기면 PUBLIC_*, SUPABASE_* 등이 PM2 자식 프로세스에 빠져
 * 빌드·배포 환경에 따라 기능이 깨지거나 시작 직후 실패할 수 있다.
 */
const envFromDotenv =
	Object.keys(parsedEnv).length > 0 ? { ...parsedEnv } : {};

module.exports = {
	apps: [
		{
			name: 'saenslog',
			script: 'build/index.js',
			cwd: __dirname,
			env: {
				NODE_ENV: 'production',
				...envFromDotenv
			}
		}
	]
};
