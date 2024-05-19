import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwind from "@astrojs/tailwind";
import rehypeMathjax from "rehype-mathjax";
import remarkMath from "remark-math";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'Simple C Compiler',
      customCss: [
        './src/tailwind.css',
      ],
      social: {
        github: 'https://ziyue.cafe'
      },
      sidebar: [
        {
          label: 'Introduction',
          items: [
            {
              label: 'Introduction',
              link: '/introduction/introduction/'
            }]
        }, 
        {
          label: 'Commit1-10',
          autogenerate: {
            directory: 'Commit1-10'
          },
        },
        {
          label: 'Commit11-20',
          autogenerate: {
            directory: 'Commit11-20'
          },
        },
        {
          label: 'Commit21-30',
          autogenerate: {
            directory: 'Commit21-30'
          },
        },
        {
          label: 'Commit31-40',
          autogenerate: {
            directory: 'Commit31-40'
          },
        },
        {
          label: 'Commit41-50',
          autogenerate: {
            directory: 'Commit41-50'
          },
        },
        {
          label: 'Commit51-60',
          autogenerate: {
            directory: 'Commit51-60'
          },
        },
        {
          label: 'Commit61-70',
          autogenerate: {
            directory: 'Commit61-70'
          },
        },
        {
          label: 'Commit71-80',
          autogenerate: {
            directory: 'Commit71-80'
          },
        },
        {
          label: 'Commit81-90',
          autogenerate: {
            directory: 'Commit81-90'
          },
        },
        {
          label: 'Commit91-100',
          autogenerate: {
            directory: 'Commit91-100'
          },
        },
      ]
  }),
  tailwind({
    applyBaseStyles: false,
  }),
  ],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeMathjax]
  }
});
