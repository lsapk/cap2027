export const onSites=location.hostname.endsWith('.chatgpt.site');
export const hostingName=onSites?'OpenAI Sites, sous le domaine chatgpt.site':'Vercel';
