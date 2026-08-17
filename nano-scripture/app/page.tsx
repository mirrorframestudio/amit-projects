import Hero from '@/components/Hero';
import Trust from '@/components/home/Trust';
import Bestsellers from '@/components/home/Bestsellers';
import Worn from '@/components/home/Worn';
import Blessings from '@/components/home/Blessings';
import Scale from '@/components/home/Scale';
import Categories from '@/components/home/Categories';
import Process from '@/components/home/Process';
import Assurance from '@/components/home/Assurance';
import Closing from '@/components/home/Closing';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Trust />
      <Bestsellers />
      <Worn />
      <Blessings />
      <Scale />
      <Categories />
      <Process />
      <Assurance />
      <Closing />
    </>
  );
}
