import Hero from '@/components/Hero';
import Bestsellers from '@/components/home/Bestsellers';
import Worn from '@/components/home/Worn';
import Scale from '@/components/home/Scale';
import Categories from '@/components/home/Categories';
import Process from '@/components/home/Process';
import Assurance from '@/components/home/Assurance';
import Closing from '@/components/home/Closing';
import Interlude from '@/components/home/Interlude';
import { INTERLUDES } from '@/lib/interludes';

/**
 * צילום בין כל שני נושאים. הסדר והבחירה ב-lib/interludes.ts.
 * הרצועה הראשונה נטענת מיד - היא עלולה להיות בתוך המסך הראשון.
 */
const [j1, j2, j3, j4, j5, j6, j7] = INTERLUDES;

export default function HomePage() {
  return (
    <>
      <Hero />
      <Interlude shot={j1} eager />
      <Bestsellers />
      <Interlude shot={j2} />
      <Worn />
      <Interlude shot={j3} />
      <Scale />
      <Interlude shot={j4} />
      <Categories />
      <Interlude shot={j5} />
      <Process />
      <Interlude shot={j6} />
      <Assurance />
      <Interlude shot={j7} />
      <Closing />
    </>
  );
}
