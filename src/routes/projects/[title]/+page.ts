export const prerender = true;

interface ProjectInfo {
	title: string;
	tags: string[];
	startDate: string;
	endDate: string;
}

interface Project extends ProjectInfo {
	id: string;
	logoPath: string;
	screenshotPaths: string[];
}

export async function load({ params }: { params: { title: string } }) {
	const { title } = params;

	// lib/projects 폴더에서 해당 프로젝트 정보 찾기
	const projectModules = import.meta.glob('/src/lib/projects/*/info.json');
	const logoModules = import.meta.glob('/src/lib/projects/*/logo.png', { eager: true, query: '?url', import: 'default' });
	const screenshotModules = import.meta.glob('/src/lib/projects/*/screenshots/*.png', { eager: true, query: '?url', import: 'default' });

	let project: Project | null = null;

	for (const path in projectModules) {
		const info = (await projectModules[path]()) as { default: ProjectInfo };
		
		if (info.default.title === title) {
			const match = path.match(/\/(\d{3}-[^/]+)\/info\.json$/);
			
			if (match) {
				const projectId = match[1];
				const logoPath = `/src/lib/projects/${projectId}/logo.png`;
				const logoUrl = logoModules[logoPath] as string;

				// 스크린샷 수집
				const screenshotPaths: string[] = [];
				for (const screenshotPath in screenshotModules) {
					if (screenshotPath.includes(projectId)) {
						screenshotPaths.push(screenshotModules[screenshotPath] as string);
					}
				}
				screenshotPaths.sort();

				project = {
					id: projectId,
					...info.default,
					logoPath: logoUrl,
					screenshotPaths
				};
				break;
			}
		}
	}

	if (!project) {
		throw new Error(`프로젝트를 찾을 수 없습니다: ${title}`);
	}

	return {
		project
	};
}

export async function entries() {
	// 모든 프로젝트의 title을 반환하여 prerender 가능하도록 함
	const projectModules = import.meta.glob('/src/lib/projects/*/info.json');
	const titles: Array<{ title: string }> = [];

	for (const path in projectModules) {
		const info = (await projectModules[path]()) as { default: { title: string } };
		titles.push({ title: info.default.title });
	}

	return titles;
}

