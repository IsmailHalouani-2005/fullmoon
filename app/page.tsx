import Header from '@/components/Header';
import Hero from '@/components/Hero';
import HeroCards from '@/components/HeroCards';
import InfoSection from '@/components/InfoSection';
import RulesSection from '@/components/RulesSection';
import RoleCarousel from '@/components/RoleCarousel';
import Leaderboard from '@/components/Leaderboard';
import Footer from '@/components/Footer';

export default function Home() {
    return (
        <>
            <Header />
            <main className="flex-1 flex flex-col">
                <Hero />
                <HeroCards />
                {/* <InfoSection /> */}
                <RulesSection />
                <RoleCarousel />
                <Leaderboard />
            </main>
            <Footer />
        </>
    );
}