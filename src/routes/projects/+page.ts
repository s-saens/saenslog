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
}

export async function load() {
	// lib/projects 폴더에서 모든 프로젝트 정보 로드
	const projectModules = import.meta.glob('/src/lib/projects/*/info.json');
	const logoModules = import.meta.glob('/src/lib/projects/*/logo.png', { eager: true, query: '?url', import: 'default' });

	const projects: Project[] = [];

	for (const path in projectModules) {
		const info = (await projectModules[path]()) as { default: ProjectInfo };
		const match = path.match(/\/(\d{3}-[^/]+)\/info\.json$/);
		
		if (match) {
			const projectId = match[1];
			const logoPath = `/src/lib/projects/${projectId}/logo.png`;
			const logoUrl = logoModules[logoPath] as string;

			projects.push({
				id: projectId,
				...info.default,
				logoPath: logoUrl
			});
		}
	}

	// 프로젝트를 ID 순으로 정렬
	projects.sort((a, b) => a.id.localeCompare(b.id));

	return {
		projects
	};
}

