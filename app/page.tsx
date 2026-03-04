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
            <main className="overflow-x-hidden">
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