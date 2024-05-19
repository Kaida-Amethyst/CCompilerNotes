import starlightPlugin from '@astrojs/starlight-tailwind';
import colors from 'tailwindcss/colors';

const accent = { 200: '#cfbdfb', 600: '#8424ea', 900: '#3c1a6a', 950: '#2a1748' };
const gray = { 100: '#f5f6f9', 200: '#eaeef3', 300: '#bec2c8', 400: '#848c97', 500: '#515963', 700: '#323942', 800: '#212730', 900: '#15181d' };


/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: { accent, gray },
			fontFamily: {
				sans: ['"CaskaydiaMonoNerd"'],
				mono: ['"CaskaydiaMonoNerd"'],
			},
		},
	},
	plugins: [starlightPlugin()],
}
