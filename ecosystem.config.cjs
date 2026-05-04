const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');
const parsedEnv = dotenv.config({ path: envPath }).parsed || {};

// Node 어댑터는 envPrefix 'APP_'를 사용하므로 APP_로 시작하는 변수만 추려냄
const appEnv = {};
for (const [key, value] of Object.entries(parsedEnv)) {
	if (key.startsWith('APP_')) {
		appEnv[key] = value;
	}
}

module.exports = {
	apps: [
		{
			name: 'saenslog',
			script: 'build/index.js',
			cwd: __dirname,
			env: appEnv
		}
	]
};