import React from 'react';
import HoverRevealCards, { CardItem } from './cards';

const demoItems: CardItem[] = [
  {
    id: 1,
    title: 'Echoes',
    subtitle: 'Grand Canyon',
    imageUrl: 'https://cdn.21st.dev/assets/mirror/11/1127d9ddb36716d0f7406f792ab484510ac712219d535e18a099d3381233cff4.jpg',
  },
  {
    id: 2,
    title: 'Highest Mountain',
    subtitle: 'Yosemite',
    imageUrl: 'https://cdn.21st.dev/assets/mirror/44/4466346f6258e5ebe8e2e96e074c58fe8bbcdeeb24765fdecec6e2fb2d7dc8e5.jpg',
  },
  {
    id: 3,
    title: 'Deep Desert',
    subtitle: 'Sahara',
    imageUrl: 'https://cdn.21st.dev/assets/mirror/51/51cdd8d3464631792370abe5c107a2645a0fd067450c67b27f1d26e510dd8956.jpg',
  },
  {
    id: 4,
    title: 'Breath-taking',
    subtitle: 'Landscape',
    imageUrl: 'https://cdn.21st.dev/assets/mirror/20/20f995189be15b38c7652b025aa3159ebdc7bfd284ed49303dc2b6e7dac489dd.jpg',
  },
];

const HoverRevealCardsDemo = () => {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <HoverRevealCards items={demoItems} />
    </div>
  );
};

export default HoverRevealCardsDemo;
