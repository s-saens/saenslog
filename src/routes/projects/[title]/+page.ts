export const prerender = true;

export async function entries() {
	const projectModules = import.meta.glob('/src/lib/projects/*/info.json');
	const titles: Array<{ title: string }> = [];

	for (const path in projectModules) {
		const info = (await projectModules[path]()) as { default: { title: string } };
		titles.push({ title: info.default.title });
	}

	return titles;
}
