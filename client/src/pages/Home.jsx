import Hero from "../sections/Hero";
import PromoBanner from "../sections/PromoBanner";
import Story from "../sections/Story";
import SlideText from "../sections/SlideText";
import MenuList from "../sections/MenuList";
import Gallery from "../sections/Gallery";
import HowItWorks from "../sections/HowItWorks";
import Reveal from "../components/Reveal";
import Marquee from "../components/Marquee";

function Home() {
  return (
    <div>
      <Hero />
      <Marquee />
      <Reveal>
        <PromoBanner />
      </Reveal>
      <Reveal>
        <Story />
      </Reveal>
      <SlideText />
      <Reveal>
        <MenuList />
      </Reveal>
      <Reveal>
        <Gallery />
      </Reveal>
      <Reveal>
        <HowItWorks />
      </Reveal>
    </div>
  );
}

export default Home;