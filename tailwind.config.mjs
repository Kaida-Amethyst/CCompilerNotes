import starlightPlugin from '@astrojs/starlight-tailwind';
import colors from 'tailwindcss/colors';


const accent = { 200: '#dac4b2', 600: '#975c22', 900: '#452c14', 950: '#302012' };
const gray = { 100: '#eef8ff', 200: '#ddf1ff', 300: '#9fc8e4', 400: '#3695cb', 500: '#005f8a', 700: '#003d5a', 800: '#002a40', 900: '#001b2b' };


/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: { accent, gray },
		},
	},
	plugins: [starlightPlugin()],
}
